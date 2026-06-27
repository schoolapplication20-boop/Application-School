package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.CreateTeacherRequest;
import com.schoolers.model.*;
import com.schoolers.repository.EmailVerificationRepository;
import com.schoolers.repository.IdempotencyKeyRepository;
import com.schoolers.repository.SchoolDiaryConfigRepository;
import com.schoolers.repository.SchoolPrivacyConfigRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class AdminController {

    @Autowired private AdminService adminService;
    @Autowired private UserRepository userRepository;
    @Autowired private IdempotencyKeyRepository idempotencyKeyRepository;
    @Autowired private EmailVerificationRepository emailVerificationRepository;
    @Autowired private com.schoolers.repository.StudentFeeAssignmentRepository feeAssignmentRepository;
    @Autowired private com.schoolers.repository.SchoolRepository schoolRepository;
    @Autowired private SchoolDiaryConfigRepository schoolDiaryConfigRepository;
    @Autowired private SchoolPrivacyConfigRepository schoolPrivacyConfigRepository;
    @Autowired private com.schoolers.repository.SchoolAuthConfigRepository schoolAuthConfigRepository;

    private static final java.util.regex.Pattern EMAIL_RE =
            java.util.regex.Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    /**
     * Extracts the schoolId embedded in the JWT claims (stored in auth details by JwtFilter).
     * Falls back to a DB lookup only when the details map is absent (e.g., tests / mock auth).
     */
    @SuppressWarnings("unchecked")
    private Long getCurrentSchoolId(Authentication auth) {
        if (auth == null) return null;
        if (auth.getDetails() instanceof java.util.Map) {
            Object v = ((java.util.Map<?, ?>) auth.getDetails()).get("schoolId");
            if (v != null) {
                if (v instanceof Long) return (Long) v;
                try {
                    return Long.parseLong(v.toString());
                } catch (NumberFormatException e) {
                    return null;
                }
            }
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(com.schoolers.model.User::getSchoolId)
                .orElse(null);
    }

    private Long getCurrentUserId(Authentication auth) {
        if (auth == null) return null;
        if (auth.getDetails() instanceof java.util.Map) {
            Object v = ((java.util.Map<?, ?>) auth.getDetails()).get("userId");
            if (v != null) {
                if (v instanceof Long) return (Long) v;
                try { return Long.parseLong(v.toString()); } catch (NumberFormatException e) { /* fall through */ }
            }
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(com.schoolers.model.User::getId)
                .orElse(null);
    }

    /**
     * Returns true (and short-circuits the caller) when the Idempotency-Key header was already processed.
     * If the key is new, saves it and returns false so the caller can proceed.
     */
    private boolean isDuplicate(HttpServletRequest request, Long schoolId, String endpoint, ResponseEntity<?>[] out) {
        String key = request.getHeader("Idempotency-Key");
        if (key == null || key.isBlank()) return false;
        if (idempotencyKeyRepository.existsByKeyAndSchoolId(key, schoolId)) {
            out[0] = ResponseEntity.ok(ApiResponse.success("Already processed", null));
            return true;
        }
        try {
            idempotencyKeyRepository.save(IdempotencyKey.builder()
                    .key(key).schoolId(schoolId).endpoint(endpoint).build());
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Concurrent request already saved this key — treat as duplicate
            out[0] = ResponseEntity.ok(ApiResponse.success("Already processed", null));
            return true;
        }
        return false;
    }

    // ===== Permissions =====
    @GetMapping("/permissions")
    public ResponseEntity<ApiResponse<String>> getPermissions() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        return userRepository.findByEmailIgnoreCase(email)
                .map(user -> ResponseEntity.ok(ApiResponse.success("Permissions retrieved", user.getPermissions())))
                .orElse(ResponseEntity.status(404).body(ApiResponse.error("User not found")));
    }

    // ===== Dashboard =====
    @GetMapping("/dashboard/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats(Authentication auth) {
        return ResponseEntity.ok(adminService.getDashboardStats(getCurrentSchoolId(auth)));
    }

    // ===== Students =====
    @GetMapping("/students")
    public ResponseEntity<ApiResponse<Page<Student>>> getStudents(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String className,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200);
        return ResponseEntity.ok(adminService.getStudents(getCurrentSchoolId(auth), search, className, status, safePage, safeSize));
    }

    @GetMapping("/students/{id}")
    public ResponseEntity<ApiResponse<Student>> getStudentById(@PathVariable Long id, Authentication auth) {
        ApiResponse<Student> response = adminService.getStudentById(id, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @PostMapping("/students")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createStudent(
            @RequestBody Map<String, Object> body, Authentication auth) {
        // If a real studentEmail was provided, it must have been OTP-verified
        Object rawEmail = body.get("studentEmail");
        if (rawEmail != null && !rawEmail.toString().isBlank()) {
            String email = rawEmail.toString().trim().toLowerCase();
            if (!EMAIL_RE.matcher(email).matches())
                return ResponseEntity.badRequest().body(ApiResponse.error("Invalid student email address."));
            if (!emailVerificationRepository.existsByEmailAndVerifiedTrue(email))
                return ResponseEntity.badRequest().body(ApiResponse.error("Student email must be verified with OTP before creating the account."));
        }
        body.put("schoolId", getCurrentSchoolId(auth));
        ApiResponse<Map<String, Object>> response = adminService.createStudent(body);
        if (response.isSuccess() && rawEmail != null && !rawEmail.toString().isBlank())
            emailVerificationRepository.deleteByEmail(rawEmail.toString().trim().toLowerCase());
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/students/{id}")
    public ResponseEntity<ApiResponse<Student>> updateStudent(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        ApiResponse<Student> response = adminService.updateStudent(id, body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/students/{id}")
    public ResponseEntity<ApiResponse<String>> deleteStudent(@PathVariable Long id, Authentication auth) {
        ApiResponse<String> response = adminService.deleteStudent(id, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    /** Creates a login account for a student that was imported without an email. */
    @PostMapping("/students/{id}/onboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> onboardStudent(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String email = body.get("email");
        ApiResponse<Map<String, Object>> res = adminService.onboardStudentAccount(id, email, getCurrentSchoolId(auth));
        return res.isSuccess() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
    }

    // ── Grade Scales ──────────────────────────────────────────────────────────
    @GetMapping("/grade-scales")
    public ResponseEntity<ApiResponse<List<com.schoolers.model.GradeScale>>> getGradeScales(Authentication auth) {
        return ResponseEntity.ok(adminService.getGradeScales(getCurrentSchoolId(auth)));
    }

    @PostMapping("/grade-scales")
    public ResponseEntity<ApiResponse<List<com.schoolers.model.GradeScale>>> saveGradeScales(
            @RequestBody List<Map<String, Object>> items, Authentication auth) {
        ApiResponse<List<com.schoolers.model.GradeScale>> response =
                adminService.saveGradeScales(getCurrentSchoolId(auth), items);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PostMapping("/year-rollover")
    public ResponseEntity<ApiResponse<Map<String, Object>>> yearRollover(
            @RequestBody Map<String, Object> body, Authentication auth) {
        String newYear       = body.get("newAcademicYear") != null ? body.get("newAcademicYear").toString().trim() : null;
        boolean copyFees     = Boolean.TRUE.equals(body.get("copyFeeStructures"));
        if (newYear == null || newYear.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("newAcademicYear is required."));
        ApiResponse<Map<String, Object>> response =
                adminService.yearRollover(getCurrentSchoolId(auth), newYear, copyFees);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PostMapping("/students/promote")
    public ResponseEntity<ApiResponse<Map<String, Object>>> promoteStudents(
            @RequestBody Map<String, Object> body, Authentication auth) {
        String fromClass   = body.get("fromClass")   != null ? body.get("fromClass").toString().trim()   : "";
        String fromSection = body.get("fromSection") != null ? body.get("fromSection").toString().trim() : "";
        String toClass     = body.get("toClass")     != null ? body.get("toClass").toString().trim()     : "";
        String toSection   = body.get("toSection")   != null ? body.get("toSection").toString().trim()   : "";
        ApiResponse<Map<String, Object>> response =
                adminService.promoteStudents(getCurrentSchoolId(auth), fromClass, fromSection, toClass, toSection);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/students/{id}/credentials")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStudentCredentials(@PathVariable Long id, Authentication auth) {
        ApiResponse<Map<String, Object>> response = adminService.getStudentCredentials(id, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    /** Bulk download — credentials for all students who haven't changed their temp password yet. */
    @GetMapping("/students/credentials/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> getPendingStudentCredentials(Authentication auth) {
        return ResponseEntity.ok(adminService.getPendingStudentCredentials(getCurrentSchoolId(auth)));
    }

    /** Reset a single student's password — generates a new temp password, updates the BCrypt hash,
     *  clears lockout, sets firstLogin=true. Returns the new credentials immediately. */
    @PostMapping("/students/{id}/reset-password")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> resetStudentPassword(@PathVariable Long id, Authentication auth) {
        var response = adminService.resetStudentPassword(id, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    // ===== Teachers =====
    @GetMapping("/teachers")
    public ResponseEntity<?> getTeachers(Authentication auth) {
        return ResponseEntity.ok(adminService.getTeachers(getCurrentSchoolId(auth)));
    }

    @GetMapping("/teachers/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeacherById(@PathVariable Long id, Authentication auth) {
        ApiResponse<Map<String, Object>> response = adminService.getTeacherById(id, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @PostMapping("/teachers")
    public ResponseEntity<?> createTeacher(@RequestBody CreateTeacherRequest req, Authentication auth) {
        String email = req.getEmail() != null ? req.getEmail().trim().toLowerCase() : "";
        if (email.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Teacher email is required."));
        if (!emailVerificationRepository.existsByEmailAndVerifiedTrue(email))
            return ResponseEntity.badRequest().body(ApiResponse.error("Teacher email must be verified with OTP before creating the account."));
        req.setSchoolId(getCurrentSchoolId(auth));
        var response = adminService.createTeacher(req);
        if (response.isSuccess()) emailVerificationRepository.deleteByEmail(email);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/teachers/{id}")
    public ResponseEntity<ApiResponse<Teacher>> updateTeacher(@PathVariable Long id, @RequestBody CreateTeacherRequest req, Authentication auth) {
        req.setSchoolId(getCurrentSchoolId(auth));
        ApiResponse<Teacher> response = adminService.updateTeacher(id, req);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/teachers/{id}/reset-password")
    public ResponseEntity<ApiResponse<String>> resetTeacherPassword(
            @PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        String newPassword = body.get("password");
        if (newPassword == null || newPassword.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("New password is required"));
        ApiResponse<String> response = adminService.resetTeacherPassword(id, newPassword, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/students/{id}/reset-password")
    public ResponseEntity<ApiResponse<String>> resetStudentPassword(
            @PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        String newPassword = body.get("password");
        if (newPassword == null || newPassword.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("New password is required"));
        ApiResponse<String> response = adminService.resetStudentPassword(id, newPassword, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/teachers/{id}")
    public ResponseEntity<ApiResponse<String>> deleteTeacher(@PathVariable Long id, Authentication auth) {
        ApiResponse<String> response = adminService.deleteTeacher(id, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ===== Classes =====
    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getClasses(Authentication auth) {
        return ResponseEntity.ok(adminService.getClasses(getCurrentSchoolId(auth)));
    }

    @GetMapping("/classes/capacity-check")
    public ResponseEntity<?> getClassCapacityInfo(
            @RequestParam String className,
            @RequestParam(required = false, defaultValue = "") String section,
            Authentication auth) {
        var response = adminService.getClassCapacityInfo(className, section, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PostMapping("/classes")
    public ResponseEntity<ApiResponse<ClassRoom>> createClass(@RequestBody ClassRoom classRoom, Authentication auth) {
        return ResponseEntity.status(201).body(adminService.createClass(classRoom, getCurrentSchoolId(auth)));
    }

    @PutMapping("/classes/{id}")
    public ResponseEntity<?> updateClass(@PathVariable Long id, @RequestBody ClassRoom classRoom, Authentication auth) {
        ApiResponse<ClassRoom> response = adminService.updateClass(id, classRoom, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/classes/{id}")
    public ResponseEntity<?> deleteClass(@PathVariable Long id, Authentication auth) {
        ApiResponse<String> response = adminService.deleteClass(id, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ===== Fees =====
    @GetMapping("/fees")
    public ResponseEntity<ApiResponse<List<Fee>>> getFees(Authentication auth) {
        return ResponseEntity.ok(adminService.getFees(getCurrentSchoolId(auth)));
    }

    @GetMapping("/fees/student/{studentId}")
    public ResponseEntity<ApiResponse<List<Fee>>> getFeesByStudent(@PathVariable Long studentId, Authentication auth) {
        return ResponseEntity.ok(adminService.getStudentFees(studentId, getCurrentSchoolId(auth)));
    }

    @GetMapping("/fees/student/{studentId}/payments")
    public ResponseEntity<ApiResponse<List<FeePayment>>> getFeePaymentsByStudent(@PathVariable Long studentId, Authentication auth) {
        return ResponseEntity.ok(adminService.getStudentFeePayments(studentId, getCurrentSchoolId(auth)));
    }

    @PostMapping("/fees/{id}/collect")
    public ResponseEntity<?> collectCashFee(@PathVariable Long id, @RequestBody Map<String, Object> body,
            Authentication auth, HttpServletRequest request) {
        Long schoolId = getCurrentSchoolId(auth);
        ResponseEntity<?>[] out = new ResponseEntity[1];
        if (isDuplicate(request, schoolId, "/fees/" + id + "/collect", out)) return out[0];
        ApiResponse<Fee> response = adminService.collectCashFee(id, body, schoolId);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/students/search")
    public ResponseEntity<?> searchStudentsForFee(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String className,
            @RequestParam(required = false) String section,
            Authentication auth) {
        return ResponseEntity.ok(adminService.searchStudentsForFee(getCurrentSchoolId(auth), q, className, section));
    }

    @PostMapping("/fees")
    public ResponseEntity<ApiResponse<Fee>> createFee(@RequestBody Fee fee, Authentication auth) {
        fee.setSchoolId(getCurrentSchoolId(auth));
        return ResponseEntity.status(201).body(adminService.createFee(fee));
    }

    @PutMapping("/fees/{id}")
    public ResponseEntity<?> updateFee(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        ApiResponse<Fee> response = adminService.updateFee(id, body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/fees/{id}")
    public ResponseEntity<ApiResponse<String>> deleteFee(@PathVariable Long id, Authentication auth) {
        ApiResponse<String> response = adminService.deleteFee(id, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ===== Class Fee Structure =====
    @GetMapping("/class-fees")
    public ResponseEntity<?> getClassFeeStructures(Authentication auth) {
        return ResponseEntity.ok(adminService.getClassFeeStructures(getCurrentSchoolId(auth)));
    }

    @PostMapping("/class-fees")
    public ResponseEntity<?> saveClassFeeStructure(@RequestBody Map<String, Object> body, Authentication auth) {
        body.put("schoolId", getCurrentSchoolId(auth));
        var response = adminService.saveClassFeeStructure(body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/class-fees/{id}")
    public ResponseEntity<?> deleteClassFeeStructure(@PathVariable Long id, Authentication auth) {
        var response = adminService.deleteClassFeeStructure(id, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    /** Year-wise fee summary for the calling school — accessible to ADMIN and SUPER_ADMIN. */
    @GetMapping("/fee-summary")
    public ResponseEntity<?> getSchoolFeeSummary(Authentication auth) {
        Long schoolId = getCurrentSchoolId(auth);
        if (schoolId == null) return ResponseEntity.status(403).body(com.schoolers.dto.ApiResponse.error("School not found."));

        // Try DB PK first; if empty try display school_id (handles both migration states)
        java.util.List<Object[]> rows = feeAssignmentRepository.feeSummaryByYear(schoolId);
        if (rows.isEmpty()) {
            com.schoolers.model.School school = schoolRepository.findById(schoolId)
                    .orElseGet(() -> schoolRepository.findBySchoolId(schoolId.intValue()).orElse(null));
            if (school != null && school.getSchoolId() != null && !school.getId().equals(school.getSchoolId().longValue())) {
                rows = feeAssignmentRepository.feeSummaryByYear(school.getSchoolId().longValue());
            }
        }

        java.util.List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        java.math.BigDecimal grandTotal   = java.math.BigDecimal.ZERO;
        java.math.BigDecimal grandPaid    = java.math.BigDecimal.ZERO;
        java.math.BigDecimal grandPending = java.math.BigDecimal.ZERO;

        for (Object[] row : rows) {
            java.math.BigDecimal total   = row[1] != null ? (java.math.BigDecimal) row[1] : java.math.BigDecimal.ZERO;
            java.math.BigDecimal paid    = row[2] != null ? (java.math.BigDecimal) row[2] : java.math.BigDecimal.ZERO;
            java.math.BigDecimal pending = total.subtract(paid).max(java.math.BigDecimal.ZERO);
            grandTotal   = grandTotal.add(total);
            grandPaid    = grandPaid.add(paid);
            grandPending = grandPending.add(pending);

            java.util.Map<String, Object> item = new java.util.LinkedHashMap<>();
            item.put("year",          row[0]);
            item.put("totalFee",      total);
            item.put("paidAmount",    paid);
            item.put("pendingAmount", pending);
            item.put("studentCount",  row[3]);
            result.add(item);
        }

        // Billing info — price per user set by the platform owner
        com.schoolers.model.School school = schoolRepository.findById(schoolId)
                .orElseGet(() -> schoolRepository.findBySchoolId(schoolId.intValue()).orElse(null));
        long activeUsers  = school != null ? userRepository.countBySchoolIdAndIsActive(school.getId(), true) : 0L;
        java.math.BigDecimal pricePerUser  = school != null ? school.getPricePerUser() : null;
        java.math.BigDecimal billingTotal  = (pricePerUser != null)
                ? pricePerUser.multiply(java.math.BigDecimal.valueOf(activeUsers))
                : null;

        java.util.Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("years",        result);
        response.put("grandTotal",   grandTotal);
        response.put("grandPaid",    grandPaid);
        response.put("grandPending", grandPending);
        response.put("pricePerUser",  pricePerUser);
        response.put("activeUsers",   activeUsers);
        response.put("billingTotal",  billingTotal);
        return ResponseEntity.ok(com.schoolers.dto.ApiResponse.success(response));
    }

    // ===== Student Fee Assignments =====
    @GetMapping("/student-fee-assignments")
    public ResponseEntity<?> getAllStudentFeeAssignments(Authentication auth) {
        return ResponseEntity.ok(adminService.getAllStudentFeeAssignments(getCurrentSchoolId(auth)));
    }

    @GetMapping("/student-fee-assignments/student/{studentId}")
    public ResponseEntity<?> getStudentFeeAssignment(@PathVariable Long studentId, Authentication auth) {
        var response = adminService.getStudentFeeAssignment(studentId, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.status(404).body(response);
    }

    @GetMapping("/student-fee-assignments/{assignmentId}/payments")
    public ResponseEntity<?> getAssignmentPayments(@PathVariable Long assignmentId, Authentication auth) {
        return ResponseEntity.ok(adminService.getAssignmentPayments(assignmentId, getCurrentSchoolId(auth)));
    }

    @GetMapping("/fee-payments")
    public ResponseEntity<?> getAllFeePayments(Authentication auth) {
        return ResponseEntity.ok(adminService.getAllFeePayments(getCurrentSchoolId(auth)));
    }

    @DeleteMapping("/student-fee-assignments/{id}")
    public ResponseEntity<?> deleteStudentFeeAssignment(@PathVariable Long id, Authentication auth) {
        var response = adminService.deleteStudentFeeAssignment(id, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PostMapping("/student-fee-assignments")
    public ResponseEntity<?> assignStudentFee(@RequestBody Map<String, Object> body, Authentication auth) {
        body.put("schoolId", getCurrentSchoolId(auth));
        var response = adminService.assignStudentFee(body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PostMapping("/student-fee-assignments/{assignmentId}/collect")
    public ResponseEntity<?> collectAssignmentFee(@PathVariable Long assignmentId, @RequestBody Map<String, Object> body,
            Authentication auth, HttpServletRequest request) {
        Long schoolId = getCurrentSchoolId(auth);
        ResponseEntity<?>[] out = new ResponseEntity[1];
        if (isDuplicate(request, schoolId, "/student-fee-assignments/" + assignmentId + "/collect", out)) return out[0];
        var response = adminService.collectAssignmentFee(assignmentId, body, schoolId);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    // ===== Fee Installments =====

    @GetMapping("/student-fee-assignments/{assignmentId}/installments")
    public ResponseEntity<?> getInstallments(@PathVariable Long assignmentId, Authentication auth) {
        return ResponseEntity.ok(adminService.getInstallments(assignmentId, getCurrentSchoolId(auth)));
    }

    @PostMapping("/fee-installments/{installmentId}/pay")
    public ResponseEntity<?> collectInstallmentFee(
            @PathVariable Long installmentId,
            @RequestBody Map<String, Object> body,
            Authentication auth,
            HttpServletRequest request) {
        Long schoolId = getCurrentSchoolId(auth);
        ResponseEntity<?>[] out = new ResponseEntity[1];
        if (isDuplicate(request, schoolId, "/fee-installments/" + installmentId + "/pay", out)) return out[0];
        // Inject receivedBy from JWT if caller didn't supply it
        if (body.get("receivedBy") == null || body.get("receivedBy").toString().isBlank()) {
            body.put("receivedBy", auth != null ? auth.getName() : "Admin");
        }
        var response = adminService.collectInstallmentFee(installmentId, body, schoolId);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    // ===== Expenses =====
    @GetMapping("/expenses")
    public ResponseEntity<ApiResponse<List<Expense>>> getExpenses(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String search,
            Authentication auth) {
        return ResponseEntity.ok(adminService.getExpenses(getCurrentSchoolId(auth), status, dateFrom, dateTo, search));
    }

    @GetMapping("/expenses/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getExpenseSummary(Authentication auth) {
        return ResponseEntity.ok(adminService.getExpenseSummary(getCurrentSchoolId(auth)));
    }

    @PostMapping("/expenses")
    public ResponseEntity<ApiResponse<Expense>> createExpense(@RequestBody Map<String, Object> body, Authentication auth) {
        body.put("schoolId", getCurrentSchoolId(auth));
        body.put("addedById", getCurrentUserId(auth));
        ApiResponse<Expense> response = adminService.createExpense(body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/expenses/{id}")
    public ResponseEntity<?> updateExpense(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        body.put("schoolId", getCurrentSchoolId(auth));
        ApiResponse<Expense> response = adminService.updateExpense(id, body, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/expenses/{id}")
    public ResponseEntity<ApiResponse<String>> deleteExpense(@PathVariable Long id, Authentication auth) {
        ApiResponse<String> response = adminService.deleteExpense(id, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ===== Attendance Summary =====

    /** Class-wise attendance summary for all active classes on a given date */
    @GetMapping("/attendance/summary")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getClassAttendanceSummaries(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication auth) {
        if (date == null) date = LocalDate.now();
        return ResponseEntity.ok(adminService.getClassAttendanceSummaries(date, getCurrentSchoolId(auth)));
    }

    /** Attendance summary for a specific teacher's primary class */
    @GetMapping("/teachers/{id}/attendance-summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeacherAttendanceSummary(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication auth) {
        if (date == null) date = LocalDate.now();
        ApiResponse<Map<String, Object>> response = adminService.getTeacherAttendanceSummary(id, date, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/attendance/classes/{classId}/details")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getClassAttendanceDetails(
            @PathVariable Long classId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            Authentication auth) {
        if (date == null) date = LocalDate.now();
        ApiResponse<Map<String, Object>> response = adminService.getClassAttendanceDetails(classId, date, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    // ===== Auth Config =====

    @GetMapping("/auth-config")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','APPLICATION_OWNER')")
    public ResponseEntity<?> getAuthConfig(Authentication auth) {
        Long schoolId = getCurrentSchoolId(auth);
        SchoolAuthConfig config = schoolAuthConfigRepository.findBySchoolId(schoolId)
            .orElseGet(() -> { SchoolAuthConfig d = new SchoolAuthConfig(); d.setSchoolId(schoolId); return d; });
        return ResponseEntity.ok(ApiResponse.success("Auth config retrieved", config));
    }

    @PutMapping("/auth-config")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APPLICATION_OWNER')")
    public ResponseEntity<?> updateAuthConfig(@RequestBody SchoolAuthConfig config, Authentication auth) {
        Long schoolId = getCurrentSchoolId(auth);
        config.setSchoolId(schoolId);
        SchoolAuthConfig saved = schoolAuthConfigRepository.save(config);
        return ResponseEntity.ok(ApiResponse.success("Auth config updated", saved));
    }

    // ===== Diary Config =====

    @GetMapping("/diary-config")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','APPLICATION_OWNER')")
    public ResponseEntity<?> getDiaryConfig(Authentication auth) {
        Long schoolId = getCurrentSchoolId(auth);
        SchoolDiaryConfig cfg = schoolDiaryConfigRepository.findBySchoolId(schoolId)
            .orElseGet(() -> { SchoolDiaryConfig d = new SchoolDiaryConfig(); d.setSchoolId(schoolId); return d; });

        // Build a response map that includes both field-name variants so the frontend
        // can read either requiresApproval or requiresAdminApproval without breaking.
        java.util.Map<String, Object> resp = new java.util.LinkedHashMap<>();
        resp.put("schoolId",             cfg.getSchoolId());
        resp.put("diaryMode",            cfg.getDiaryMode());
        resp.put("coordinatorUserId",    cfg.getCoordinatorUserId());
        resp.put("requiresApproval",     cfg.getRequiresApproval());
        resp.put("requiresAdminApproval",cfg.getRequiresApproval());  // frontend alias
        resp.put("notifyStudentsPush",   cfg.getNotifyStudentsPush());
        resp.put("notifyParentsWhatsapp",cfg.getNotifyParentsWhatsapp());
        // Include coordinator name + email so the frontend can display the coordinator info card
        if (cfg.getCoordinatorUserId() != null) {
            userRepository.findById(cfg.getCoordinatorUserId()).ifPresent(u -> {
                resp.put("coordinatorEmail", u.getEmail());
                resp.put("coordinatorName",  u.getName());
            });
        }
        return ResponseEntity.ok(ApiResponse.success("Diary config", resp));
    }

    @PutMapping("/diary-config")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APPLICATION_OWNER')")
    public ResponseEntity<?> updateDiaryConfig(@RequestBody java.util.Map<String, Object> body,
                                               Authentication auth) {
        Long schoolId = getCurrentSchoolId(auth);

        // ── Diary mode ────────────────────────────────────────────────────
        String diaryMode = body.containsKey("diaryMode")
            ? (String) body.get("diaryMode") : "SUBJECT_TEACHER";

        // ── requiresApproval — accept both field-name variants ────────────
        Object approvalRaw = body.containsKey("requiresApproval")
            ? body.get("requiresApproval") : body.get("requiresAdminApproval");
        boolean requiresApproval = Boolean.TRUE.equals(approvalRaw);

        boolean notifyStudentsPush    = Boolean.TRUE.equals(body.get("notifyStudentsPush"));
        boolean notifyParentsWhatsapp = Boolean.TRUE.equals(body.get("notifyParentsWhatsapp"));

        // ── Coordinator: accept email address, resolve to user ID ───────────
        // COORDINATOR mode requires a valid email; other modes clear the field.
        Long coordinatorUserId = null;
        String coordinatorName = null;
        String coordinatorEmail = null;

        if ("COORDINATOR".equals(diaryMode)) {
            Object coordValue = body.get("coordinatorUserId");  // frontend sends email in this field
            String coordStr = (coordValue != null) ? coordValue.toString().trim() : "";

            if (coordStr.isBlank())
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Coordinator email is required when Diary Mode is School-wide Coordinator."));

            if (!coordStr.contains("@"))
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Please enter a valid email address for the coordinator."));

            var coordUser = userRepository.findByEmailIgnoreCase(coordStr).orElse(null);
            if (coordUser == null)
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("No staff/teacher found with email \"" + coordStr
                        + "\" in this school. Please check the email and try again."));

            // School isolation — coordinator must belong to the same school
            if (coordUser.getSchoolId() == null || !coordUser.getSchoolId().equals(schoolId))
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("This user does not belong to your school. "
                        + "Only staff members of this school can be assigned as coordinator."));

            coordinatorUserId = coordUser.getId();
            coordinatorName   = coordUser.getName();
            coordinatorEmail  = coordUser.getEmail();
        }

        // ── Upsert via native PostgreSQL ON CONFLICT ──────────────────────
        schoolDiaryConfigRepository.upsert(
            schoolId, diaryMode, coordinatorUserId,
            requiresApproval, notifyStudentsPush, notifyParentsWhatsapp);

        // Return coordinator info so the frontend can display it immediately
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("diaryMode", diaryMode);
        if (coordinatorUserId != null) {
            result.put("coordinatorUserId", coordinatorUserId);
            result.put("coordinatorName",   coordinatorName);
            result.put("coordinatorEmail",  coordinatorEmail);
        }
        String successMsg = "COORDINATOR".equals(diaryMode) && coordinatorName != null
            ? "School-wide coordinator assigned to " + coordinatorName + " successfully."
            : "Diary configuration saved successfully.";
        return ResponseEntity.ok(ApiResponse.success(successMsg, result));
    }

    // ===== Privacy Config =====

    @GetMapping("/privacy-config")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','APPLICATION_OWNER')")
    public ResponseEntity<?> getPrivacyConfig(Authentication auth) {
        Long schoolId = getCurrentSchoolId(auth);
        com.schoolers.model.SchoolPrivacyConfig cfg = schoolPrivacyConfigRepository.findBySchoolId(schoolId)
            .orElseGet(() -> {
                com.schoolers.model.SchoolPrivacyConfig d = new com.schoolers.model.SchoolPrivacyConfig();
                d.setSchoolId(schoolId);
                return d;
            });
        return ResponseEntity.ok(ApiResponse.success("Privacy config", cfg));
    }

    @PutMapping("/privacy-config")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','APPLICATION_OWNER')")
    public ResponseEntity<?> updatePrivacyConfig(
            @RequestBody com.schoolers.model.SchoolPrivacyConfig config, Authentication auth) {
        Long schoolId = getCurrentSchoolId(auth);
        config.setSchoolId(schoolId);
        com.schoolers.model.SchoolPrivacyConfig saved = schoolPrivacyConfigRepository.save(config);
        return ResponseEntity.ok(ApiResponse.success("Privacy config updated", saved));
    }

}
