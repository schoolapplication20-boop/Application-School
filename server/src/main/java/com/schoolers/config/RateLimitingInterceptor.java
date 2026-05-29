package com.schoolers.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Rate Limiting Interceptor using Bucket4j
 *
 * Limits API requests per IP address:
 * - 20 requests per 15 minutes for /api/auth/login and /api/auth/register (IP-level bot protection;
 *   per-account lockout after 5 wrong passwords is handled in AuthService)
 * - 10 requests per hour for /api/auth/forgot-password and /api/auth/verify-otp
 *   (prevents OTP spam; kept generous enough that a locked-out user can still reset)
 * - 1000 requests per 10 minutes for public endpoints
 * - 2000 requests per 10 minutes for authenticated endpoints
 */
@Component
public class RateLimitingInterceptor implements HandlerInterceptor {

    private final Map<String, Bucket>     authenticationBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket>     generalBuckets        = new ConcurrentHashMap<>();
    private final Map<String, Bucket>     loginBuckets          = new ConcurrentHashMap<>();
    private final Map<String, Bucket>     passwordResetBuckets  = new ConcurrentHashMap<>();
    /** Tight bucket for onboarding OTP send — prevents email-bombing users */
    private final Map<String, Bucket>     onboardingOtpBuckets  = new ConcurrentHashMap<>();
    /** Last-access epoch-ms per IP — used by evictStaleBuckets() to remove idle entries */
    private final Map<String, AtomicLong> lastSeen              = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        String ipAddress = getClientIp(request);
        String requestPath = request.getRequestURI();

        lastSeen.computeIfAbsent(ipAddress, k -> new AtomicLong()).set(System.currentTimeMillis());
        Bucket bucket = selectBucket(requestPath, ipAddress);

        if (bucket.tryConsume(1)) {
            response.addHeader("X-Rate-Limit-Remaining", String.valueOf(bucket.getAvailableTokens()));
            return true;
        } else {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Too many requests from this device. Please wait a few minutes and try again.\"}");
            return false;
        }
    }

    private Bucket selectBucket(String path, String ipAddress) {
        // Onboarding email OTP (teacher/student creation) — very tight to prevent email bombing.
        // 5 OTP-send requests per 10 min per IP is generous for legitimate admins.
        if (path.contains("/api/auth/onboarding/send-otp")
                || path.contains("/api/auth/onboarding/verify-otp")) {
            return onboardingOtpBuckets.computeIfAbsent(ipAddress, k -> Bucket4j.builder()
                    .addLimit(Bandwidth.classic(5, Refill.intervally(5, java.time.Duration.ofMinutes(10))))
                    .build());
        }

        // Forgot-password and OTP verify get their own generous bucket so a locked-out user
        // can always recover their account — 10 attempts per hour is more than enough.
        if (path.contains("/api/auth/forgot-password")
                || path.contains("/api/auth/verify-otp")
                || path.contains("/api/auth/reset-password")) {
            return passwordResetBuckets.computeIfAbsent(ipAddress, k -> Bucket4j.builder()
                    .addLimit(Bandwidth.classic(10, Refill.intervally(10, java.time.Duration.ofHours(1))))
                    .build());
        }

        // Login and register: 20 attempts per 15 minutes per IP.
        // Per-account lockout (5 wrong passwords → permanent lock) is handled in AuthService.
        if (path.contains("/api/auth/login") || path.contains("/api/auth/register")) {
            return loginBuckets.computeIfAbsent(ipAddress, k -> Bucket4j.builder()
                    .addLimit(Bandwidth.classic(20, Refill.intervally(20, java.time.Duration.ofMinutes(15))))
                    .build());
        }

        // Public endpoints (admissions, marketing) get moderate limit
        if (path.contains("/api/applications") || path.contains("/api/marketing") || path.contains("/api/chatbot")) {
            return generalBuckets.computeIfAbsent(ipAddress, k -> Bucket4j.builder()
                    .addLimit(Bandwidth.classic(1000, Refill.intervally(1000, java.time.Duration.ofMinutes(10))))
                    .build());
        }

        // Authenticated endpoints get higher limit
        return authenticationBuckets.computeIfAbsent(ipAddress, k -> Bucket4j.builder()
                .addLimit(Bandwidth.classic(2000, Refill.intervally(2000, java.time.Duration.ofMinutes(10))))
                .build());
    }

    /** Remove buckets for IPs that haven't been seen in the last hour. Returns count removed. */
    public int evictStaleBuckets() {
        long staleThreshold = System.currentTimeMillis() - 60 * 60 * 1000L;
        int removed = 0;
        for (Map.Entry<String, AtomicLong> entry : lastSeen.entrySet()) {
            if (entry.getValue().get() < staleThreshold) {
                String ip = entry.getKey();
                loginBuckets.remove(ip);
                generalBuckets.remove(ip);
                authenticationBuckets.remove(ip);
                passwordResetBuckets.remove(ip);
                onboardingOtpBuckets.remove(ip);
                lastSeen.remove(ip);
                removed++;
            }
        }
        return removed;
    }

    /**
     * Extract the real client IP, resistant to spoofing.
     *
     * Strategy (in priority order):
     * 1. CF-Connecting-IP — set by Cloudflare's edge; cannot be forged by the end client
     *    because Cloudflare strips/overwrites it.  Only trust this when remoteAddr is a
     *    Cloudflare IP (private-range guard handles non-CF deploys automatically).
     * 2. X-Forwarded-For — only trusted when the *direct* connection comes from a private
     *    network (i.e., a known reverse proxy like Render, Nginx, AWS ALB).  We take the
     *    LAST non-private IP in the chain, which is the outermost public address and the
     *    hardest for an attacker to spoof.
     * 3. Direct remoteAddr — used when not behind a proxy.
     */
    private String getClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();

        // CF-Connecting-IP is reliable when the request genuinely comes from Cloudflare
        String cfIp = request.getHeader("CF-Connecting-IP");
        if (cfIp != null && !cfIp.isBlank() && isPrivateOrLoopback(remoteAddr)) {
            // remoteAddr is a private IP → we are behind a proxy; CF-Connecting-IP is trustworthy
            String candidate = cfIp.split(",")[0].trim();
            if (!candidate.isEmpty()) return candidate;
        }

        // X-Forwarded-For is only trusted from private/loopback remoteAddr (known reverse proxy)
        if (isPrivateOrLoopback(remoteAddr)) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.isBlank()) {
                // Take the last public (non-private) IP in the chain
                String[] hops = xForwardedFor.split(",");
                for (int i = hops.length - 1; i >= 0; i--) {
                    String hop = hops[i].trim();
                    if (!hop.isEmpty() && !isPrivateOrLoopback(hop)) return hop;
                }
                // All hops are private — fall through to remoteAddr
            }
        }

        return remoteAddr;
    }

    /** Returns true if the given IP string is a loopback or RFC-1918 private address. */
    private boolean isPrivateOrLoopback(String ip) {
        if (ip == null || ip.isBlank()) return false;
        return ip.startsWith("127.")
                || ip.startsWith("10.")
                || ip.startsWith("192.168.")
                || ip.equals("::1")
                || ip.startsWith("172.") && isPrivate172(ip)
                || ip.startsWith("fd")   // IPv6 ULA
                || ip.startsWith("fc");
    }

    private boolean isPrivate172(String ip) {
        // 172.16.0.0 – 172.31.255.255
        try {
            int second = Integer.parseInt(ip.split("\\.")[1]);
            return second >= 16 && second <= 31;
        } catch (Exception e) { return false; }
    }
}
