package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.LoginRequest;
import com.schoolers.dto.LoginResponse;
import com.schoolers.model.School;
import com.schoolers.model.User;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.security.SecureRandom;
import java.util.logging.Logger;

@Service
public class AuthService {

    private static final Logger log = Logger.getLogger(AuthService.class.getName());

    @Autowired private UserRepository   userRepository;
    @Autowired private SchoolRepository schoolRepository;
    @Autowired private JwtUtil          jwtUtil;
    @Autowired private PasswordEncoder  passwordEncoder;

    // All OTP data is persisted directly on the User record in the database.
    // No in-memory caches — restarts and multi-instance deployments are safe.

    // ── Login ─────────────────────────────────────────────────────────────────

    public ApiResponse<LoginResponse> login(LoginRequest request) {
        try {
            // ── Step 1: Resolve the user ───────────────────────────────────
            String username;
            User   user;
            if ("mobile".equals(request.getLoginType())) {
                if (request.getMobile() == null || request.getMobile().isBlank())
                    return ApiResponse.error("Mobile number is required.");
                user = userRepository.findByMobile(request.getMobile()).orElse(null);
                if (user == null)
                    return ApiResponse.error("No account found with this mobile number. Please contact admin.");
                username = user.getEmail();
            } else {
                if (request.getEmail() == null || request.getEmail().isBlank())
                    return ApiResponse.error("Email is required.");
                username = request.getEmail().trim().toLowerCase();
                user = userRepository.findByEmailIgnoreCase(username).orElse(null);
                if (user == null) {
                    user = userRepository.findByUsername(username).orElse(null);
                    if (user != null) username = user.getEmail();
                }
                if (user == null)
                    return ApiResponse.error("No account found with this email or username. Please contact admin.");
            }

            // ── Step 2: Status checks ──────────────────────────────────────
            if (!Boolean.TRUE.equals(user.getIsActive()))
                return ApiResponse.error("Your account has been deactivated. Please contact admin.");

            // ── Step 3: Password ───────────────────────────────────────────
            if (request.getPassword() == null || request.getPassword().isBlank())
                return ApiResponse.error("Password is required.");
            if (!passwordEncoder.matches(request.getPassword(), user.getPassword()))
                return ApiResponse.error("Incorrect password. Please check your password and try again.");

            // ── Step 4: Build JWT claims (include schoolId for tenant isolation) ──
            Map<String, Object> claims = new HashMap<>();
            claims.put("role",     user.getRole().name());
            claims.put("userId",   user.getId());
            if (user.getSchoolId() != null) claims.put("schoolId", user.getSchoolId());

            UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                    user.getEmail(), user.getPassword(),
                    Collections.singletonList(
                            new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                    "ROLE_" + user.getRole().name())));

            String token = jwtUtil.generateToken(userDetails, claims);

            // ── Step 5: Load school branding ───────────────────────────────
            LoginResponse.SchoolDto schoolDto = null;
            if (user.getSchoolId() != null) {
                schoolDto = schoolRepository.findById(user.getSchoolId())
                        .map(this::toSchoolDto)
                        .orElse(null);
            }

            // ── Step 5b: Determine if SUPER_ADMIN still needs to set up their school ──
            // Each SUPER_ADMIN owns exactly one school. Setup is required when:
            //   a) No school is linked yet  (schoolId == null), OR
            //   b) The linked school's isSetupCompleted flag is still false.
            // This check is per-user so multiple SUPER_ADMINs each manage their own flow.
            Boolean needsSchoolSetup = null;
            if (user.getRole() == User.Role.SUPER_ADMIN) {
                if (user.getSchoolId() == null) {
                    needsSchoolSetup = true;
                } else {
                    needsSchoolSetup = schoolRepository.findById(user.getSchoolId())
                            .map(s -> !Boolean.TRUE.equals(s.getIsSetupCompleted()))
                            .orElse(true);
                }
            }

