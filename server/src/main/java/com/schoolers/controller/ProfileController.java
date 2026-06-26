package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.User;
import com.schoolers.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Self-service profile endpoints — any authenticated role can read and update
 * their own basic info (name, mobile, address). Sensitive fields (email, role,
 * schoolId, password) are never touched here.
 */
@RestController
@RequestMapping("/api/user/profile")
public class ProfileController {

    @Autowired
    private UserRepository userRepository;

    /** GET /api/user/profile — returns the logged-in user's own profile. */
    @GetMapping
    public ResponseEntity<?> getProfile(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        User user = userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(ApiResponse.error("User not found"));
        return ResponseEntity.ok(ApiResponse.success("Profile", safeView(user)));
    }

    /** PUT /api/user/profile — updates name, mobile, and address only. */
    @PutMapping
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body, Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        User user = userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(ApiResponse.error("User not found"));

        // Only allow safe, non-privileged fields — never touch email, role, schoolId, password
        String name = body.getOrDefault("name", "").trim();
        if (name.length() < 2 || name.length() > 100)
            return ResponseEntity.badRequest().body(ApiResponse.error("Name must be between 2 and 100 characters"));

        user.setName(name);

        String mobile = body.get("phone") != null ? body.get("phone").trim()
                      : body.get("mobile") != null ? body.get("mobile").trim() : null;
        if (mobile != null) {
            if (!mobile.isEmpty() && !mobile.matches("\\d{10,15}"))
                return ResponseEntity.badRequest().body(ApiResponse.error("Phone must be 10-15 digits"));
            // Mobile must be unique — check for conflicts with other users
            if (!mobile.isEmpty()) {
                User conflict = userRepository.findByMobile(mobile).orElse(null);
                if (conflict != null && !conflict.getId().equals(user.getId()))
                    return ResponseEntity.badRequest().body(ApiResponse.error("This phone number is already registered to another account"));
            }
            user.setMobile(mobile.isEmpty() ? null : mobile);
        }

        String address = body.get("address");
        if (address != null) user.setAddress(address.trim().isEmpty() ? null : address.trim());

        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", safeView(user)));
    }

    /** Returns only the fields safe to expose — never password, tokens, OTP, permissions. */
    private Map<String, Object> safeView(User u) {
        String displayEmail = u.getEmail() != null && u.getEmail().endsWith("@my-skoolz.com")
                ? u.getEmail().split("@")[0]   // show only the username part for auto-generated emails
                : u.getEmail();
        return Map.of(
            "id",       u.getId(),
            "name",     u.getName() != null ? u.getName() : "",
            "email",    displayEmail != null ? displayEmail : "",
            "mobile",   u.getMobile()  != null ? u.getMobile()  : "",
            "address",  u.getAddress() != null ? u.getAddress() : "",
            "role",     u.getRole() != null ? u.getRole().name() : "",
            "username", u.getUsername() != null ? u.getUsername() : "",
            "firstLogin", Boolean.TRUE.equals(u.getFirstLogin())
        );
    }
}
