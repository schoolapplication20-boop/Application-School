package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
public class ReportCardController {

    @Autowired private UserRepository       userRepository;
    @Autowired private StudentRepository    studentRepository;
    @Autowired private MarksRepository      marksRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private SchoolRepository     schoolRepository;

    /** Student fetches available exam filters (distinct exam types from their marks) */
    @GetMapping("/api/student/report-card/filters")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getMyFilters(Authentication auth) {
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("User not found"));
        var studentOpt = studentRepository.findByStudentUserId(userOpt.get().getId());
        if (studentOpt.isEmpty()) return ResponseEntity.ok(ApiResponse.success(Map.of("examTypes", List.of())));
        Student student = studentOpt.get();
        List<String> examTypes = marksRepository.findDistinctExamTypesByStudentIdAndSchoolId(
                student.getId(), student.getSchoolId());
        return ResponseEntity.ok(ApiResponse.success(Map.of("examTypes", examTypes)));
    }

    /** Student fetches their own report card — optional ?examType=X filter */
    @GetMapping("/api/student/report-card")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getMyReportCard(
            @RequestParam(required = false) String examType,
            Authentication auth) {
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("User not found"));
        var studentOpt = studentRepository.findByStudentUserId(userOpt.get().getId());
        if (studentOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("Student profile not found"));
        return ResponseEntity.ok(buildReportCard(studentOpt.get(), examType));
    }

    /** Admin fetches any student's report card — optional ?examType=X filter */
    @GetMapping("/api/admin/students/{studentId}/report-card")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> getStudentReportCard(
            @PathVariable Long studentId,
            @RequestParam(required = false) String examType,
            Authentication auth) {
        Long adminSchoolId = userRepository.findByEmailIgnoreCase(auth.getName())
                .map(User::getSchoolId).orElse(null);
        Student student = studentRepository.findById(studentId).orElse(null);
        if (student == null) return ResponseEntity.status(404).body(ApiResponse.error("Student not found"));
        if (adminSchoolId != null && !adminSchoolId.equals(student.getSchoolId()))
            return ResponseEntity.status(403).body(ApiResponse.error("Unauthorized"));
        return ResponseEntity.ok(buildReportCard(student, examType));
    }

    private Map<String, Object> buildReportCard(Student student, String examTypeFilter) {
        // Primary query: schoolId-scoped for multi-tenant safety.
        // Fallback for records saved before schoolId stamping was fixed (schoolId = null).
        List<Marks> marks;
        if (examTypeFilter != null && !examTypeFilter.isBlank()) {
            marks = marksRepository.findByStudentIdAndSchoolIdAndExamType(
                    student.getId(), student.getSchoolId(), examTypeFilter);
            if (marks.isEmpty())
                marks = marksRepository.findByStudentIdAndExamType(student.getId(), examTypeFilter);
        } else {
            marks = marksRepository.findByStudentIdAndSchoolId(student.getId(), student.getSchoolId());
            if (marks.isEmpty())
                marks = marksRepository.findByStudentId(student.getId());
        }

        // Group by examType
        Map<String, List<Map<String, Object>>> byExam = marks.stream().collect(
            Collectors.groupingBy(
                m -> m.getExamType() != null ? m.getExamType() : "General",
                LinkedHashMap::new,
                Collectors.mapping(m -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("subject", m.getSubject());
                    row.put("marks", m.getMarks());
                    row.put("maxMarks", m.getMaxMarks());
                    row.put("grade", m.getGrade());
                    row.put("examDate", m.getExamDate() != null ? m.getExamDate().toString() : null);
                    return row;
                }, Collectors.toList())
            )
        );

        // Attendance summary (current academic year: June to May)
        LocalDate today = LocalDate.now();
        LocalDate yearStart = today.getMonthValue() >= 6
            ? LocalDate.of(today.getYear(), 6, 1)
            : LocalDate.of(today.getYear() - 1, 6, 1);
        List<Attendance> attendance = attendanceRepository.findByStudentIdAndDateBetween(
                student.getId(), yearStart, today);
        long total   = attendance.size();
        long present = attendance.stream().filter(a ->
                a.getStatus() == Attendance.Status.PRESENT || a.getStatus() == Attendance.Status.LATE).count();
        double pct = total > 0 ? Math.round((present * 100.0 / total) * 10) / 10.0 : 0;

        // School info — student.schoolId stores the human-assigned display number (School.schoolId),
        // with a fallback to the DB primary key for older records that stored the PK instead.
        Map<String, Object> schoolInfo = new LinkedHashMap<>();
        Long sid = student.getSchoolId();
        if (sid != null) {
            Optional<School> schoolOpt = schoolRepository.findBySchoolId(sid.intValue());
            if (schoolOpt.isEmpty()) schoolOpt = schoolRepository.findById(sid);
            schoolOpt.ifPresent(sc -> {
                schoolInfo.put("name", sc.getName());
                schoolInfo.put("address", sc.getAddress());
                schoolInfo.put("phone", sc.getPhone());
                schoolInfo.put("email", sc.getEmail());
                schoolInfo.put("board", sc.getBoard());
                schoolInfo.put("academicYear", sc.getAcademicYear());
                schoolInfo.put("logoUrl", sc.getLogoUrl());
            });
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("student", Map.of(
            "name", student.getName(),
            "rollNumber", student.getRollNumber(),
            "admissionNumber", student.getAdmissionNumber() != null ? student.getAdmissionNumber() : "",
            "className", student.getClassName(),
            "section", student.getSection() != null ? student.getSection() : "",
            "parentName", student.getParentName() != null ? student.getParentName() : ""
        ));
        result.put("school", schoolInfo);
        result.put("marksByExam", byExam);
        result.put("attendance", Map.of(
            "totalDays", total, "presentDays", present, "percentage", pct
        ));
        return result;
    }
}
