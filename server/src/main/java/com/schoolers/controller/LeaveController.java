package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.LeaveRequest;
import com.schoolers.service.LeaveService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leave")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class LeaveController {

    @Autowired
    private LeaveService leaveService;

    @GetMapping("/student")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<LeaveRequest>>> getStudentLeaves() {
        return ResponseEntity.ok(leaveService.getStudentLeaves());
    }

    @GetMapping("/teacher")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<LeaveRequest>>> getTeacherLeaves() {
        return ResponseEntity.ok(leaveService.getTeacherLeaves());
    }

    @GetMapping("/my/{requesterId}")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN', 'PARENT')")
    public ResponseEntity<ApiResponse<List<LeaveRequest>>> getMyLeaves(
            @PathVariable Long requesterId,
            @RequestParam(defaultValue = "STUDENT") String type) {
        return ResponseEntity.ok(leaveService.getLeavesByRequester(requesterId, type));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN', 'PARENT')")
    public ResponseEntity<?> createLeave(@RequestBody Map<String, Object> body) {
        var response = leaveService.createLeave(body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = leaveService.updateStatus(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        var response = leaveService.delete(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }
}
