package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.UserRepository;
import com.schoolers.repository.TeacherRepository;
import com.schoolers.service.TeacherService;
import org.springframework.beans.factory.annotation.Autowired;
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
@RequestMapping("/api/teacher")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:5173"})
public class TeacherController {

    @Autowired
    private TeacherService teacherService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TeacherRepository teacherRepository;

    // ── Helper: resolve teacher id from auth ──────────────────────────────────

    private Long resolveTeacherId(Long requestedId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return requestedId;
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return requestedId;
        User u = userOpt.get();
        boolean isAdmin = "ADMIN".equals(u.getRole().name()) || "SUPER_ADMIN".equals(u.getRole().name());
        if (isAdmin && requestedId != null) return requestedId;
        return teacherRepository.findByUserId(u.getId()).map(Teacher::getId).orElse(null);
    }

    private Long resolveMarkedBy() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName()).map(User::getId).orElse(null);
    }

    // ── Classes ────────────────────────────────────────────────────────────────

    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<ClassRoom>>> getMyClasses(
            @RequestParam(required = false) Long teacherId) {
        Long resolved = resolveTeacherId(teacherId);
        return ResponseEntity.ok(teacherService.getTeacherClasses(resolved));
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyProfile(
            @RequestParam(required = false) Long teacherId) {
        Long resolved = resolveTeacherId(teacherId);
        return ResponseEntity.ok(teacherService.getTeacherProfile(resolved));
    }

    // ── Students in a class ───────────────────────────────────────────────────

    @GetMapping("/class/{classId}/students")
    public ResponseEntity<ApiResponse<List<Student>>> getClassStudents(@PathVariable Long classId) {
        Long resolved = resolveTeacherId(null);
        ApiResponse<List<Student>> response = teacherService.getClassStudents(resolved, classId);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PostMapping("/class/{classId}/students")
    public ResponseEntity<ApiResponse<Student>> createClassStudent(
            @PathVariable Long classId,
            @RequestBody Map<String, Object> body) {
        Long resolved = resolveTeacherId(null);
        ApiResponse<Student> response = teacherService.createStudentForClass(resolved, classId, body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/class/{classId}/students/{studentId}")
    public ResponseEntity<ApiResponse<Student>> updateClassStudent(
            @PathVariable Long classId,
            @PathVariable Long studentId,
            @RequestBody Map<String, Object> body) {
        Long resolved = resolveTeacherId(null);
        ApiResponse<Student> response = teacherService.updateStudentForClass(resolved, classId, studentId, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/class/{classId}/students/{studentId}")
    public ResponseEntity<ApiResponse<String>> deleteClassStudent(
            @PathVariable Long classId,
            @PathVariable Long studentId) {
        Long resolved = resolveTeacherId(null);
        ApiResponse<String> response = teacherService.deleteStudentForClass(resolved, classId, studentId);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    // ── Attendance ─────────────────────────────────────────────────────────────

    @PostMapping("/attendance")
    public ResponseEntity<ApiResponse<String>> markAttendance(
            @RequestBody List<Map<String, Object>> attendanceList) {
        Long markedBy = resolveMarkedBy();
        Long resolved = resolveTeacherId(null);
        ApiResponse<String> response = teacherService.markAttendance(resolved, attendanceList, markedBy);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/attendance/{classId}")
    public ResponseEntity<ApiResponse<List<Attendance>>> getAttendance(
            @PathVariable Long classId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) date = LocalDate.now();
        Long resolved = resolveTeacherId(null);
        ApiResponse<List<Attendance>> response = teacherService.getAttendanceByClassAndDate(resolved, classId, date);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/attendance/{classId}/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAttendanceSummary(
            @PathVariable Long classId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        if (startDate != null && endDate != null) {
            return ResponseEntity.ok(teacherService.getAttendanceSummaryRange(classId, startDate, endDate));
        }
        if (date == null) date = LocalDate.now();
        Long resolved = resolveTeacherId(null);
        ApiResponse<Map<String, Object>> response = teacherService.getAttendanceSummary(resolved, classId, date);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/attendance/{classId}/dates")
    public ResponseEntity<ApiResponse<List<LocalDate>>> getAttendanceDates(@PathVariable Long classId) {
        Long resolved = resolveTeacherId(null);
        ApiResponse<List<LocalDate>> response = teacherService.getAttendanceDates(resolved, classId);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/attendance/history")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAttendanceHistory(
            @RequestParam Long classId) {
        Long resolved = resolveTeacherId(null);
        ApiResponse<List<Map<String, Object>>> response = teacherService.getAttendanceHistory(resolved, classId);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    // ── Assignments ────────────────────────────────────────────────────────────

    @GetMapping("/assignments")
    public ResponseEntity<ApiResponse<List<Assignment>>> getAssignments(
            @RequestParam(required = false) Long teacherId) {
        Long resolved = resolveTeacherId(teacherId);
        return ResponseEntity.ok(teacherService.getTeacherAssignments(resolved));
    }

    @PostMapping("/assignments")
    public ResponseEntity<ApiResponse<Assignment>> createAssignment(@RequestBody Assignment assignment) {
        return ResponseEntity.status(201).body(teacherService.createAssignment(assignment));
    }

    @PutMapping("/assignments/{id}")
    public ResponseEntity<ApiResponse<Assignment>> updateAssignment(
            @PathVariable Long id, @RequestBody Assignment assignment) {
        ApiResponse<Assignment> response = teacherService.updateAssignment(id, assignment);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/assignments/{id}")
    public ResponseEntity<ApiResponse<String>> deleteAssignment(@PathVariable Long id) {
        ApiResponse<String> response = teacherService.deleteAssignment(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ── Marks ──────────────────────────────────────────────────────────────────

    @GetMapping("/marks/{studentId}")
    public ResponseEntity<ApiResponse<List<Marks>>> getMarksByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(teacherService.getMarksByStudent(studentId));
    }

    @PostMapping("/marks")
    public ResponseEntity<ApiResponse<Marks>> addMarks(@RequestBody Marks marks) {
        return ResponseEntity.status(201).body(teacherService.addMarks(marks));
    }

    @PutMapping("/marks/{id}")
    public ResponseEntity<ApiResponse<Marks>> updateMarks(
            @PathVariable Long id, @RequestBody Marks marks) {
        ApiResponse<Marks> response = teacherService.updateMarks(id, marks);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/marks/{id}")
    public ResponseEntity<ApiResponse<String>> deleteMarks(@PathVariable Long id) {
        ApiResponse<String> response = teacherService.deleteMarks(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }
}
