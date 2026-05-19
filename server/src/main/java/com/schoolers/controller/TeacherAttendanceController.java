package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.TeacherAttendance;
import com.schoolers.service.TeacherAttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher-attendance")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:5173"})
public class TeacherAttendanceController {

    @Autowired
    private TeacherAttendanceService service;

    /** Teacher marks their own attendance for today */
    @PostMapping("/mark")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<ApiResponse<TeacherAttendance>> mark(
            @RequestBody Map<String, Object> body, Authentication auth) {
        return ResponseEntity.ok(service.markAttendance(body, auth));
    }

    /** Teacher gets their own attendance for current month */
    @GetMapping("/my")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> myAttendance(Authentication auth) {
        return ResponseEntity.ok(service.getMyAttendance(auth));
    }

    /** Teacher checks if they already marked attendance today */
    @GetMapping("/today")
    @PreAuthorize("hasRole('TEACHER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> today(Authentication auth) {
        return ResponseEntity.ok(service.getTodayStatus(auth));
    }

    /** Admin / Super Admin: get all teacher attendance for a specific date */
    @GetMapping("/by-date")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> byDate(
            @RequestParam(required = false) String date, Authentication auth) {
        return ResponseEntity.ok(service.getByDate(date, auth));
    }

    /** Admin / Super Admin: get teacher attendance for a date range */
    @GetMapping("/by-range")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> byRange(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            Authentication auth) {
        return ResponseEntity.ok(service.getByRange(from, to, auth));
    }
}
