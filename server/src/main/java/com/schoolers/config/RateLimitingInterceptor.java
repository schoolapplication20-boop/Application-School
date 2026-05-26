package com.schoolers.config;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate Limiting Interceptor using Bucket4j
 * 
 * Limits API requests per IP address:
 * - 1000 requests per 10 minutes for public endpoints
 * - 2000 requests per 10 minutes for authenticated endpoints
 * - 100 requests per minute for login endpoint (brute force protection)
 */
@Component
public class RateLimitingInterceptor implements HandlerInterceptor {

    private final Map<String, Bucket> authenticationBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> generalBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();

    // Bucket configurations
    private final Bucket authenticationBucket = Bucket4j.builder()
            .addLimit(Refill.intervally(2000, java.time.Duration.ofMinutes(10)))
            .build();

    private final Bucket generalBucket = Bucket4j.builder()
            .addLimit(Refill.intervally(1000, java.time.Duration.ofMinutes(10)))
            .build();

    private final Bucket loginBucket = Bucket4j.builder()
            .addLimit(Refill.intervally(100, java.time.Duration.ofMinutes(1)))
            .build();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        String ipAddress = getClientIp(request);
        String requestPath = request.getRequestURI();

        Bucket bucket = selectBucket(requestPath, ipAddress);

        if (bucket.tryConsume(1)) {
            response.addHeader("X-Rate-Limit-Remaining", String.valueOf(bucket.getAvailableTokens()));
            return true;
        } else {
            response.setStatus(HttpServletResponse.SC_TOO_MANY_REQUESTS);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Rate limit exceeded. Please try again later.\"}");
            return false;
        }
    }

    private Bucket selectBucket(String path, String ipAddress) {
        // Login endpoint gets strictest rate limit (brute force protection)
        if (path.contains("/api/auth/login") || path.contains("/api/auth/verify-otp")) {
            return loginBuckets.computeIfAbsent(ipAddress, k -> Bucket4j.builder()
                    .addLimit(Refill.intervally(100, java.time.Duration.ofMinutes(1)))
                    .build());
        }

        // Public endpoints (admissions, marketing) get moderate limit
        if (path.contains("/api/applications") || path.contains("/api/marketing") || path.contains("/api/chatbot")) {
            return generalBuckets.computeIfAbsent(ipAddress, k -> Bucket4j.builder()
                    .addLimit(Refill.intervally(1000, java.time.Duration.ofMinutes(10)))
                    .build());
        }

        // Authenticated endpoints get higher limit
        return authenticationBuckets.computeIfAbsent(ipAddress, k -> Bucket4j.builder()
                .addLimit(Refill.intervally(2000, java.time.Duration.ofMinutes(10)))
                .build());
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
