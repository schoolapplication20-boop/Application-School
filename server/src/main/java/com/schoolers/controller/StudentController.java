package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.AssignmentRepository;
import com.schoolers.repository.AssignmentSubmissionRepository;
import com.schoolers.repository.StudentRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.repository.AttendanceRepository;
import com.schoolers.repository.MarksRepository;
import com.schoolers.service.AdminService;
import com.schoolers.service.ClassDiaryService;
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
import java.util.Optional;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("hasAnyRole('STUDENT', 'ADMIN', 'SUPER_ADMIN')")
public class StudentController {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private MarksRepository marksRepository;

    @Autowired
    private AdminService adminService;

    @Autowired
    private ClassDiaryService classDiaryService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private AssignmentSubmissionRepository submissionRepository;

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
        List<Attendance> records = (startDate != null && endDate != null)
            ? attendanceRepository.findByStudentIdAndDateBetween(studentId, startDate, endDate)
            : attendanceRepository.findByStudentIdOrderByDateDesc(studentId);
        return ResponseEntity.ok(ApiResponse.success(records));
    }

    @GetMapping("/marks")
    public ResponseEntity<ApiResponse<List<Marks>>> getMyMarks() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long studentId = resolveStudentId(auth);
        if (studentId == null) return ResponseEntity.status(403).body(ApiResponse.error("Student profile not found."));
        return ResponseEntity.ok(ApiResponse.success(marksRepository.findByStudentId(studentId)));
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

    @GetMapping("/grade-scales")
    public ResponseEntity<?> getGradeScales() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated."));
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("User not found."));
        Long userId = userOpt.get().getId();
        Long schoolId = studentRepository.findByStudentUserId(userId)
                .map(Student::getSchoolId).orElse(null);
        return ResponseEntity.ok(adminService.getGradeScales(schoolId));
    }

    @GetMapping("/assignments")
    public ResponseEntity<?> getMyAssignments(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated."));
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("User not found."));
        Long userId = userOpt.get().getId();
        Optional<Student> studentOpt = studentRepository.findByStudentUserId(userId);
        if (studentOpt.isEmpty()) return ResponseEntity.status(404).body(ApiResponse.error("Student profile not found."));
        Student student = studentOpt.get();
        Long schoolId = student.getSchoolId();
        // Build class identifier matching the assignment's className field
        String classSection = student.getClassName();
        if (student.getSection() != null && !student.getSection().isBlank()) {
            classSection = classSection + "-" + student.getSection();
        }
        // Try exact match first, then fallback to class name only
        List<Assignment> found = assignmentRepository.findByClassNameAndSchoolIdOrderByCreatedAtDesc(classSection, schoolId);
        if (found.isEmpty()) {
            found = assignmentRepository.findByClassNameAndSchoolIdOrderByCreatedAtDesc(student.getClassName(), schoolId);
        }
        return ResponseEntity.ok(ApiResponse.success(found));
    }

    @PostMapping("/assignments/{id}/submit")
    public ResponseEntity<?> submitAssignment(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated."));
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("User not found."));
        Long userId = userOpt.get().getId();
        Optional<Student> studentOpt = studentRepository.findByStudentUserId(userId);
        if (studentOpt.isEmpty()) return ResponseEntity.status(404).body(ApiResponse.error("Student profile not found."));
        Student student = studentOpt.get();

        if (!assignmentRepository.existsById(id)) {
            return ResponseEntity.status(404).body(ApiResponse.error("Assignment not found."));
        }

        String classSection = student.getClassName();
        if (student.getSection() != null && !student.getSection().isBlank()) {
            classSection = classSection + "-" + student.getSection();
        }
        String notes = body.containsKey("notes") ? (String) body.get("notes") : "";
        final String cs = classSection;

        AssignmentSubmission sub = submissionRepository
                .findByStudentIdAndAssignmentId(student.getId(), id)
                .orElseGet(() -> AssignmentSubmission.builder()
                        .assignmentId(id)
                        .studentId(student.getId())
                        .studentName(student.getName())
                        .classSection(cs)
                        .schoolId(student.getSchoolId())
                        .build());
        sub.setNotes(notes);
        AssignmentSubmission saved = submissionRepository.save(sub);
        return ResponseEntity.status(201).body(ApiResponse.success("Submitted successfully", saved));
    }

    @GetMapping("/assignments/my-submissions")
    public ResponseEntity<?> getMySubmissions(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated."));
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("User not found."));
        Long userId = userOpt.get().getId();
        Optional<Student> studentOpt = studentRepository.findByStudentUserId(userId);
        if (studentOpt.isEmpty()) return ResponseEntity.status(404).body(ApiResponse.error("Student profile not found."));
        Student student = studentOpt.get();
        return ResponseEntity.ok(ApiResponse.success(
            submissionRepository.findByStudentIdAndSchoolIdOrderBySubmittedAtDesc(student.getId(), student.getSchoolId())));
    }
}
