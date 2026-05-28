package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.LoginRequest;
import com.schoolers.dto.LoginResponse;
import com.schoolers.security.JwtUtil;
import com.schoolers.service.AuthService;
import com.schoolers.service.TokenBlacklistService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private AuthService authService;
    @Autowired private TokenBlacklistService tokenBlacklistService;
    @Autowired private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, Object>>> register(@RequestBody Map<String, String> body) {
        String adminName  = body.get("adminName");
        String schoolName = body.get("schoolName");
        String email      = body.get("email");
        String password   = body.get("password");
        String phone      = body.get("phone");
        ApiResponse<Map<String, Object>> response = authService.register(adminName, schoolName, email, password, phone);
        return response.isSuccess()
            ? ResponseEntity.ok(response)
            : ResponseEntity.status(400).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        ApiResponse<LoginResponse> response = authService.login(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(401).body(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@RequestBody Map<String, String> body) {
        // Accept "identifier" (email or mobile), fall back to "mobile" or "email" for compatibility
        String identifier = body.get("identifier");
        if (identifier == null || identifier.isBlank()) identifier = body.get("mobile");
        if (identifier == null || identifier.isBlank()) identifier = body.get("email");
        if (identifier == null || identifier.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Mobile number or email is required"));
        }
        ApiResponse<String> response = authService.forgotPassword(identifier);
        return response.isSuccess()
            ? ResponseEntity.ok(response)
            : ResponseEntity.status(400).body(response);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<String>> verifyOTP(@RequestBody Map<String, String> body) {
        String identifier = body.get("identifier");
        if (identifier == null || identifier.isBlank()) identifier = body.get("mobile");
        if (identifier == null || identifier.isBlank()) identifier = body.get("email");
        String otp = body.get("otp");
        if (identifier == null || otp == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Identifier and OTP are required"));
        }
        ApiResponse<String> response = authService.verifyOTP(identifier, otp);
        return response.isSuccess()
            ? ResponseEntity.ok(response)
            : ResponseEntity.status(400).body(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(@RequestBody Map<String, String> body) {
        String identifier = body.get("identifier");
        if (identifier == null || identifier.isBlank()) identifier = body.get("mobile");
        if (identifier == null || identifier.isBlank()) identifier = body.get("email");
        String newPassword = body.get("newPassword");
        if (identifier == null || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Identifier and new password are required"));
        }
        ApiResponse<String> response = authService.resetPassword(identifier, newPassword);
        return response.isSuccess()
            ? ResponseEntity.ok(response)
            : ResponseEntity.badRequest().body(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(@RequestBody Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated."));
        }
        String email = auth.getName();

        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (currentPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Current and new password are required"));
        }

        ApiResponse<String> response = authService.changePassword(email, currentPassword, newPassword);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(400).body(response);
    }

    /** Revokes the current JWT so it cannot be reused even before its natural expiry. */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            String token = bearer.substring(7);
            Date expiry = jwtUtil.extractExpiration(token);
            LocalDateTime expiresAt = expiry != null
                    ? expiry.toInstant().atZone(java.time.ZoneOffset.UTC).toLocalDateTime()
                    : LocalDateTime.now().plusHours(2);
            tokenBlacklistService.revoke(token, expiresAt);
        }
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    /** Verifies the 2FA OTP for APPLICATION_OWNER login and issues a JWT on success. */
    @PostMapping("/verify-owner-otp")
    public ResponseEntity<ApiResponse<LoginResponse>> verifyOwnerOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp   = body.get("otp");
        if (email == null || email.isBlank() || otp == null || otp.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email and OTP are required."));
        }
        ApiResponse<LoginResponse> response = authService.verifyOwnerOtp(email, otp);
        return response.isSuccess()
            ? ResponseEntity.ok(response)
            : ResponseEntity.status(400).body(response);
    }

    /** Activates a self-registered account by verifying the emailed OTP. */
    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<String>> verifyEmail(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp   = body.get("otp");
        if (email == null || email.isBlank() || otp == null || otp.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email and OTP are required"));
        }
        ApiResponse<String> response = authService.verifyRegistrationEmail(email, otp);
        return response.isSuccess()
            ? ResponseEntity.ok(response)
            : ResponseEntity.status(400).body(response);
    }

    /** First-login password set — requires the temporary password for verification */
    @PostMapping("/set-first-password")
    public ResponseEntity<ApiResponse<String>> setFirstPassword(@RequestBody Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");
        if (currentPassword == null || currentPassword.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Current (temporary) password is required"));
        }
        if (newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("New password is required"));
        }
        ApiResponse<String> response = authService.setFirstPassword(email, currentPassword, newPassword);
        if (response.isSuccess()) return ResponseEntity.ok(response);
        return ResponseEntity.status(400).body(response);
    }
}
