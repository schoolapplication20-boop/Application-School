package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.LoginRequest;
import com.schoolers.dto.LoginResponse;
import com.schoolers.model.User;
import com.schoolers.repository.UserRepository;
import com.schoolers.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.logging.Logger;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.security.SecureRandom;

@Service
public class AuthService {

    private static final Logger log = Logger.getLogger(AuthService.class.getName());

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // In-memory OTP store: mobile → otp, mobile → expiry
    private final Map<String, String> otpStore = new ConcurrentHashMap<>();
    private final Map<String, LocalDateTime> otpExpiryStore = new ConcurrentHashMap<>();

    public ApiResponse<LoginResponse> login(LoginRequest request) {
        try {
            // ── Step 1: Resolve the username (email) ───────────────────────────
            String username;
            User user;
            if ("mobile".equals(request.getLoginType())) {
                if (request.getMobile() == null || request.getMobile().isBlank()) {
                    return ApiResponse.error("Mobile number is required.");
                }
                user = userRepository.findByMobile(request.getMobile()).orElse(null);
                if (user == null) {
                    log.warning("[login] Mobile not found: " + request.getMobile());
                    return ApiResponse.error("No account found with this mobile number. Please contact admin.");
                }
                username = user.getEmail();
            } else {
                if (request.getEmail() == null || request.getEmail().isBlank()) {
                    return ApiResponse.error("Email is required.");
                }
                username = request.getEmail().trim().toLowerCase();
                user = userRepository.findByEmailIgnoreCase(username).orElse(null);
                if (user == null) {
                    log.warning("[login] Email not found in DB: " + username);
                    return ApiResponse.error("No account found with this email. Please contact admin to create your account.");
                }
            }

            // ── Step 2: Account status checks ──────────────────────────────────
            if (!Boolean.TRUE.equals(user.getIsActive())) {
                log.warning("[login] Account deactivated: " + username);
                return ApiResponse.error("Your account has been deactivated. Please contact admin.");
            }

            // ── Step 3: Password check ─────────────────────────────────────────
            if (request.getPassword() == null || request.getPassword().isBlank()) {
                return ApiResponse.error("Password is required.");
            }
            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                log.warning("[login] Wrong password for: " + username);
                return ApiResponse.error("Incorrect password. Please check your password and try again.");
            }

            // ── Step 4: Generate JWT ───────────────────────────────────────────
            Map<String, Object> claims = new HashMap<>();
            claims.put("role", user.getRole().name());
            claims.put("userId", user.getId());

            UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                    user.getEmail(), user.getPassword(),
                    java.util.Collections.singletonList(
                            new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + user.getRole().name())
                    )
            );

            String token = jwtUtil.generateToken(userDetails, claims);

            LoginResponse.UserDto userDto = LoginResponse.UserDto.builder()
                    .id(user.getId())
                    .name(user.getName())
                    .email(user.getEmail())
                    .mobile(user.getMobile())
                    .role(user.getRole().name())
                    .firstLogin(Boolean.TRUE.equals(user.getFirstLogin()))
                    .permissions(user.getPermissions())
                    .build();

            log.info("[login] Success: " + username + " role=" + user.getRole().name());
            return ApiResponse.success("Login successful", LoginResponse.builder().token(token).user(userDto).build());

        } catch (Exception e) {
            log.severe("[login] Unexpected error for: " + (request != null ? request.getEmail() : "unknown") + " | " + e.getMessage());
            return ApiResponse.error("Login failed: " + e.getMessage());
        }
    }

    public ApiResponse<String> forgotPassword(String mobile) {
        User user = userRepository.findByMobile(mobile).orElse(null);
        if (user == null) {
            return ApiResponse.error("Mobile number not registered.");
        }

        // Generate 4-digit OTP
        String otp = String.format("%04d", new SecureRandom().nextInt(10000));
        LocalDateTime expiry = LocalDateTime.now(ZoneOffset.UTC).plusMinutes(5);

        // Store OTP in memory immediately (primary source for verification)
        otpStore.put(mobile, otp);
        otpExpiryStore.put(mobile, expiry);

        try {
            user.setResetOtp(otp);
            user.setOtpExpiry(expiry);
            userRepository.save(user);
        } catch (Exception e) {
            log.warning("[forgotPassword] DB save failed for " + mobile + ": " + e.getMessage());
        }

        // In production: send OTP via SMS service
        log.info("[DEV] OTP for " + mobile + ": " + otp);

        return ApiResponse.success("OTP sent successfully to " + mobile, otp);
    }

    public ApiResponse<String> verifyOTP(String mobile, String otp) {
        String cachedOtp = otpStore.get(mobile);

        if (cachedOtp == null || !cachedOtp.equals(otp)) {
            User user = userRepository.findByMobile(mobile).orElse(null);
            if (user == null) return ApiResponse.error("Mobile number not registered.");
            String dbOtp = user.getResetOtp();
            if (dbOtp == null || !dbOtp.trim().equals(otp.trim())) {
                return ApiResponse.error("Invalid OTP.");
            }
            // OTP matched from DB — re-cache it and continue
            otpStore.put(mobile, dbOtp);
        }

        otpStore.remove(mobile);
        otpExpiryStore.remove(mobile);
        return ApiResponse.success("OTP verified successfully", "OTP verified");
    }

    public ApiResponse<String> resetPassword(String mobile, String newPassword) {
        User user = userRepository.findByMobile(mobile).orElse(null);
        if (user == null) {
            return ApiResponse.error("Mobile number not registered.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetOtp(null);
        user.setOtpExpiry(null);
        userRepository.save(user);
        otpStore.remove(mobile);
        otpExpiryStore.remove(mobile);

        return ApiResponse.success("Password reset successfully", "Password updated");
    }

    public ApiResponse<String> setFirstPassword(String email, String currentPassword, String newPassword) {
        User user = userRepository.findByEmailIgnoreCase(email != null ? email.trim().toLowerCase() : email).orElse(null);
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

    public ApiResponse<String> changePassword(String email, String currentPassword, String newPassword) {
        User user = userRepository.findByEmailIgnoreCase(email != null ? email.trim().toLowerCase() : email).orElse(null);
        if (user == null) {
            return ApiResponse.error("User not found.");
        }

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ApiResponse.error("Current password is incorrect.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFirstLogin(false);
        user.setTempPassword(null);   // clear stored plain-text password
        userRepository.save(user);

        return ApiResponse.success("Password changed successfully", "Password updated");
    }
}