            LoginResponse.UserDto userDto = LoginResponse.UserDto.builder()
                    .id(user.getId())
                    .name(user.getName())
                    .email(user.getEmail())
                    .mobile(user.getMobile())
                    .role(user.getRole().name())
                    .firstLogin(Boolean.TRUE.equals(user.getFirstLogin()))
                    .permissions(user.getPermissions())
                    .schoolId(user.getSchoolId())
                    .school(schoolDto)
                    .needsSchoolSetup(needsSchoolSetup)
                    .build();

            log.info("[login] Success: " + username + " role=" + user.getRole().name()
                    + " schoolId=" + user.getSchoolId());

            return ApiResponse.success("Login successful",
                    LoginResponse.builder().token(token).user(userDto).build());

        } catch (Exception e) {
            log.severe("[login] Unexpected error: " + e.getMessage());
            return ApiResponse.error("Login failed: " + e.getMessage());
        }
    }

    // ── Register (self-service school onboarding) ─────────────────────────────

    /**
     * Creates a new School and links a SUPER_ADMIN to it in one transaction.
     * The school is created with isSetupCompleted=false so the new SUPER_ADMIN
     * is redirected to the Setup School wizard on first login to fill in full
     * school details.
     */
    @org.springframework.transaction.annotation.Transactional
    public ApiResponse<java.util.Map<String, Object>> register(String adminName, String schoolName,
                                                                String email, String password,
                                                                String phone) {
        // ── Validation ────────────────────────────────────────────────────────
        if (schoolName == null || schoolName.isBlank())
            return ApiResponse.error("School name is required.");
        if (adminName == null || adminName.isBlank())
            return ApiResponse.error("Your name is required.");
        if (email == null || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            return ApiResponse.error("A valid email address is required.");
        if (password == null || password.length() < 8)
            return ApiResponse.error("Password must be at least 8 characters.");

        String normalizedEmail = email.trim().toLowerCase();
        String normalizedPhone = (phone != null && !phone.isBlank()) ? phone.trim() : null;

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail))
            return ApiResponse.error("An account with this email already exists.");
        if (normalizedPhone != null && userRepository.existsByMobile(normalizedPhone))
            return ApiResponse.error("An account with this phone number already exists.");

        // ── Create school (minimal — wizard completes the rest) ───────────────
        String code = generateSchoolCode(schoolName.trim());
        com.schoolers.model.School school = com.schoolers.model.School.builder()
                .name(schoolName.trim())
                .code(code)
                .isSetupCompleted(false)
                .isActive(true)
                .build();
        school = schoolRepository.save(school);
        log.info("[register] Created school id=" + school.getId() + " code=" + code);

        // ── Create SUPER_ADMIN linked to the school ───────────────────────────
        User superAdmin = User.builder()
                .name(adminName.trim())
                .email(normalizedEmail)
                .mobile(normalizedPhone)
                .password(passwordEncoder.encode(password))
                .role(User.Role.SUPER_ADMIN)
                .schoolId(school.getId())
                .isActive(true)
                .firstLogin(false)
                .build();
        userRepository.save(superAdmin);
        log.info("[register] SUPER_ADMIN created email=" + normalizedEmail
                + " schoolId=" + school.getId());

        return ApiResponse.success(
                "Registration successful. Please login to complete your school setup.",
                java.util.Map.of("schoolId", school.getId(), "email", normalizedEmail));
    }

    /** Generates a short unique code from the school name (e.g. "Springfield High" → "SPRHI"). */
    private String generateSchoolCode(String name) {
        String[] words = name.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            String clean = w.replaceAll("[^A-Za-z0-9]", "");
            if (!clean.isEmpty())
                sb.append(clean.substring(0, Math.min(clean.length(), 3)).toUpperCase());
        }
        String base = sb.length() >= 3 ? sb.substring(0, Math.min(sb.length(), 8))
                : name.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        if (base.length() < 3) base = "SCH";

        String candidate = base;
        int n = 1;
        while (schoolRepository.existsByCode(candidate)) {
            candidate = (base.length() > 7 ? base.substring(0, 7) : base) + n++;
        }
        return candidate;
    }

    // ── Forgot Password ───────────────────────────────────────────────────────
    // OTP is generated and saved directly to the database. No in-memory cache.

    public ApiResponse<String> forgotPassword(String mobile) {
        User user = userRepository.findByMobile(mobile).orElse(null);
        if (user == null) return ApiResponse.error("Mobile number not registered.");

        String otp    = String.format("%04d", new SecureRandom().nextInt(10000));
        LocalDateTime expiry = LocalDateTime.now(ZoneOffset.UTC).plusMinutes(5);

        user.setResetOtp(otp);
        user.setOtpExpiry(expiry);
        userRepository.save(user);

        log.info("[DEV] OTP for " + mobile + ": " + otp);
        return ApiResponse.success("OTP sent successfully to " + mobile, otp);
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────
    // Reads OTP and expiry directly from the database — no in-memory lookup.

    public ApiResponse<String> verifyOTP(String mobile, String otp) {
        User user = userRepository.findByMobile(mobile).orElse(null);
        if (user == null) return ApiResponse.error("Mobile number not registered.");

        String dbOtp = user.getResetOtp();
        if (dbOtp == null || !dbOtp.trim().equals(otp.trim()))
            return ApiResponse.error("Invalid OTP.");

        LocalDateTime expiry = user.getOtpExpiry();
        if (expiry != null && LocalDateTime.now(ZoneOffset.UTC).isAfter(expiry))
            return ApiResponse.error("OTP has expired. Please request a new one.");

        // Clear OTP from DB after successful verification
        user.setResetOtp(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        return ApiResponse.success("OTP verified successfully", "OTP verified");
    }

    // ── Reset Password ────────────────────────────────────────────────────────
    // Reads and writes entirely from the database.

    public ApiResponse<String> resetPassword(String mobile, String newPassword) {
        User user = userRepository.findByMobile(mobile).orElse(null);
        if (user == null) return ApiResponse.error("Mobile number not registered.");
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetOtp(null);
        user.setOtpExpiry(null);
        userRepository.save(user);
        return ApiResponse.success("Password reset successfully", "Password updated");
    }

    // ── Set First Password ────────────────────────────────────────────────────

    public ApiResponse<String> setFirstPassword(String email, String currentPassword, String newPassword) {
        User user = userRepository.findByEmailIgnoreCase(
                email != null ? email.trim().toLowerCase() : email).orElse(null);
        if (user == null) return ApiResponse.error("User not found.");
        if (!Boolean.TRUE.equals(user.getFirstLogin()))
            return ApiResponse.error("This endpoint is only for first-time login password setup.");
        if (!passwordEncoder.matches(currentPassword, user.getPassword()))
            return ApiResponse.error("Temporary password is incorrect.");
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFirstLogin(false);
        user.setTempPassword(null);
        userRepository.save(user);
        return ApiResponse.success("Password set successfully", "Password updated");
    }

    // ── Change Password ───────────────────────────────────────────────────────

    public ApiResponse<String> changePassword(String email, String currentPassword, String newPassword) {
        User user = userRepository.findByEmailIgnoreCase(
                email != null ? email.trim().toLowerCase() : email).orElse(null);
        if (user == null) return ApiResponse.error("User not found.");
        if (!passwordEncoder.matches(currentPassword, user.getPassword()))
            return ApiResponse.error("Current password is incorrect.");
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFirstLogin(false);
        user.setTempPassword(null);
        userRepository.save(user);
        return ApiResponse.success("Password changed successfully", "Password updated");
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private LoginResponse.SchoolDto toSchoolDto(School s) {
        return LoginResponse.SchoolDto.builder()
                .id(s.getId())
                .name(s.getName())
                .code(s.getCode())
                .logoUrl(s.getLogoUrl())
                .primaryColor(s.getPrimaryColor())
                .secondaryColor(s.getSecondaryColor())
                .features(s.getFeatures())
                .subscriptionPlan(s.getSubscriptionPlan())
                .academicYear(s.getAcademicYear())
                .build();
    }
}
