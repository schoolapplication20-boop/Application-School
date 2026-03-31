package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Salary;
import com.schoolers.repository.SalaryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
public class SalaryService {

    @Autowired
    private SalaryRepository salaryRepository;

    public ApiResponse<List<Salary>> getAll() {
        return ApiResponse.success(salaryRepository.findAll());
    }

    public ApiResponse<List<Salary>> getByMonthYear(String month, String year) {
        return ApiResponse.success(salaryRepository.findByMonthAndYear(month, year));
    }

    public ApiResponse<Salary> create(Map<String, Object> body) {
        String staffName = str(body, "staffName", str(body, "name", null));
        if (staffName == null || staffName.isBlank()) return ApiResponse.error("Staff name is required");

        Salary salary = Salary.builder()
                .staffId(longVal(body, "staffId", null))
                .staffName(staffName)
                .role(str(body, "role", null))
                .department(str(body, "department", null))
                .basic(decimal(body, "basic", BigDecimal.ZERO))
                .hra(decimal(body, "hra", BigDecimal.ZERO))
                .da(decimal(body, "da", BigDecimal.ZERO))
                .medical(decimal(body, "medical", BigDecimal.ZERO))
                .pf(decimal(body, "pf", BigDecimal.ZERO))
                .tax(decimal(body, "tax", BigDecimal.ZERO))
                .month(str(body, "month", null))
                .year(str(body, "year", null))
                .status(Salary.Status.PENDING)
                .build();
        return ApiResponse.success("Salary record created", salaryRepository.save(salary));
    }

    public ApiResponse<Salary> update(Long id, Map<String, Object> body) {
        return salaryRepository.findById(id)
                .map(s -> {
                    if (body.containsKey("basic"))      s.setBasic(decimal(body, "basic", s.getBasic()));
                    if (body.containsKey("hra"))        s.setHra(decimal(body, "hra", s.getHra()));
                    if (body.containsKey("da"))         s.setDa(decimal(body, "da", s.getDa()));
                    if (body.containsKey("medical"))    s.setMedical(decimal(body, "medical", s.getMedical()));
                    if (body.containsKey("pf"))         s.setPf(decimal(body, "pf", s.getPf()));
                    if (body.containsKey("tax"))        s.setTax(decimal(body, "tax", s.getTax()));
                    if (body.containsKey("department")) s.setDepartment(str(body, "department", s.getDepartment()));
                    if (body.containsKey("status")) {
                        try { s.setStatus(Salary.Status.valueOf(str(body, "status", "PENDING").toUpperCase())); }
                        catch (IllegalArgumentException ignored) {}
                    }
                    return ApiResponse.success("Salary updated", salaryRepository.save(s));
                })
                .orElse(ApiResponse.error("Salary record not found"));
    }

    public ApiResponse<Salary> paySalary(Long id, String paymentMethod) {
        return salaryRepository.findById(id)
                .map(s -> {
                    s.setStatus(Salary.Status.PAID);
                    s.setPaymentMethod(paymentMethod);
                    s.setPaidDate(LocalDate.now());
                    return ApiResponse.success("Salary paid", salaryRepository.save(s));
                })
                .orElse(ApiResponse.error("Salary record not found"));
    }

    public ApiResponse<String> delete(Long id) {
        if (!salaryRepository.existsById(id)) return ApiResponse.error("Salary record not found");
        salaryRepository.deleteById(id);
        return ApiResponse.success("Salary record deleted", "Deleted");
    }

    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }

    private Long longVal(Map<String, Object> map, String key, Long fallback) {
        Object v = map.get(key);
        if (v == null) return fallback;
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return fallback; }
    }

    private BigDecimal decimal(Map<String, Object> map, String key, BigDecimal fallback) {
        Object v = map.get(key);
        if (v == null) return fallback;
        try { return new BigDecimal(v.toString()); } catch (Exception e) { return fallback; }
    }
}
