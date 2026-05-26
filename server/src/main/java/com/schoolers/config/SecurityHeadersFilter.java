package com.schoolers.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Security Headers Filter
 * 
 * Adds essential security headers to all HTTP responses to prevent common attacks:
 * - HSTS: Enforce HTTPS only
 * - X-Content-Type-Options: Prevent MIME sniffing
 * - X-Frame-Options: Prevent clickjacking
 * - X-XSS-Protection: Enable browser XSS protection
 * - Content-Security-Policy: Restrict resource loading
 * - Referrer-Policy: Control referrer information
 */
@Component
public class SecurityHeadersFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // HSTS: Force HTTPS for 1 year + all subdomains
        httpResponse.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

        // Prevent MIME type sniffing
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");

        // Prevent clickjacking
        httpResponse.setHeader("X-Frame-Options", "DENY");

        // Enable browser XSS protection (for older browsers)
        httpResponse.setHeader("X-XSS-Protection", "1; mode=block");

        // Content Security Policy: Only allow resources from same origin + specific trusted CDNs
        String csp = "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://storage.googleapis.com; " +
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; " +
                "img-src 'self' data: https: blob:; " +
                "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; " +
                "connect-src 'self' https: wss:; " +
                "frame-ancestors 'none'; " +
                "base-uri 'self'; " +
                "form-action 'self';";
        httpResponse.setHeader("Content-Security-Policy", csp);

        // Referrer Policy: Don't leak referrer to external sites
        httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // Permissions Policy: Disable access to sensitive features
        httpResponse.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

        chain.doFilter(request, response);
    }
}
