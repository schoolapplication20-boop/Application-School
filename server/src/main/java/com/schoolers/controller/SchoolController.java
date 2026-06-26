package com.schoolers.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.dto.ApiResponse;
import com.schoolers.model.School;
import com.schoolers.model.User;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.SchoolService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schools")
public class SchoolController {

    private static final Logger log = LoggerFactory.getLogger(SchoolController.class);

    @Autowired private SchoolService    schoolService;
    @Autowired private SchoolRepository schoolRepository;
    @Autowired private UserRepository   userRepository;
    @Autowired private ObjectMapper     objectMapper;

    // ── POST /api/schools ─────────────────────────────────────────────────────
    // SUPER_ADMIN creates their school.
    // Logo upload is intentionally done HERE (outside the @Transactional service)
    // so that an IOException from the filesystem does NOT mark the JPA transaction
    // as rollback-only — which would cause UnexpectedRollbackException on commit.
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createSchool(
            @RequestPart("data") String dataJson,
            @RequestPart(value = "logo", required = false) MultipartFile logo,
            Authentication auth) {
        try {
            Map<String, Object> data = objectMapper.readValue(dataJson,
                    new TypeReference<Map<String, Object>>() {});

            // Upload logo before starting the DB transaction
            String logoUrl = null;
            if (logo != null && !logo.isEmpty()) {
                logoUrl = schoolService.uploadLogo(logo);
            }

            String creatorEmail = auth != null ? auth.getName() : null;
            ApiResponse<Map<String, Object>> response =
                    schoolService.createSchool(data, logoUrl, creatorEmail);

            // If validation failed (duplicate code, etc.) and a logo was uploaded,
            // clean it up so we don't leave orphaned files.
            if (!response.isSuccess() && logoUrl != null) {
                schoolService.cleanupLogo(logoUrl);
            }

            return response.isSuccess()
                    ? ResponseEntity.ok(response)
                    : ResponseEntity.badRequest().body(response);

        } catch (Exception e) {
            log.error("[CreateSchool] Failed to create school", e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to create school. Please check your input and try again."));
        }
    }

    // ── GET /api/schools ──────────────────────────────────────────────────────
    // APPLICATION_OWNER: sees all schools (global view)
    // SUPER_ADMIN: can also call this (e.g. for setup wizard flows)
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllSchools() {
        return ResponseEntity.ok(schoolService.getAllSchools());
    }

    // ── GET /api/schools/by-admin ─────────────────────────────────────────────
    // Any authenticated user: fetch the school they belong to.
    @GetMapping("/by-admin")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMySchool(Authentication auth) {
        if (auth == null)
            return ResponseEntity.status(200).body(ApiResponse.error("Not authenticated"));
        return ResponseEntity.ok(schoolService.getSchoolByAdminEmail(auth.getName()));
    }

    // ── GET /api/schools/{id} ─────────────────────────────────────────────────
    // {id} = human-assigned display number (1, 2, 3…) — NOT the DB auto-generated PK.
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APPLICATION_OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSchoolById(@PathVariable Integer id) {
        return ResponseEntity.ok(schoolService.getSchoolById(id));
    }

    // ── PUT /api/schools/{id} ─────────────────────────────────────────────────
    // {id} = human-assigned display number (1, 2, 3…) — NOT the DB auto-generated PK.
    // Logo upload done here (outside @Transactional) to prevent IOException from
    // poisoning the JPA transaction with rollback-only status.
    // ADMIN must NOT update school settings — only SUPER_ADMIN (their own school)
    // and APPLICATION_OWNER (any school) are allowed.
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateSchool(
            @PathVariable Integer id,
            @RequestPart("data") String dataJson,
            @RequestPart(value = "logo", required = false) MultipartFile logo,
            Authentication auth) {
        try {
            Map<String, Object> data = objectMapper.readValue(dataJson,
                    new TypeReference<Map<String, Object>>() {});

            String newLogoUrl = null;
            String oldLogoUrl = null;
            if (logo != null && !logo.isEmpty()) {
                ApiResponse<Map<String, Object>> existing = schoolService.getSchoolById(id);
                if (existing.getData() != null) {
                    oldLogoUrl = (String) existing.getData().get("logoUrl");
                }
                newLogoUrl = schoolService.uploadLogo(logo);
            }

            String creatorEmail = auth != null ? auth.getName() : null;
            ApiResponse<Map<String, Object>> response =
                    schoolService.updateSchool(id, data, newLogoUrl, oldLogoUrl, creatorEmail);

            if (!response.isSuccess() && newLogoUrl != null) {
                schoolService.cleanupLogo(newLogoUrl);
            }

            return response.isSuccess()
                    ? ResponseEntity.ok(response)
                    : ResponseEntity.badRequest().body(response);

        } catch (Exception e) {
            log.error("[UpdateSchool] Failed to update school id={}", id, e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to update school. Please check your input and try again."));
        }
    }

    // ── PATCH /api/schools/{id}/active ───────────────────────────────────────
    // APPLICATION_OWNER only — enable or disable a school.
    // {id} = human-assigned display number (schools.school_id column).
    @PatchMapping("/{id}/active")
    @PreAuthorize("hasRole('APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<Void>> toggleSchoolActive(
            @PathVariable Integer id,
            @RequestParam boolean active) {

        School school = schoolRepository.findBySchoolId(id).orElse(null);
        if (school == null)
            return ResponseEntity.status(404).body(ApiResponse.error("School not found."));

        school.setIsActive(active);
        schoolRepository.save(school);
        String msg = active ? "School activated successfully." : "School deactivated. Users will see a subscription-ended message.";
        return ResponseEntity.ok(ApiResponse.success(msg, null));
    }

    // ── PATCH /api/schools/{id}/features ─────────────────────────────────────
    // APPLICATION_OWNER only — set which modules are enabled for a school.
    // {id} = human-assigned display number (schools.school_id column).
    // Body: { "students": true, "fees": false, ... }
    @PatchMapping("/{id}/features")
    @PreAuthorize("hasRole('APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<Void>> updateSchoolFeatures(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> features) {

        School school = schoolRepository.findBySchoolId(id).orElse(null);
        if (school == null)
            return ResponseEntity.status(404).body(ApiResponse.error("School not found."));

        try {
            school.setFeatures(objectMapper.writeValueAsString(features));
            schoolRepository.save(school);
            return ResponseEntity.ok(ApiResponse.success("Module settings updated.", null));
        } catch (Exception e) {
            log.error("[UpdateSchoolFeatures] Failed to save features for school id={}", id, e);
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to save module settings. Please try again."));
        }
    }

    // ── GET /api/schools/my-status ────────────────────────────────────────────
    // Any authenticated user — check whether their school is currently active.
    // APPLICATION_OWNER always returns active = true.
    @GetMapping("/my-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyStatus(Authentication auth) {
        if (auth == null)
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));

        User user = userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
        if (user == null || user.getRole() == User.Role.APPLICATION_OWNER || user.getSchoolId() == null)
            return ResponseEntity.ok(ApiResponse.success("OK", Map.of("active", true, "schoolName", "")));

        School school = schoolRepository.findBySchoolId(user.getSchoolId().intValue())
            .or(() -> schoolRepository.findById(user.getSchoolId()))
            .orElse(null);

        boolean isActive   = school == null || Boolean.TRUE.equals(school.getIsActive());
        String  schoolName = school != null ? school.getName() : "";
        return ResponseEntity.ok(ApiResponse.success("OK", Map.of("active", isActive, "schoolName", schoolName)));
    }

