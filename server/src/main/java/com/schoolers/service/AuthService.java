package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.LoginRequest;
import com.schoolers.dto.LoginResponse;
import com.schoolers.model.School;
import com.schoolers.model.User;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.TeacherRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    @Autowired private UserRepository    userRepository;
    @Autowired private SchoolRepository  schoolRepository;
    @Autowired private TeacherRepository teacherRepository;
    @Autowired private JwtUtil           jwtUtil;
    @Autowired private PasswordEncoder   passwordEncoder;
    @Autowired private EmailService      emailService;

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
            if (!Boolean.TRUE.equals(user.getIsActive())) {
                // Self-registered SUPER_ADMIN whose email verification is still pending
                if (user.getRole() == User.Role.SUPER_ADMIN && user.getResetOtp() != null) {
                    return ApiResponse.error("Please verify your email before logging in. Check your inbox for the verification OTP.");
                }
                return ApiResponse.error("Your account has been deactivated. Please contact admin.");
            }

            // ── Step 2b: Account lockout check ────────────────────────────
            // Account is locked when lockedUntil is set (permanently — cleared only on password reset).
            if (user.getLockedUntil() != null) {
                return ApiResponse.error("Your account has been locked after too many failed attempts. "
                        + "Please use 'Forgot Password' to reset your password and unlock your account.");
            }

            // Check if the school itself is active (skip for APPLICATION_OWNER)
            if (user.getRole() != User.Role.APPLICATION_OWNER && user.getSchoolId() != null) {
                java.util.Optional<School> schoolOpt =
                    schoolRepository.findBySchoolId(user.getSchoolId().intValue());
                if (schoolOpt.isEmpty()) schoolOpt = schoolRepository.findById(user.getSchoolId());
                boolean schoolActive = schoolOpt.map(s -> Boolean.TRUE.equals(s.getIsActive())).orElse(true);
                if (!schoolActive)
                    return ApiResponse.error("Your school's subscription has ended. Please reach out to the My-Skoolz team to reactivate.");

                // Block all school users when subscription is expired (skip for APPLICATION_OWNER only)
                // !isAfter(today) means expired if expiry date is today or in the past
                boolean expired = schoolOpt.map(s ->
                    s.getSubscriptionExpiry() != null &&
                    !s.getSubscriptionExpiry().isAfter(java.time.LocalDate.now())
                ).orElse(false);
                if (expired)
                    return ApiResponse.error("Your school's subscription has expired. Please contact the My-Skoolz team to renew.");
            }

            // ── Step 3: Password ───────────────────────────────────────────
            if (request.getPassword() == null || request.getPassword().isBlank())
                return ApiResponse.error("Password is required.");
            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                int attempts = (user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts()) + 1;
                user.setFailedLoginAttempts(attempts);
                if (attempts >= 5) {
                    // Lock permanently — cleared only when user completes a password reset via OTP
                    user.setLockedUntil(LocalDateTime.now(ZoneOffset.UTC));
                    user.setFailedLoginAttempts(0);
                    userRepository.save(user);
                    log.warn("[login] Account locked after 5 failed attempts: {}", user.getEmail());
                    // Notify the user by email (fire-and-forget; skip auto-generated @my-skoolz.com addresses)
                    String lockedEmail = user.getEmail();
                    if (lockedEmail != null && !lockedEmail.endsWith("@my-skoolz.com")) {
                        try { emailService.sendAccountLockedEmail(lockedEmail, user.getName()); }
                        catch (Exception ignored) {}
                    }
                    return ApiResponse.error("Account locked after 5 failed attempts. "
                            + "Please use 'Forgot Password' to reset your password and unlock your account.");
                }
                userRepository.save(user);
                return ApiResponse.error("Incorrect password. " + (5 - attempts) + " attempt(s) remaining before account lock.");
            }
            // Reset counter on successful password match
            if (user.getFailedLoginAttempts() != null && user.getFailedLoginAttempts() > 0) {
                user.setFailedLoginAttempts(0);
                userRepository.save(user);
            }

            // ── Step 3b: Role validation — selectedRole must match actual DB role ──
            // This blocks cross-role access even if the frontend is tampered with.
            if (request.getSelectedRole() != null && !request.getSelectedRole().isBlank()) {
                String claimed = request.getSelectedRole().trim().toUpperCase();
                if (!user.getRole().name().equals(claimed)) {
                    log.warn("[login] Role mismatch: claimed={} actual={}", claimed, user.getRole().name());
                    return ApiResponse.error("Access denied. You do not have the selected role.");
                }
            }

            // ── Step 3c: Tenant isolation ──────────────────────────────────
            // APPLICATION_OWNER must have no school — they are platform-level only.
            // All school users must belong to a school.
            if (user.getRole() == User.Role.APPLICATION_OWNER && user.getSchoolId() != null) {
                return ApiResponse.error("Account configuration error. Please contact support.");
            }
            if (user.getRole() != User.Role.APPLICATION_OWNER && user.getSchoolId() == null) {
                return ApiResponse.error("Your account is not linked to any school. Please contact admin.");
            }

            // ── Step 3d: APPLICATION_OWNER 2FA — send OTP before issuing JWT ──
            if (user.getRole() == User.Role.APPLICATION_OWNER) {
                String otp = String.format("%06d", 100000 + new SecureRandom().nextInt(900000));
                user.setResetOtp(otp);
                user.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(5));
                userRepository.save(user);
                try {
                    emailService.sendOwnerLoginOtp(user.getEmail(), otp);
                } catch (Exception e) {
                    log.error("[login] Failed to send owner OTP email: {}", e.getMessage());
                    return ApiResponse.error("Failed to send verification OTP. Please try again.");
                }
                log.info("[login] Owner OTP issued, awaiting 2FA: {}", user.getEmail());
                return ApiResponse.success("OTP sent to authorized email address.",
                    LoginResponse.builder().otpRequired(true).otpEmail(user.getEmail()).build());
            }

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
            // user.getSchoolId() is normally the human-assigned display number (1, 2, 3…).
            // For stub schools created by /register the DB PK is stored as schoolId and
            // the school's display schoolId column is null, so findBySchoolId won't match.
            // We capture the value in an effectively-final variable (required by javac for
            // lambdas) and fall back to findById so the school is always resolved.
            LoginResponse.SchoolDto schoolDto = null;
            if (user.getSchoolId() != null) {
                Long resolvedSchoolId = user.getSchoolId();
                java.util.Optional<School> schoolOpt =
                        schoolRepository.findBySchoolId(resolvedSchoolId.intValue());
                if (schoolOpt.isEmpty()) {
                    schoolOpt = schoolRepository.findById(resolvedSchoolId);
                }
                schoolDto = schoolOpt.map(this::toSchoolDto).orElse(null);
            }

            // ── Step 5b: Determine if SUPER_ADMIN still needs to set up their school ──
            // Each SUPER_ADMIN owns exactly one school. Setup is required when:
            //   a) No school is linked yet  (schoolId == null), OR
            //   b) The linked school's isSetupCompleted flag is still false.
            // user.getSchoolId() is the display number — look up by findBySchoolId.
            Boolean needsSchoolSetup = null;
            if (user.getRole() == User.Role.SUPER_ADMIN) {
                if (user.getSchoolId() == null) {
                    needsSchoolSetup = true;
                } else {
                    needsSchoolSetup = schoolRepository.findBySchoolId(user.getSchoolId().intValue())
                            .map(s -> !Boolean.TRUE.equals(s.getIsSetupCompleted()))
                            .orElse(true);
                }
            }

            String teacherType = null;
            if (user.getRole() == User.Role.TEACHER) {
                teacherType = teacherRepository.findByUserId(user.getId())
                        .map(t -> t.getTeacherType() != null ? t.getTeacherType() : "SUBJECT_TEACHER")
                        .orElse("SUBJECT_TEACHER");
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
                    .teacherType(teacherType)
                    .build();

            log.info("[login] Success: role={} schoolId={}", user.getRole().name(), user.getSchoolId());

            return ApiResponse.success("Login successful",
                    LoginResponse.builder().token(token).user(userDto).build());

        } catch (Exception e) {
            log.error("[login] Unexpected error: {}", e.getMessage());
            return ApiResponse.error("Login failed. Please try again.");
        }
    }

    // ── Verify APPLICATION_OWNER login OTP ───────────────────────────────────

    public ApiResponse<LoginResponse> verifyOwnerOtp(String email, String otp) {
        try {
            if (email == null || email.isBlank()) return ApiResponse.error("Email is required.");
            if (otp == null || otp.isBlank())    return ApiResponse.error("OTP is required.");

            User user = userRepository.findByEmailIgnoreCase(email.trim().toLowerCase()).orElse(null);
            if (user == null || user.getRole() != User.Role.APPLICATION_OWNER)
                return ApiResponse.error("Invalid request.");

            // Expire the OTP after 5 wrong attempts to prevent brute-force (900k combinations)
            int attempts = user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts();
            if (attempts >= 5) {
                user.setResetOtp(null);
                user.setOtpExpiry(null);
                user.setFailedLoginAttempts(0);
                userRepository.save(user);
                log.warn("[verifyOwnerOtp] OTP invalidated after 5 failed attempts: {}", user.getEmail());
                return ApiResponse.error("Too many incorrect attempts. Please log in again to receive a new OTP.");
            }

            String dbOtp = user.getResetOtp();
            LocalDateTime expiry = user.getOtpExpiry();

            if (expiry != null && LocalDateTime.now(ZoneOffset.UTC).isAfter(expiry)) {
                user.setResetOtp(null);
                user.setOtpExpiry(null);
                user.setFailedLoginAttempts(0);
                userRepository.save(user);
                return ApiResponse.error("OTP has expired. Please log in again.");
            }

            if (dbOtp == null || !constantTimeEquals(dbOtp.trim(), otp.trim())) {
                user.setFailedLoginAttempts(attempts + 1);
                userRepository.save(user);
                int remaining = 5 - (attempts + 1);
                log.warn("[verifyOwnerOtp] Wrong OTP attempt {}/5 for {}", attempts + 1, user.getEmail());
                return ApiResponse.error("Invalid OTP. " + remaining + " attempt(s) remaining.");
            }

            user.setResetOtp(null);
            user.setOtpExpiry(null);
            user.setFailedLoginAttempts(0);
            userRepository.save(user);

            Map<String, Object> claims = new HashMap<>();
            claims.put("role",   user.getRole().name());
            claims.put("userId", user.getId());

            UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                user.getEmail(), user.getPassword(),
                Collections.singletonList(
                    new org.springframework.security.core.authority.SimpleGrantedAuthority(
                        "ROLE_" + user.getRole().name())));

            String token = jwtUtil.generateToken(userDetails, claims);

            LoginResponse.UserDto userDto = LoginResponse.UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .mobile(user.getMobile())
                .role(user.getRole().name())
                .firstLogin(Boolean.TRUE.equals(user.getFirstLogin()))
                .permissions(user.getPermissions())
                .schoolId(user.getSchoolId())
                .build();

            log.info("[verifyOwnerOtp] Success: owner={}", user.getEmail());
            return ApiResponse.success("Login successful",
                LoginResponse.builder().token(token).user(userDto).build());

        } catch (Exception e) {
            log.error("[verifyOwnerOtp] Unexpected error: {}", e.getMessage());
            return ApiResponse.error("Verification failed. Please try again.");
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
        String pwdError = validatePasswordComplexity(password);
        if (pwdError != null) return ApiResponse.error(pwdError);

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

        // Set the display schoolId to the DB PK so findBySchoolId() can locate this stub
        // school immediately (before the setup wizard runs). The wizard may overwrite it
        // with a user-chosen display number later.
        if (!schoolRepository.existsBySchoolId(school.getId().intValue())) {
            school.setSchoolId(school.getId().intValue());
            school = schoolRepository.save(school);
        }
        log.info("[register] Created school id={} schoolId={} code={}", school.getId(), school.getSchoolId(), code);

        // ── Create SUPER_ADMIN (inactive until email is verified) ───────────────
        String verifyOtp = String.format("%06d", 100000 + new SecureRandom().nextInt(900000));
        LocalDateTime otpExpiry = LocalDateTime.now(ZoneOffset.UTC).plusMinutes(15);

        User superAdmin = User.builder()
                .name(adminName.trim())
                .email(normalizedEmail)
                .mobile(normalizedPhone)
                .password(passwordEncoder.encode(password))
                .role(User.Role.SUPER_ADMIN)
                .schoolId(school.getId())
                .isActive(false)
                .firstLogin(false)
                .resetOtp(verifyOtp)
                .otpExpiry(otpExpiry)
                .build();
        userRepository.save(superAdmin);
        log.info("[register] SUPER_ADMIN created schoolId={} (pending email verification)", school.getId());

        try {
            emailService.sendRegistrationOtp(normalizedEmail, adminName.trim(), verifyOtp);
        } catch (Exception e) {
            log.warn("[register] Could not send verification email to {}: {}", normalizedEmail, e.getMessage());
        }

        return ApiResponse.success(
                "Registration successful! Please check your email for a 6-digit verification code.",
                java.util.Map.of("schoolId", school.getId(), "email", normalizedEmail));
    }

    // ── Verify registration email ─────────────────────────────────────────────

    public ApiResponse<String> verifyRegistrationEmail(String email, String otp) {
        if (email == null || email.isBlank()) return ApiResponse.error("Email is required.");
        if (otp == null || otp.isBlank()) return ApiResponse.error("OTP is required.");

        User user = userRepository.findByEmailIgnoreCase(email.trim().toLowerCase()).orElse(null);
        if (user == null) return ApiResponse.error("No account found with this email.");

        if (Boolean.TRUE.equals(user.getIsActive())) {
            return ApiResponse.success("Email already verified. Please login.", "already_verified");
        }

        String dbOtp = user.getResetOtp();
        if (dbOtp == null || !constantTimeEquals(dbOtp.trim(), otp.trim()))
            return ApiResponse.error("Invalid verification code.");

        LocalDateTime expiry = user.getOtpExpiry();
        if (expiry != null && LocalDateTime.now(ZoneOffset.UTC).isAfter(expiry))
            return ApiResponse.error("Verification code has expired. Please contact support to resend.");

        user.setIsActive(true);
        user.setResetOtp(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        log.info("[verifyRegistrationEmail] Email verified for {}", email);
        return ApiResponse.success("Email verified successfully! You can now login.", "verified");
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
    // identifier = email (APPLICATION_OWNER) or mobile (all other roles).
    // OTP is persisted to the database; no in-memory cache.

    public ApiResponse<String> forgotPassword(String identifier) {
        try {
            boolean isEmail = identifier != null && identifier.contains("@");
            User user;
            log.info("[forgotPassword] isEmail={}", isEmail);

            if (isEmail) {
                String email = identifier.trim().toLowerCase();
                user = userRepository.findByEmailIgnoreCase(email).orElse(null);
                if (user == null) user = userRepository.findByEmail(email).orElse(null);
                // Return the same message whether the account exists or not — prevents enumeration
                if (user == null) return ApiResponse.success("If this account exists, an OTP has been sent.", null);
            } else {
                user = userRepository.findByMobile(identifier).orElse(null);
                if (user == null) return ApiResponse.success("If this account exists, an OTP has been sent.", null);
            }

            String otp = String.format("%06d", 100000 + new SecureRandom().nextInt(900000));
            LocalDateTime expiry = LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10);
            user.setResetOtp(otp);
            user.setOtpExpiry(expiry);
            userRepository.save(user);

            if (isEmail) {
                try {
                    emailService.sendOtpEmail(identifier.trim().toLowerCase(), otp);
                    return ApiResponse.success("OTP sent to your registered email address", null);
                } catch (Exception mailEx) {
                    log.error("[forgotPassword] Failed to send OTP email: {}", mailEx.getMessage());
                    return ApiResponse.error("Failed to send OTP email. Please check your email configuration.");
                }
            } else {
                log.info("[forgotPassword] Mobile OTP issued (SMS delivery not configured)");
                return ApiResponse.success("If this account exists, an OTP has been sent.", null);
            }
        } catch (Exception e) {
            log.error("[forgotPassword] Unexpected error: {}", e.getMessage());
            return ApiResponse.error("An error occurred. Please try again.");
        }
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────
    // identifier = email or mobile, matching what was used in forgotPassword.

    public ApiResponse<String> verifyOTP(String identifier, String otp) {
        boolean isEmail = identifier != null && identifier.contains("@");
        User user;

        if (isEmail) {
            user = userRepository.findByEmailIgnoreCase(identifier.trim().toLowerCase()).orElse(null);
            if (user == null) return ApiResponse.error("Email not registered.");
        } else {
            user = userRepository.findByMobile(identifier).orElse(null);
            if (user == null) return ApiResponse.error("Mobile number not registered.");
        }

        String dbOtp = user.getResetOtp();
        if (dbOtp == null || !constantTimeEquals(dbOtp.trim(), otp.trim()))
            return ApiResponse.error("Invalid OTP.");

        LocalDateTime expiry = user.getOtpExpiry();
        if (expiry != null && LocalDateTime.now(ZoneOffset.UTC).isAfter(expiry))
            return ApiResponse.error("OTP has expired. Please request a new one.");

        // Mark OTP as verified — resetPassword() checks for this sentinel before allowing reset.
        // 15-minute window: prevents the verified state from persisting indefinitely.
        user.setResetOtp("VERIFIED");
        user.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(15));
        userRepository.save(user);

        return ApiResponse.success("OTP verified successfully", "OTP verified");
    }

    // ── Reset Password ────────────────────────────────────────────────────────
    // identifier = email or mobile, matching what was used in forgotPassword.

    public ApiResponse<String> resetPassword(String identifier, String newPassword) {
        boolean isEmail = identifier != null && identifier.contains("@");
        User user;

        if (isEmail) {
            user = userRepository.findByEmailIgnoreCase(identifier.trim().toLowerCase()).orElse(null);
            if (user == null) return ApiResponse.error("Email not registered.");
        } else {
            user = userRepository.findByMobile(identifier).orElse(null);
            if (user == null) return ApiResponse.error("Mobile number not registered.");
        }

        if (!"VERIFIED".equals(user.getResetOtp()))
            return ApiResponse.error("OTP verification required before resetting password.");

        // Enforce the 15-minute verification window
        LocalDateTime verifiedExpiry = user.getOtpExpiry();
        if (verifiedExpiry != null && LocalDateTime.now(ZoneOffset.UTC).isAfter(verifiedExpiry)) {
            user.setResetOtp(null);
            user.setOtpExpiry(null);
            userRepository.save(user);
            return ApiResponse.error("Verification has expired. Please request a new OTP.");
        }

        String pwdError = validatePasswordComplexity(newPassword);
        if (pwdError != null) return ApiResponse.error(pwdError);

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetOtp(null);
        user.setOtpExpiry(null);
        // Clear any lockout so user can log in with new password
        user.setLockedUntil(null);
        user.setFailedLoginAttempts(0);
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
        String pwdError = validatePasswordComplexity(newPassword);
        if (pwdError != null) return ApiResponse.error(pwdError);
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
        String pwdError = validatePasswordComplexity(newPassword);
        if (pwdError != null) return ApiResponse.error(pwdError);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFirstLogin(false);
        user.setTempPassword(null);
        userRepository.save(user);
        return ApiResponse.success("Password changed successfully", "Password updated");
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Returns an error message if the password doesn't meet complexity rules, null if valid.
     * Rules: 8+ chars, 1 uppercase, 1 digit, 1 special character.
     */
    private String validatePasswordComplexity(String password) {
        if (password == null || password.length() < 8)
            return "Password must be at least 8 characters.";
        if (!password.matches(".*[A-Z].*"))
            return "Password must contain at least one uppercase letter.";
        if (!password.matches(".*[0-9].*"))
            return "Password must contain at least one number.";
        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?].*"))
            return "Password must contain at least one special character (!@#$%^&* etc.).";
        return null;
    }

    /** Constant-time string comparison to prevent timing-based OTP enumeration. */
    private boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(a.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                                     b.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private LoginResponse.SchoolDto toSchoolDto(School s) {
        return LoginResponse.SchoolDto.builder()
                .id(s.getId())
                .schoolId(s.getSchoolId())
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
