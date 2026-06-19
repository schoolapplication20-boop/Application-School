package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Certificate;
import com.schoolers.model.ExamSchedule;
import com.schoolers.model.HallTicket;
import com.schoolers.security.CurrentUserUtil;
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
public class ExaminationController {

    @Autowired
    private ExaminationService examinationService;

    @Autowired
    private CurrentUserUtil currentUserUtil;

    private String currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }

    // ============================================================
    // EXAM SCHEDULES — Admin/SuperAdmin manage, Teacher/Parent read
    // ============================================================

    @GetMapping("/schedules")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'STUDENT')")
    public ResponseEntity<ApiResponse<List<ExamSchedule>>> getSchedules(
            @RequestParam(required = false) String className,
            @RequestParam(required = false) String examType,
            Authentication auth) {
        return ResponseEntity.ok(examinationService.getAllSchedules(className, examType, currentUserUtil.getCurrentSchoolId(auth)));
    }

    @PostMapping("/schedules")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<ExamSchedule>> createSchedule(
            @RequestBody Map<String, Object> body, Authentication auth) {
        return ResponseEntity.ok(examinationService.createSchedule(body, currentUserUtil.getCurrentSchoolId(auth)));
    }

    @PutMapping("/schedules/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<ExamSchedule>> updateSchedule(
            @PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        return ResponseEntity.ok(examinationService.updateSchedule(id, body, currentUserUtil.getCurrentSchoolId(auth)));
    }

    @DeleteMapping("/schedules/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSchedule(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(examinationService.deleteSchedule(id, currentUserUtil.getCurrentSchoolId(auth)));
    }

    // ============================================================
    // HALL TICKETS — Admin generates, Teacher/Parent view/download
    // ============================================================

    @GetMapping("/hall-tickets")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<HallTicket>>> getHallTickets(
            @RequestParam(required = false) String className,
            @RequestParam(required = false) String examType,
            Authentication auth) {
        return ResponseEntity.ok(examinationService.getAllHallTickets(className, examType, currentUserUtil.getCurrentSchoolId(auth)));
    }

    @GetMapping("/hall-tickets/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<HallTicket>>> getHallTicketsByStudent(
            @PathVariable Long studentId, Authentication auth) {
        return ResponseEntity.ok(examinationService.getHallTicketsByStudent(studentId, currentUserUtil.getCurrentSchoolId(auth)));
    }

    @PostMapping("/hall-tickets")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<HallTicket>> createHallTicket(
            @RequestBody Map<String, Object> body, Authentication auth) {
        return ResponseEntity.ok(examinationService.createHallTicket(body, currentUser(), currentUserUtil.getCurrentSchoolId(auth)));
    }

    @PostMapping("/hall-tickets/bulk")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<HallTicket>> generateBulk(
            @RequestBody Map<String, Object> body, Authentication auth) {
        return ResponseEntity.ok(examinationService.generateBulkHallTickets(body, currentUser(), currentUserUtil.getCurrentSchoolId(auth)));
    }

    @DeleteMapping("/hall-tickets/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteHallTicket(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(examinationService.deleteHallTicket(id, currentUserUtil.getCurrentSchoolId(auth)));
    }

    // ============================================================
    // CERTIFICATES — Admin generates, Teacher verifies, Parent downloads
    // ============================================================

    @GetMapping("/certificates")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<Certificate>>> getCertificates(
            @RequestParam(required = false) String type, Authentication auth) {
        return ResponseEntity.ok(examinationService.getAllCertificates(type, currentUserUtil.getCurrentSchoolId(auth)));
    }

    @GetMapping("/certificates/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<Certificate>>> getCertificatesByStudent(
            @PathVariable Long studentId, Authentication auth) {
        return ResponseEntity.ok(examinationService.getCertificatesByStudent(studentId, currentUserUtil.getCurrentSchoolId(auth)));
    }

    @GetMapping("/certificates/verify/{certId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Certificate>> findByCertId(@PathVariable String certId, Authentication auth) {
        return ResponseEntity.ok(examinationService.findByCertificateId(certId, currentUserUtil.getCurrentSchoolId(auth)));
    }

    @PostMapping("/certificates")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Certificate>> createCertificate(
            @RequestBody Map<String, Object> body, Authentication auth) {
        return ResponseEntity.ok(examinationService.createCertificate(body, currentUser(), currentUserUtil.getCurrentSchoolId(auth)));
    }

    @PatchMapping("/certificates/{id}/verify")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<Certificate>> verifyCertificate(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(examinationService.verifyCertificate(id, currentUser(), currentUserUtil.getCurrentSchoolId(auth)));
    }

    @DeleteMapping("/certificates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteCertificate(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(examinationService.deleteCertificate(id, currentUserUtil.getCurrentSchoolId(auth)));
    }
}
