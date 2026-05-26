package com.schoolers.controller;

import com.schoolers.model.AuditLog;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit-logs")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'APPLICATION_OWNER')")
public class AuditLogController {

    @Autowired private AuditLogService auditLogService;
    @Autowired private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Page<AuditLog>> getLogs(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false)    String entityType,
            Authentication auth) {

        Long schoolId = userRepository.findByEmailIgnoreCase(auth.getName())
                .map(u -> u.getSchoolId()).orElse(null);

        Page<AuditLog> result = (entityType != null && !entityType.isBlank())
                ? auditLogService.getBySchoolAndEntityType(schoolId, entityType, page, size)
                : auditLogService.getBySchool(schoolId, page, size);

        return ResponseEntity.ok(result);
    }
}
