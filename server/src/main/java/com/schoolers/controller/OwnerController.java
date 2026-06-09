package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.School;
import com.schoolers.model.User;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.StudentFeeAssignmentRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.AuthService;
import com.schoolers.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;

@RestController
@RequestMapping("/api/owner")
@PreAuthorize("hasRole('APPLICATION_OWNER')")
public class OwnerController {

    @Autowired private UserRepository               userRepository;
    @Autowired private SchoolRepository               schoolRepository;
    @Autowired private StudentFeeAssignmentRepository feeAssignmentRepository;
    @Autowired private com.schoolers.repository.PlatformPaymentRepository platformPaymentRepository;
    @Autowired private EmailService                   emailService;

    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Step 1: send a 6-digit confirmation OTP to the owner's email.
     * OTP is valid for 10 minutes.
     */
    @PostMapping("/confirm/request-otp")
    public ResponseEntity<ApiResponse<String>> requestActionOtp(Authentication auth) {
        User owner = resolve(auth);
        if (owner == null)
            return ResponseEntity.status(403).body(ApiResponse.error("Owner account not found."));

        String otp    = String.format("%06d", RANDOM.nextInt(1_000_000));
        String hashed = AuthService.hashOtp(otp, owner.getEmail().toLowerCase());

        owner.setResetOtp(hashed);
        owner.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10));
        owner.setFailedLoginAttempts(0);
        userRepository.save(owner);

        try {
            emailService.sendOwnerActionOtp(owner.getEmail(), otp);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to send OTP email. Please try again."));
        }

        return ResponseEntity.ok(ApiResponse.success("OTP sent to your registered email."));
    }

    /**
     * Step 2: verify the OTP the owner entered.
     * Clears the OTP after successful verification.
     */
    @PostMapping("/confirm/verify-otp")
    public ResponseEntity<ApiResponse<String>> verifyActionOtp(
            @RequestBody Map<String, String> body, Authentication auth) {

        String otp = body.get("otp");
        if (otp == null || otp.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("OTP is required."));

        User owner = resolve(auth);
        if (owner == null)
            return ResponseEntity.status(403).body(ApiResponse.error("Owner account not found."));

        if (owner.getResetOtp() == null)
            return ResponseEntity.badRequest().body(ApiResponse.error("No OTP was requested. Please send one first."));

        if (owner.getOtpExpiry() == null || LocalDateTime.now(ZoneOffset.UTC).isAfter(owner.getOtpExpiry())) {
            owner.setResetOtp(null);
            owner.setOtpExpiry(null);
            owner.setFailedLoginAttempts(0);
            userRepository.save(owner);
            return ResponseEntity.badRequest().body(ApiResponse.error("OTP has expired. Please request a new one."));
        }

        int attempts = owner.getFailedLoginAttempts() == null ? 0 : owner.getFailedLoginAttempts();
        if (attempts >= 5) {
            owner.setResetOtp(null);
            owner.setOtpExpiry(null);
            owner.setFailedLoginAttempts(0);
            userRepository.save(owner);
            return ResponseEntity.badRequest().body(ApiResponse.error("Too many incorrect attempts. Please request a new OTP."));
        }

        String submitted = AuthService.hashOtp(otp.trim(), owner.getEmail().toLowerCase());
        boolean match = MessageDigest.isEqual(
                owner.getResetOtp().trim().getBytes(java.nio.charset.StandardCharsets.UTF_8),
                submitted.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        if (!match) {
            owner.setFailedLoginAttempts(attempts + 1);
            userRepository.save(owner);
            int remaining = 5 - (attempts + 1);
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid OTP. " + remaining + " attempt(s) remaining."));
        }

        // Clear OTP after successful use
        owner.setResetOtp(null);
        owner.setOtpExpiry(null);
        owner.setFailedLoginAttempts(0);
        userRepository.save(owner);

        return ResponseEntity.ok(ApiResponse.success("OTP verified."));
    }

    /**
     * Enhanced year-wise fee summary for a school.
     * Returns: { years[], grandTotal, grandPaid, grandPending,
     *            pricePerUser, paymentPlan, activeUsers, billingTotal,
     *            adminCount, teacherCount, studentCount, superAdminCount }
     */
    @GetMapping("/schools/{schoolDbId}/fee-summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getFeeSummary(
            @PathVariable Long schoolDbId) {

        School school = schoolRepository.findById(schoolDbId).orElse(null);
        if (school == null)
            return ResponseEntity.status(404).body(ApiResponse.error("School not found."));

        // Try DB PK first; fallback to display school_id
        java.util.List<Object[]> rows = feeAssignmentRepository.feeSummaryByYear(school.getId());
        if (rows.isEmpty() && school.getSchoolId() != null) {
            rows = feeAssignmentRepository.feeSummaryByYear(school.getSchoolId().longValue());
        }

        java.util.List<Map<String, Object>> years = new java.util.ArrayList<>();
        java.math.BigDecimal grandTotal   = java.math.BigDecimal.ZERO;
        java.math.BigDecimal grandPaid    = java.math.BigDecimal.ZERO;
        java.math.BigDecimal grandPending = java.math.BigDecimal.ZERO;
        for (Object[] row : rows) {
            java.math.BigDecimal total   = row[1] != null ? (java.math.BigDecimal) row[1] : java.math.BigDecimal.ZERO;
            java.math.BigDecimal paid    = row[2] != null ? (java.math.BigDecimal) row[2] : java.math.BigDecimal.ZERO;
            java.math.BigDecimal pending = total.subtract(paid).max(java.math.BigDecimal.ZERO);
            grandTotal   = grandTotal.add(total);
            grandPaid    = grandPaid.add(paid);
            grandPending = grandPending.add(pending);
            Map<String, Object> item = new java.util.LinkedHashMap<>();
            item.put("year",          row[0]);
            item.put("totalFee",      total);
            item.put("paidAmount",    paid);
            item.put("pendingAmount", pending);
            item.put("studentCount",  row[3]);
            years.add(item);
        }

        // Determine which schoolId users actually store (display number OR DB PK, depending on migration state).
        // Try DB PK first; if returns 0 for all roles, fall back to display school_id.
        Long userSchoolId = school.getId();
        java.util.Map<String,Long> roleCounts = new java.util.HashMap<>();
        for (Object[] row : userRepository.countByRoleForSchool(userSchoolId)) {
            roleCounts.put(row[0].toString(), (Long) row[1]);
        }
        if (roleCounts.isEmpty() && school.getSchoolId() != null && !school.getId().equals(school.getSchoolId().longValue())) {
            userSchoolId = school.getSchoolId().longValue();
            for (Object[] row : userRepository.countByRoleForSchool(userSchoolId)) {
                roleCounts.put(row[0].toString(), (Long) row[1]);
            }
        }
        long activeUsers = userRepository.countActiveBySchoolId(userSchoolId);

        // Platform billing — annual fee
        java.math.BigDecimal pricePerUser = school.getPricePerUser();
        java.math.BigDecimal billingTotal = (pricePerUser != null && activeUsers > 0)
                ? pricePerUser.multiply(java.math.BigDecimal.valueOf(activeUsers)) : null;

        // Platform payments received from this school
        java.math.BigDecimal platformPaid    = platformPaymentRepository.sumAmountBySchoolId(school.getId());
        java.math.BigDecimal platformPending = (billingTotal != null)
                ? billingTotal.subtract(platformPaid).max(java.math.BigDecimal.ZERO)
                : java.math.BigDecimal.ZERO;

        Map<String, Object> response = new java.util.LinkedHashMap<>();
        response.put("years",          years);
        response.put("grandTotal",     grandTotal);
        response.put("grandPaid",      grandPaid);
        response.put("grandPending",   grandPending);
        response.put("pricePerUser",   pricePerUser);
        response.put("paymentPlan",    school.getPaymentPlan() != null ? school.getPaymentPlan() : "YEARLY");
        response.put("activeUsers",    activeUsers);
        response.put("billingTotal",   billingTotal);
        response.put("platformPaid",   platformPaid);
        response.put("platformPending",platformPending);
        response.put("adminCount",     roleCounts.getOrDefault("ADMIN",       0L));
        response.put("teacherCount",   roleCounts.getOrDefault("TEACHER",     0L));
        response.put("studentCount",   roleCounts.getOrDefault("STUDENT",     0L));
        response.put("superAdminCount",roleCounts.getOrDefault("SUPER_ADMIN", 0L));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /** List platform payments received from a school */
    @GetMapping("/schools/{schoolDbId}/platform-payments")
    public ResponseEntity<ApiResponse<java.util.List<com.schoolers.model.PlatformPayment>>> listPlatformPayments(
            @PathVariable Long schoolDbId) {
        School school = schoolRepository.findById(schoolDbId).orElse(null);
        if (school == null) return ResponseEntity.status(404).body(ApiResponse.error("School not found."));
        return ResponseEntity.ok(ApiResponse.success(
                platformPaymentRepository.findBySchoolIdOrderByPaidDateDesc(school.getId())));
    }

    /** Record a platform payment received from a school.
     *  Body: { "amount": 5000, "paidDate": "2026-06-01", "paymentMode": "BANK_TRANSFER", "notes": "..." } */
    @PostMapping("/schools/{schoolDbId}/platform-payments")
    public ResponseEntity<ApiResponse<com.schoolers.model.PlatformPayment>> recordPlatformPayment(
            @PathVariable Long schoolDbId,
            @RequestBody Map<String, Object> body) {

        School school = schoolRepository.findById(schoolDbId).orElse(null);
        if (school == null) return ResponseEntity.status(404).body(ApiResponse.error("School not found."));

        Object amtRaw = body.get("amount");
        if (amtRaw == null) return ResponseEntity.badRequest().body(ApiResponse.error("amount is required."));
        java.math.BigDecimal amount;
        try {
            amount = new java.math.BigDecimal(amtRaw.toString());
            if (amount.compareTo(java.math.BigDecimal.ZERO) <= 0)
                return ResponseEntity.badRequest().body(ApiResponse.error("amount must be greater than 0."));
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("amount must be a number."));
        }

        String paidDateStr = body.get("paidDate") != null ? body.get("paidDate").toString() : null;
        java.time.LocalDate paidDate;
        try { paidDate = paidDateStr != null ? java.time.LocalDate.parse(paidDateStr) : java.time.LocalDate.now(); }
        catch (Exception e) { paidDate = java.time.LocalDate.now(); }

        com.schoolers.model.PlatformPayment payment = com.schoolers.model.PlatformPayment.builder()
                .schoolId(school.getId())
                .amount(amount)
                .paidDate(paidDate)
                .paymentMode(body.get("paymentMode") != null ? body.get("paymentMode").toString() : null)
                .notes(body.get("notes") != null ? body.get("notes").toString() : null)
                .build();

        return ResponseEntity.ok(ApiResponse.success(platformPaymentRepository.save(payment)));
    }

    /** Update payment plan. Body: { "paymentPlan": "QUARTERLY" } */
    @PatchMapping("/schools/{schoolDbId}/payment-plan")
    public ResponseEntity<ApiResponse<String>> setPaymentPlan(
            @PathVariable Long schoolDbId,
            @RequestBody Map<String, Object> body) {
        School school = schoolRepository.findById(schoolDbId).orElse(null);
        if (school == null)
            return ResponseEntity.status(404).body(ApiResponse.error("School not found."));
        String plan = body.get("paymentPlan") != null ? body.get("paymentPlan").toString().toUpperCase() : null;
        java.util.Set<String> valid = java.util.Set.of("MONTHLY","QUARTERLY","HALF_YEARLY","YEARLY");
        if (plan == null || !valid.contains(plan))
            return ResponseEntity.badRequest().body(ApiResponse.error("paymentPlan must be MONTHLY, QUARTERLY, HALF_YEARLY, or YEARLY."));
        school.setPaymentPlan(plan);
        schoolRepository.save(school);
        return ResponseEntity.ok(ApiResponse.success("Payment plan set to " + plan + "."));
    }

    /**
     * Set or clear the per-user price for a school.
     * Body: { "pricePerUser": 50 }  — send null to remove the price.
     */
    @PatchMapping("/schools/{schoolDbId}/price-per-user")
    public ResponseEntity<ApiResponse<String>> setPricePerUser(
            @PathVariable Long schoolDbId,
            @RequestBody Map<String, Object> body) {

        School school = schoolRepository.findById(schoolDbId).orElse(null);
        if (school == null)
            return ResponseEntity.status(404).body(ApiResponse.error("School not found."));

        Object raw = body.get("pricePerUser");
        if (raw == null) {
            school.setPricePerUser(null);
        } else {
            try {
                java.math.BigDecimal price = new java.math.BigDecimal(raw.toString());
                if (price.compareTo(java.math.BigDecimal.ZERO) < 0)
                    return ResponseEntity.badRequest().body(ApiResponse.error("Price must be 0 or greater."));
                school.setPricePerUser(price);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(ApiResponse.error("pricePerUser must be a number."));
            }
        }

        schoolRepository.save(school);
        String msg = school.getPricePerUser() == null
                ? "Price per user removed."
                : "Price per user set to ₹" + school.getPricePerUser() + ".";
        return ResponseEntity.ok(ApiResponse.success(msg));
    }

    /**
     * Set or clear the user limit for a school.
     * Body: { "userLimit": 1000 }  — send null to remove the limit.
     */
    @PatchMapping("/schools/{schoolDbId}/user-limit")
    public ResponseEntity<ApiResponse<String>> setUserLimit(
            @PathVariable Long schoolDbId,
            @RequestBody Map<String, Object> body) {

        School school = schoolRepository.findById(schoolDbId).orElse(null);
        if (school == null)
            return ResponseEntity.status(404).body(ApiResponse.error("School not found."));

        Object raw = body.get("userLimit");
        if (raw == null) {
            school.setUserLimit(null); // remove limit
        } else {
            try {
                int limit = Integer.parseInt(raw.toString());
                if (limit < 1)
                    return ResponseEntity.badRequest().body(ApiResponse.error("User limit must be at least 1."));
                school.setUserLimit(limit);
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(ApiResponse.error("userLimit must be a number."));
            }
        }

        schoolRepository.save(school);
        String msg = school.getUserLimit() == null
                ? "User limit removed — school now has no limit."
                : "User limit set to " + school.getUserLimit() + ".";
        return ResponseEntity.ok(ApiResponse.success(msg));
    }

    private User resolve(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
    }
}
