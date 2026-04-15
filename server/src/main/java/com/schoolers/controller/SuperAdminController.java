package com.schoolers.controller;

import com.schoolers.dto.AdminCreatedResponse;
import com.schoolers.dto.ApiResponse;
import com.schoolers.model.User;
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
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:5173"})
public class SuperAdminController {

    private static final java.util.regex.Pattern EMAIL_PATTERN =
        java.util.regex.Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    @Autowired
    private SuperAdminService superAdminService;

    @Autowired
    private UserRepository userRepository;

    /** Resolve the school_id of the currently authenticated SUPER_ADMIN */
    private Long getCurrentSchoolId(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(User::getSchoolId)
                .orElse(null);
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

        Long schoolId = getCurrentSchoolId(auth);
        ApiResponse<AdminCreatedResponse> response =
                superAdminService.createAdmin(name, email, mobile.isEmpty() ? null : mobile, permissions, schoolId);

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
            @RequestBody Map<String, String> body, Authentication auth) {

        String name        = body.getOrDefault("name",        "").trim();
        String email       = body.getOrDefault("email",       "").trim();
        String mobile      = body.getOrDefault("mobile",      "").trim();
        String schoolName  = body.getOrDefault("schoolName",  "").trim();
        String schoolCode  = body.getOrDefault("schoolCode",  "").trim();
        String permissions = body.get("permissions");   // JSON string of module toggles

        if (name.isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("Name is required"));
        if (!EMAIL_PATTERN.matcher(email).matches())
            return ResponseEntity.badRequest().body(ApiResponse.error("Valid email is required"));
        if (schoolName.isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("School name is required"));
        if (schoolCode.isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("School code is required"));

        Long callerSchoolId = getCurrentSchoolId(auth);
        ApiResponse<AdminCreatedResponse> response = superAdminService.createSuperAdmin(
                name, email, mobile.isEmpty() ? null : mobile,
                schoolName, schoolCode, permissions, callerSchoolId);

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
}
