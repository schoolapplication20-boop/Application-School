package com.schoolers.controller;

import com.schoolers.dto.*;
import com.schoolers.model.ImportLog;
import com.schoolers.model.User;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.BulkImportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/students/bulk-import")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class BulkImportController {

    @Autowired private BulkImportService bulkImportService;
    @Autowired private UserRepository    userRepo;

    /**
     * Starts an async import job and returns immediately with the jobId.
     * The frontend polls GET /jobs/{jobId} for live progress and the final result.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> startImport(
            @RequestBody BulkImportRequest request,
            Authentication auth) {

        User admin = userRepo.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        if (request.getRows() == null || request.getRows().isEmpty())
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("No rows provided for import"));

        if (request.getRows().size() > 5000)
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Maximum 5000 rows allowed per import"));

        Long jobId = bulkImportService.startImport(
                request, admin.getSchoolId(), admin.getId(), admin.getName());

        return ResponseEntity.ok(ApiResponse.success("Import started",
                Map.of("jobId", jobId, "totalRows", request.getRows().size(), "status", "PROCESSING")));
    }

    /**
     * Polls the status of an async import job.
     * Returns ImportLog which includes processedRows/totalRows for the progress bar,
     * and credentialsJson once the job reaches COMPLETED or PARTIAL status.
     */
    @GetMapping("/jobs/{id}")
    public ResponseEntity<ApiResponse<ImportLog>> getJobStatus(
            @PathVariable Long id, Authentication auth) {
        User admin = userRepo.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        ImportLog job = bulkImportService.getJobStatus(id, admin.getSchoolId());
        return ResponseEntity.ok(ApiResponse.success("OK", job));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<ImportLog>>> getHistory(Authentication auth) {
        User admin = userRepo.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        List<ImportLog> history = bulkImportService.getHistory(admin.getSchoolId());
        return ResponseEntity.ok(ApiResponse.success("OK", history));
    }

    @GetMapping("/{id}/failed")
    public ResponseEntity<ApiResponse<List<FailedRowDto>>> getFailedRows(
            @PathVariable Long id, Authentication auth) {
        User admin = userRepo.findByEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        List<FailedRowDto> rows = bulkImportService.getFailedRows(id, admin.getSchoolId());
        return ResponseEntity.ok(ApiResponse.success("OK", rows));
    }
}
