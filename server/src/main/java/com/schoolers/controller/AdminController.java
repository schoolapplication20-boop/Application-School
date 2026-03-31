package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.CreateTeacherRequest;
import com.schoolers.model.*;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.AdminService;
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
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:5173"})
public class AdminController {

    @Autowired
    private AdminService adminService;

    @Autowired
    private UserRepository userRepository;

    // ===== Permissions =====
    @GetMapping("/permissions")
    public ResponseEntity<ApiResponse<String>> getPermissions() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .map(user -> ResponseEntity.ok(ApiResponse.success("Permissions retrieved", user.getPermissions())))
                .orElse(ResponseEntity.status(404).body(ApiResponse.error("User not found")));
    }

    // ===== Dashboard =====
    @GetMapping("/dashboard/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    // ===== Students =====
    @GetMapping("/students")
    public ResponseEntity<ApiResponse<Page<Student>>> getStudents(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(adminService.getStudents(search, page, size));
    }

    @GetMapping("/students/{id}")
    public ResponseEntity<ApiResponse<Student>> getStudentById(@PathVariable Long id) {
        ApiResponse<Student> response = adminService.getStudentById(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @PostMapping("/students")
    public ResponseEntity<ApiResponse<Student>> createStudent(@RequestBody Map<String, Object> body) {
        ApiResponse<Student> response = adminService.createStudent(body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/students/{id}")
    public ResponseEntity<ApiResponse<Student>> updateStudent(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        ApiResponse<Student> response = adminService.updateStudent(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/students/{id}")
    public ResponseEntity<ApiResponse<String>> deleteStudent(@PathVariable Long id) {
        ApiResponse<String> response = adminService.deleteStudent(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ===== Teachers =====
    @GetMapping("/teachers")
    public ResponseEntity<ApiResponse<List<Teacher>>> getTeachers() {
        return ResponseEntity.ok(adminService.getTeachers());
    }

    @GetMapping("/teachers/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeacherById(@PathVariable Long id) {
        ApiResponse<Map<String, Object>> response = adminService.getTeacherById(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @PostMapping("/teachers")
    public ResponseEntity<?> createTeacher(@RequestBody CreateTeacherRequest req) {
        var response = adminService.createTeacher(req);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/teachers/{id}")
    public ResponseEntity<ApiResponse<Teacher>> updateTeacher(@PathVariable Long id, @RequestBody CreateTeacherRequest req) {
        ApiResponse<Teacher> response = adminService.updateTeacher(id, req);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/teachers/{id}/reset-password")
    public ResponseEntity<ApiResponse<String>> resetTeacherPassword(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        String newPassword = body.get("password");
        if (newPassword == null || newPassword.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("New password is required"));
        ApiResponse<String> response = adminService.resetTeacherPassword(id, newPassword);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/teachers/{id}")
    public ResponseEntity<ApiResponse<String>> deleteTeacher(@PathVariable Long id) {
        ApiResponse<String> response = adminService.deleteTeacher(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ===== Classes =====
    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<ClassRoom>>> getClasses() {
        return ResponseEntity.ok(adminService.getClasses());
    }

    @PostMapping("/classes")
    public ResponseEntity<ApiResponse<ClassRoom>> createClass(@RequestBody ClassRoom classRoom) {
        return ResponseEntity.status(201).body(adminService.createClass(classRoom));
    }

    @PutMapping("/classes/{id}")
    public ResponseEntity<?> updateClass(@PathVariable Long id, @RequestBody ClassRoom classRoom) {
        ApiResponse<ClassRoom> response = adminService.updateClass(id, classRoom);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/classes/{id}")
    public ResponseEntity<?> deleteClass(@PathVariable Long id) {
        ApiResponse<String> response = adminService.deleteClass(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ===== Fees =====
    @GetMapping("/fees")
    public ResponseEntity<ApiResponse<List<Fee>>> getFees() {
        return ResponseEntity.ok(adminService.getFees());
    }

    @GetMapping("/fees/student/{studentId}")
    public ResponseEntity<ApiResponse<List<Fee>>> getFeesByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(adminService.getStudentFees(studentId));
    }

    @GetMapping("/fees/student/{studentId}/payments")
    public ResponseEntity<ApiResponse<List<FeePayment>>> getFeePaymentsByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(adminService.getStudentFeePayments(studentId));
    }

    @PostMapping("/fees/{id}/collect")
    public ResponseEntity<?> collectCashFee(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        ApiResponse<Fee> response = adminService.collectCashFee(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/students/search")
    public ResponseEntity<?> searchStudentsForFee(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(adminService.searchStudentsForFee(q));
    }

    @PostMapping("/fees")
    public ResponseEntity<ApiResponse<Fee>> createFee(@RequestBody Fee fee) {
        return ResponseEntity.status(201).body(adminService.createFee(fee));
    }

    @PutMapping("/fees/{id}")
    public ResponseEntity<?> updateFee(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        ApiResponse<Fee> response = adminService.updateFee(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/fees/{id}")
    public ResponseEntity<ApiResponse<String>> deleteFee(@PathVariable Long id) {
        ApiResponse<String> response = adminService.deleteFee(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ===== Expenses =====
    @GetMapping("/expenses")
    public ResponseEntity<ApiResponse<List<Expense>>> getExpenses() {
        return ResponseEntity.ok(adminService.getExpenses());
    }

    @PostMapping("/expenses")
    public ResponseEntity<ApiResponse<Expense>> createExpense(@RequestBody Expense expense) {
        return ResponseEntity.status(201).body(adminService.createExpense(expense));
    }

    @PutMapping("/expenses/{id}")
    public ResponseEntity<?> updateExpense(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        ApiResponse<Expense> response = adminService.updateExpense(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/expenses/{id}")
    public ResponseEntity<ApiResponse<String>> deleteExpense(@PathVariable Long id) {
        ApiResponse<String> response = adminService.deleteExpense(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ===== Parents =====
    @GetMapping("/parents")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getParents() {
        return ResponseEntity.ok(adminService.getParents());
    }

    @PostMapping("/parents")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createParent(@RequestBody Map<String, Object> body) {
        ApiResponse<Map<String, Object>> response = adminService.createParent(body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/parents/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateParent(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        ApiResponse<Map<String, Object>> response = adminService.updateParent(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/parents/{id}/reset-password")
    public ResponseEntity<ApiResponse<String>> resetParentPassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newPassword = body.get("password");
        if (newPassword == null || newPassword.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("New password is required"));
        ApiResponse<String> response = adminService.resetParentPassword(id, newPassword);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/parents/{id}")
    public ResponseEntity<ApiResponse<String>> deleteParent(@PathVariable Long id) {
        ApiResponse<String> response = adminService.deleteParent(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ===== Attendance Summary =====

    /** Class-wise attendance summary for all active classes on a given date */
    @GetMapping("/attendance/summary")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getClassAttendanceSummaries(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) date = LocalDate.now();
        return ResponseEntity.ok(adminService.getClassAttendanceSummaries(date));
    }

    /** Attendance summary for a specific teacher's primary class */
    @GetMapping("/teachers/{id}/attendance-summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeacherAttendanceSummary(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) date = LocalDate.now();
        ApiResponse<Map<String, Object>> response = adminService.getTeacherAttendanceSummary(id, date);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/attendance/classes/{classId}/details")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getClassAttendanceDetails(
            @PathVariable Long classId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) date = LocalDate.now();
        ApiResponse<Map<String, Object>> response = adminService.getClassAttendanceDetails(classId, date);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }
}
