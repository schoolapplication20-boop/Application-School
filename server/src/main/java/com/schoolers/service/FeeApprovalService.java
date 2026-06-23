package com.schoolers.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.dto.ApiResponse;
import com.schoolers.model.FeeEditRequest;
import com.schoolers.repository.FeeEditRequestRepository;
import com.schoolers.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class FeeApprovalService {

    @Autowired private FeeEditRequestRepository requestRepo;
    @Autowired private AdminService             adminService;
    @Autowired private UserRepository           userRepository;
    @Autowired private ObjectMapper             objectMapper;

    // ── auth helpers ─────────────────────────────────────────────────────────

    private Long getSchoolId(Authentication auth) {
        if (auth != null && auth.getDetails() instanceof Map<?, ?> d) {
            Object v = d.get("schoolId");
            if (v != null) { try { return Long.parseLong(v.toString()); } catch (NumberFormatException ignored) {} }
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(com.schoolers.model.User::getSchoolId).orElse(null);
    }

    private Long getUserId(Authentication auth) {
        if (auth != null && auth.getDetails() instanceof Map<?, ?> d) {
            Object v = d.get("userId");
            if (v != null) { try { return Long.parseLong(v.toString()); } catch (NumberFormatException ignored) {} }
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(com.schoolers.model.User::getId).orElse(null);
    }

    private String getDisplayName(Authentication auth) {
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(u -> u.getName() != null ? u.getName() : auth.getName())
                .orElse(auth.getName());
    }

    private boolean isSuperAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"));
    }

    // ── Create approval request (ADMIN → queued; SUPER_ADMIN → direct) ───────

    @SuppressWarnings("unchecked")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createRequest(
            Map<String, Object> body, Authentication auth) {

        Long schoolId = getSchoolId(auth);
        Long userId   = getUserId(auth);
        if (schoolId == null)
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("School context not found"));

        String requestType = String.valueOf(body.getOrDefault("requestType", ""));
        if (requestType.isBlank())
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("requestType is required"));

        // Super Admins apply immediately — no approval queue
        if (isSuperAdmin(auth))
            return applyDirectly(requestType, body, schoolId);

        // Build the request record
        FeeEditRequest req = new FeeEditRequest();
        req.setRequestId(UUID.randomUUID().toString());
        req.setSchoolId(schoolId);
        req.setRequestedByUserId(userId);
        req.setRequestedByName(getDisplayName(auth));
        req.setRequestType(requestType);
        req.setStudentName(String.valueOf(body.getOrDefault("studentName", "")));
        req.setClassName(String.valueOf(body.getOrDefault("className", "")));
        req.setReason(String.valueOf(body.getOrDefault("reason", "")));
        req.setStatus("PENDING");
        req.setRequestedAt(LocalDateTime.now());

        Object eid = body.get("entityId");
        if (eid != null) { try { req.setEntityId(Long.parseLong(eid.toString())); } catch (NumberFormatException ignored) {} }

        try {
            req.setExistingValues(body.get("existingValues") != null
                    ? objectMapper.writeValueAsString(body.get("existingValues")) : null);
            req.setNewValues(body.get("newValues") != null
                    ? objectMapper.writeValueAsString(body.get("newValues")) : null);

            // The payload that will be replayed on approval
            Map<String, Object> payload = new HashMap<>(
                    (Map<String, Object>) body.getOrDefault("payload", body));
            payload.put("schoolId", schoolId);
            payload.remove("existingValues");
            payload.remove("newValues");
            payload.remove("reason");
            req.setPendingPayload(objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Serialisation failed: " + e.getMessage()));
        }

        FeeEditRequest saved = requestRepo.save(req);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("requestId", saved.getRequestId());
        result.put("status",    "PENDING");
        result.put("message",   "Request submitted — awaiting Super Admin approval.");
        return ResponseEntity.ok(ApiResponse.success("Request submitted successfully", result));
    }

    // ── Super Admin direct-apply (bypasses queue) ────────────────────────────

    @SuppressWarnings("unchecked")
    private ResponseEntity<ApiResponse<Map<String, Object>>> applyDirectly(
            String requestType, Map<String, Object> body, Long schoolId) {
        try {
            Map<String, Object> payload = new HashMap<>(
                    (Map<String, Object>) body.getOrDefault("payload", body));
            payload.put("schoolId", schoolId);
            applyPayload(requestType, payload, schoolId);
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("status",  "APPLIED");
            r.put("message", "Change applied directly by Super Admin.");
            return ResponseEntity.ok(ApiResponse.success("Applied successfully", r));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to apply: " + e.getMessage()));
        }
    }

    // ── List requests ─────────────────────────────────────────────────────────

    public ResponseEntity<ApiResponse<List<FeeEditRequest>>> listRequests(Authentication auth) {
        Long schoolId = getSchoolId(auth);
        List<FeeEditRequest> list = isSuperAdmin(auth)
                ? requestRepo.findBySchoolIdOrderByRequestedAtDesc(schoolId)
                : requestRepo.findByRequestedByUserIdOrderByRequestedAtDesc(getUserId(auth));
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    // ── Pending count for notification badge ─────────────────────────────────

    public ResponseEntity<ApiResponse<Map<String, Long>>> pendingCount(Authentication auth) {
        Long schoolId = getSchoolId(auth);
        long count = requestRepo.countBySchoolIdAndStatus(schoolId, "PENDING");
        Map<String, Long> result = Map.of("pendingCount", count);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ── Approve ───────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    @Transactional
    public ResponseEntity<ApiResponse<FeeEditRequest>> approve(
            Long id, Map<String, Object> body, Authentication auth) {

        Optional<FeeEditRequest> opt = requestRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        FeeEditRequest req = opt.get();
        if (!req.getSchoolId().equals(getSchoolId(auth)))
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied"));
        if (!"PENDING".equals(req.getStatus()))
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Request is already " + req.getStatus()));

        try {
            Map<String, Object> payload = objectMapper.readValue(req.getPendingPayload(), Map.class);
            applyPayload(req.getRequestType(), payload, req.getSchoolId());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to apply change: " + e.getMessage()));
        }

        req.setStatus("APPROVED");
        req.setApprovedByUserId(getUserId(auth));
        req.setApprovedByName(getDisplayName(auth));
        req.setApprovalNotes(body != null ? String.valueOf(body.getOrDefault("notes", "")) : "");
        req.setActionedAt(LocalDateTime.now());
        return ResponseEntity.ok(ApiResponse.success("Request approved and change applied", requestRepo.save(req)));
    }

    // ── Reject ────────────────────────────────────────────────────────────────

    @Transactional
    public ResponseEntity<ApiResponse<FeeEditRequest>> reject(
            Long id, Map<String, Object> body, Authentication auth) {

        Optional<FeeEditRequest> opt = requestRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        FeeEditRequest req = opt.get();
        if (!req.getSchoolId().equals(getSchoolId(auth)))
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied"));
        if (!"PENDING".equals(req.getStatus()))
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Request is already " + req.getStatus()));

        req.setStatus("REJECTED");
        req.setApprovedByUserId(getUserId(auth));
        req.setApprovedByName(getDisplayName(auth));
        req.setApprovalNotes(body != null ? String.valueOf(body.getOrDefault("notes", "")) : "");
        req.setActionedAt(LocalDateTime.now());
        return ResponseEntity.ok(ApiResponse.success("Request rejected", requestRepo.save(req)));
    }

    // ── Apply stored payload to actual data ───────────────────────────────────

    @SuppressWarnings("unchecked")
    private void applyPayload(String requestType, Map<String, Object> payload, Long schoolId)
            throws Exception {
        payload.put("schoolId", schoolId);

        switch (requestType) {
            case "FEE_STRUCTURE_SAVE"   -> adminService.saveClassFeeStructure(payload);
            case "FEE_STRUCTURE_DELETE" -> adminService.deleteClassFeeStructure(toLong(payload.get("entityId")), schoolId);
            case "STUDENT_FEE_UPDATE"   -> adminService.assignStudentFee(payload);
            case "CONDONATION_UPDATE"   -> adminService.updateCondonation(toLong(payload.get("assignmentId")), payload, schoolId);
            case "ASSIGNMENT_DELETE"    -> adminService.deleteStudentFeeAssignment(toLong(payload.get("assignmentId")), schoolId);
            default -> throw new IllegalArgumentException("Unknown requestType: " + requestType);
        }
    }

    private Long toLong(Object v) {
        if (v == null) throw new IllegalArgumentException("Required id field is null in payload");
        try { return Long.parseLong(v.toString()); }
        catch (NumberFormatException e) { throw new IllegalArgumentException("Invalid id: " + v); }
    }
}
