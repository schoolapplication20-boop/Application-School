package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.service.TeacherService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class TeacherController {

    @Autowired
    private TeacherService teacherService;

    // Classes
    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<ClassRoom>>> getMyClasses(
            @RequestParam(required = false) Long teacherId) {
        return ResponseEntity.ok(teacherService.getTeacherClasses(teacherId));
    }

    // Attendance
    @PostMapping("/attendance")
    public ResponseEntity<ApiResponse<String>> markAttendance(
            @RequestBody List<Map<String, Object>> attendanceList) {
        return ResponseEntity.ok(teacherService.markAttendance(attendanceList));
    }

    @GetMapping("/attendance/{classId}")
    public ResponseEntity<ApiResponse<List<Attendance>>> getAttendance(
            @PathVariable Long classId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) date = LocalDate.now();
        return ResponseEntity.ok(teacherService.getAttendanceByClassAndDate(classId, date));
    }

    // Assignments
    @GetMapping("/assignments")
    public ResponseEntity<ApiResponse<List<Assignment>>> getAssignments(
            @RequestParam(required = false) Long teacherId) {
        return ResponseEntity.ok(teacherService.getTeacherAssignments(teacherId));
    }

    @PostMapping("/assignments")
    public ResponseEntity<ApiResponse<Assignment>> createAssignment(@RequestBody Assignment assignment) {
        return ResponseEntity.status(201).body(teacherService.createAssignment(assignment));
    }

    @PutMapping("/assignments/{id}")
    public ResponseEntity<ApiResponse<Assignment>> updateAssignment(
            @PathVariable Long id, @RequestBody Assignment assignment) {
        ApiResponse<Assignment> response = teacherService.updateAssignment(id, assignment);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/assignments/{id}")
    public ResponseEntity<ApiResponse<String>> deleteAssignment(@PathVariable Long id) {
        ApiResponse<String> response = teacherService.deleteAssignment(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // Marks
    @GetMapping("/marks/{studentId}")
    public ResponseEntity<ApiResponse<List<Marks>>> getMarksByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(teacherService.getMarksByStudent(studentId));
    }

    @PostMapping("/marks")
    public ResponseEntity<ApiResponse<Marks>> addMarks(@RequestBody Marks marks) {
        return ResponseEntity.status(201).body(teacherService.addMarks(marks));
    }

    @PutMapping("/marks/{id}")
    public ResponseEntity<ApiResponse<Marks>> updateMarks(
            @PathVariable Long id, @RequestBody Marks marks) {
        ApiResponse<Marks> response = teacherService.updateMarks(id, marks);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }
}
