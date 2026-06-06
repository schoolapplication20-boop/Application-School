package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.IssueReport;
import com.schoolers.model.School;
import com.schoolers.model.User;
import com.schoolers.repository.IssueReportRepository;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/issues")
public class IssueReportController {

    @Autowired private IssueReportRepository issueReportRepository;
    @Autowired private UserRepository         userRepository;
    @Autowired private SchoolRepository       schoolRepository;
    @Autowired private EmailService           emailService;

    // ── Submit an issue — any authenticated user ──────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<IssueReport>> reportIssue(
            @RequestBody Map<String, Object> body,
            Authentication auth) {

        String title       = getString(body, "title");
        String description = getString(body, "description");
        String category    = getString(body, "category", "BUG");
        String priority    = getString(body, "priority", "MEDIUM");

        if (title == null || title.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Title is required."));
        if (description == null || description.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Description is required."));

        // Resolve reporter info from the JWT
        String reporterEmail = auth != null ? auth.getName() : null;
        String reporterName  = null;
        String reporterRole  = null;
        Long   schoolId      = null;
        String schoolName    = null;

        if (reporterEmail != null) {
            User user = userRepository.findByEmailIgnoreCase(reporterEmail).orElse(null);
            if (user != null) {
                reporterName = user.getName();
                reporterRole = user.getRole() != null ? user.getRole().name() : null;
                schoolId     = user.getSchoolId();
                if (schoolId != null) {
                    java.util.Optional<School> sc = schoolRepository.findBySchoolId(schoolId.intValue());
                    if (sc.isEmpty()) sc = schoolRepository.findById(schoolId);
                    schoolName = sc.map(School::getName).orElse(null);
                }
            }
        }

        IssueReport.Priority priorityEnum;
        try { priorityEnum = IssueReport.Priority.valueOf(priority.toUpperCase()); }
        catch (IllegalArgumentException e) { priorityEnum = IssueReport.Priority.MEDIUM; }

        IssueReport issue = IssueReport.builder()
                .title(title.trim())
                .description(description.trim())
                .category(category.toUpperCase())
                .priority(priorityEnum)
                .reporterName(reporterName)
                .reporterEmail(reporterEmail)
                .reporterRole(reporterRole)
                .schoolId(schoolId)
                .schoolName(schoolName)
                .build();

        IssueReport saved = issueReportRepository.save(issue);

        // Fire-and-forget email notification
        try {
            emailService.sendIssueReportNotification(saved);
        } catch (Exception e) {
            // non-critical — issue is already saved
        }

        return ResponseEntity.status(201).body(ApiResponse.success("Issue reported successfully. Thank you!", saved));
    }

    // ── Get all issues — APPLICATION_OWNER only ────────────────────────────────

    @GetMapping
    @PreAuthorize("hasRole('APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<List<IssueReport>>> getAllIssues(
            @RequestParam(required = false) String status) {
        List<IssueReport> issues;
        if (status != null && !status.isBlank()) {
            try {
                IssueReport.Status statusEnum = IssueReport.Status.valueOf(status.toUpperCase());
                issues = issueReportRepository.findByStatusOrderByCreatedAtDesc(statusEnum);
            } catch (IllegalArgumentException e) {
                issues = issueReportRepository.findAllByOrderByCreatedAtDesc();
            }
        } else {
            issues = issueReportRepository.findAllByOrderByCreatedAtDesc();
        }
        return ResponseEntity.ok(ApiResponse.success(issues));
    }

    // ── Update issue status / owner note — APPLICATION_OWNER only ─────────────

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<IssueReport>> updateIssue(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        IssueReport issue = issueReportRepository.findById(id).orElse(null);
        if (issue == null)
            return ResponseEntity.status(404).body(ApiResponse.error("Issue not found."));

        String status    = getString(body, "status");
        String ownerNote = getString(body, "ownerNote");

        if (status != null && !status.isBlank()) {
            try { issue.setStatus(IssueReport.Status.valueOf(status.toUpperCase())); }
            catch (IllegalArgumentException ignored) { }
        }
        if (ownerNote != null) issue.setOwnerNote(ownerNote);

        return ResponseEntity.ok(ApiResponse.success(issueReportRepository.save(issue)));
    }

    // ── Delete issue — APPLICATION_OWNER only ─────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<String>> deleteIssue(@PathVariable Long id) {
        if (!issueReportRepository.existsById(id))
            return ResponseEntity.status(404).body(ApiResponse.error("Issue not found."));
        issueReportRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Issue deleted."));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private String getString(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v != null ? v.toString().trim() : null;
    }

    private String getString(Map<String, Object> body, String key, String defaultVal) {
        String v = getString(body, key);
        return (v != null && !v.isBlank()) ? v : defaultVal;
    }
}
