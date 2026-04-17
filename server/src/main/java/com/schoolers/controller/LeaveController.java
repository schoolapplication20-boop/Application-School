package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.LeaveRequest;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.LeaveService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leave")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:5173"})
public class LeaveController {

    @Autowired
    private LeaveService leaveService;

    @Autowired
    private UserRepository userRepository;

    /** Returns the school_id of the currently authenticated user (null for platform-level SUPER_ADMIN). */
    private Long getCurrentSchoolId(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName())
                .map(com.schoolers.model.User::getSchoolId)
                .orElse(null);
    }

    // ── Admin: student leaves (school ADMIN only — SUPER_ADMIN excluded intentionally) ──
    @GetMapping("/student")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<LeaveRequest>>> getStudentLeaves(Authentication auth) {
        return ResponseEntity.ok(leaveService.getStudentLeaves(getCurrentSchoolId(auth)));
    }

    @GetMapping("/teacher")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<LeaveRequest>>> getTeacherLeaves(Authentication auth) {
        return ResponseEntity.ok(leaveService.getTeacherLeaves(getCurrentSchoolId(auth)));
    }

    // ── Student: submit leave ───────────────────────────────────────────────
    @PostMapping("/student/submit")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> submitStudentLeave(
            @RequestBody Map<String, Object> body, Authentication auth) {
        var response = leaveService.submitStudentLeave(body, auth);
        return response.isSuccess()
                ? ResponseEntity.status(201).body(response)
                : ResponseEntity.badRequest().body(response);
    }

    // ── Student: get own leave history ─────────────────────────────────────
    @GetMapping("/student/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getMyStudentLeaves(Authentication auth) {
        return ResponseEntity.ok(leaveService.getMyStudentLeaves(auth));
    }

    // ── Teacher: get pending student leaves for assigned class ─────────────
    @GetMapping("/teacher/class")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> getClassStudentLeaves(Authentication auth) {
        return ResponseEntity.ok(leaveService.getClassStudentLeaves(auth));
    }

    // ── Teacher: approve or reject a student leave ─────────────────────────
    @PutMapping("/{id}/teacher-action")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<?> teacherAction(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        var response = leaveService.teacherAction(id, body, auth);
        return response.isSuccess()
                ? ResponseEntity.ok(response)
                : ResponseEntity.badRequest().body(response);
    }

    // ── Legacy: by requesterId path variable (parent / teacher self) ───────
    @GetMapping("/my/{requesterId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN', 'PARENT')")
    public ResponseEntity<ApiResponse<List<LeaveRequest>>> getMyLeaves(
            @PathVariable Long requesterId,
            @RequestParam(defaultValue = "STUDENT") String type) {
        return ResponseEntity.ok(leaveService.getLeavesByRequester(requesterId, type));
    }

    // ── Legacy: generic create (teacher / parent self-leave) ───────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN', 'PARENT')")
    public ResponseEntity<?> createLeave(@RequestBody Map<String, Object> body, Authentication auth) {
        var response = leaveService.createLeave(body, auth);
        return response.isSuccess()
                ? ResponseEntity.status(201).body(response)
                : ResponseEntity.badRequest().body(response);
    }

    // ── Admin: update status ───────────────────────────────────────────────
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        var response = leaveService.updateStatus(id, body, getCurrentSchoolId(auth));
        return response.isSuccess()
                ? ResponseEntity.ok(response)
                : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        var response = leaveService.delete(id, getCurrentSchoolId(auth));
        return response.isSuccess()
                ? ResponseEntity.ok(response)
                : ResponseEntity.notFound().build();
    }
}
