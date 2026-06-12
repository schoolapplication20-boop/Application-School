package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.LeaveRequest;
import com.schoolers.repository.UserRepository;
import com.schoolers.security.CurrentUserUtil;
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
public class LeaveController {

    @Autowired
    private LeaveService leaveService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CurrentUserUtil currentUserUtil;

    // ── Admin: student leaves — accessible to both ADMIN and SUPER_ADMIN (school owner) ──
    @GetMapping("/student")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<LeaveRequest>>> getStudentLeaves(Authentication auth) {
        return ResponseEntity.ok(leaveService.getStudentLeaves(currentUserUtil.getCurrentSchoolId(auth)));
    }

    @GetMapping("/teacher")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<LeaveRequest>>> getTeacherLeaves(Authentication auth) {
        return ResponseEntity.ok(leaveService.getTeacherLeaves(currentUserUtil.getCurrentSchoolId(auth)));
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

    // ── Teacher: own leave history (school-scoped) ─────────────────────────
    @GetMapping("/my/{requesterId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<LeaveRequest>>> getMyLeaves(
            @PathVariable Long requesterId,
            @RequestParam(defaultValue = "STUDENT") String type,
            Authentication auth) {
        Long schoolId = currentUserUtil.getCurrentSchoolId(auth);
        var callerOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (callerOpt.isPresent()) {
            var caller = callerOpt.get();
            String role = caller.getRole() != null ? caller.getRole().name() : "";
            if ("TEACHER".equals(role)) {
                Long callerId = caller.getId();
                if (!requesterId.equals(callerId)) {
                    return ResponseEntity.status(403).body(ApiResponse.error("Access denied"));
                }
            }
        }
        return ResponseEntity.ok(leaveService.getLeavesByRequester(requesterId, type, schoolId));
    }

    // ── Legacy: generic create (teacher / parent self-leave) ───────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN')")
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
        var response = leaveService.updateStatus(id, body, currentUserUtil.getCurrentSchoolId(auth));
        return response.isSuccess()
                ? ResponseEntity.ok(response)
                : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        var response = leaveService.delete(id, currentUserUtil.getCurrentSchoolId(auth));
        return response.isSuccess()
                ? ResponseEntity.ok(response)
                : ResponseEntity.notFound().build();
    }
}
