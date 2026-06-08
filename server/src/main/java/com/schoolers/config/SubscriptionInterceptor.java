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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Enforces school subscription expiry on every authenticated API call.
 * Returns HTTP 402 when a school's subscription is expired.
 * APPLICATION_OWNER accounts are exempt.
 * Results are cached per schoolId for 5 minutes to avoid a DB hit on every request.
 */
@Component
public class SubscriptionInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionInterceptor.class);
    private static final long CACHE_TTL_MS = 5 * 60 * 1000L; // 5 minutes

    @Autowired private JwtUtil jwtUtil;
    @Autowired private SchoolRepository schoolRepository;

    /** schoolId → epoch-ms when the cache entry expires (use -1 to mean "not expired") */
    private final Map<Long, long[]> cache = new ConcurrentHashMap<>();

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {

        String token = extractToken(request);
        if (token == null) return true;

        String role = jwtUtil.extractRole(token);
        if ("APPLICATION_OWNER".equals(role)) return true;

        Long schoolId = jwtUtil.extractSchoolId(token);
        if (schoolId == null) return true;

        if (isExpired(schoolId)) {
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

    private boolean isExpired(Long schoolId) {
        long now = System.currentTimeMillis();
        // Atomic compute: read-check-write in a single ConcurrentHashMap operation
        long[] result = cache.compute(schoolId, (k, entry) -> {
            if (entry != null && now < entry[0]) {
                return entry; // cache hit — return unchanged
            }
            // cache miss or stale — query DB
            boolean expired = schoolRepository.findById(k)
                    .map(s -> s.getSubscriptionExpiry() != null
                            && !s.getSubscriptionExpiry().isAfter(LocalDate.now()))
                    .orElse(false);
            return new long[]{now + CACHE_TTL_MS, expired ? 1 : 0};
        });
        // Evict if cache grows too large (simple size guard)
        if (cache.size() > 10_000) {
            cache.clear();
        }
        return result[1] == 1;
    }

    private String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        return (StringUtils.hasText(bearer) && bearer.startsWith("Bearer "))
                ? bearer.substring(7) : null;
    }
}
