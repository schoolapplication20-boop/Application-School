package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Holiday;
import com.schoolers.model.Salary;
import com.schoolers.model.SalaryPayment;
import com.schoolers.security.CurrentUserUtil;
import com.schoolers.service.SalaryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/salary")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class SalaryController {

    @Autowired
    private SalaryService salaryService;

    @Autowired
    private CurrentUserUtil currentUserUtil;

    // ── SALARY CRUD ──────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<List<Salary>>> getAll(
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String year,
            Authentication auth) {
        Long schoolId = currentUserUtil.getCurrentSchoolId(auth);
        if (month != null && year != null) return ResponseEntity.ok(salaryService.getByMonthYear(month, year, schoolId));
        return ResponseEntity.ok(salaryService.getAll(schoolId));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, Authentication auth) {
        var response = salaryService.create(body, currentUserUtil.getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        var response = salaryService.update(id, body, currentUserUtil.getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        var response = salaryService.delete(id, currentUserUtil.getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ── LEAVES ───────────────────────────────────────────────────────────────

    @PatchMapping("/{id}/leaves")
    public ResponseEntity<?> updateLeaves(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        var response = salaryService.updateLeaves(id, body, currentUserUtil.getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    // ── PAYMENTS ─────────────────────────────────────────────────────────────

    @PostMapping("/{id}/collect")
    public ResponseEntity<?> collectPayment(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        var response = salaryService.collectPayment(id, body, currentUserUtil.getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/{id}/payments")
    public ResponseEntity<ApiResponse<List<SalaryPayment>>> getPayments(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(salaryService.getPayments(id, currentUserUtil.getCurrentSchoolId(auth)));
    }

    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<List<SalaryPayment>>> getAllPayments(Authentication auth) {
        return ResponseEntity.ok(salaryService.getAllPayments(currentUserUtil.getCurrentSchoolId(auth)));
    }

    // ── HOLIDAYS ─────────────────────────────────────────────────────────────

    @GetMapping("/holidays")
    public ResponseEntity<ApiResponse<List<Holiday>>> getHolidays(Authentication auth) {
        return ResponseEntity.ok(salaryService.getHolidays(currentUserUtil.getCurrentSchoolId(auth)));
    }

    @PostMapping("/holidays")
    public ResponseEntity<?> addHoliday(@RequestBody Map<String, Object> body, Authentication auth) {
        var response = salaryService.addHoliday(body, currentUserUtil.getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/holidays/{id}")
    public ResponseEntity<?> deleteHoliday(@PathVariable Long id, Authentication auth) {
        var response = salaryService.deleteHoliday(id, currentUserUtil.getCurrentSchoolId(auth));
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }
}
