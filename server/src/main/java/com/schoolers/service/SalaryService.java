package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Holiday;
import com.schoolers.model.Salary;
import com.schoolers.model.SalaryPayment;
import com.schoolers.repository.HolidayRepository;
import com.schoolers.repository.SalaryPaymentRepository;
import com.schoolers.repository.SalaryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class SalaryService {

    @Autowired private SalaryRepository salaryRepository;
    @Autowired private HolidayRepository holidayRepository;
    @Autowired private SalaryPaymentRepository salaryPaymentRepository;

    // ── READ ────────────────────────────────────────────────────────────────

    public ApiResponse<List<Salary>> getAll() {
        return ApiResponse.success(salaryRepository.findAll());
    }

    public ApiResponse<List<Salary>> getByMonthYear(String month, String year) {
        return ApiResponse.success(salaryRepository.findByMonthAndYear(month, year));
    }

    // ── CREATE / UPDATE ─────────────────────────────────────────────────────

    @Transactional
    public ApiResponse<Salary> create(Map<String, Object> body) {
        String staffName = str(body, "staffName", str(body, "name", null));
        if (staffName == null || staffName.isBlank()) return ApiResponse.error("Staff name is required");

        String month = str(body, "month", null);
        String year  = str(body, "year", null);
        Long staffId = longVal(body, "staffId", null);

        // Upsert: if a record already exists for this staff+month+year, update it
        Salary salary = (staffId != null && month != null && year != null)
            ? salaryRepository.findByStaffIdAndMonthAndYear(staffId, month, year)
                .orElse(Salary.builder().build())
            : Salary.builder().build();

        salary.setStaffId(staffId);
        salary.setStaffName(staffName);
        salary.setRole(str(body, "role", salary.getRole()));
        salary.setDepartment(str(body, "department", salary.getDepartment()));
        salary.setBasic(decimal(body, "basic", salary.getBasic() != null ? salary.getBasic() : BigDecimal.ZERO));
        salary.setHra(decimal(body, "hra", salary.getHra() != null ? salary.getHra() : BigDecimal.ZERO));
        salary.setDa(decimal(body, "da", salary.getDa() != null ? salary.getDa() : BigDecimal.ZERO));
        salary.setMedical(decimal(body, "medical", salary.getMedical() != null ? salary.getMedical() : BigDecimal.ZERO));
        salary.setPf(decimal(body, "pf", salary.getPf() != null ? salary.getPf() : BigDecimal.ZERO));
        salary.setTax(decimal(body, "tax", salary.getTax() != null ? salary.getTax() : BigDecimal.ZERO));
        salary.setMonth(month);
        salary.setYear(year);

        if (salary.getLeavesTaken() == null) salary.setLeavesTaken(0);
        if (salary.getPaidAmount() == null) salary.setPaidAmount(BigDecimal.ZERO);
        if (salary.getStatus() == null) salary.setStatus(Salary.Status.PENDING);

        applyCalculations(salary);
        return ApiResponse.success("Salary record saved", salaryRepository.save(salary));
    }

    @Transactional
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
                applyCalculations(s);
                return ApiResponse.success("Salary updated", salaryRepository.save(s));
            })
            .orElse(ApiResponse.error("Salary record not found"));
    }

    // ── LEAVES ──────────────────────────────────────────────────────────────

    @Transactional
    public ApiResponse<Salary> updateLeaves(Long id, Map<String, Object> body) {
        return salaryRepository.findById(id)
            .map(s -> {
                int leaves = intVal(body, "leavesTaken", s.getLeavesTaken() != null ? s.getLeavesTaken() : 0);
                s.setLeavesTaken(leaves);
                applyCalculations(s);
                return ApiResponse.success("Leaves updated", salaryRepository.save(s));
            })
            .orElse(ApiResponse.error("Salary record not found"));
    }

    // ── COLLECT PAYMENT ─────────────────────────────────────────────────────

    @Transactional
    public ApiResponse<SalaryPayment> collectPayment(Long id, Map<String, Object> body) {
        return salaryRepository.findById(id)
            .map(s -> {
                BigDecimal amount = decimal(body, "amount", BigDecimal.ZERO);
                if (amount.compareTo(BigDecimal.ZERO) <= 0)
                    return ApiResponse.<SalaryPayment>error("Amount must be greater than zero");

                BigDecimal due = s.getDueAmount();
                if (amount.compareTo(due) > 0)
                    return ApiResponse.<SalaryPayment>error("Amount exceeds due: ₹" + due.setScale(2, RoundingMode.HALF_UP));

                String receiptNo = str(body, "receiptNumber", "RCP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());

                SalaryPayment payment = SalaryPayment.builder()
                    .salaryId(id)
                    .staffId(s.getStaffId())
                    .staffName(s.getStaffName())
                    .amountPaid(amount)
                    .paidDate(LocalDate.now())
                    .paymentMode(str(body, "paymentMode", "Cash"))
                    .receiptNumber(receiptNo)
                    .remarks(str(body, "remarks", null))
                    .month(s.getMonth())
                    .year(s.getYear())
                    .build();

                salaryPaymentRepository.save(payment);

                // Update salary paid amount & status
                BigDecimal newPaid = (s.getPaidAmount() != null ? s.getPaidAmount() : BigDecimal.ZERO).add(amount);
                s.setPaidAmount(newPaid);
                s.setPaymentMethod(str(body, "paymentMode", "Cash"));
                s.setPaidDate(LocalDate.now());

                BigDecimal calc = s.getCalculatedSalary() != null ? s.getCalculatedSalary() : BigDecimal.ZERO;
                if (newPaid.compareTo(calc) >= 0) s.setStatus(Salary.Status.PAID);
                else s.setStatus(Salary.Status.PROCESSING); // partial payment

                salaryRepository.save(s);
                return ApiResponse.success("Payment collected", payment);
            })
            .orElse(ApiResponse.error("Salary record not found"));
    }

    // ── PAYMENT HISTORY ─────────────────────────────────────────────────────

    public ApiResponse<List<SalaryPayment>> getPayments(Long salaryId) {
        return ApiResponse.success(salaryPaymentRepository.findBySalaryIdOrderByPaidDateDesc(salaryId));
    }

    public ApiResponse<List<SalaryPayment>> getAllPayments() {
        return ApiResponse.success(salaryPaymentRepository.findAllByOrderByPaidDateDescCreatedAtDesc());
    }

    // ── HOLIDAYS ────────────────────────────────────────────────────────────

    public ApiResponse<List<Holiday>> getHolidays() {
        return ApiResponse.success(holidayRepository.findAll());
    }

    @Transactional
    public ApiResponse<Holiday> addHoliday(Map<String, Object> body) {
        String name = str(body, "name", null);
        String dateStr = str(body, "date", null);
        if (name == null || name.isBlank()) return ApiResponse.error("Holiday name is required");
        if (dateStr == null || dateStr.isBlank()) return ApiResponse.error("Holiday date is required");

        boolean recurring = Boolean.TRUE.equals(body.get("recurring"));
        Holiday holiday = Holiday.builder()
            .name(name)
            .date(LocalDate.parse(dateStr))
            .recurring(recurring)
            .build();
        return ApiResponse.success("Holiday added", holidayRepository.save(holiday));
    }

    @Transactional
    public ApiResponse<String> deleteHoliday(Long id) {
        if (!holidayRepository.existsById(id)) return ApiResponse.error("Holiday not found");
        holidayRepository.deleteById(id);
        return ApiResponse.success("Holiday deleted", "Deleted");
    }

    // ── DELETE SALARY ────────────────────────────────────────────────────────

    @Transactional
    public ApiResponse<String> delete(Long id) {
        if (!salaryRepository.existsById(id)) return ApiResponse.error("Salary record not found");
        salaryRepository.deleteById(id);
        return ApiResponse.success("Salary record deleted", "Deleted");
    }

    // ── ATTENDANCE CALCULATION ───────────────────────────────────────────────

    private void applyCalculations(Salary s) {
        if (s.getMonth() == null || s.getYear() == null) return;

        int year  = parseYear(s.getYear());
        int month = parseMonth(s.getMonth());
        if (year <= 0 || month <= 0) return;

        YearMonth ym = YearMonth.of(year, month);
        int totalDays    = ym.lengthOfMonth();
        int weekends     = countWeekends(ym);
        int extraHolidays = countExtraHolidays(ym, month, year);
        int workingDays  = Math.max(totalDays - weekends - extraHolidays, 1);
        int leaves       = s.getLeavesTaken() != null ? s.getLeavesTaken() : 0;
        int workedDays   = Math.max(workingDays - leaves, 0);

        // Net salary components
        BigDecimal gross = s.getGross();
        BigDecimal pfAmt = s.getPf()  != null ? s.getPf()  : BigDecimal.ZERO;
        BigDecimal tax   = s.getTax() != null ? s.getTax() : BigDecimal.ZERO;
        BigDecimal net   = gross.subtract(pfAmt).subtract(tax);

        BigDecimal perDay = net.divide(BigDecimal.valueOf(workingDays), 4, RoundingMode.HALF_UP);
        BigDecimal calc   = perDay.multiply(BigDecimal.valueOf(workedDays)).setScale(2, RoundingMode.HALF_UP);

        s.setTotalDaysInMonth(totalDays);
        s.setTotalWorkingDays(workingDays);
        s.setWorkedDays(workedDays);
        s.setPerDaySalary(perDay.setScale(2, RoundingMode.HALF_UP));
        s.setCalculatedSalary(calc);

        // Recalculate status based on paid vs calculated
        BigDecimal paid = s.getPaidAmount() != null ? s.getPaidAmount() : BigDecimal.ZERO;
        if (paid.compareTo(BigDecimal.ZERO) == 0)  s.setStatus(Salary.Status.PENDING);    // Unpaid
        else if (paid.compareTo(calc) >= 0)         s.setStatus(Salary.Status.PAID);       // Fully paid
        else                                         s.setStatus(Salary.Status.PROCESSING); // Partial
    }

    private int countWeekends(YearMonth ym) {
        int count = 0;
        for (int day = 1; day <= ym.lengthOfMonth(); day++) {
            DayOfWeek dow = ym.atDay(day).getDayOfWeek();
            if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) count++;
        }
        return count;
    }

    private int countExtraHolidays(YearMonth ym, int month, int year) {
        List<Holiday> nonRecurring = holidayRepository.findNonRecurringByMonthYear(year, month);
        List<Holiday> recurring    = holidayRepository.findRecurringByMonth(month);

        long count = nonRecurring.stream()
            .filter(h -> !isWeekend(h.getDate()))
            .count();
        count += recurring.stream()
            .filter(h -> {
                LocalDate d = h.getDate().withYear(year);
                return !isWeekend(d);
            })
            .count();
        return (int) count;
    }

    private boolean isWeekend(LocalDate d) {
        return d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY;
    }

    private int parseMonth(String month) {
        if (month == null) return -1;
        try {
            return Integer.parseInt(month);
        } catch (NumberFormatException ignored) {}
        for (Month m : Month.values()) {
            if (m.getDisplayName(TextStyle.FULL, Locale.ENGLISH).equalsIgnoreCase(month.trim())) return m.getValue();
            if (m.getDisplayName(TextStyle.SHORT, Locale.ENGLISH).equalsIgnoreCase(month.trim())) return m.getValue();
        }
        return -1;
    }

    private int parseYear(String year) {
        try { return Integer.parseInt(year.trim()); } catch (Exception e) { return -1; }
    }

    // ── HELPERS ──────────────────────────────────────────────────────────────

    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }

    private Long longVal(Map<String, Object> map, String key, Long fallback) {
        Object v = map.get(key);
        if (v == null) return fallback;
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return fallback; }
    }

    private int intVal(Map<String, Object> map, String key, int fallback) {
        Object v = map.get(key);
        if (v == null) return fallback;
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return fallback; }
    }

    private BigDecimal decimal(Map<String, Object> map, String key, BigDecimal fallback) {
        Object v = map.get(key);
        if (v == null) return fallback;
        try { return new BigDecimal(v.toString()); } catch (Exception e) { return fallback; }
    }
}
