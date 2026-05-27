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

    /** Student fetches their own report card */
    @GetMapping("/api/student/report-card")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getMyReportCard(Authentication auth) {
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("User not found"));
        var studentOpt = studentRepository.findByStudentUserId(userOpt.get().getId());
        if (studentOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("Student profile not found"));
        return ResponseEntity.ok(buildReportCard(studentOpt.get()));
    }

    /** Admin fetches any student's report card */
    @GetMapping("/api/admin/students/{studentId}/report-card")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> getStudentReportCard(@PathVariable Long studentId, Authentication auth) {
        Long adminSchoolId = userRepository.findByEmailIgnoreCase(auth.getName())
                .map(User::getSchoolId).orElse(null);
        Student student = studentRepository.findById(studentId).orElse(null);
        if (student == null) return ResponseEntity.status(404).body(ApiResponse.error("Student not found"));
        if (adminSchoolId != null && !adminSchoolId.equals(student.getSchoolId()))
            return ResponseEntity.status(403).body(ApiResponse.error("Unauthorized"));
        return ResponseEntity.ok(buildReportCard(student));
    }

    private Map<String, Object> buildReportCard(Student student) {
        List<Marks> marks = marksRepository.findByStudentIdAndSchoolId(student.getId(), student.getSchoolId());

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

        // School info
        Map<String, Object> schoolInfo = new LinkedHashMap<>();
        schoolRepository.findById(student.getSchoolId()).ifPresent(sc -> {
            schoolInfo.put("name", sc.getName());
            schoolInfo.put("address", sc.getAddress());
            schoolInfo.put("phone", sc.getPhone());
            schoolInfo.put("email", sc.getEmail());
            schoolInfo.put("board", sc.getBoard());
            schoolInfo.put("academicYear", sc.getAcademicYear());
            schoolInfo.put("logoUrl", sc.getLogoUrl());
        });

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
