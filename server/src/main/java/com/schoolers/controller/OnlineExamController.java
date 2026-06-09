package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.OnlineExamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class OnlineExamController {

    @Autowired
    private OnlineExamService onlineExamService;

    @Autowired
    private UserRepository userRepository;

    // ── Helpers ────────────────────────────────────────────────────────────────

    private Authentication auth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    private Teacher requireTeacher() {
        return onlineExamService.resolveTeacher(auth());
    }

    private Student requireStudent() {
        return onlineExamService.resolveStudent(auth());
    }

    private Long resolveAdminSchoolId() {
        Authentication a = auth();
        if (a == null) return null;
        return userRepository.findByEmailIgnoreCase(a.getName())
                .map(User::getSchoolId)
                .orElse(null);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TEACHER ENDPOINTS  —  /api/teacher/online-exams
    // ══════════════════════════════════════════════════════════════════════════

    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping("/api/teacher/online-exams")
    public ResponseEntity<ApiResponse<OnlineExam>> createExam(@RequestBody Map<String, Object> body) {
        Teacher teacher = requireTeacher();
        if (teacher == null) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found."));
        ApiResponse<OnlineExam> resp = onlineExamService.createExam(teacher, body);
        return resp.isSuccess() ? ResponseEntity.status(201).body(resp) : ResponseEntity.badRequest().body(resp);
    }

    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/api/teacher/online-exams")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listTeacherExams() {
        Teacher teacher = requireTeacher();
        if (teacher == null) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found."));
        return ResponseEntity.ok(onlineExamService.listTeacherExams(teacher));
    }

    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/api/teacher/online-exams/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeacherExam(@PathVariable Long id) {
        Teacher teacher = requireTeacher();
        if (teacher == null) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found."));
        ApiResponse<Map<String, Object>> resp = onlineExamService.getTeacherExam(teacher, id);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.status(404).body(resp);
    }

    @PreAuthorize("hasRole('TEACHER')")
    @PutMapping("/api/teacher/online-exams/{id}")
    public ResponseEntity<ApiResponse<OnlineExam>> updateExam(@PathVariable Long id,
                                                               @RequestBody Map<String, Object> body) {
        Teacher teacher = requireTeacher();
        if (teacher == null) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found."));
        ApiResponse<OnlineExam> resp = onlineExamService.updateExam(teacher, id, body);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.badRequest().body(resp);
    }

    @PreAuthorize("hasRole('TEACHER')")
    @DeleteMapping("/api/teacher/online-exams/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteExam(@PathVariable Long id) {
        Teacher teacher = requireTeacher();
        if (teacher == null) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found."));
        ApiResponse<Void> resp = onlineExamService.deleteExam(teacher, id);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.badRequest().body(resp);
    }

    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping("/api/teacher/online-exams/{id}/questions")
    public ResponseEntity<ApiResponse<OnlineExamQuestion>> addQuestion(@PathVariable Long id,
                                                                        @RequestBody Map<String, Object> body) {
        Teacher teacher = requireTeacher();
        if (teacher == null) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found."));
        ApiResponse<OnlineExamQuestion> resp = onlineExamService.addQuestion(teacher, id, body);
        return resp.isSuccess() ? ResponseEntity.status(201).body(resp) : ResponseEntity.badRequest().body(resp);
    }

    @PreAuthorize("hasRole('TEACHER')")
    @PutMapping("/api/teacher/online-exams/{id}/questions/{qId}")
    public ResponseEntity<ApiResponse<OnlineExamQuestion>> updateQuestion(@PathVariable Long id,
                                                                           @PathVariable Long qId,
                                                                           @RequestBody Map<String, Object> body) {
        Teacher teacher = requireTeacher();
        if (teacher == null) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found."));
        ApiResponse<OnlineExamQuestion> resp = onlineExamService.updateQuestion(teacher, id, qId, body);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.badRequest().body(resp);
    }

    @PreAuthorize("hasRole('TEACHER')")
    @DeleteMapping("/api/teacher/online-exams/{id}/questions/{qId}")
    public ResponseEntity<ApiResponse<Void>> deleteQuestion(@PathVariable Long id, @PathVariable Long qId) {
        Teacher teacher = requireTeacher();
        if (teacher == null) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found."));
        ApiResponse<Void> resp = onlineExamService.deleteQuestion(teacher, id, qId);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.badRequest().body(resp);
    }

    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping("/api/teacher/online-exams/{id}/publish")
    public ResponseEntity<ApiResponse<OnlineExam>> publishExam(@PathVariable Long id) {
        Teacher teacher = requireTeacher();
        if (teacher == null) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found."));
        ApiResponse<OnlineExam> resp = onlineExamService.publishExam(teacher, id);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.badRequest().body(resp);
    }

    @PreAuthorize("hasRole('TEACHER')")
    @PostMapping("/api/teacher/online-exams/{id}/close")
    public ResponseEntity<ApiResponse<OnlineExam>> closeExam(@PathVariable Long id) {
        Teacher teacher = requireTeacher();
        if (teacher == null) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found."));
        ApiResponse<OnlineExam> resp = onlineExamService.closeExam(teacher, id);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.badRequest().body(resp);
    }

    @PreAuthorize("hasRole('TEACHER')")
    @GetMapping("/api/teacher/online-exams/{id}/results")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getExamResults(@PathVariable Long id) {
        Teacher teacher = requireTeacher();
        if (teacher == null) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found."));
        ApiResponse<List<Map<String, Object>>> resp = onlineExamService.getExamResults(teacher, id);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.status(404).body(resp);
    }

    @PreAuthorize("hasRole('TEACHER')")
    @PutMapping("/api/teacher/online-exams/{id}/attempts/{attemptId}/grade")
    public ResponseEntity<ApiResponse<Map<String, Object>>> gradeAttempt(@PathVariable Long id,
                                                                          @PathVariable Long attemptId,
                                                                          @RequestBody List<Map<String, Object>> grades) {
        Teacher teacher = requireTeacher();
        if (teacher == null) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found."));
        ApiResponse<Map<String, Object>> resp = onlineExamService.gradeAttempt(teacher, id, attemptId, grades);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.badRequest().body(resp);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STUDENT ENDPOINTS  —  /api/student/online-exams
    // ══════════════════════════════════════════════════════════════════════════

    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/api/student/online-exams")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listStudentExams() {
        Student student = requireStudent();
        if (student == null) return ResponseEntity.status(403).body(ApiResponse.error("Student profile not found."));
        return ResponseEntity.ok(onlineExamService.listStudentExams(student));
    }

    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/api/student/online-exams/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStudentExam(@PathVariable Long id) {
        Student student = requireStudent();
        if (student == null) return ResponseEntity.status(403).body(ApiResponse.error("Student profile not found."));
        ApiResponse<Map<String, Object>> resp = onlineExamService.getStudentExam(student, id);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.status(404).body(resp);
    }

    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/api/student/online-exams/{id}/start")
    public ResponseEntity<ApiResponse<OnlineExamAttempt>> startExam(@PathVariable Long id) {
        Student student = requireStudent();
        if (student == null) return ResponseEntity.status(403).body(ApiResponse.error("Student profile not found."));
        ApiResponse<OnlineExamAttempt> resp = onlineExamService.startExam(student, id);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.badRequest().body(resp);
    }

    @PreAuthorize("hasRole('STUDENT')")
    @PutMapping("/api/student/online-exams/{id}/save")
    public ResponseEntity<ApiResponse<Void>> saveAnswers(@PathVariable Long id,
                                                          @RequestBody List<Map<String, Object>> answers) {
        Student student = requireStudent();
        if (student == null) return ResponseEntity.status(403).body(ApiResponse.error("Student profile not found."));
        ApiResponse<Void> resp = onlineExamService.saveAnswers(student, id, answers);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.badRequest().body(resp);
    }

    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/api/student/online-exams/{id}/submit")
    public ResponseEntity<ApiResponse<OnlineExamAttempt>> submitExam(@PathVariable Long id) {
        Student student = requireStudent();
        if (student == null) return ResponseEntity.status(403).body(ApiResponse.error("Student profile not found."));
        ApiResponse<OnlineExamAttempt> resp = onlineExamService.submitExam(student, id);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.badRequest().body(resp);
    }

    @PreAuthorize("hasRole('STUDENT')")
    @GetMapping("/api/student/online-exams/{id}/my-result")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyResult(@PathVariable Long id) {
        Student student = requireStudent();
        if (student == null) return ResponseEntity.status(403).body(ApiResponse.error("Student profile not found."));
        ApiResponse<Map<String, Object>> resp = onlineExamService.getStudentResult(student, id);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.status(404).body(resp);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ADMIN ENDPOINTS  —  /api/admin/online-exams
    // ══════════════════════════════════════════════════════════════════════════

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @GetMapping("/api/admin/online-exams")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listAdminExams() {
        Long schoolId = resolveAdminSchoolId();
        if (schoolId == null) return ResponseEntity.status(403).body(ApiResponse.error("School not found."));
        return ResponseEntity.ok(onlineExamService.listAdminExams(schoolId));
    }

    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    @GetMapping("/api/admin/online-exams/{id}/results")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAdminExamResults(@PathVariable Long id) {
        Long schoolId = resolveAdminSchoolId();
        if (schoolId == null) return ResponseEntity.status(403).body(ApiResponse.error("School not found."));
        ApiResponse<List<Map<String, Object>>> resp = onlineExamService.getAdminExamResults(schoolId, id);
        return resp.isSuccess() ? ResponseEntity.ok(resp) : ResponseEntity.status(404).body(resp);
    }
}
