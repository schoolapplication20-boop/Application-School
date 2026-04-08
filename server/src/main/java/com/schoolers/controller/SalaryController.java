package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Holiday;
import com.schoolers.model.Salary;
import com.schoolers.model.SalaryPayment;
import com.schoolers.service.SalaryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/salary")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
@CrossOrigin(origins = {
    "http://localhost:3000", "http://localhost:3001",
    "http://localhost:5173", "http://127.0.0.1:5173"
})
public class SalaryController {

    @Autowired
    private SalaryService salaryService;

    // ── SALARY CRUD ──────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<List<Salary>>> getAll(
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String year) {
        if (month != null && year != null) return ResponseEntity.ok(salaryService.getByMonthYear(month, year));
        return ResponseEntity.ok(salaryService.getAll());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        var response = salaryService.create(body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = salaryService.update(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        var response = salaryService.delete(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    // ── LEAVES ───────────────────────────────────────────────────────────────

    @PatchMapping("/{id}/leaves")
    public ResponseEntity<?> updateLeaves(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = salaryService.updateLeaves(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    // ── PAYMENTS ─────────────────────────────────────────────────────────────

    @PostMapping("/{id}/collect")
    public ResponseEntity<?> collectPayment(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        var response = salaryService.collectPayment(id, body);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/{id}/payments")
    public ResponseEntity<ApiResponse<List<SalaryPayment>>> getPayments(@PathVariable Long id) {
        return ResponseEntity.ok(salaryService.getPayments(id));
    }

    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<List<SalaryPayment>>> getAllPayments() {
        return ResponseEntity.ok(salaryService.getAllPayments());
    }

    // ── HOLIDAYS ─────────────────────────────────────────────────────────────

    @GetMapping("/holidays")
    public ResponseEntity<ApiResponse<List<Holiday>>> getHolidays() {
        return ResponseEntity.ok(salaryService.getHolidays());
    }

    @PostMapping("/holidays")
    public ResponseEntity<?> addHoliday(@RequestBody Map<String, Object> body) {
        var response = salaryService.addHoliday(body);
        return response.isSuccess() ? ResponseEntity.status(201).body(response) : ResponseEntity.badRequest().body(response);
    }

    @DeleteMapping("/holidays/{id}")
    public ResponseEntity<?> deleteHoliday(@PathVariable Long id) {
        var response = salaryService.deleteHoliday(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }
}
