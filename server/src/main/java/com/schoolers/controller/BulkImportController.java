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

@RestController
@RequestMapping("/api/admin/students/bulk-import")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class BulkImportController {

    @Autowired private BulkImportService bulkImportService;
    @Autowired private UserRepository    userRepo;

    @PostMapping
    public ResponseEntity<ApiResponse<BulkImportResult>> importStudents(
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

        BulkImportResult result = bulkImportService.importStudents(
            request, admin.getSchoolId(), admin.getId(), admin.getName());

        String msg = result.getImportedRows() + " student(s) imported successfully";
        if (result.getFailedRows() > 0)
            msg += ", " + result.getFailedRows() + " failed";

        return ResponseEntity.ok(ApiResponse.success(msg, result));
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
