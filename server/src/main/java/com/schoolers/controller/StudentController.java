package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.StudentRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.AdminService;
import com.schoolers.service.ClassDiaryService;
import com.schoolers.service.ParentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'SUPER_ADMIN')")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:5173"})
public class StudentController {

    @Autowired
    private ParentService parentService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private ClassDiaryService classDiaryService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    private Long resolveStudentId(Authentication auth) {
        if (auth == null) return null;
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return null;
        Long userId = userOpt.get().getId();
        Optional<Student> student = studentRepository.findByStudentUserId(userId);
        return student.map(Student::getId).orElse(null);
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Student>> getMyProfile() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated."));
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("User not found."));
        Long userId = userOpt.get().getId();
        Optional<Student> student = studentRepository.findByStudentUserId(userId);
        return student
                .map(s -> ResponseEntity.ok(ApiResponse.success(s)))
                .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.error("Student profile not found.")));
    }

    @GetMapping("/attendance")
    public ResponseEntity<ApiResponse<List<Attendance>>> getMyAttendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long studentId = resolveStudentId(auth);
        if (studentId == null) return ResponseEntity.status(403).body(ApiResponse.error("Student profile not found."));
        return ResponseEntity.ok(parentService.getChildAttendance(studentId, startDate, endDate));
    }

    @GetMapping("/marks")
    public ResponseEntity<ApiResponse<List<Marks>>> getMyMarks() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long studentId = resolveStudentId(auth);
        if (studentId == null) return ResponseEntity.status(403).body(ApiResponse.error("Student profile not found."));
        return ResponseEntity.ok(parentService.getChildMarks(studentId));
    }

    /**
     * Returns comprehensive fee data for the logged-in student:
     *   { assignment, installments, payments, summary }
     * Falls back to legacy Fee list when no StudentFeeAssignment exists.
     */
    @GetMapping("/fees")
    public ResponseEntity<?> getMyFees() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long studentId = resolveStudentId(auth);
        if (studentId == null) return ResponseEntity.status(403).body(ApiResponse.error("Student profile not found."));
        return ResponseEntity.ok(adminService.getStudentFeeData(studentId));
    }

    @GetMapping("/diary")
    public ResponseEntity<?> getMyDiary() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated."));
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("User not found."));
        Long userId = userOpt.get().getId();
        Optional<Student> studentOpt = studentRepository.findByStudentUserId(userId);
        if (studentOpt.isEmpty()) return ResponseEntity.status(404).body(ApiResponse.error("Student profile not found."));
        Student student = studentOpt.get();
        return ResponseEntity.ok(classDiaryService.getForStudent(student.getClassName(), student.getSection(), student.getSchoolId()));
    }
}