    // ── GET /api/schools/{id}/users ──────────────────────────────────────────
    // APPLICATION_OWNER only — list all users belonging to a school.
    // {id} = DB primary key of the school (sa.schoolDbId on the frontend).
    @GetMapping("/{id}/users")
    @PreAuthorize("hasRole('APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSchoolUsers(@PathVariable Long id) {
        List<User> users = userRepository.findBySchoolId(id);
        List<Map<String, Object>> result = new ArrayList<>();
        for (User u : users) {
            Map<String, Object> row = new HashMap<>();
            row.put("id",       u.getId());
            row.put("name",     u.getName());
            row.put("email",    u.getEmail());
            row.put("username", u.getUsername());
            row.put("mobile",   u.getMobile());
            row.put("role",     u.getRole() != null ? u.getRole().name() : null);
            row.put("isActive", u.getIsActive());
            result.add(row);
        }
        // Sort: SUPER_ADMIN → ADMIN → TEACHER → STUDENT
        java.util.Comparator<Map<String, Object>> roleOrder = java.util.Comparator.comparingInt(m -> {
            String r = (String) m.get("role");
            if ("SUPER_ADMIN".equals(r)) return 0;
            if ("ADMIN".equals(r))       return 1;
            if ("TEACHER".equals(r))     return 2;
            if ("STUDENT".equals(r))     return 3;
            return 4;
        });
        result.sort(roleOrder);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ── PATCH /api/schools/{id}/logo ──────────────────────────────────────────
    // {id} = human-assigned display number (1, 2, 3…) — NOT the DB auto-generated PK.
    @PatchMapping(value = "/{id}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APPLICATION_OWNER','ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateLogo(
            @PathVariable Integer id,
            @RequestPart("logo") MultipartFile logo,
            Authentication auth) {
        try {
            // ADMIN must only update their own school's logo
            if (auth != null) {
                User caller = userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
                if (caller != null) {
                    String role = caller.getRole() != null ? caller.getRole().name() : "";
                    if (!"SUPER_ADMIN".equals(role) && !"APPLICATION_OWNER".equals(role)) {
                        Long callerSchoolId = caller.getSchoolId();
                        if (callerSchoolId == null || !callerSchoolId.equals(id.longValue())) {
                            return ResponseEntity.status(403).body(ApiResponse.error("Access denied"));
                        }
                    }
                }
            }
            String oldLogoUrl = schoolService.getSchoolById(id).getData() != null
                    ? (String) schoolService.getSchoolById(id).getData().get("logoUrl")
                    : null;
            String newLogoUrl = schoolService.uploadLogo(logo);
            ApiResponse<Map<String, Object>> response =
                    schoolService.updateSchool(id, Map.of(), newLogoUrl, oldLogoUrl, null);
            if (!response.isSuccess()) schoolService.cleanupLogo(newLogoUrl);
            return response.isSuccess()
                    ? ResponseEntity.ok(response)
                    : ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            log.error("[UpdateLogo] Logo update failed for school id={}", id, e);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Logo update failed. Please try again."));
        }
    }
}
