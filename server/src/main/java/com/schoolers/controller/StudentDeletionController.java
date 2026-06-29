package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.StudentDeletionRequest;
import com.schoolers.service.StudentDeletionRequestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Student deletion approval workflow endpoints.
 *
 * ADMIN  → POST /students/{id}/deletion-requests   (submit a deletion request)
 * SA     → submitting applies immediately (soft-delete + audit record)
 * ADMIN  → GET  /student-deletion-requests          (see own requests)
 * SA     → GET  /student-deletion-requests          (see all school requests)
 * SA     → GET  /student-deletion-requests/pending-count   (badge count)
 * SA     → POST /student-deletion-requests/{id}/approve
 * SA     → POST /student-deletion-requests/{id}/reject
 */
@RestController
@RequestMapping("/api/admin")
public class StudentDeletionController {

    @Autowired private StudentDeletionRequestService service;

    @PostMapping("/students/{id}/deletion-requests")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createRequest(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        String reason = String.valueOf(body.getOrDefault("reason", ""));
        return service.createRequest(id, reason, auth);
    }

    @GetMapping("/student-deletion-requests")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<StudentDeletionRequest>>> listRequests(Authentication auth) {
        return service.listRequests(auth);
    }

    @GetMapping("/student-deletion-requests/pending-count")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> pendingCount(Authentication auth) {
        return service.pendingCount(auth);
    }

    @PostMapping("/student-deletion-requests/{id}/approve")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<StudentDeletionRequest>> approve(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication auth) {
        String notes = body != null ? String.valueOf(body.getOrDefault("notes", "")) : "";
        return service.approve(id, notes, auth);
    }

    @PostMapping("/student-deletion-requests/{id}/reject")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<StudentDeletionRequest>> reject(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication auth) {
        String notes = body != null ? String.valueOf(body.getOrDefault("notes", "")) : "";
        return service.reject(id, notes, auth);
    }
}
