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
    @Autowired private SchoolRepository             schoolRepository;
    @Autowired private StudentFeeAssignmentRepository feeAssignmentRepository;
    @Autowired private EmailService                 emailService;

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

        String otp    = String.format("%06d", 100000 + RANDOM.nextInt(900000));
        String hashed = AuthService.hashOtp(otp, owner.getEmail().toLowerCase());

        owner.setResetOtp(hashed);
        owner.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10));
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
            userRepository.save(owner);
            return ResponseEntity.badRequest().body(ApiResponse.error("OTP has expired. Please request a new one."));
        }

        String submitted = AuthService.hashOtp(otp.trim(), owner.getEmail().toLowerCase());
        boolean match = MessageDigest.isEqual(
                owner.getResetOtp().trim().getBytes(java.nio.charset.StandardCharsets.UTF_8),
                submitted.getBytes(java.nio.charset.StandardCharsets.UTF_8));

        if (!match)
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid OTP. Please try again."));

        // Clear OTP after successful use
        owner.setResetOtp(null);
        owner.setOtpExpiry(null);
        userRepository.save(owner);

        return ResponseEntity.ok(ApiResponse.success("OTP verified."));
    }

    /**
     * Year-wise fee summary for a school.
     * Returns: [{ year, totalFee, paidAmount, pendingAmount, studentCount }]
     */
    @GetMapping("/schools/{schoolDbId}/fee-summary")
    public ResponseEntity<ApiResponse<java.util.List<Map<String, Object>>>> getFeeSummary(
            @PathVariable Long schoolDbId) {

        School school = schoolRepository.findById(schoolDbId).orElse(null);
        if (school == null)
            return ResponseEntity.status(404).body(ApiResponse.error("School not found."));

        java.util.List<Object[]> rows = feeAssignmentRepository.feeSummaryByYear(schoolDbId);
        java.util.List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new java.util.LinkedHashMap<>();
            java.math.BigDecimal total  = (java.math.BigDecimal) row[1];
            java.math.BigDecimal paid   = (java.math.BigDecimal) row[2];
            java.math.BigDecimal pending = total.subtract(paid).max(java.math.BigDecimal.ZERO);
            item.put("year",          row[0]);
            item.put("totalFee",      total);
            item.put("paidAmount",    paid);
            item.put("pendingAmount", pending);
            item.put("studentCount",  row[3]);
            result.add(item);
        }
        return ResponseEntity.ok(ApiResponse.success(result));
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
