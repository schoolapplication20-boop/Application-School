package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.CreateTeacherRequest;
import com.schoolers.model.*;
import com.schoolers.repository.EmailVerificationRepository;
import com.schoolers.repository.IdempotencyKeyRepository;
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
            if (v != null) return v instanceof Long ? (Long) v : Long.parseLong(v.toString());
        }
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(com.schoolers.model.User::getSchoolId)
                .orElse(null);
    }

    private Long getCurrentUserId(Authentication auth) {
        if (auth == null) return null;
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
        idempotencyKeyRepository.save(IdempotencyKey.builder()
                .key(key).schoolId(schoolId).endpoint(endpoint).build());
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
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 200); // cap at 200 per page
        return ResponseEntity.ok(adminService.getStudents(getCurrentSchoolId(auth), search, safePage, safeSize));
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
        var response = adminService.collectInstallmentFee(installmentId, body);
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

    // ===== Parents =====
    @GetMapping("/parents")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getParents(Authentication auth) {
        return ResponseEntity.ok(adminService.getParents(getCurrentSchoolId(auth)));
    }

    @PostMapping("/parents")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createParent(
            @RequestBody Map<String, Object> body, Authentication auth) {
        body.put("schoolId", getCurrentSchoolId(auth));
        ApiResponse<Map<String, Object>> response = adminService.createParent(body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/parents/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateParent(
            @PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        body.put("schoolId", getCurrentSchoolId(auth));
        ApiResponse<Map<String, Object>> response = adminService.updateParent(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/parents/{id}/reset-password")
    public ResponseEntity<ApiResponse<String>> resetParentPassword(
            @PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        String newPassword = body.get("password");
        if (newPassword == null || newPassword.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("New password is required"));
        ApiResponse<String> response = adminService.resetParentPassword(id, newPassword, getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/parents/{id}")
    public ResponseEntity<ApiResponse<String>> deleteParent(@PathVariable Long id, Authentication auth) {
        ApiResponse<String> response = adminService.deleteParent(id, getCurrentSchoolId(auth));
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

}
