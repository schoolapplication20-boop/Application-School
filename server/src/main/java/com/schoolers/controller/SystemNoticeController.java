package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.SystemNoticeRequest;
import com.schoolers.model.SystemNotice;
import com.schoolers.repository.SystemNoticeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/system/notice")
public class SystemNoticeController {

    @Autowired
    private SystemNoticeRepository noticeRepository;

    /** Any authenticated user — fetch the current active notice */
    @GetMapping
    public ResponseEntity<ApiResponse<SystemNotice>> getActive() {
        SystemNotice notice = noticeRepository.findFirstByIsActiveTrueOrderByCreatedAtDesc().orElse(null);
        return ResponseEntity.ok(ApiResponse.success("OK", notice));
    }

    /** APPLICATION_OWNER only — publish or replace the active notice */
    @PutMapping
    @PreAuthorize("hasRole('APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<SystemNotice>> setNotice(@RequestBody SystemNoticeRequest req) {
        if (req.getMessage() == null || req.getMessage().isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Message is required."));

        String severity = req.getSeverity() != null ? req.getSeverity().toUpperCase() : "WARNING";
        if (!severity.equals("INFO") && !severity.equals("WARNING") && !severity.equals("CRITICAL"))
            severity = "WARNING";

        LocalDateTime scheduledAt = null;
        if (req.getScheduledAt() != null && !req.getScheduledAt().isBlank()) {
            try { scheduledAt = LocalDateTime.parse(req.getScheduledAt()); }
            catch (DateTimeParseException ignored) {}
        }

        // Deactivate any existing notice before creating a new one
        noticeRepository.deactivateAll();

        SystemNotice notice = SystemNotice.builder()
            .message(req.getMessage().trim())
            .severity(severity)
            .scheduledAt(scheduledAt)
            .durationMinutes(req.getDurationMinutes())
            .isActive(true)
            .build();

        noticeRepository.save(notice);
        return ResponseEntity.ok(ApiResponse.success("Notice published.", notice));
    }

    /** APPLICATION_OWNER only — clear / dismiss the active notice */
    @DeleteMapping
    @PreAuthorize("hasRole('APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<Void>> clearNotice() {
        noticeRepository.deactivateAll();
        return ResponseEntity.ok(ApiResponse.success("Notice cleared.", null));
    }
}
