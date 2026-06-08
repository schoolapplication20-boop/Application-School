package com.schoolers.controller;

import com.schoolers.dto.AdminCreatedResponse;
import com.schoolers.dto.ApiResponse;
import com.schoolers.model.User;
import com.schoolers.repository.EmailVerificationRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.SuperAdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/superadmin")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','APPLICATION_OWNER')")
public class SuperAdminController {

    private static final java.util.regex.Pattern EMAIL_PATTERN =
        java.util.regex.Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    @Autowired private SuperAdminService superAdminService;
    @Autowired private UserRepository userRepository;
    @Autowired private EmailVerificationRepository emailVerificationRepository;

    /**
     * Extracts the schoolId from JWT claims stored in auth details by JwtFilter.
     * Falls back to DB lookup for test contexts where details may not be present.
     */
    @SuppressWarnings("unchecked")
    private Long getCurrentSchoolId(Authentication auth) {
        if (auth == null) return null;
        if (auth.getDetails() instanceof java.util.Map) {
            Object v = ((java.util.Map<?, ?>) auth.getDetails()).get("schoolId");
            if (v != null) return v instanceof Long ? (Long) v : Long.parseLong(v.toString());
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(User::getSchoolId)
                .orElse(null);
    }

    private static String strVal(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString().trim() : "";
    }

    private static Integer intVal(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v == null) return null;
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return null; }
    }

    // ── GET /api/superadmin/admins ────────────────────────────────────────────
    @GetMapping("/admins")
    public ResponseEntity<ApiResponse<List<User>>> getAdmins(Authentication auth) {
        return ResponseEntity.ok(superAdminService.getAdmins(getCurrentSchoolId(auth)));
    }

    // ── POST /api/superadmin/admins ───────────────────────────────────────────
    @PostMapping("/admins")
    public ResponseEntity<ApiResponse<AdminCreatedResponse>> createAdmin(
            @RequestBody Map<String, String> body,
            Authentication auth) {

        String rawName  = body.get("name");
        String rawEmail = body.get("email");
        String rawMobile = body.get("mobile");

        String name        = rawName  != null ? rawName.trim()  : "";
        String email       = rawEmail != null ? rawEmail.trim() : "";
        String mobile      = rawMobile != null ? rawMobile.trim() : "";
        String permissions = body.get("permissions");

        if (name.isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("Name is required"));
        if (!EMAIL_PATTERN.matcher(email).matches())
            return ResponseEntity.badRequest().body(ApiResponse.error("Valid email is required"));
        if (!emailVerificationRepository.existsByEmailAndVerifiedTrue(email))
            return ResponseEntity.badRequest().body(ApiResponse.error("Email must be verified with OTP before creating an account."));

        Long schoolId = getCurrentSchoolId(auth);
        ApiResponse<AdminCreatedResponse> response =
                superAdminService.createAdmin(name, email, mobile.isEmpty() ? null : mobile, permissions, schoolId);

        if (response.isSuccess()) emailVerificationRepository.deleteByEmail(email);
        return response.isSuccess()
                ? ResponseEntity.status(201).body(response)
                : ResponseEntity.badRequest().body(response);
    }

    // ── GET /api/superadmin/super-admins ──────────────────────────────────────
    // Only the platform Application Owner (schoolId=null) may list super admins.
    @GetMapping("/super-admins")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSuperAdmins(Authentication auth) {
        Long callerSchoolId = getCurrentSchoolId(auth);
        if (callerSchoolId != null)
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Only the Application Owner can view Super Admin accounts."));
        return ResponseEntity.ok(superAdminService.getSuperAdmins());
    }

    // ── POST /api/superadmin/super-admins ─────────────────────────────────────
    // Only the platform Application Owner (schoolId=null) may create super admins.
    // Creates a stub school linked to the new super admin (isSetupCompleted=false).
    @PostMapping("/super-admins")
    public ResponseEntity<ApiResponse<AdminCreatedResponse>> createSuperAdmin(
            @RequestBody Map<String, Object> body, Authentication auth) {

        String name        = strVal(body, "name");
        String email       = strVal(body, "email");
        String mobile      = strVal(body, "mobile");
        String schoolName  = strVal(body, "schoolName");
        String schoolCode  = strVal(body, "schoolCode");
        String permissions = body.get("permissions") != null ? body.get("permissions").toString() : null;
        Integer schoolNumber = intVal(body, "schoolId");

        if (name.isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("Name is required"));
        if (!EMAIL_PATTERN.matcher(email).matches())
            return ResponseEntity.badRequest().body(ApiResponse.error("Valid email is required"));
        if (!emailVerificationRepository.existsByEmailAndVerifiedTrue(email))
            return ResponseEntity.badRequest().body(ApiResponse.error("Email must be verified with OTP before creating an account."));
        if (schoolName.isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("School name is required"));
        if (schoolCode.isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("School code is required"));
        if (schoolNumber == null || schoolNumber < 1)
            return ResponseEntity.badRequest().body(ApiResponse.error("School ID is required and must be a positive number"));

        Long callerSchoolId = getCurrentSchoolId(auth);
        ApiResponse<AdminCreatedResponse> response = superAdminService.createSuperAdmin(
                name, email, mobile.isEmpty() ? null : mobile,
                schoolName, schoolCode, permissions, schoolNumber, callerSchoolId);

        if (response.isSuccess()) emailVerificationRepository.deleteByEmail(email);
        return response.isSuccess()
                ? ResponseEntity.status(201).body(response)
                : ResponseEntity.badRequest().body(response);
    }

    // ── DELETE /api/superadmin/super-admins/{id} ──────────────────────────────
    // Only APPLICATION_OWNER (schoolId == null) may delete SUPER_ADMIN accounts.
    @DeleteMapping("/super-admins/{id}")
    public ResponseEntity<ApiResponse<String>> deleteSuperAdmin(
            @PathVariable Long id, Authentication auth) {
        Long callerSchoolId = getCurrentSchoolId(auth);
        if (callerSchoolId != null)
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Only the Application Owner can delete Super Admin accounts."));
        ApiResponse<String> response = superAdminService.deleteSuperAdmin(id);
        return response.isSuccess()
                ? ResponseEntity.ok(response)
                : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/admins/{id}")
    public ResponseEntity<ApiResponse<User>> updateAdmin(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        String  name        = (String)  body.get("name");
        String  mobile      = (String)  body.get("mobile");
        Boolean isActive    = body.get("isActive") instanceof Boolean ? (Boolean) body.get("isActive") : null;
        String  permissions = body.get("permissions") instanceof String ? (String) body.get("permissions") : null;

        Long callerSchoolId = getCurrentSchoolId(auth);
        ApiResponse<User> response = superAdminService.updateAdmin(id, name, mobile, isActive, permissions, callerSchoolId);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.status(403).body(response);
    }

    @DeleteMapping("/admins/{id}")
    public ResponseEntity<ApiResponse<String>> deleteAdmin(@PathVariable Long id, Authentication auth) {
        Long callerSchoolId = getCurrentSchoolId(auth);
        ApiResponse<String> response = superAdminService.deleteAdmin(id, callerSchoolId);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.status(403).body(response);
    }

    /** Suspend a school: blocks all logins, data preserved. APPLICATION_OWNER only. */
    @PutMapping("/schools/{id}/suspend")
    @PreAuthorize("hasRole('APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<String>> suspendSchool(@PathVariable Long id) {
        ApiResponse<String> response = superAdminService.suspendSchool(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    /** Reactivate a suspended school with a new expiry date. APPLICATION_OWNER only. */
    @PutMapping("/schools/{id}/reactivate")
    @PreAuthorize("hasRole('APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<String>> reactivateSchool(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String expiryStr = body.get("expiryDate") != null ? body.get("expiryDate").toString() : null;
        java.time.LocalDate newExpiry;
        if (expiryStr != null && !expiryStr.isBlank()) {
            try {
                newExpiry = java.time.LocalDate.parse(expiryStr);
            } catch (java.time.format.DateTimeParseException e) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Invalid date format. Use YYYY-MM-DD."));
            }
            if (!newExpiry.isAfter(java.time.LocalDate.now())) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Expiry date must be in the future."));
            }
        } else {
            newExpiry = java.time.LocalDate.now().plusYears(1);
        }
        ApiResponse<String> response = superAdminService.reactivateSchool(id, newExpiry);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    /** Permanently delete a school and ALL its data. APPLICATION_OWNER only. */
    @DeleteMapping("/schools/{id}")
    @PreAuthorize("hasRole('APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<String>> deleteSchool(@PathVariable Long id) {
        ApiResponse<String> response = superAdminService.deleteSchool(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }
}
