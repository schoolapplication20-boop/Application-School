package com.schoolers.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.dto.ApiResponse;
import com.schoolers.model.School;
import com.schoolers.model.User;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.logging.Logger;

@Service
public class SchoolService {

    private static final Logger log = Logger.getLogger(SchoolService.class.getName());

    @Autowired private SchoolRepository  schoolRepository;
    @Autowired private UserRepository    userRepository;
    @Autowired private FileStorageService fileStorageService;
    @Autowired private PasswordEncoder   passwordEncoder;
    @Autowired private ObjectMapper      objectMapper;

    // ────────────────────────────────────────────────────────────────────────
    // CREATE
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Creates a new school and optionally creates its first admin account.
     *
     * Design note — NO catch-all inside this @Transactional method:
     * Catching a RuntimeException internally and returning normally is an
     * anti-pattern that causes "Transaction silently rolled back because it has
     * been marked as rollback-only" (UnexpectedRollbackException at commit time).
     * Instead we validate eagerly before any DB writes, upload the logo before
     * the transaction touches the DB, and let any unexpected RuntimeException
     * propagate cleanly so Spring can roll back and the controller can return a
     * meaningful error.
     */
    @Transactional
    public ApiResponse<Map<String, Object>> createSchool(Map<String, Object> data,
                                                          String logoUrl,
                                                          String creatorEmail) {
        // ── 1. Early validation (before any DB writes) ─────────────────────
        String code = (String) data.get("code");
        if (code == null || code.isBlank())
            return ApiResponse.error("School code is required.");
        if (schoolRepository.existsByCode(code.toUpperCase()))
            return ApiResponse.error("A school with code '" + code.toUpperCase() + "' already exists.");

        // Validate & normalise admin fields before touching DB
        String adminEmail  = str(data, "adminEmail");
        String adminName   = str(data, "adminName");
        // Treat blank mobile as null so it doesn't hit the unique constraint
        String adminMobile = str(data, "adminMobile");
        adminMobile = (adminMobile != null && adminMobile.isBlank()) ? null : adminMobile;

        if (adminEmail != null && !adminEmail.isBlank()) {
            String normEmail = adminEmail.trim().toLowerCase();
            if (userRepository.existsByEmailIgnoreCase(normEmail))
                return ApiResponse.error("Admin email '" + normEmail + "' is already registered.");
            if (adminMobile != null && userRepository.existsByMobile(adminMobile))
                return ApiResponse.error("Admin mobile '" + adminMobile + "' is already registered.");
        }

        // ── 2. Build and save school ───────────────────────────────────────
        School school = School.builder()
                .name(str(data, "name"))
                .code(code.toUpperCase())
                .board(str(data, "board"))
                .academicYear(str(data, "academicYear"))
                .address(str(data, "address"))
                .city(str(data, "city"))
                .state(str(data, "state"))
                .pincode(str(data, "pincode"))
                .country(defaultStr(data, "country", "India"))
                .phone(str(data, "phone"))
                .email(str(data, "email"))
                .website(str(data, "website"))
                .logoUrl(logoUrl)
                .primaryColor(defaultStr(data, "primaryColor", "#76C442"))
                .secondaryColor(defaultStr(data, "secondaryColor", "#5fa832"))
                .totalClasses(intVal(data, "totalClasses"))
                .sections(str(data, "sections"))
                .subscriptionPlan(defaultStr(data, "subscriptionPlan", "BASIC"))
                .subscriptionExpiry(parseDate(data, "subscriptionExpiry"))
                .features(strOrDefault(data, "features",
                        "{\"attendance\":true,\"transport\":true,\"fees\":true,"
                        + "\"salary\":true,\"examination\":true,\"diary\":true,"
                        + "\"announcements\":true,\"messages\":true}"))
                .isSetupCompleted(true)
                .isActive(true)
                .build();

        school = schoolRepository.save(school);
        log.info("[createSchool] Saved school id=" + school.getId() + " code=" + school.getCode());

        // ── 3. Link school to the SUPER_ADMIN who created it ───────────────
        // Guard: only skip re-link if the creator already has a valid, existing school.
        // If schoolId is stale (school was deleted), re-link to the new school.
        if (creatorEmail != null && !creatorEmail.isBlank()) {
            final Long schoolId = school.getId();
            userRepository.findByEmailIgnoreCase(creatorEmail).ifPresent(creator -> {
                if (creator.getSchoolId() != null && schoolRepository.existsById(creator.getSchoolId())) {
                    log.warning("[createSchool] Creator " + creatorEmail
                            + " already has valid schoolId=" + creator.getSchoolId() + ". Skipping re-link.");
                    return;
                }
                if (userRepository.existsBySchoolIdAndRole(schoolId, User.Role.SUPER_ADMIN)) {
                    log.warning("[createSchool] Another SUPER_ADMIN already linked to schoolId="
                            + schoolId + ". Skipping.");
                    return;
                }
                creator.setSchoolId(schoolId);
                userRepository.save(creator);
                log.info("[createSchool] Linked schoolId=" + schoolId + " to creator=" + creatorEmail
                        + (creator.getSchoolId() != null ? " (replaced stale schoolId)" : ""));
            });
        }

        // ── 4. Create first admin if details provided ──────────────────────
        Map<String, Object> result = new HashMap<>();
        result.put("school", toResponse(school));

        if (adminEmail != null && !adminEmail.isBlank()) {
            String tempPass = generateTempPassword();
            User admin = User.builder()
                    .name(adminName != null && !adminName.isBlank() ? adminName.trim() : "Admin")
                    .email(adminEmail.trim().toLowerCase())
                    .mobile(adminMobile)   // already null-normalised above
                    .password(passwordEncoder.encode(tempPass))
                    .tempPassword(tempPass)
                    .role(User.Role.ADMIN)
                    .schoolId(school.getId())
                    .firstLogin(true)
                    .isActive(true)
                    .permissions("{\"students\":true,\"teachers\":true,\"classes\":true,"
                            + "\"fees\":true,\"expenses\":true,\"applications\":true,"
                            + "\"collectFee\":true,\"salaries\":true,\"leave\":true,"
                            + "\"transport\":true,\"attendance\":true,\"timetable\":true,"
                            + "\"examination\":true,\"parents\":true,\"diary\":true}")
                    .build();
            userRepository.save(admin);
            result.put("adminEmail", adminEmail.trim().toLowerCase());
            result.put("adminTempPassword", tempPass);
            log.info("[createSchool] Created admin: " + adminEmail + " for schoolId=" + school.getId());
        }

        return ApiResponse.success("School created successfully", result);
    }

