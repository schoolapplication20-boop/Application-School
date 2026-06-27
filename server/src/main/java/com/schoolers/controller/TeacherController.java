package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.AssignmentRepository;
import com.schoolers.repository.AssignmentSubmissionRepository;
import com.schoolers.repository.ClassRoomRepository;
import com.schoolers.repository.ReportCardAttendanceRepository;
import com.schoolers.repository.StudentRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.repository.TeacherRepository;
import com.schoolers.model.AssignmentSubmission;
import com.schoolers.service.AdminService;
import com.schoolers.service.EmailService;
import com.schoolers.service.StudentPrivacyService;
import com.schoolers.service.TeacherService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/teacher")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherController {

    @Autowired
    private TeacherService teacherService;

    @Autowired
    private AdminService adminService;

    @Autowired
    private StudentPrivacyService studentPrivacyService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private ClassRoomRepository classRoomRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private AssignmentSubmissionRepository submissionRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private ReportCardAttendanceRepository rcaRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    // ── Helper: resolve teacher id from auth ──────────────────────────────────

    private Long resolveTeacherId(Long requestedId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return requestedId;
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return requestedId;
        User u = userOpt.get();
        boolean isAdmin = "ADMIN".equals(u.getRole().name()) || "SUPER_ADMIN".equals(u.getRole().name());
        if (isAdmin && requestedId != null) {
            // APPLICATION_OWNER (schoolId == null) may access any teacher.
            // ADMIN/SUPER_ADMIN must only access teachers belonging to their own school.
            if (u.getSchoolId() != null) {
                Teacher target = teacherRepository.findById(requestedId).orElse(null);
                if (target != null && !u.getSchoolId().equals(target.getSchoolId())) {
                    return null; // cross-school access denied
                }
            }
            return requestedId;
        }
        return teacherRepository.findByUserId(u.getId()).map(Teacher::getId).orElse(null);
    }

    private Long resolveMarkedBy() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName()).map(User::getId).orElse(null);
    }

    /** Returns the school ID of the authenticated teacher (or admin acting on behalf of one). */
    private Long resolveTeacherSchoolId() {
        Long teacherId = resolveTeacherId(null);
        if (teacherId == null) return null;
        return teacherRepository.findById(teacherId).map(Teacher::getSchoolId).orElse(null);
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

    /** Returns which class (if any) this teacher is assigned as class teacher for. */
    @GetMapping("/class-teacher-assignment")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getClassTeacherAssignment() {
        Long teacherId = resolveTeacherId(null);
        Map<String, Object> result = new HashMap<>();

        if (teacherId == null) {
            result.put("isClassTeacher", false);
            return ResponseEntity.ok(ApiResponse.success(result));
        }

        Teacher teacher = teacherRepository.findById(teacherId).orElse(null);
        if (teacher == null) {
            result.put("isClassTeacher", false);
            return ResponseEntity.ok(ApiResponse.success(result));
        }

        String type = teacher.getTeacherType();
        boolean isClassTeacher = "CLASS_TEACHER".equalsIgnoreCase(type) || "BOTH".equalsIgnoreCase(type);

        if (!isClassTeacher) {
            result.put("isClassTeacher", false);
            result.put("teacherType", type);
            return ResponseEntity.ok(ApiResponse.success(result));
        }

        // Find the classroom: primaryClassId first, then classroom.teacherId match
        ClassRoom room = null;
        if (teacher.getPrimaryClassId() != null) {
            room = classRoomRepository.findById(teacher.getPrimaryClassId()).orElse(null);
        }
        if (room == null) {
            Long schoolId = teacher.getSchoolId();
            java.util.List<ClassRoom> byTeacher = (schoolId != null)
                    ? classRoomRepository.findBySchoolIdAndTeacherId(schoolId, teacherId)
                    : classRoomRepository.findByTeacherId(teacherId);
            if (!byTeacher.isEmpty()) room = byTeacher.get(0);
        }

        result.put("isClassTeacher", true);
        result.put("teacherType", type);
        if (room != null) {
            result.put("classId",   room.getId());
            result.put("className", room.getName());
            result.put("section",   room.getSection());
            result.put("schoolId",  room.getSchoolId());
            result.put("label",     room.getName() + (room.getSection() != null ? " - " + room.getSection() : ""));
        } else {
            result.put("classId", null);
            result.put("className", null);
            result.put("section", null);
            result.put("label", null);
        }
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // ── Students in a class ───────────────────────────────────────────────────

    @GetMapping("/class/{classId}/students")
    public ResponseEntity<ApiResponse<List<Student>>> getClassStudents(
            @PathVariable Long classId, Authentication auth) {
        Long resolved = resolveTeacherId(null);
        ApiResponse<List<Student>> response = teacherService.getClassStudents(resolved, classId);

        if (response.isSuccess() && response.getData() != null) {
            // Determine caller's role — strip the ROLE_ prefix Spring Security adds
            String role = auth != null ? auth.getAuthorities().stream()
                    .map(a -> a.getAuthority().replace("ROLE_", ""))
                    .findFirst().orElse("") : "";
            Long schoolId = resolveTeacherSchoolId();
            if (studentPrivacyService.shouldHideContactInfo(schoolId, role)) {
                studentPrivacyService.maskContactInfo(response.getData());
            }
        }

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

    @PutMapping("/students/{studentId}/reset-password")
    public ResponseEntity<ApiResponse<String>> resetStudentPassword(
            @PathVariable Long studentId,
            @RequestBody Map<String, String> body) {
        String newPassword = body.get("password");
        if (newPassword == null || newPassword.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("New password is required"));
        Long teacherId = resolveTeacherId(null);
        // Cross-school guard: ensure the target student belongs to the teacher's school
        Long teacherSchoolId = resolveTeacherSchoolId();
        if (teacherSchoolId != null) {
            Student targetStudent = studentRepository.findById(studentId).orElse(null);
            if (targetStudent == null)
                return ResponseEntity.status(404).body(ApiResponse.error("Student not found"));
            if (!teacherSchoolId.equals(targetStudent.getSchoolId()))
                return ResponseEntity.status(403).body(ApiResponse.error("Access denied: student does not belong to your school"));
        }
        ApiResponse<String> response = teacherService.resetStudentPassword(teacherId, studentId, newPassword);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    /** Creates a login account for a student in the teacher's class that doesn't have one yet. */
    @PostMapping("/students/{studentId}/onboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> onboardStudent(
            @PathVariable Long studentId,
            @RequestBody Map<String, String> body) {
        Long teacherId = resolveTeacherId(null);
        if (teacherId == null)
            return ResponseEntity.badRequest().body(ApiResponse.error("Teacher not found"));

        // Verify student belongs to teacher's class
        Teacher teacher = teacherRepository.findById(teacherId).orElse(null);
        if (teacher == null)
            return ResponseEntity.badRequest().body(ApiResponse.error("Teacher not found"));

        Student student = studentRepository.findById(studentId).orElse(null);
        if (student == null)
            return ResponseEntity.badRequest().body(ApiResponse.error("Student not found"));
        // Require non-null schoolId — prevents bypassing school isolation for platform-level accounts
        if (teacher.getSchoolId() == null)
            return ResponseEntity.badRequest().body(ApiResponse.error("Teacher school not configured"));
        if (!teacher.getSchoolId().equals(student.getSchoolId()))
            return ResponseEntity.badRequest().body(ApiResponse.error("Student does not belong to your school"));

        ApiResponse<java.util.List<com.schoolers.model.ClassRoom>> classesResp = teacherService.getTeacherClasses(teacherId);
        boolean inClass = classesResp.isSuccess() && classesResp.getData().stream()
                .anyMatch(cls -> cls.getName() != null
                        && cls.getName().equalsIgnoreCase(student.getClassName())
                        && (cls.getSection() == null || cls.getSection().isBlank()
                            || cls.getSection().equalsIgnoreCase(student.getSection())));
        if (!inClass)
            return ResponseEntity.badRequest().body(ApiResponse.error("This student is not in any of your assigned classes"));

        String email = body.get("email");
        ApiResponse<Map<String, Object>> res = adminService.onboardStudentAccount(studentId, email, teacher.getSchoolId());
        return res.isSuccess() ? ResponseEntity.ok(res) : ResponseEntity.badRequest().body(res);
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
            Long resolved = resolveTeacherId(null);
            ApiResponse<Map<String, Object>> rangeResponse = teacherService.getAttendanceSummaryRange(resolved, classId, startDate, endDate);
            return rangeResponse.isSuccess() ? ResponseEntity.ok(rangeResponse) : ResponseEntity.badRequest().body(rangeResponse);
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
    public ResponseEntity<ApiResponse<Assignment>> createAssignment(
            @RequestBody Assignment assignment, Authentication auth) {
        if (auth != null) {
            var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
            if (userOpt.isPresent()) {
                assignment.setSchoolId(userOpt.get().getSchoolId());
            }
        }
        Long teacherId = resolveTeacherId(null);
        if (teacherId != null) {
            assignment.setTeacherId(teacherId);
        }
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

    @GetMapping("/assignments/{id}/submissions")
    public ResponseEntity<?> getSubmissions(@PathVariable Long id) {
        Long schoolId = resolveTeacherSchoolId();
        return assignmentRepository.findById(id)
                .filter(a -> schoolId == null || schoolId.equals(a.getSchoolId()))
                .map(a -> ResponseEntity.ok(ApiResponse.success(submissionRepository.findByAssignmentIdOrderBySubmittedAtAsc(id))))
                .orElseGet(() -> ResponseEntity.status(403).body(ApiResponse.error("Assignment not found or access denied")));
    }

    @PutMapping("/assignments/{id}/submissions/{subId}/grade")
    public ResponseEntity<?> gradeSubmission(
            @PathVariable Long id, @PathVariable Long subId,
            @RequestBody Map<String, Object> body) {
        Long schoolId = resolveTeacherSchoolId();
        boolean assignmentOwned = assignmentRepository.findById(id)
                .map(a -> schoolId == null || schoolId.equals(a.getSchoolId()))
                .orElse(false);
        if (!assignmentOwned) {
            return ResponseEntity.status(403).body(ApiResponse.error("Assignment not found or access denied"));
        }
        if (body.containsKey("grade") && body.get("grade") instanceof String g && g.length() > 50)
            return ResponseEntity.badRequest().body(ApiResponse.error("Grade cannot exceed 50 characters"));
        if (body.containsKey("feedback") && body.get("feedback") instanceof String fb && fb.length() > 2000)
            return ResponseEntity.badRequest().body(ApiResponse.error("Feedback cannot exceed 2000 characters"));
        return submissionRepository.findById(subId)
                .filter(s -> s.getAssignmentId().equals(id))
                .map(s -> {
                    if (body.containsKey("grade"))    s.setGrade((String) body.get("grade"));
                    if (body.containsKey("feedback")) s.setFeedback((String) body.get("feedback"));
                    return ResponseEntity.ok(ApiResponse.success(submissionRepository.save(s)));
                })
                .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.error("Submission not found")));
    }

    // ── Marks ──────────────────────────────────────────────────────────────────

    @GetMapping("/marks/{studentId}")
    public ResponseEntity<ApiResponse<List<Marks>>> getMarksByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(teacherService.getMarksByStudent(studentId, resolveTeacherSchoolId()));
    }

    /** Returns all marks for every student in a class in one query — eliminates N+1 per-student calls. */
    @GetMapping("/marks/by-class/{classId}")
    public ResponseEntity<ApiResponse<List<Marks>>> getMarksByClass(@PathVariable Long classId) {
        Long teacherId = resolveTeacherId(null);
        Long schoolId  = resolveTeacherSchoolId();
        // Use teacher-scoped lookup so a teacher cannot read students from classes they don't own
        ApiResponse<List<com.schoolers.model.Student>> studentsResp = teacherService.getClassStudents(teacherId, classId);
        if (!studentsResp.isSuccess()) return ResponseEntity.status(403).body(ApiResponse.error(studentsResp.getMessage()));
        List<com.schoolers.model.Student> students = studentsResp.getData() != null ? studentsResp.getData() : java.util.List.of();
        if (students.isEmpty()) return ResponseEntity.ok(ApiResponse.success(java.util.List.of()));
        List<Long> ids = students.stream().map(com.schoolers.model.Student::getId).collect(java.util.stream.Collectors.toList());
        // Single query — fetches all marks for all students in one DB round-trip
        List<Marks> marks = teacherService.getMarksByStudentIds(ids, schoolId);
        return ResponseEntity.ok(ApiResponse.success(marks));
    }

    @PostMapping("/marks")
    public ResponseEntity<ApiResponse<Marks>> addMarks(@RequestBody Marks marks) {
        return ResponseEntity.status(201).body(teacherService.addMarks(marks, resolveTeacherSchoolId()));
    }

    @PutMapping("/marks/{id}")
    public ResponseEntity<ApiResponse<Marks>> updateMarks(
            @PathVariable Long id, @RequestBody Marks marks) {
        ApiResponse<Marks> response = teacherService.updateMarks(id, marks, resolveTeacherSchoolId());
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/marks/{id}")
    public ResponseEntity<ApiResponse<String>> deleteMarks(@PathVariable Long id) {
        ApiResponse<String> response = teacherService.deleteMarks(id, resolveTeacherSchoolId());
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ── Report-card attendance (manually entered working/present days) ────────────

    /**
     * Save bulk attendance for a class + exam type.
     * Body: { className, section, examType, academicYear, totalWorkingDays,
     *         students: [ {studentId, presentDays}, … ] }
     */
    @PostMapping("/marks/report-attendance")
    public ResponseEntity<?> saveReportAttendance(
            @RequestBody Map<String, Object> body, Authentication auth) {
        Long schoolId = userRepository.findByEmailIgnoreCase(auth.getName())
                .map(User::getSchoolId).orElse(null);
        if (schoolId == null)
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        String className       = (String) body.get("className");
        String section         = body.get("section") != null ? (String) body.get("section") : "";
        String examType        = (String) body.get("examType");
        String academicYear    = body.get("academicYear") != null ? (String) body.get("academicYear") : "";
        int    totalWorkingDays = body.get("totalWorkingDays") instanceof Number
                ? ((Number) body.get("totalWorkingDays")).intValue() : 0;

        if (className == null || examType == null)
            return ResponseEntity.badRequest().body(ApiResponse.error("className and examType are required"));
        if (totalWorkingDays <= 0)
            return ResponseEntity.badRequest().body(ApiResponse.error("totalWorkingDays must be a positive number"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> students = (List<Map<String, Object>>) body.get("students");
        if (students == null || students.isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("students list is required"));

        int saved = 0;
        for (Map<String, Object> s : students) {
            Long studentId  = s.get("studentId") instanceof Number ? ((Number) s.get("studentId")).longValue() : null;
            int  presentDays = s.get("presentDays") instanceof Number ? ((Number) s.get("presentDays")).intValue() : 0;
            if (studentId == null) continue;
            if (presentDays < 0) presentDays = 0;
            if (presentDays > totalWorkingDays) presentDays = totalWorkingDays;
            rcaRepository.upsert(schoolId, className, section, examType, academicYear,
                    studentId, totalWorkingDays, presentDays);
            saved++;
        }
        return ResponseEntity.ok(ApiResponse.success("Attendance saved for " + saved + " students", saved));
    }

    /**
     * Get existing attendance for a class + exam type (used to pre-fill the bulk entry form).
     * Returns: { totalWorkingDays, students: [{studentId, presentDays}] }
     */
    @GetMapping("/marks/report-attendance")
    public ResponseEntity<?> getReportAttendance(
            @RequestParam String className,
            @RequestParam(required = false, defaultValue = "") String section,
            @RequestParam String examType,
            @RequestParam(required = false, defaultValue = "") String academicYear,
            Authentication auth) {
        Long schoolId = userRepository.findByEmailIgnoreCase(auth.getName())
                .map(User::getSchoolId).orElse(null);
        if (schoolId == null)
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));

        List<com.schoolers.model.ReportCardAttendance> rows =
                rcaRepository.findBySchoolIdAndClassNameAndSectionAndExamTypeAndAcademicYear(
                        schoolId, className, section, examType, academicYear);

        int totalWorkingDays = rows.isEmpty() ? 0 : rows.get(0).getTotalWorkingDays();
        List<Map<String, Object>> students = rows.stream().map(r -> {
            Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("studentId",   r.getStudentId());
            m.put("presentDays", r.getPresentDays());
            return m;
        }).collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("OK",
                Map.of("totalWorkingDays", totalWorkingDays, "students", students)));
    }

    @GetMapping("/grade-scales")
    public ResponseEntity<?> getGradeScales(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        Long schoolId = userRepository.findByEmailIgnoreCase(auth.getName())
                .map(User::getSchoolId).orElse(null);
        return ResponseEntity.ok(adminService.getGradeScales(schoolId));
    }

}
