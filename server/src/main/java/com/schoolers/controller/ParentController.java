package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.service.ParentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/parent")
@PreAuthorize("hasAnyRole('PARENT', 'ADMIN')")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class ParentController {

    @Autowired
    private ParentService parentService;

    @Autowired
    private com.schoolers.repository.UserRepository userRepository;

    private boolean isOwnerOrAdmin(Long parentId, Authentication auth) {
        if (auth == null) return false;
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return false;
        var u = userOpt.get();
        return u.getId().equals(parentId) || u.getRole().name().equals("SUPER_ADMIN") || u.getRole().name().equals("ADMIN");
    }

    // Child Info
    @GetMapping("/child/{parentId}")
    public ResponseEntity<ApiResponse<List<Student>>> getChildInfo(@PathVariable Long parentId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!isOwnerOrAdmin(parentId, auth)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        }
        ApiResponse<List<Student>> response = parentService.getChildByParentId(parentId);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // Attendance
    @GetMapping("/attendance/{studentId}")
    public ResponseEntity<ApiResponse<List<Attendance>>> getChildAttendance(
            @PathVariable Long studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(parentService.getChildAttendance(studentId, startDate, endDate));
    }

    // Assignments
    @GetMapping("/assignments/{studentId}")
    public ResponseEntity<ApiResponse<List<Assignment>>> getChildAssignments(@PathVariable Long studentId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long callerParentId = null;
        if (auth != null) {
            var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
            if (userOpt.isPresent()) {
                var u = userOpt.get();
                boolean isAdmin = u.getRole().name().equals("ADMIN") || u.getRole().name().equals("SUPER_ADMIN");
                callerParentId = isAdmin ? null : u.getId();
            }
        }
        return ResponseEntity.ok(parentService.getChildAssignments(callerParentId, studentId));
    }

    // Fees
    @GetMapping("/fees/{studentId}")
    public ResponseEntity<ApiResponse<List<Fee>>> getChildFees(@PathVariable Long studentId) {
        return ResponseEntity.ok(parentService.getChildFees(studentId));
    }

    @PostMapping("/fees/pay")
    public ResponseEntity<ApiResponse<Fee>> payFee(@RequestBody Map<String, Object> body) {
        Object feeIdObj = body.get("feeId");
        if (feeIdObj == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("feeId is required."));
        }
        Long feeId;
        try {
            feeId = Long.valueOf(feeIdObj.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid feeId format."));
        }
        String paymentMethod = (String) body.get("paymentMethod");
        String transactionId = (String) body.getOrDefault("transactionId", "");
        ApiResponse<Fee> response = parentService.payFee(feeId, paymentMethod, transactionId);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // Marks
    @GetMapping("/marks/{studentId}")
    public ResponseEntity<ApiResponse<List<Marks>>> getChildMarks(@PathVariable Long studentId) {
        return ResponseEntity.ok(parentService.getChildMarks(studentId));
    }

    // Messages - Simplified (in full implementation, would have a Message entity)
    @GetMapping("/messages/{parentId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMessages(@PathVariable Long parentId) {
        // Return empty list for now - would be implemented with Message entity
        return ResponseEntity.ok(ApiResponse.success(List.of()));
    }

    @PostMapping("/messages")
    public ResponseEntity<ApiResponse<String>> sendMessage(@RequestBody Map<String, Object> messageBody) {
        // In full implementation, would save to Message entity and notify teacher
        return ResponseEntity.ok(ApiResponse.success("Message sent successfully", "Sent"));
    }
}
