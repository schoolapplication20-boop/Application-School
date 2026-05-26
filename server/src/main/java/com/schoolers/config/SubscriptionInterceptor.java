package com.schoolers.config;

import com.schoolers.repository.SchoolRepository;
import com.schoolers.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDate;

/**
 * Enforces school subscription expiry on every authenticated API call.
 * Returns HTTP 402 when a school's subscription is expired.
 * APPLICATION_OWNER accounts are exempt.
 */
@Component
public class SubscriptionInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionInterceptor.class);

    @Autowired private JwtUtil jwtUtil;
    @Autowired private SchoolRepository schoolRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        String token = extractToken(request);
        if (token == null) return true; // no token — let Spring Security handle auth

        String role = jwtUtil.extractRole(token);
        if ("APPLICATION_OWNER".equals(role)) return true; // platform admins are exempt

        Long schoolId = jwtUtil.extractSchoolId(token);
        if (schoolId == null) return true;

        boolean expired = schoolRepository.findById(schoolId)
                .map(s -> s.getSubscriptionExpiry() != null
                        && !s.getSubscriptionExpiry().isAfter(LocalDate.now()))
                .orElse(false);

        if (expired) {
            log.warn("[Subscription] Blocked request — schoolId={} subscription expired", schoolId);
            response.setStatus(402);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"success\":false,\"message\":\"Your school's subscription has expired. "
                    + "Please contact the My-Skoolz team to renew.\"}");
            return false;
        }

        return true;
    }

    private String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        return (StringUtils.hasText(bearer) && bearer.startsWith("Bearer "))
                ? bearer.substring(7) : null;
    }
}
