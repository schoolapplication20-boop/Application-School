package com.schoolers.service;

import com.schoolers.dto.AdminCreatedResponse;
import com.schoolers.dto.ApiResponse;
import com.schoolers.model.School;
import com.schoolers.model.User;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
import java.util.logging.Logger;

@Service
public class SuperAdminService {

    private static final Logger log = Logger.getLogger(SuperAdminService.class.getName());

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SchoolRepository schoolRepository;

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
    public ApiResponse<AdminCreatedResponse> createAdmin(String name, String email, String mobile, String permissions, Long schoolId) {

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
                    .schoolId(schoolId)
                    .build());

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
            String hint = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            String userMessage;
            if (hint.contains("email") || hint.contains("uk_users_email")) {
                userMessage = "Email '" + normalizedEmail + "' was just registered by another request. Please use a different email.";
            } else if (hint.contains("mobile") || hint.contains("uk_users_mobile")) {
                userMessage = "Mobile number '" + normalizedMobile + "' was just registered by another request. Please use a different number.";
            } else {
                userMessage = "A data conflict occurred (duplicate entry). Please verify the email and mobile are unique.";
            }
            log.warning("[createAdmin] Constraint violation — email=" + normalizedEmail + " | " + e.getMessage());
            return ApiResponse.error(userMessage);

        } catch (DataAccessException e) {
            log.severe("[createAdmin] Database access failure — email=" + normalizedEmail
                    + " | " + e.getClass().getSimpleName() + ": " + e.getMessage());
            return ApiResponse.error("A database error occurred while creating the admin. Please try again in a moment.");

        } catch (Exception e) {
            log.severe("[createAdmin] Unexpected error — email=" + normalizedEmail
                    + " | " + e.getClass().getName() + ": " + e.getMessage());
            return ApiResponse.error("An unexpected error occurred. Please contact your system administrator.");
        }
    }

    public ApiResponse<List<User>> getAdmins(Long schoolId) {
        if (schoolId != null) {
            return ApiResponse.success(userRepository.findByRoleAndSchoolId(User.Role.ADMIN, schoolId));
        }
        return ApiResponse.success(userRepository.findByRole(User.Role.ADMIN));
    }

    /**
     * Creates a new school-level Super Admin.
     * Only the platform Application Owner (callerSchoolId == null) may call this.
     *
     * A stub School record is created with isSetupCompleted=false so the new
     * Super Admin is redirected to the Setup School wizard on first login.
     *
     * @param schoolName  Human-readable school name (e.g. "Springfield High School")
     * @param schoolCode  Unique school identifier/code (e.g. "SPRHS")
     */
    @Transactional
    public ApiResponse<AdminCreatedResponse> createSuperAdmin(
            String name, String email, String mobile,
            String schoolName, String schoolCode,
            Long callerSchoolId) {

        // ── Gate: only platform-level (no schoolId) owners may create super admins ──
        if (callerSchoolId != null)
            return ApiResponse.error("Only the Application Owner can create new Super Admin accounts.");

        // ── Basic validation ──────────────────────────────────────────────────
        if (name == null || name.isBlank())
            return ApiResponse.error("Name is required");
        if (email == null || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            return ApiResponse.error("A valid email address is required");
        if (schoolName == null || schoolName.isBlank())
            return ApiResponse.error("School name is required");
        if (schoolCode == null || schoolCode.isBlank())
            return ApiResponse.error("School code is required");

        String normalizedEmail  = email.trim().toLowerCase();
        String normalizedMobile = (mobile != null && !mobile.isBlank()) ? mobile.trim() : null;
        String normalizedCode   = schoolCode.trim().toUpperCase();

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail))
            return ApiResponse.error("Email '" + normalizedEmail + "' is already registered.");
        if (normalizedMobile != null && userRepository.existsByMobile(normalizedMobile))
            return ApiResponse.error("Mobile number '" + normalizedMobile + "' is already registered.");
        if (schoolRepository.existsByCode(normalizedCode))
            return ApiResponse.error("School code '" + normalizedCode + "' is already in use. Choose a different code.");

        String rawPassword = generatePassword();

        try {
            // ── 1. Create stub school (isSetupCompleted=false) ────────────────
            School school = schoolRepository.save(School.builder()
                    .name(schoolName.trim())
                    .code(normalizedCode)
                    .isSetupCompleted(false)
                    .isActive(true)
                    .build());
            log.info("[createSuperAdmin] Created stub school id=" + school.getId()
                    + " code=" + normalizedCode);

            // ── 2. Create Super Admin linked to the stub school ───────────────
            User user = userRepository.save(User.builder()
                    .name(name.trim())
                    .email(normalizedEmail)
                    .mobile(normalizedMobile)
                    .password(passwordEncoder.encode(rawPassword))
                    .tempPassword(rawPassword)
                    .role(User.Role.SUPER_ADMIN)
                    .schoolId(school.getId())
                    .isActive(true)
                    .firstLogin(false)   // password is known; no forced reset needed
                    .build());
            log.info("[createSuperAdmin] Created super admin id=" + user.getId()
                    + " email=" + normalizedEmail + " schoolId=" + school.getId());

            AdminCreatedResponse response = AdminCreatedResponse.builder()
                    .id(user.getId())
                    .name(user.getName())
                    .email(user.getEmail())
                    .mobile(user.getMobile())
                    .generatedPassword(rawPassword)
                    .build();

            return ApiResponse.success("Super Admin created successfully", response);

        } catch (DataIntegrityViolationException e) {
            String hint = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            if (hint.contains("email") || hint.contains("uk_users_email"))
                return ApiResponse.error("Email '" + normalizedEmail + "' was just registered. Use a different email.");
            if (hint.contains("mobile") || hint.contains("uk_users_mobile"))
                return ApiResponse.error("Mobile number '" + normalizedMobile + "' is already in use.");
            if (hint.contains("code") || hint.contains("schools"))
                return ApiResponse.error("School code '" + normalizedCode + "' conflicts with an existing school.");
            return ApiResponse.error("A data conflict occurred. Verify email, mobile, and school code are unique.");
        } catch (Exception e) {
            log.severe("[createSuperAdmin] Error — email=" + normalizedEmail + " | " + e.getMessage());
            return ApiResponse.error("An error occurred while creating the Super Admin.");
        }
    }

    /**
     * Returns all school-level Super Admins (those with a non-null schoolId).
     * Enriched with school name and code from the linked School record.
     */
    public ApiResponse<List<Map<String, Object>>> getSuperAdmins() {
        List<User> superAdmins = userRepository.findByRoleAndSchoolIdNotNull(User.Role.SUPER_ADMIN);

        List<Map<String, Object>> result = superAdmins.stream().map(sa -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id",        sa.getId());
            dto.put("name",      sa.getName());
            dto.put("email",     sa.getEmail());
            dto.put("mobile",    sa.getMobile());
            dto.put("isActive",  sa.getIsActive());
            dto.put("schoolId",  sa.getSchoolId());
            dto.put("createdAt", sa.getCreatedAt());

            // Enrich with school details
            if (sa.getSchoolId() != null) {
                schoolRepository.findById(sa.getSchoolId()).ifPresent(school -> {
                    dto.put("schoolName",        school.getName());
                    dto.put("schoolCode",        school.getCode());
                    dto.put("needsSchoolSetup",  !Boolean.TRUE.equals(school.getIsSetupCompleted()));
                });
            } else {
                dto.put("needsSchoolSetup", true);
            }
            return dto;
        }).collect(Collectors.toList());

        return ApiResponse.success("Super admins fetched", result);
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
