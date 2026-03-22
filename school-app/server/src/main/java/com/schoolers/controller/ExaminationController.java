package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Certificate;
import com.schoolers.model.ExamSchedule;
import com.schoolers.model.HallTicket;
import com.schoolers.service.ExaminationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/examination")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class ExaminationController {

    @Autowired
    private ExaminationService examinationService;

    private String currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }

    // ============================================================
    // EXAM SCHEDULES — Admin/SuperAdmin manage, Teacher/Parent read
    // ============================================================

    @GetMapping("/schedules")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT')")
    public ResponseEntity<ApiResponse<List<ExamSchedule>>> getSchedules(
            @RequestParam(required = false) String className,
            @RequestParam(required = false) String examType) {
        return ResponseEntity.ok(examinationService.getAllSchedules(className, examType));
    }

    @PostMapping("/schedules")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<ExamSchedule>> createSchedule(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(examinationService.createSchedule(body));
    }

    @PutMapping("/schedules/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<ExamSchedule>> updateSchedule(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(examinationService.updateSchedule(id, body));
    }

    @DeleteMapping("/schedules/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSchedule(@PathVariable Long id) {
        return ResponseEntity.ok(examinationService.deleteSchedule(id));
    }

    // ============================================================
    // HALL TICKETS — Admin generates, Teacher/Parent view/download
    // ============================================================

    @GetMapping("/hall-tickets")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<HallTicket>>> getHallTickets(
            @RequestParam(required = false) String className,
            @RequestParam(required = false) String examType) {
        return ResponseEntity.ok(examinationService.getAllHallTickets(className, examType));
    }

    @GetMapping("/hall-tickets/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT')")
    public ResponseEntity<ApiResponse<List<HallTicket>>> getHallTicketsByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(examinationService.getHallTicketsByStudent(studentId));
    }

    @PostMapping("/hall-tickets")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<HallTicket>> createHallTicket(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(examinationService.createHallTicket(body, currentUser()));
    }

    @PostMapping("/hall-tickets/bulk")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<HallTicket>> generateBulk(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(examinationService.generateBulkHallTickets(body, currentUser()));
    }

    @DeleteMapping("/hall-tickets/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteHallTicket(@PathVariable Long id) {
        return ResponseEntity.ok(examinationService.deleteHallTicket(id));
    }

    // ============================================================
    // CERTIFICATES — Admin generates, Teacher verifies, Parent downloads
    // ============================================================

    @GetMapping("/certificates")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<Certificate>>> getCertificates(
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(examinationService.getAllCertificates(type));
    }

    @GetMapping("/certificates/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT')")
    public ResponseEntity<ApiResponse<List<Certificate>>> getCertificatesByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(examinationService.getCertificatesByStudent(studentId));
    }

    @GetMapping("/certificates/verify/{certId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT')")
    public ResponseEntity<ApiResponse<Certificate>> findByCertId(@PathVariable String certId) {
        return ResponseEntity.ok(examinationService.findByCertificateId(certId));
    }

    @PostMapping("/certificates")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Certificate>> createCertificate(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(examinationService.createCertificate(body, currentUser()));
    }

    @PatchMapping("/certificates/{id}/verify")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Certificate>> verifyCertificate(@PathVariable Long id) {
        return ResponseEntity.ok(examinationService.verifyCertificate(id, currentUser()));
    }

    @DeleteMapping("/certificates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteCertificate(@PathVariable Long id) {
        return ResponseEntity.ok(examinationService.deleteCertificate(id));
    }
}
