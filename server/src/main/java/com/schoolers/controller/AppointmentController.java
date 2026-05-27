package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.AppointmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Map;

@RestController
public class AppointmentController {

    @Autowired private AppointmentService appointmentService;
    @Autowired private UserRepository     userRepository;

    private Long userId(Authentication auth) {
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(u -> u.getId())
                .orElseThrow(() -> new IllegalStateException("User not found"));
    }

    private LocalDate parseDate(Object val) {
        if (val == null) return null;
        try { return LocalDate.parse(val.toString()); }
        catch (DateTimeParseException e) { return null; }
    }

    private String str(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return (v instanceof String s && !s.isBlank()) ? s.trim() : null;
    }

    // ── Student endpoints ─────────────────────────────────────────────────────

    @PostMapping("/api/student/appointments")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> studentRequest(@RequestBody Map<String, Object> body, Authentication auth) {
        var result = appointmentService.requestByStudent(
                userId(auth),
                str(body, "topic"),
                parseDate(body.get("proposedDate")),
                str(body, "proposedTime"),
                str(body, "studentNote"));
        return result.isSuccess() ? ResponseEntity.status(201).body(result) : ResponseEntity.badRequest().body(result);
    }

    @GetMapping("/api/student/appointments")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> studentList(Authentication auth) {
        return ResponseEntity.ok(appointmentService.getStudentAppointments(userId(auth)));
    }

    @PatchMapping("/api/student/appointments/{id}/cancel")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> studentCancel(@PathVariable Long id, Authentication auth) {
        var result = appointmentService.studentCancel(userId(auth), id);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    // ── Teacher endpoints ─────────────────────────────────────────────────────

    @PostMapping("/api/teacher/appointments")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> teacherRequest(@RequestBody Map<String, Object> body, Authentication auth) {
        Object sidVal = body.get("studentId");
        if (sidVal == null)
            return ResponseEntity.badRequest().body(ApiResponse.error("studentId is required"));
        Long studentId;
        try { studentId = Long.valueOf(sidVal.toString()); }
        catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid studentId"));
        }

        var result = appointmentService.requestByTeacher(
                userId(auth), studentId,
                str(body, "topic"),
                parseDate(body.get("proposedDate")),
                str(body, "proposedTime"),
                str(body, "teacherNote"));
        return result.isSuccess() ? ResponseEntity.status(201).body(result) : ResponseEntity.badRequest().body(result);
    }

    @GetMapping("/api/teacher/appointments")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> teacherList(Authentication auth) {
        return ResponseEntity.ok(appointmentService.getTeacherAppointments(userId(auth)));
    }

    @PatchMapping("/api/teacher/appointments/{id}/respond")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> teacherRespond(@PathVariable Long id,
            @RequestBody Map<String, Object> body, Authentication auth) {
        var result = appointmentService.teacherRespond(
                userId(auth), id,
                str(body, "status"),
                str(body, "teacherNote"),
                parseDate(body.get("confirmedDate")),
                str(body, "confirmedTime"));
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    @GetMapping("/api/teacher/appointment-students")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> classStudents(Authentication auth) {
        return ResponseEntity.ok(appointmentService.getClassStudentsForTeacher(userId(auth)));
    }
}
