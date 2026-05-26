package com.schoolers.service;

import com.schoolers.model.AuditLog;
import com.schoolers.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Records immutable audit trail entries. The {@code log} methods are fire-and-forget
 * (annotated @Async) so they never block the main request thread.
 */
@Service
public class AuditLogService {

    @Autowired private AuditLogRepository auditLogRepository;

    @Async
    public void log(Long actorId, String actorName, String actorRole,
                    Long schoolId, String action, String entityType, Long entityId,
                    String description, String ipAddress) {
        auditLogRepository.save(AuditLog.builder()
                .actorId(actorId)
                .actorName(actorName)
                .actorRole(actorRole)
                .schoolId(schoolId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .description(description)
                .ipAddress(ipAddress)
                .build());
    }

    @Async
    public void logWithValues(Long actorId, String actorName, String actorRole,
                              Long schoolId, String action, String entityType, Long entityId,
                              String description, String oldValue, String newValue, String ipAddress) {
        auditLogRepository.save(AuditLog.builder()
                .actorId(actorId)
                .actorName(actorName)
                .actorRole(actorRole)
                .schoolId(schoolId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .description(description)
                .oldValue(oldValue)
                .newValue(newValue)
                .ipAddress(ipAddress)
                .build());
    }

    public Page<AuditLog> getBySchool(Long schoolId, int page, int size) {
        return auditLogRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId, PageRequest.of(page, size));
    }

    public Page<AuditLog> getBySchoolAndEntityType(Long schoolId, String entityType, int page, int size) {
        return auditLogRepository.findBySchoolIdAndEntityTypeOrderByCreatedAtDesc(schoolId, entityType, PageRequest.of(page, size));
    }

    public Page<AuditLog> getByActor(Long actorId, int page, int size) {
        return auditLogRepository.findByActorIdOrderByCreatedAtDesc(actorId, PageRequest.of(page, size));
    }

    /** Extracts the real client IP, honoring Cloudflare and proxy headers. */
    public static String getClientIp(HttpServletRequest request) {
        String cf = request.getHeader("CF-Connecting-IP");
        if (StringUtils.hasText(cf)) return cf;
        String xff = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(xff)) return xff.split(",")[0].trim();
        String xri = request.getHeader("X-Real-IP");
        if (StringUtils.hasText(xri)) return xri;
        return request.getRemoteAddr();
    }
}
