package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.service.ParentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    // Child Info
    @GetMapping("/child/{parentId}")
    public ResponseEntity<ApiResponse<List<Student>>> getChildInfo(@PathVariable Long parentId) {
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
        return ResponseEntity.ok(parentService.getChildAssignments(studentId));
    }

    // Fees
    @GetMapping("/fees/{studentId}")
    public ResponseEntity<ApiResponse<List<Fee>>> getChildFees(@PathVariable Long studentId) {
        return ResponseEntity.ok(parentService.getChildFees(studentId));
    }

    @PostMapping("/fees/pay")
    public ResponseEntity<ApiResponse<Fee>> payFee(@RequestBody Map<String, Object> body) {
        Long feeId = Long.valueOf(body.get("feeId").toString());
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
