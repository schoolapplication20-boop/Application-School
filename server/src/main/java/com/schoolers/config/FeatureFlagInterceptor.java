package com.schoolers.config;

import com.schoolers.repository.SchoolFeatureRepository;
import com.schoolers.security.CurrentUserUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

@Component
public class FeatureFlagInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(FeatureFlagInterceptor.class);

    @Autowired private SchoolFeatureRepository schoolFeatureRepository;
    @Autowired private CurrentUserUtil currentUserUtil;

    // Map URI path segments to feature keys
    private static final Map<String, String> PATH_FEATURE_MAP = Map.ofEntries(
        Map.entry("/api/transport",     "transport"),
        Map.entry("/api/timetable",     "timetable"),
        Map.entry("/api/sms",           "sms"),
        Map.entry("/api/online-exams",  "online_exams"),
        Map.entry("/api/examination",   "examination"),
        Map.entry("/api/report-cards",  "report_cards"),
        Map.entry("/api/leave",         "leave"),
        Map.entry("/api/salary",        "salaries"),
        Map.entry("/api/messages",      "messages"),
        Map.entry("/api/class-diary",   "diary"),
        Map.entry("/api/diary",         "diary"),
        Map.entry("/api/ai",            "ai_assistant"),
        Map.entry("/api/chatbot",       "ai_assistant")
    );

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return true; // Not authenticated — let SecurityConfig handle it
        }

        // APPLICATION_OWNER bypasses all feature flag checks
        boolean isOwner = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_APPLICATION_OWNER"));
        if (isOwner) return true;

        String path = request.getRequestURI();
        String featureKey = resolveFeatureKey(path);
        if (featureKey == null) return true; // No feature gate for this path

        Long schoolId;
        try {
            schoolId = currentUserUtil.getCurrentSchoolId(auth);
        } catch (Exception e) {
            return true; // Can't resolve school — let normal auth handle it
        }
        if (schoolId == null) return true;

        // Check school_features table — if a row exists and enabled=false, block
        boolean blocked = schoolFeatureRepository.findByIdSchoolId(schoolId).stream()
            .filter(f -> featureKey.equals(f.getId() != null ? f.getId().getFeatureKey() : null))
            .anyMatch(f -> Boolean.FALSE.equals(f.getEnabled()));

        if (blocked) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"This module is not enabled for your school.\"}");
            return false;
        }
        return true;
    }

    private String resolveFeatureKey(String path) {
        for (Map.Entry<String, String> entry : PATH_FEATURE_MAP.entrySet()) {
            if (path.startsWith(entry.getKey())) return entry.getValue();
        }
        return null;
    }
}
