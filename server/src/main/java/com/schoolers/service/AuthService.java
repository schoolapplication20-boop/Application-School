package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.LoginRequest;
import com.schoolers.dto.LoginResponse;
import com.schoolers.model.School;
import com.schoolers.model.Student;
import com.schoolers.model.User;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.StudentRepository;
import com.schoolers.repository.TeacherRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Autowired private UserRepository        userRepository;
    @Autowired private StudentRepository     studentRepository;
    @Autowired private SchoolRepository      schoolRepository;
    @Autowired private TeacherRepository     teacherRepository;
    @Autowired private JwtUtil               jwtUtil;
    @Autowired private PasswordEncoder       passwordEncoder;
    @Autowired private EmailService          emailService;
    @Autowired private TokenBlacklistService tokenBlacklistService;

    private static final int MAX_LOGIN_ATTEMPTS = 5;

    // All OTP data is persisted directly on the User record in the database.
    // No in-memory caches — restarts and multi-instance deployments are safe.

    // ── Login ─────────────────────────────────────────────────────────────────

    @Transactional
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
                user = userRepository.findByEmailIgnoreCaseForUpdate(username).orElse(null);
                if (user == null) {
                    user = userRepository.findByUsername(username).orElse(null);
                    if (user != null) username = user.getEmail();
                }
                // Try admission number lookup (for students who log in with their admission number)
                if (user == null) {
                    java.util.List<Student> byAdmission = studentRepository.findAllByAdmissionNumberIgnoreCase(username);
                    if (byAdmission.size() == 1) {
                        Student s = byAdmission.get(0);
                        if (s.getStudentUserId() != null) {
                            user = userRepository.findById(s.getStudentUserId()).orElse(null);
                            if (user != null) username = user.getEmail();
                        }
                    } else if (byAdmission.size() > 1) {
                        return ApiResponse.error("Multiple accounts found with this admission number. Please use your email address to log in.");
                    }
                }
                if (user == null)
                    return ApiResponse.error("No account found with this email or admission number. Please contact admin.");
            }

            // ── Step 2: Status checks ──────────────────────────────────────
            if (!Boolean.TRUE.equals(user.getIsActive())) {
                // Account pending email verification (SUPER_ADMIN self-registered OR student bulk-imported)
                if (user.getResetOtp() != null) {
                    return ApiResponse.error("Please verify your email before logging in. Check your inbox for the 6-digit activation OTP.");
                }
                return ApiResponse.error("Your account has been deactivated. Please contact admin.");
            }

            // ── Step 2b: Account lockout check ────────────────────────────
            // Lock is active only when lockedUntil is in the future.
            // Old records with a past timestamp (set by code that used now() instead of now()+100y)
            // are automatically recognised as unlocked by this time-based comparison.
            if (user.getLockedUntil() != null
                    && user.getLockedUntil().isAfter(LocalDateTime.now(ZoneOffset.UTC))) {
                return ApiResponse.error("Your account has been locked after too many failed attempts. "
                        + "Please use 'Forgot Password' to reset your password and unlock your account.");
            }

            // ── Step 3: Password ───────────────────────────────────────────
            // Password is validated BEFORE subscription checks (S-21) so that unauthenticated
            // requests cannot probe whether a school's subscription is active or expired.
            if (request.getPassword() == null || request.getPassword().isBlank())
                return ApiResponse.error("Password is required.");
            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

                int attempts = (user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts()) + 1;
                user.setFailedLoginAttempts(attempts);

                if (attempts >= MAX_LOGIN_ATTEMPTS) {
                    // Lock permanently — cleared only when user completes a password reset via OTP.
                    user.setLockedUntil(now.plusYears(100));
                    user.setFailedLoginAttempts(0);
                    userRepository.save(user);
                    log.warn("[login] Account locked after {} failed attempts: {}", MAX_LOGIN_ATTEMPTS, user.getEmail());
                    String lockedEmail = user.getEmail();
                    if (lockedEmail != null && !lockedEmail.endsWith("@my-skoolz.com")) {
                        try { emailService.sendAccountLockedEmail(lockedEmail, user.getName()); }
                        catch (Exception ignored) {}
                    }
                    return ApiResponse.error("Account locked after " + MAX_LOGIN_ATTEMPTS + " failed attempts. "
                            + "Please use 'Forgot Password' to reset your password and unlock your account.");
                }
                userRepository.save(user);
                int remaining = MAX_LOGIN_ATTEMPTS - attempts;
                return ApiResponse.error("Invalid password. " + remaining + " attempt" + (remaining == 1 ? "" : "s") + " remaining.");
            }
            // Reset counter on successful password match
            if (user.getFailedLoginAttempts() != null && user.getFailedLoginAttempts() > 0) {
                user.setFailedLoginAttempts(0);
                userRepository.save(user);
            }

            // ── Single school lookup reused for subscription, branding, and setup checks ──
            // Runs after password is verified so unauthenticated callers can't probe subscription state (S-21).
            java.util.Optional<School> cachedSchoolOpt = java.util.Optional.empty();
            if (user.getRole() != User.Role.APPLICATION_OWNER && user.getSchoolId() != null) {
                cachedSchoolOpt = schoolRepository.findBySchoolId(user.getSchoolId().intValue());
                if (cachedSchoolOpt.isEmpty()) cachedSchoolOpt = schoolRepository.findById(user.getSchoolId());

                boolean schoolActive = cachedSchoolOpt.map(s -> Boolean.TRUE.equals(s.getIsActive())).orElse(true);
                if (!schoolActive)
                    return ApiResponse.error("Your school's subscription has ended. Please reach out to the My-Skoolz team to reactivate.");

                boolean expired = cachedSchoolOpt.map(s ->
                    s.getSubscriptionExpiry() != null &&
                    !s.getSubscriptionExpiry().isAfter(java.time.LocalDate.now())
                ).orElse(false);
                if (expired)
                    return ApiResponse.error("Your school's subscription has expired. Please contact the My-Skoolz team to renew.");
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
                String otp = String.format("%06d", new SecureRandom().nextInt(1_000_000));
                user.setResetOtp(hashOtp(otp, user.getEmail()));
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

            // ── Step 5: School branding + setup check (reuse cached lookup) ──────
            LoginResponse.SchoolDto schoolDto = cachedSchoolOpt.map(this::toSchoolDto).orElse(null);

            Boolean needsSchoolSetup = null;
            if (user.getRole() == User.Role.SUPER_ADMIN) {
                needsSchoolSetup = user.getSchoolId() == null
                        || cachedSchoolOpt.map(s -> !Boolean.TRUE.equals(s.getIsSetupCompleted())).orElse(true);
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

            String dbOtpHash = user.getResetOtp();
            LocalDateTime expiry = user.getOtpExpiry();

            if (expiry != null && LocalDateTime.now(ZoneOffset.UTC).isAfter(expiry)) {
                user.setResetOtp(null);
                user.setOtpExpiry(null);
                user.setFailedLoginAttempts(0);
                userRepository.save(user);
                return ApiResponse.error("OTP has expired. Please log in again.");
            }

            String submittedOwnerHash = hashOtp(otp.trim(), email.trim().toLowerCase());
            if (dbOtpHash == null || !constantTimeEquals(dbOtpHash.trim(), submittedOwnerHash)) {
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
        String verifyOtp = String.format("%06d", new SecureRandom().nextInt(1_000_000));
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
                .resetOtp(hashOtp(verifyOtp, normalizedEmail))
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

        String normalizedEmail2 = email.trim().toLowerCase();
        String dbOtp = user.getResetOtp();
        if (dbOtp == null || !constantTimeEquals(dbOtp.trim(), hashOtp(otp.trim(), normalizedEmail2)))
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

    // ── Student self-signup ───────────────────────────────────────────────────

    /**
     * Lets a student create their own account using their admission number.
     * The admin must have already imported the student record (with or without email).
     * On success the account is inactive until the student verifies their email.
     */
    @org.springframework.transaction.annotation.Transactional
    public ApiResponse<Map<String, Object>> studentSignup(
            Integer schoolCode, String admissionNumber, String email, String password) {

        if (schoolCode == null) return ApiResponse.error("School ID is required");
        if (admissionNumber == null || admissionNumber.isBlank()) return ApiResponse.error("Admission number is required");
        if (email == null || email.isBlank()) return ApiResponse.error("Email is required");
        String studentPwdError = validatePasswordComplexity(password);
        if (studentPwdError != null) return ApiResponse.error(studentPwdError);

        School school = schoolRepository.findBySchoolId(schoolCode).orElse(null);
        if (school == null) return ApiResponse.error("School not found. Please check your School ID.");

        Student student = studentRepository
                .findBySchoolIdAndAdmissionNumberIgnoreCase(school.getId(), admissionNumber.trim())
                .orElse(null);
        if (student == null) return ApiResponse.error("No student found with this admission number in that school.");

        if (student.getStudentUserId() != null)
            return ApiResponse.error("An account already exists for this admission number. Please login or use Forgot Password.");

        String normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail.matches("^[\\w.+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"))
            return ApiResponse.error("Please enter a valid email address.");
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail))
            return ApiResponse.error("This email is already registered. Use a different email or try Forgot Password.");

        String otp = String.format("%06d", new SecureRandom().nextInt(1_000_000));
        LocalDateTime otpExpiry = LocalDateTime.now(ZoneOffset.UTC).plusMinutes(15);

        User studentUser = userRepository.save(User.builder()
                .name(student.getName())
                .email(normalizedEmail)
                .username(normalizedEmail)
                .studentId(student.getId())
                .password(passwordEncoder.encode(password))
                .role(User.Role.STUDENT)
                .isActive(false)
                .firstLogin(true)
                .schoolId(school.getId())
                .resetOtp(hashOtp(otp, normalizedEmail))
                .otpExpiry(otpExpiry)
                .build());

        student.setStudentUserId(studentUser.getId());
        studentRepository.save(student);

        try { emailService.sendRegistrationOtp(normalizedEmail, student.getName(), otp); }
        catch (Exception e) { log.warn("[studentSignup] Could not send OTP to {}: {}", normalizedEmail, e.getMessage()); }

        log.info("[studentSignup] Student {} signed up, pending email verification", normalizedEmail);
        return ApiResponse.success(
                "Account created! Please check your email for a 6-digit verification code.",
                Map.of("email", normalizedEmail));
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
            if (n > 9999) throw new IllegalStateException("Could not generate a unique school code for: " + base);
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

            String resolvedEmail = null; // the email address we will actually send the OTP to

            if (isEmail) {
                String email = identifier.trim().toLowerCase();
                user = userRepository.findByEmailIgnoreCase(email).orElse(null);
                if (user == null) user = userRepository.findByEmail(email).orElse(null);
                // Return the same message whether the account exists or not — prevents enumeration
                if (user == null) return ApiResponse.success("If this account exists, an OTP has been sent.", null);
                resolvedEmail = user.getEmail();
            } else {
                // Try mobile number first
                user = userRepository.findByMobile(identifier.trim()).orElse(null);

                // Not found by mobile → try as student admission number
                if (user == null) {
                    java.util.List<com.schoolers.model.Student> students =
                            studentRepository.findAllByAdmissionNumberIgnoreCase(identifier.trim());
                    if (students.size() == 1) {
                        com.schoolers.model.Student student = students.get(0);
                        if (student.getStudentUserId() != null) {
                            user = userRepository.findById(student.getStudentUserId()).orElse(null);
                        }
                    }
                    log.info("[forgotPassword] Admission-number lookup for '{}': {} student(s) found, user={}",
                            identifier, students.size(), user != null ? user.getId() : "null");
                }

                if (user == null) return ApiResponse.success("If this account exists, an OTP has been sent.", null);
                // OTP will be sent to the user's registered email address
                resolvedEmail = user.getEmail();
            }

            if (resolvedEmail == null || resolvedEmail.isBlank()) {
                log.warn("[forgotPassword] No email on file for identifier='{}' userId={}", identifier, user.getId());
                // Still return opaque success — don't reveal account details
                return ApiResponse.success("If this account exists, an OTP has been sent.", null);
            }

            String otp = String.format("%06d", new SecureRandom().nextInt(1_000_000));
            LocalDateTime expiry = LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10);
            // Hash uses the resolved email as salt (consistent for this user regardless of identifier format)
            user.setResetOtp(hashOtp(otp, resolvedEmail.toLowerCase()));
            user.setOtpExpiry(expiry);
            userRepository.save(user);

            try {
                emailService.sendOtpEmail(resolvedEmail.toLowerCase(), otp);
                return ApiResponse.success("If this account exists, an OTP has been sent.", null);
            } catch (Exception mailEx) {
                log.error("[forgotPassword] Failed to send OTP email to {}: {}", resolvedEmail, mailEx.getMessage());
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

        // Generic error message — do NOT reveal whether the identifier is registered
        final String INVALID_MSG = "Invalid or expired OTP. Please request a new one.";

        if (isEmail) {
            user = userRepository.findByEmailIgnoreCase(identifier.trim().toLowerCase()).orElse(null);
            if (user == null) return ApiResponse.error(INVALID_MSG);
        } else {
            // Try mobile first, then admission number (same resolution order as forgotPassword)
            user = userRepository.findByMobile(identifier.trim()).orElse(null);
            if (user == null) {
                java.util.List<com.schoolers.model.Student> students =
                        studentRepository.findAllByAdmissionNumberIgnoreCase(identifier.trim());
                if (students.size() == 1 && students.get(0).getStudentUserId() != null) {
                    user = userRepository.findById(students.get(0).getStudentUserId()).orElse(null);
                }
            }
            if (user == null) return ApiResponse.error(INVALID_MSG);
        }

        // Brute-force protection: invalidate OTP after 5 wrong attempts
        int otpAttempts = user.getFailedLoginAttempts() == null ? 0 : user.getFailedLoginAttempts();
        if (otpAttempts >= 5) {
            user.setResetOtp(null);
            user.setOtpExpiry(null);
            user.setFailedLoginAttempts(0);
            userRepository.save(user);
            return ApiResponse.error(INVALID_MSG);
        }

        String dbOtpHash = user.getResetOtp();
        LocalDateTime expiry = user.getOtpExpiry();
        if (expiry != null && LocalDateTime.now(ZoneOffset.UTC).isAfter(expiry))
            return ApiResponse.error(INVALID_MSG);

        // Salt for verification = user's registered email (same as in forgotPassword)
        String emailSalt = user.getEmail() != null ? user.getEmail().toLowerCase() : identifier.trim().toLowerCase();
        String submittedHash = hashOtp(otp.trim(), emailSalt);
        if (dbOtpHash == null || !constantTimeEquals(dbOtpHash.trim(), submittedHash)) {
            user.setFailedLoginAttempts(otpAttempts + 1);
            userRepository.save(user);
            return ApiResponse.error(INVALID_MSG);
        }

        // Mark OTP as verified — resetPassword() checks for this sentinel before allowing reset.
        // 15-minute window: prevents the verified state from persisting indefinitely.
        user.setResetOtp("VERIFIED");
        user.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(15));
        user.setFailedLoginAttempts(0);
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
            if (user == null) return ApiResponse.error("OTP verification required before resetting password.");
        } else {
            // Try mobile, then admission number (same resolution order)
            user = userRepository.findByMobile(identifier.trim()).orElse(null);
            if (user == null) {
                java.util.List<com.schoolers.model.Student> students =
                        studentRepository.findAllByAdmissionNumberIgnoreCase(identifier.trim());
                if (students.size() == 1 && students.get(0).getStudentUserId() != null) {
                    user = userRepository.findById(students.get(0).getStudentUserId()).orElse(null);
                }
            }
            if (user == null) return ApiResponse.error("OTP verification required before resetting password.");
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
        user.setTempPassword(null);
        user.setFirstLogin(false);
        // Clear lockout and failure counter so the fresh password works on the first try
        user.setLockedUntil(null);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);
        // Revoke all existing sessions so stolen tokens can't be reused (S-15)
        tokenBlacklistService.revokeUser(user.getId());
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
        // Invalidate any existing tokens so the user re-authenticates with the new password (S-16)
        tokenBlacklistService.revokeUser(user.getId());
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
        // Invalidate existing tokens; user must re-login with new password (S-15)
        tokenBlacklistService.revokeUser(user.getId());
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

    /**
     * Hash a plain-text OTP with SHA-256 using the identifier (email/mobile) as a salt.
     * Returns a 16-character hex string (first 8 bytes of SHA-256) — fits in VARCHAR(64)
     * and is sufficient to protect a 6-digit OTP from offline brute-force if the DB is
     * compromised (attacker must hash all 1M combinations per account, and the per-account
     * 5-attempt limit and 10-min expiry still apply online).
     * The "VERIFIED" sentinel is stored as-is (no hash).
     */
    public static String hashOtp(String otp, String salt) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String input = (salt != null ? salt.toLowerCase() : "") + ":" + otp;
            byte[] hash = digest.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            // Return the full 64-char hex for defence-in-depth (column is now VARCHAR(64))
            StringBuilder sb = new StringBuilder(64);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            // SHA-256 is always present in the JDK — this can never happen
            throw new IllegalStateException("SHA-256 not available", e);
        }
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
