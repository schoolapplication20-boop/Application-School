package com.schoolers.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Attaches a unique request ID to every HTTP request.
 *
 * Priority is HIGHEST_PRECEDENCE so the ID is in MDC before any other filter
 * (including Spring Security) emits a log line. All SLF4J appenders that
 * include %X{requestId} in their pattern will automatically correlate logs
 * that belong to the same request — critical for debugging production issues.
 *
 * The same ID is echoed back in the X-Request-Id response header so clients
 * and load balancers can correlate their logs with the server logs.
 *
 * Honour an incoming X-Request-Id when present (e.g., from an API gateway
 * or frontend that already attached one), otherwise generate a fresh UUID.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String MDC_KEY = "requestId";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        MDC.put(MDC_KEY, requestId);
        response.setHeader(REQUEST_ID_HEADER, requestId);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }
}
