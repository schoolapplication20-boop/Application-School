package com.schoolers.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.dto.ApiResponse;
import com.schoolers.service.SchoolService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/schools")
public class SchoolController {

    @Autowired private SchoolService schoolService;
    @Autowired private ObjectMapper  objectMapper;

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
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to create school: " + e.getMessage()));
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
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
        return ResponseEntity.ok(schoolService.getSchoolByAdminEmail(auth.getName()));
    }

    // ── GET /api/schools/{id} ─────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSchoolById(@PathVariable Long id) {
        return ResponseEntity.ok(schoolService.getSchoolById(id));
    }

    // ── PUT /api/schools/{id} ─────────────────────────────────────────────────
    // Logo upload done here (outside @Transactional) to prevent IOException from
    // poisoning the JPA transaction with rollback-only status.
    // ADMIN must NOT update school settings — only SUPER_ADMIN (their own school)
    // and APPLICATION_OWNER (any school) are allowed.
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateSchool(
            @PathVariable Long id,
            @RequestPart("data") String dataJson,
            @RequestPart(value = "logo", required = false) MultipartFile logo,
            Authentication auth) {
        try {
            Map<String, Object> data = objectMapper.readValue(dataJson,
                    new TypeReference<Map<String, Object>>() {});

            String newLogoUrl = null;
            String oldLogoUrl = null;
            if (logo != null && !logo.isEmpty()) {
                // Fetch old logo URL ONLY when a replacement is being uploaded,
                // so we can clean up the old file after a successful save.
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
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to update school: " + e.getMessage()));
        }
    }

    // ── PATCH /api/schools/{id}/logo ──────────────────────────────────────────
    @PatchMapping(value = "/{id}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateLogo(
            @PathVariable Long id,
            @RequestPart("logo") MultipartFile logo) {
        try {
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
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Logo update failed: " + e.getMessage()));
        }
    }
}
