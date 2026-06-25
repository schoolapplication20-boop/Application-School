package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.*;
import com.schoolers.security.CurrentUserUtil;
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

    @Autowired private CurrentUserUtil       currentUserUtil;
    @Autowired private StudentRepository    studentRepository;
    @Autowired private MarksRepository      marksRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private SchoolRepository     schoolRepository;
    @Autowired private com.schoolers.repository.TeacherRepository    teacherRepository;
    @Autowired private com.schoolers.repository.ClassRoomRepository  classRoomRepository;
    @Autowired private com.schoolers.repository.GradeScaleRepository gradeScaleRepository;

    // Default grade scale — mirrors AdminService.DEFAULT_GRADE_SCALE, used when the
    // school has not configured a custom scale yet.
    private static final List<com.schoolers.model.GradeScale> DEFAULT_GRADE_SCALE = List.of(
        com.schoolers.model.GradeScale.builder().grade("O")  .minPercentage(new java.math.BigDecimal("90.00")).displayOrder(1).build(),
        com.schoolers.model.GradeScale.builder().grade("A+") .minPercentage(new java.math.BigDecimal("80.00")).displayOrder(2).build(),
        com.schoolers.model.GradeScale.builder().grade("A")  .minPercentage(new java.math.BigDecimal("70.00")).displayOrder(3).build(),
        com.schoolers.model.GradeScale.builder().grade("B+") .minPercentage(new java.math.BigDecimal("60.00")).displayOrder(4).build(),
        com.schoolers.model.GradeScale.builder().grade("B")  .minPercentage(new java.math.BigDecimal("50.00")).displayOrder(5).build(),
        com.schoolers.model.GradeScale.builder().grade("B-") .minPercentage(new java.math.BigDecimal("40.00")).displayOrder(6).build(),
        com.schoolers.model.GradeScale.builder().grade("C")  .minPercentage(new java.math.BigDecimal("33.00")).displayOrder(7).build(),
        com.schoolers.model.GradeScale.builder().grade("F")  .minPercentage(new java.math.BigDecimal("0.00")) .displayOrder(8).build()
    );

    /** Resolve a grade from a percentage using the provided scale (sorted desc by minPercentage). */
    private static String computeGrade(double percentage, List<com.schoolers.model.GradeScale> scales) {
        for (com.schoolers.model.GradeScale scale : scales) {
            if (scale.getMinPercentage() != null &&
                    percentage >= scale.getMinPercentage().doubleValue()) {
                return scale.getGrade();
            }
        }
        // Fallback: return the last entry's grade (lowest tier, e.g. "F") or a hard default.
        return scales.isEmpty() ? "F" : scales.get(scales.size() - 1).getGrade();
    }

    /** Student fetches available exam filters (distinct exam types from their marks) */
    @GetMapping("/api/student/report-card/filters")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getMyFilters(Authentication auth) {
        Long userId = currentUserUtil.getCurrentUserId(auth);
        if (userId == null) return ResponseEntity.status(403).body(ApiResponse.error("User not found"));
        var studentOpt = studentRepository.findByStudentUserId(userId);
        if (studentOpt.isEmpty()) return ResponseEntity.ok(ApiResponse.success(Map.of("examTypes", List.of())));
        Student student = studentOpt.get();
        // Merge schoolId-scoped + fallback (null schoolId = pre-fix records) to ensure all exam types appear
        List<String> scoped   = marksRepository.findDistinctExamTypesByStudentIdAndSchoolId(student.getId(), student.getSchoolId());
        List<String> all      = marksRepository.findDistinctExamTypesByStudentId(student.getId());
        List<String> examTypes = all.stream().distinct().sorted().collect(Collectors.toList());
        if (scoped.isEmpty() && examTypes.isEmpty()) examTypes = List.of();
        return ResponseEntity.ok(ApiResponse.success(Map.of("examTypes", examTypes)));
    }

    /** Student fetches their own report card — optional ?examType=X filter */
    @GetMapping("/api/student/report-card")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getMyReportCard(
            @RequestParam(required = false) String examType,
            Authentication auth) {
        Long userId = currentUserUtil.getCurrentUserId(auth);
        if (userId == null) return ResponseEntity.status(403).body(ApiResponse.error("User not found"));
        var studentOpt = studentRepository.findByStudentUserId(userId);
        if (studentOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("Student profile not found"));
        return ResponseEntity.ok(buildReportCard(studentOpt.get(), examType));
    }

    // ── Shared filters endpoint (admin, teacher) ─────────────────────────────

    @GetMapping("/api/report-cards/filters")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<?> getSchoolFilters(Authentication auth) {
        Long schoolId = currentUserUtil.getCurrentSchoolId(auth);
        if (schoolId == null) return ResponseEntity.ok(ApiResponse.success(Map.of("examTypes", List.of())));
        List<String> examTypes = marksRepository.findDistinctExamTypesBySchoolId(schoolId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("examTypes", examTypes)));
    }

    // ── Class-level report cards (admin, super admin, teacher) ─────────────────

    @GetMapping("/api/report-cards/class")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<?> getClassReportCards(
            @RequestParam(required = false) String className,
            @RequestParam(required = false) String section,
            @RequestParam(required = false) String examType,
            Authentication auth) {
        Long schoolId = currentUserUtil.getCurrentSchoolId(auth);
        if (schoolId == null) return ResponseEntity.status(403).body(ApiResponse.error("School not found"));
        if (className == null || className.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("className is required"));

        // Find students in the class
        List<Student> students = section != null && !section.isBlank()
                ? studentRepository.findBySchoolIdAndClassNameIgnoreCaseAndSectionIgnoreCase(schoolId, className.trim(), section.trim())
                : studentRepository.findBySchoolIdAndClassName(schoolId, className.trim());

        if (students.isEmpty()) return ResponseEntity.ok(ApiResponse.success(List.of()));

        List<Long> ids = students.stream().map(Student::getId).collect(Collectors.toList());
        List<Marks> allMarks = marksRepository.findByStudentIdsAndExamType(ids, examType != null && !examType.isBlank() ? examType : null);

        // Group marks by studentId
        Map<Long, List<Marks>> byStudent = allMarks.stream().collect(Collectors.groupingBy(Marks::getStudentId));

        List<Map<String, Object>> result = students.stream().map(student -> {
            List<Marks> sMarks = byStudent.getOrDefault(student.getId(), List.of());
            Map<String, List<Map<String, Object>>> byExam = sMarks.stream().collect(
                Collectors.groupingBy(m -> m.getExamType() != null ? m.getExamType() : "General",
                    LinkedHashMap::new,
                    Collectors.mapping(m -> {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("subject", m.getSubject()); row.put("marks", m.getMarks());
                        row.put("maxMarks", m.getMaxMarks()); row.put("grade", m.getGrade());
                        row.put("examDate", m.getExamDate() != null ? m.getExamDate().toString() : null);
                        return row;
                    }, Collectors.toList())));
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("studentId", student.getId());
            dto.put("name", student.getName());
            dto.put("rollNumber", student.getRollNumber());
            dto.put("admissionNumber", student.getAdmissionNumber() != null ? student.getAdmissionNumber() : "");
            dto.put("className", student.getClassName());
            dto.put("section", student.getSection() != null ? student.getSection() : "");
            dto.put("marksByExam", byExam);
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ── Single student report card for admin/teacher ───────────────────────────

    @GetMapping("/api/report-cards/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<?> getAnyStudentReportCard(
            @PathVariable Long studentId,
            @RequestParam(required = false) String examType,
            Authentication auth) {
        Long schoolId = currentUserUtil.getCurrentSchoolId(auth);
        Student student = studentRepository.findById(studentId).orElse(null);
        if (student == null) return ResponseEntity.status(404).body(ApiResponse.error("Student not found"));
        if (schoolId != null && !schoolId.equals(student.getSchoolId()))
            return ResponseEntity.status(403).body(ApiResponse.error("Unauthorized"));
        return ResponseEntity.ok(ApiResponse.success(buildReportCard(student, examType)));
    }

    // ── Bulk CSV import of marks (teacher) ─────────────────────────────────────

    @PostMapping("/api/teacher/marks/bulk-csv")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> bulkImportMarksCsv(
            @org.springframework.web.bind.annotation.RequestBody Map<String, Object> body,
            Authentication auth) {
        Long schoolId  = currentUserUtil.getCurrentSchoolId(auth);
        Long teacherId = currentUserUtil.getCurrentUserId(auth);
        if (schoolId == null || teacherId == null)
            return ResponseEntity.status(403).body(ApiResponse.error("User not found"));

        // For TEACHER role: enforce class-teacher-only restriction and scope to their assigned class
        boolean isTeacher = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_TEACHER".equals(a.getAuthority()));
        String allowedClassName = null;
        String allowedSection   = null;
        if (isTeacher) {
            com.schoolers.model.Teacher teacher = teacherRepository.findByUserId(teacherId).orElse(null);
            if (teacher == null) return ResponseEntity.status(403).body(ApiResponse.error("Teacher profile not found"));
            String type = teacher.getTeacherType() != null ? teacher.getTeacherType() : "SUBJECT_TEACHER";
            if (!"CLASS_TEACHER".equalsIgnoreCase(type) && !"BOTH".equalsIgnoreCase(type))
                return ResponseEntity.status(403).body(ApiResponse.error("Only class teachers can do bulk CSV import of marks."));
            // Find their assigned classroom
            com.schoolers.model.ClassRoom room = null;
            if (teacher.getPrimaryClassId() != null)
                room = classRoomRepository.findById(teacher.getPrimaryClassId()).orElse(null);
            if (room == null) {
                java.util.List<com.schoolers.model.ClassRoom> byTeacher = schoolId != null
                        ? classRoomRepository.findBySchoolIdAndTeacherId(schoolId, teacherId)
                        : classRoomRepository.findByTeacherId(teacherId);
                if (!byTeacher.isEmpty()) room = byTeacher.get(0);
            }
            if (room == null) return ResponseEntity.status(403).body(ApiResponse.error("No class assigned to you as class teacher."));
            allowedClassName = room.getName();
            allowedSection   = room.getSection();
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) body.get("rows");
        String examType = body.get("examType") != null ? body.get("examType").toString() : null;
        String examDateStr = body.get("examDate") != null ? body.get("examDate").toString() : null;
        if (rows == null || rows.isEmpty()) return ResponseEntity.badRequest().body(ApiResponse.error("No rows provided"));

        java.time.LocalDate examDate = null;
        try { if (examDateStr != null) examDate = java.time.LocalDate.parse(examDateStr); } catch (Exception ignored) {}

        // Load the school's configured grade scale; fall back to the default if none configured.
        List<com.schoolers.model.GradeScale> gradeScales =
                gradeScaleRepository.findBySchoolIdOrderByMinPercentageDesc(schoolId);
        if (gradeScales.isEmpty()) gradeScales = DEFAULT_GRADE_SCALE;

        List<Map<String, Object>> results = new java.util.ArrayList<>();
        int saved = 0;
        for (Map<String, Object> row : rows) {
            String admNum  = row.get("admissionNumber") != null ? row.get("admissionNumber").toString().trim() : null;
            String subject = row.get("subject") != null ? row.get("subject").toString().trim() : null;
            String marksS  = row.get("marks") != null ? row.get("marks").toString().trim() : null;
            String maxS    = row.get("maxMarks") != null ? row.get("maxMarks").toString().trim() : null;

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("admissionNumber", admNum);
            res.put("subject", subject);

            if (admNum == null || admNum.isBlank() || subject == null || subject.isBlank() || marksS == null || maxS == null) {
                res.put("status", "error"); res.put("message", "Missing required fields"); results.add(res); continue;
            }
            List<com.schoolers.model.Student> found = studentRepository.findAllByAdmissionNumberIgnoreCase(admNum);
            found = found.stream().filter(s -> schoolId.equals(s.getSchoolId())).collect(Collectors.toList());
            if (found.isEmpty()) { res.put("status", "error"); res.put("message", "Student not found"); results.add(res); continue; }
            com.schoolers.model.Student student = found.get(0);

            // Enforce class-teacher scope: student must be in the teacher's assigned class
            if (allowedClassName != null) {
                boolean classMatch = allowedClassName.equalsIgnoreCase(student.getClassName());
                boolean sectionMatch = allowedSection == null || allowedSection.isBlank()
                        || allowedSection.equalsIgnoreCase(student.getSection() != null ? student.getSection() : "");
                if (!classMatch || !sectionMatch) {
                    String allowed = allowedClassName + (allowedSection != null && !allowedSection.isBlank() ? " - " + allowedSection : "");
                    res.put("status", "error");
                    res.put("message", "Student not in your class (" + allowed + ")");
                    results.add(res); continue;
                }
            }

            double marksVal, maxVal;
            try { marksVal = Double.parseDouble(marksS); maxVal = Double.parseDouble(maxS); }
            catch (NumberFormatException e) { res.put("status", "error"); res.put("message", "Invalid marks/maxMarks — must be numbers"); results.add(res); continue; }
            if (marksVal < 0 || maxVal <= 0) { res.put("status", "error"); res.put("message", "maxMarks must be > 0 and marks must be ≥ 0"); results.add(res); continue; }
            if (marksVal > maxVal) { res.put("status", "error"); res.put("message", "marks (" + marksVal + ") cannot exceed maxMarks (" + maxVal + ")"); results.add(res); continue; }

            double pctVal = (marksVal / maxVal) * 100;
            String grade = computeGrade(pctVal, gradeScales);

            com.schoolers.model.Marks m = com.schoolers.model.Marks.builder()
                .studentId(student.getId()).studentName(student.getName())
                .subject(subject).examType(examType != null ? examType : "General")
                .marks((int) marksVal).maxMarks((int) maxVal).grade(grade)
                .teacherId(teacherId).schoolId(schoolId).examDate(examDate).build();
            marksRepository.save(m);
            saved++;
            res.put("status", "ok"); res.put("studentName", student.getName()); results.add(res);
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("saved", saved); resp.put("total", rows.size()); resp.put("results", results);
        return ResponseEntity.ok(ApiResponse.success(resp));
    }

    /** Admin fetches any student's report card — optional ?examType=X filter */
    @GetMapping("/api/admin/students/{studentId}/report-card")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> getStudentReportCard(
            @PathVariable Long studentId,
            @RequestParam(required = false) String examType,
            Authentication auth) {
        Long adminSchoolId = currentUserUtil.getCurrentSchoolId(auth);
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
                a != null && a.getStatus() != null &&
                (a.getStatus() == Attendance.Status.PRESENT || a.getStatus() == Attendance.Status.LATE)).count();
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
