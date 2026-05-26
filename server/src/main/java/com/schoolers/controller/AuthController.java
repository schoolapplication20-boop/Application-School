package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.LoginRequest;
import com.schoolers.dto.LoginResponse;
import com.schoolers.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

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