    // ────────────────────────────────────────────────────────────────────────
    // READ
    // ────────────────────────────────────────────────────────────────────────

    public ApiResponse<Map<String, Object>> getSchoolById(Long id) {
        return schoolRepository.findById(id)
                .map(s -> ApiResponse.success("School found", toResponse(s)))
                .orElse(ApiResponse.error("School not found with id: " + id));
    }

    public ApiResponse<Map<String, Object>> getSchoolByAdminEmail(String email) {
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) return ApiResponse.error("User not found.");
        User user = userOpt.get();
        if (user.getSchoolId() == null) return ApiResponse.error("No school linked to this account.");
        return getSchoolById(user.getSchoolId());
    }

    public ApiResponse<List<Map<String, Object>>> getAllSchools() {
        List<Map<String, Object>> list = schoolRepository.findAll()
                .stream().map(this::toResponse).toList();
        return ApiResponse.success("Schools fetched", list);
    }

    // ────────────────────────────────────────────────────────────────────────
    // UPDATE
    // ────────────────────────────────────────────────────────────────────────

    // ── Logo helpers (called from controller, outside @Transactional) ──────────

    /** Uploads a logo file and returns the stored URL. Called from the controller
     *  before the DB transaction starts so that an IOException does not mark
     *  any JPA transaction as rollback-only. */
    public String uploadLogo(MultipartFile logo) throws java.io.IOException {
        return fileStorageService.storeLogo(logo);
    }

    /** Deletes an orphaned logo when school creation/update validation fails. */
    public void cleanupLogo(String logoUrl) {
        if (logoUrl != null) {
            try { fileStorageService.deleteLogo(logoUrl); } catch (Exception ignored) {}
        }
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────
    // Logo upload is handled by the controller (outside this @Transactional
    // method) so that IOException cannot mark the transaction rollback-only.

    @Transactional
    public ApiResponse<Map<String, Object>> updateSchool(Long id, Map<String, Object> data,
                                                          String newLogoUrl,
                                                          String oldLogoUrl,
                                                          String creatorEmail) {
        Optional<School> opt = schoolRepository.findById(id);
        if (opt.isEmpty()) {
            // Stub school was deleted or lost. If we know who is calling (setup wizard),
            // fall back to creating a fresh school and re-linking the user.
            if (creatorEmail != null && !creatorEmail.isBlank()) {
                log.warning("[updateSchool] School id=" + id + " not found. Falling back to create for " + creatorEmail);
                ApiResponse<Map<String, Object>> createResp = createSchool(data, newLogoUrl, creatorEmail);
                if (createResp.isSuccess()) {
                    // Return just the school object so the response shape matches the update path.
                    @SuppressWarnings("unchecked")
                    Map<String, Object> nested = (Map<String, Object>) createResp.getData();
                    Object schoolObj = nested != null ? nested.get("school") : null;
                    @SuppressWarnings("unchecked")
                    Map<String, Object> schoolMap = schoolObj instanceof Map ? (Map<String, Object>) schoolObj : nested;
                    return ApiResponse.success("School setup completed", schoolMap);
                }
                return createResp;
            }
            return ApiResponse.error("School not found.");
        }

        School school = opt.get();

        if (data.containsKey("name"))             school.setName(str(data, "name"));
        if (data.containsKey("board"))            school.setBoard(str(data, "board"));
        if (data.containsKey("academicYear"))     school.setAcademicYear(str(data, "academicYear"));
        if (data.containsKey("address"))          school.setAddress(str(data, "address"));
        if (data.containsKey("city"))             school.setCity(str(data, "city"));
        if (data.containsKey("state"))            school.setState(str(data, "state"));
        if (data.containsKey("pincode"))          school.setPincode(str(data, "pincode"));
        if (data.containsKey("country"))          school.setCountry(str(data, "country"));
        if (data.containsKey("phone"))            school.setPhone(str(data, "phone"));
        if (data.containsKey("email"))            school.setEmail(str(data, "email"));
        if (data.containsKey("website"))          school.setWebsite(str(data, "website"));
        if (data.containsKey("primaryColor"))     school.setPrimaryColor(str(data, "primaryColor"));
        if (data.containsKey("secondaryColor"))   school.setSecondaryColor(str(data, "secondaryColor"));
        if (data.containsKey("totalClasses"))     school.setTotalClasses(intVal(data, "totalClasses"));
        if (data.containsKey("sections"))         school.setSections(str(data, "sections"));
        if (data.containsKey("subscriptionPlan")) school.setSubscriptionPlan(str(data, "subscriptionPlan"));
        if (data.containsKey("subscriptionExpiry"))
            school.setSubscriptionExpiry(parseDate(data, "subscriptionExpiry"));
        if (data.containsKey("features"))          school.setFeatures(str(data, "features"));
        if (data.containsKey("isActive"))          school.setIsActive((Boolean) data.get("isActive"));
        // Allow the Setup School wizard to mark setup as complete via PUT
        if (data.containsKey("isSetupCompleted") && data.get("isSetupCompleted") instanceof Boolean)
            school.setIsSetupCompleted((Boolean) data.get("isSetupCompleted"));

        if (newLogoUrl != null) {
            school.setLogoUrl(newLogoUrl);
        }

        school = schoolRepository.save(school);

        // Delete old logo file after successful DB commit (best-effort)
        if (newLogoUrl != null && oldLogoUrl != null) {
            cleanupLogo(oldLogoUrl);
        }

        return ApiResponse.success("School updated successfully", toResponse(school));
    }

    // ────────────────────────────────────────────────────────────────────────
    // Helper: entity → Map response (no Lombok cycles)
    // ────────────────────────────────────────────────────────────────────────

    public Map<String, Object> toResponse(School s) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", s.getId());
        m.put("name", s.getName());
        m.put("code", s.getCode());
        m.put("board", s.getBoard());
        m.put("academicYear", s.getAcademicYear());
        m.put("address", s.getAddress());
        m.put("city", s.getCity());
        m.put("state", s.getState());
        m.put("pincode", s.getPincode());
        m.put("country", s.getCountry());
        m.put("phone", s.getPhone());
        m.put("email", s.getEmail());
        m.put("website", s.getWebsite());
        m.put("logoUrl", s.getLogoUrl());
        m.put("primaryColor", s.getPrimaryColor());
        m.put("secondaryColor", s.getSecondaryColor());
        m.put("totalClasses", s.getTotalClasses());
        m.put("sections", s.getSections());
        m.put("subscriptionPlan", s.getSubscriptionPlan());
        m.put("subscriptionExpiry", s.getSubscriptionExpiry());
        m.put("features", s.getFeatures());
        m.put("isActive", s.getIsActive());
        m.put("createdAt", s.getCreatedAt());
        return m;
    }

    // ── Private utility methods ───────────────────────────────────────────────

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString().trim() : null;
    }

    private String defaultStr(Map<String, Object> m, String key, String def) {
        String v = str(m, key);
        return (v != null && !v.isBlank()) ? v : def;
    }

    private String strOrDefault(Map<String, Object> m, String key, String def) {
        String v = str(m, key);
        return (v != null && !v.isBlank()) ? v : def;
    }

    private Integer intVal(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v == null) return null;
        try { return Integer.parseInt(v.toString()); } catch (Exception e) { return null; }
    }

    private LocalDate parseDate(Map<String, Object> m, String key) {
        String v = str(m, key);
        if (v == null || v.isBlank()) return null;
        try { return LocalDate.parse(v); } catch (Exception e) { return null; }
    }

    private String generateTempPassword() {
        String chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#";
        SecureRandom rng = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 10; i++) sb.append(chars.charAt(rng.nextInt(chars.length())));
        return sb.toString();
    }
}
