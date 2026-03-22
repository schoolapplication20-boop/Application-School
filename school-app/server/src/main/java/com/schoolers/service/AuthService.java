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
import java.util.logging.Logger;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Service
public class AuthService {

    private static final Logger log = Logger.getLogger(AuthService.class.getName());

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public ApiResponse<LoginResponse> login(LoginRequest request) {
        try {
            // ── Step 1: Resolve the username (email) ───────────────────────────
            String username;
            User user;
            if ("mobile".equals(request.getLoginType())) {
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
            log.severe("[login] Unexpected error for: " + request.getEmail() + " | " + e.getMessage());
            return ApiResponse.error("Login failed: " + e.getMessage());
        }
    }

    public ApiResponse<String> forgotPassword(String mobile) {
        User user = userRepository.findByMobile(mobile).orElse(null);
        if (user == null) {
            return ApiResponse.error("Mobile number not registered.");
        }

        // Generate 4-digit OTP
        String otp = String.format("%04d", new Random().nextInt(10000));
        user.setResetOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);

        // In production: send OTP via SMS service
        System.out.println("OTP for " + mobile + ": " + otp); // Log for testing

        return ApiResponse.success("OTP sent successfully to " + mobile, otp);
    }

    public ApiResponse<String> verifyOTP(String mobile, String otp) {
        User user = userRepository.findByMobile(mobile).orElse(null);
        if (user == null) {
            return ApiResponse.error("Mobile number not registered.");
        }

        if (user.getResetOtp() == null || !user.getResetOtp().equals(otp)) {
            return ApiResponse.error("Invalid OTP.");
        }

        if (user.getOtpExpiry() == null || LocalDateTime.now().isAfter(user.getOtpExpiry())) {
            return ApiResponse.error("OTP has expired. Please request a new one.");
        }

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
