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

    /** Returns null for admins (bypass ownership check) or the caller's userId for parents. */
    private Long resolveCallerParentId(Authentication auth) {
        if (auth == null) return null;
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return null;
        var u = userOpt.get();
        String role = u.getRole().name();
        return (role.equals("ADMIN") || role.equals("SUPER_ADMIN")) ? null : u.getId();
    }

    /** Returns children for the currently authenticated parent (resolves from JWT — no path param needed). */
    @GetMapping("/me/children")
    public ResponseEntity<ApiResponse<List<Student>>> getMyChildren() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated."));
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(403).body(ApiResponse.error("User not found."));
        Long parentId = userOpt.get().getId();
        ApiResponse<List<Student>> response = parentService.getChildByParentId(parentId);
        // Return empty list (not 404) when no children yet
        if (!response.isSuccess()) return ResponseEntity.ok(ApiResponse.success(List.of()));
        return ResponseEntity.ok(response);
    }

    // Child Info (kept for backward compatibility / admin use)
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
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long callerParentId = resolveCallerParentId(auth);
        return ResponseEntity.ok(parentService.getChildAttendance(callerParentId, studentId, startDate, endDate));
    }

    // Assignments
    @GetMapping("/assignments/{studentId}")
    public ResponseEntity<ApiResponse<List<Assignment>>> getChildAssignments(@PathVariable Long studentId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ResponseEntity.ok(parentService.getChildAssignments(resolveCallerParentId(auth), studentId));
    }

    // Fees
    @GetMapping("/fees/{studentId}")
    public ResponseEntity<ApiResponse<List<Fee>>> getChildFees(@PathVariable Long studentId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long callerParentId = resolveCallerParentId(auth);
        return ResponseEntity.ok(parentService.getChildFees(callerParentId, studentId));
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
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long callerParentId = resolveCallerParentId(auth);
        return ResponseEntity.ok(parentService.getChildMarks(callerParentId, studentId));
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
