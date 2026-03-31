package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Salary;
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
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class SalaryController {

    @Autowired
    private SalaryService salaryService;

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

    @PatchMapping("/{id}/pay")
    public ResponseEntity<?> paySalary(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String method = body.getOrDefault("paymentMethod", "Bank Transfer").toString();
        var response = salaryService.paySalary(id, method);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        var response = salaryService.delete(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }
}
