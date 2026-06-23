package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.FeeEditRequest;
import com.schoolers.service.FeeApprovalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Fee approval workflow endpoints.
 *
 * ADMIN  → POST /fee-edit-requests       (submit a change request)
 * ADMIN  → GET  /fee-edit-requests       (see own requests)
 * SA     → GET  /fee-edit-requests       (see all school requests)
 * SA     → GET  /fee-edit-requests/pending-count   (badge count)
 * SA     → POST /fee-edit-requests/{id}/approve
 * SA     → POST /fee-edit-requests/{id}/reject
 */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin
public class FeeApprovalController {

    @Autowired private FeeApprovalService service;

    /** Submit a fee-edit request (ADMIN queues it; SUPER_ADMIN applies immediately). */
    @PostMapping("/fee-edit-requests")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createRequest(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        return service.createRequest(body, auth);
    }

    /** List requests — ADMIN sees own; SUPER_ADMIN sees all for the school. */
    @GetMapping("/fee-edit-requests")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<FeeEditRequest>>> listRequests(Authentication auth) {
        return service.listRequests(auth);
    }

    /** Number of pending requests — drives the sidebar badge. */
    @GetMapping("/fee-edit-requests/pending-count")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> pendingCount(Authentication auth) {
        return service.pendingCount(auth);
    }

    /** Approve a request and immediately apply the stored payload. */
    @PostMapping("/fee-edit-requests/{id}/approve")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<FeeEditRequest>> approve(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication auth) {
        return service.approve(id, body, auth);
    }

    /** Reject a request — no changes are made to fee data. */
    @PostMapping("/fee-edit-requests/{id}/reject")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<FeeEditRequest>> reject(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication auth) {
        return service.reject(id, body, auth);
    }
}
