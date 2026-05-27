package com.schoolers.controller;

import com.schoolers.service.MeetingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
public class MeetingController {

    @Autowired private MeetingService meetingService;

    // ── Teacher endpoints ─────────────────────────────────────────────────────

    @PostMapping("/api/teacher/meeting-slots")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> createSlot(@RequestBody Map<String, Object> body, Authentication auth) {
        var result = meetingService.createSlot(body, auth);
        return result.isSuccess() ? ResponseEntity.status(201).body(result) : ResponseEntity.badRequest().body(result);
    }

    @GetMapping("/api/teacher/meeting-slots")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> getTeacherSlots(Authentication auth) {
        return ResponseEntity.ok(meetingService.getTeacherSlots(auth));
    }

    @DeleteMapping("/api/teacher/meeting-slots/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> deleteSlot(@PathVariable Long id, Authentication auth) {
        var result = meetingService.deleteSlot(id, auth);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    // ── Student endpoints ─────────────────────────────────────────────────────

    @GetMapping("/api/student/meeting-slots")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getAvailableSlots(Authentication auth) {
        return ResponseEntity.ok(meetingService.getAvailableSlots(auth));
    }

    @PostMapping("/api/student/meeting-slots/{slotId}/book")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> bookSlot(@PathVariable Long slotId,
            @RequestBody(required = false) Map<String, Object> body, Authentication auth) {
        var result = meetingService.bookSlot(slotId, body != null ? body : Map.of(), auth);
        return result.isSuccess() ? ResponseEntity.status(201).body(result) : ResponseEntity.badRequest().body(result);
    }

    @GetMapping("/api/student/meeting-bookings")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getStudentBookings(Authentication auth) {
        return ResponseEntity.ok(meetingService.getStudentBookings(auth));
    }

    @PatchMapping("/api/student/meeting-bookings/{id}/cancel")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id, Authentication auth) {
        var result = meetingService.cancelBooking(id, auth);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }
}
