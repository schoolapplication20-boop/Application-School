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
                lastSeen.remove(ip);
                removed++;
            }
        }
        return removed;
    }

    /**
     * Get client IP address, accounting for proxies (X-Forwarded-For, CF-Connecting-IP)
     */
    private String getClientIp(HttpServletRequest request) {
        String cfConnectingIp = request.getHeader("CF-Connecting-IP"); // Cloudflare
        if (cfConnectingIp != null && !cfConnectingIp.isEmpty()) {
            return cfConnectingIp;
        }

        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }
}
