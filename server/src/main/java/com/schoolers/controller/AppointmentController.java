package com.schoolers.controller;

import com.schoolers.repository.UserRepository;
import com.schoolers.service.AppointmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
public class AppointmentController {

    @Autowired private AppointmentService appointmentService;
    @Autowired private UserRepository     userRepository;

    private Long userId(Authentication auth) {
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(u -> u.getId()).orElseThrow();
    }

    // ── Student endpoints ─────────────────────────────────────────────────────

    @PostMapping("/api/student/appointments")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> studentRequest(@RequestBody Map<String, Object> body, Authentication auth) {
        String topic        = (String) body.get("topic");
        String proposedTime = (String) body.get("proposedTime");
        String studentNote  = (String) body.get("studentNote");
        LocalDate proposedDate = body.get("proposedDate") != null
                ? LocalDate.parse((String) body.get("proposedDate")) : null;

        var result = appointmentService.requestByStudent(userId(auth), topic, proposedDate, proposedTime, studentNote);
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
        Long studentId      = body.get("studentId") != null ? Long.valueOf(body.get("studentId").toString()) : null;
        String topic        = (String) body.get("topic");
        String proposedTime = (String) body.get("proposedTime");
        String teacherNote  = (String) body.get("teacherNote");
        LocalDate proposedDate = body.get("proposedDate") != null
                ? LocalDate.parse((String) body.get("proposedDate")) : null;

        var result = appointmentService.requestByTeacher(userId(auth), studentId, topic, proposedDate, proposedTime, teacherNote);
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
        String status        = (String) body.get("status");
        String teacherNote   = (String) body.get("teacherNote");
        String confirmedTime = (String) body.get("confirmedTime");
        LocalDate confirmedDate = body.get("confirmedDate") != null
                ? LocalDate.parse((String) body.get("confirmedDate")) : null;

        var result = appointmentService.teacherRespond(userId(auth), id, status, teacherNote, confirmedDate, confirmedTime);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    @GetMapping("/api/teacher/appointment-students")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> classStudents(Authentication auth) {
        return ResponseEntity.ok(appointmentService.getClassStudentsForTeacher(userId(auth)));
    }
}
