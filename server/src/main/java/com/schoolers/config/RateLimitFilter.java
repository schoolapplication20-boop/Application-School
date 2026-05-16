package com.schoolers.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple in-memory rate limiter for auth endpoints.
 * Allows max 10 requests per IP per minute on /api/auth/login and /api/auth/forgot-password.
 * Resets counts every 60 seconds.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int    MAX_REQUESTS = 10;
    private static final long   WINDOW_MS    = 60_000;

    private final ConcurrentHashMap<String, AtomicInteger> counts    = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long>          windowStart = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String path = request.getRequestURI();
        if (!path.equals("/api/auth/login") && !path.equals("/api/auth/forgot-password")) {
            chain.doFilter(request, response);
            return;
        }

        String ip  = getClientIp(request);
        long   now = System.currentTimeMillis();

        windowStart.putIfAbsent(ip, now);
        if (now - windowStart.get(ip) > WINDOW_MS) {
            windowStart.put(ip, now);
            counts.put(ip, new AtomicInteger(0));
        }

        counts.putIfAbsent(ip, new AtomicInteger(0));
        int count = counts.get(ip).incrementAndGet();

        if (count > MAX_REQUESTS) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"success\":false,\"message\":\"Too many requests. Please wait a minute and try again.\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
