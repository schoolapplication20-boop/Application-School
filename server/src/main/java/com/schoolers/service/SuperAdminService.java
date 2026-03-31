package com.schoolers.service;

import com.schoolers.dto.AdminCreatedResponse;
import com.schoolers.dto.ApiResponse;
import com.schoolers.model.User;
import com.schoolers.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.logging.Logger;

@Service
public class SuperAdminService {

    private static final Logger log = Logger.getLogger(SuperAdminService.class.getName());

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    private static final SecureRandom RANDOM = new SecureRandom();

    public String generatePassword() {
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        }
        return sb.toString();
    }

    @Transactional
    public ApiResponse<AdminCreatedResponse> createAdmin(String name, String email, String mobile, String permissions) {

        // ── Input validation (fast-fail before touching the DB) ────────────────
        if (name == null || name.isBlank())
            return ApiResponse.error("Admin name is required");

        if (email == null || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            return ApiResponse.error("A valid email address is required");

        String normalizedEmail  = email.trim().toLowerCase();
        String normalizedMobile = (mobile != null && !mobile.isBlank()) ? mobile.trim() : null;

        // Case-insensitive pre-check — prevents duplicate accounts regardless of email casing
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail))
            return ApiResponse.error("Email '" + normalizedEmail + "' is already registered. Use a different email.");

        if (normalizedMobile != null && userRepository.existsByMobile(normalizedMobile))
            return ApiResponse.error("Mobile number '" + normalizedMobile + "' is already registered. Use a different number.");

        String rawPassword = generatePassword();

        try {
            User user = userRepository.save(User.builder()
                    .name(name.trim())
                    .email(normalizedEmail)
                    .mobile(normalizedMobile)
                    .password(passwordEncoder.encode(rawPassword))
                    .tempPassword(rawPassword)
                    .role(User.Role.ADMIN)
                    .isActive(true)
                    .firstLogin(true)
                    .permissions(permissions)
                    .build());

            // Log AFTER saveAndFlush() — data is confirmed flushed to the DB connection.
            // Any failure above throws before reaching this line, so this log is trustworthy.
            log.info("[createAdmin] Flushed admin id=" + user.getId() + " email=" + normalizedEmail);

            AdminCreatedResponse response = AdminCreatedResponse.builder()
                    .id(user.getId())
                    .name(user.getName())
                    .email(user.getEmail())
                    .mobile(user.getMobile())
                    .generatedPassword(rawPassword)
                    .build();

            return ApiResponse.success("Admin created successfully", response);

        } catch (DataIntegrityViolationException e) {
            // Race condition: pre-check passed but a concurrent request committed first.
            // Explicitly mark rollback so the @Transactional proxy rolls back cleanly
            // instead of throwing UnexpectedRollbackException when it tries to commit.
            // no-op: transaction rollback not available without JPA
            String hint = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            String userMessage;
            if (hint.contains("email") || hint.contains("uk_users_email")) {
                userMessage = "Email '" + normalizedEmail + "' was just registered by another request. Please use a different email.";
            } else if (hint.contains("mobile") || hint.contains("uk_users_mobile")) {
                userMessage = "Mobile number '" + normalizedMobile + "' was just registered by another request. Please use a different number.";
            } else {
                userMessage = "A data conflict occurred (duplicate entry). Please verify the email and mobile are unique.";
            }
            log.warning("[createAdmin] Constraint violation — email=" + normalizedEmail
                    + " | " + e.getMessage());
            return ApiResponse.error(userMessage);

        } catch (DataAccessException e) {
            // no-op: transaction rollback not available without JPA
            log.severe("[createAdmin] Database access failure — email=" + normalizedEmail
                    + " | " + e.getClass().getSimpleName() + ": " + e.getMessage());
            return ApiResponse.error("A database error occurred while creating the admin. Please try again in a moment.");

        } catch (Exception e) {
            // no-op: transaction rollback not available without JPA
            log.severe("[createAdmin] Unexpected error — email=" + normalizedEmail
                    + " | " + e.getClass().getName() + ": " + e.getMessage());
            return ApiResponse.error("An unexpected error occurred. Please contact your system administrator.");
        }
    }

    public ApiResponse<List<User>> getAdmins() {
        return ApiResponse.success(userRepository.findByRole(User.Role.ADMIN));
    }

    public ApiResponse<User> updateAdmin(Long id, String name, String mobile, Boolean isActive, String permissions) {
        return userRepository.findById(id)
                .filter(u -> u.getRole() == User.Role.ADMIN)
                .map(user -> {
                    if (name != null && !name.isBlank()) user.setName(name);
                    if (mobile != null && !mobile.isBlank()) {
                        String newMobile = mobile.trim();
                        if (userRepository.existsByMobileAndIdNot(newMobile, user.getId()))
                            return ApiResponse.<User>error("Mobile number '" + newMobile + "' is already registered to another user.");
                        user.setMobile(newMobile);
                    }
                    if (isActive != null) user.setIsActive(isActive);
                    if (permissions != null) user.setPermissions(permissions);
                    return ApiResponse.success("Admin updated", userRepository.save(user));
                })
                .orElse(ApiResponse.error("Admin not found"));
    }

    public ApiResponse<String> deleteAdmin(Long id) {
        return userRepository.findById(id)
                .filter(u -> u.getRole() == User.Role.ADMIN)
                .map(user -> {
                    userRepository.deleteById(id);
                    return ApiResponse.success("Admin deleted", "Deleted");
                })
                .orElse(ApiResponse.<String>error("Admin not found"));
    }
}
