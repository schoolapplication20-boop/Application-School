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
    @Autowired private EmailService      emailService;
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

        Integer schoolId = intVal(data, "schoolId");
        if (schoolId == null || schoolId < 1)
            return ApiResponse.error("School ID is required and must be a positive number (e.g. 1, 2, 3).");
        if (schoolRepository.existsBySchoolId(schoolId))
            return ApiResponse.error("School ID '" + schoolId + "' is already in use by another school. Choose a different ID.");

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
                .schoolId(intVal(data, "schoolId"))
                .build();

        school = schoolRepository.save(school);
        log.info("[createSchool] Saved school id=" + school.getId() + " code=" + school.getCode());

        // ── 3. Link school to the SUPER_ADMIN who created it ───────────────
        // Store the human-assigned display number (school.schoolId) — NOT the DB PK (school.id).
        // This ensures users.school_id matches the ID shown in the UI (1, 2, 3…).
        if (creatorEmail != null && !creatorEmail.isBlank()) {
            final Long displayIdAsLong = school.getSchoolId().longValue();
            userRepository.findByEmailIgnoreCase(creatorEmail).ifPresent(creator -> {
                if (creator.getSchoolId() != null
                        && schoolRepository.existsBySchoolId(creator.getSchoolId().intValue())) {
                    log.warning("[createSchool] Creator " + creatorEmail
                            + " already has valid schoolId=" + creator.getSchoolId() + ". Skipping re-link.");
                    return;
                }
                if (userRepository.existsBySchoolIdAndRole(displayIdAsLong, User.Role.SUPER_ADMIN)) {
                    log.warning("[createSchool] Another SUPER_ADMIN already linked to schoolId="
                            + displayIdAsLong + ". Skipping.");
                    return;
                }
                creator.setSchoolId(displayIdAsLong);
                userRepository.save(creator);
                log.info("[createSchool] Linked display schoolId=" + displayIdAsLong + " to creator=" + creatorEmail);
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
                    .role(User.Role.ADMIN)
                    .schoolId(school.getSchoolId().longValue())  // store display number, not DB PK
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

            emailService.sendWelcomeEmail(adminEmail.trim().toLowerCase(),
                adminName != null && !adminName.isBlank() ? adminName.trim() : "Admin",
                "ADMIN", tempPass);
        }

        return ApiResponse.success("School created successfully", result);
    }

    // ────────────────────────────────────────────────────────────────────────
    // READ
    // ────────────────────────────────────────────────────────────────────────

    /**
     * Look up a school by its human-assigned display number (the value shown in the UI
     * and stored as the FK in users/students/teachers/etc.).
     * This is the primary lookup used by API endpoints and service methods.
     */
    public ApiResponse<Map<String, Object>> getSchoolById(Integer displayId) {
        return schoolRepository.findBySchoolId(displayId)
                .map(s -> ApiResponse.success("School found", toResponse(s)))
                .orElse(ApiResponse.error("School not found with display ID: " + displayId));
    }

    /** Internal lookup by DB primary key — used only by JPA-internal operations. */
    public ApiResponse<Map<String, Object>> getSchoolByDbId(Long dbId) {
        return schoolRepository.findById(dbId)
                .map(s -> ApiResponse.success("School found", toResponse(s)))
                .orElse(ApiResponse.error("School not found with db id: " + dbId));
    }

    public ApiResponse<Map<String, Object>> getSchoolByAdminEmail(String email) {
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) return ApiResponse.error("User not found.");
        User user = userOpt.get();
        if (user.getSchoolId() == null) return ApiResponse.error("No school linked to this account.");
        // user.schoolId stores the human-assigned display number (not the DB PK).
        // Fall back to findById (DB PK) if the display number lookup fails — handles
        // the case where the display schoolId was changed in the setup wizard but the
        // user's school_id column still holds the original DB PK.
        Optional<School> schoolOpt = schoolRepository.findBySchoolId(user.getSchoolId().intValue());
        if (schoolOpt.isEmpty()) {
            schoolOpt = schoolRepository.findById(user.getSchoolId());
        }
        return schoolOpt
                .map(s -> ApiResponse.success("School found", toResponse(s)))
                .orElse(ApiResponse.error("No school found for ID: " + user.getSchoolId()));
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
    public ApiResponse<Map<String, Object>> updateSchool(Integer displayId, Map<String, Object> data,
                                                          String newLogoUrl,
                                                          String oldLogoUrl,
                                                          String creatorEmail) {
        Optional<School> opt = schoolRepository.findBySchoolId(displayId);
        if (opt.isEmpty()) {
            // Stub school was deleted or lost. If we know who is calling (setup wizard),
            // fall back to creating a fresh school and re-linking the user.
            if (creatorEmail != null && !creatorEmail.isBlank()) {
                log.warning("[updateSchool] School display_id=" + displayId + " not found. Falling back to create for " + creatorEmail);
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
        if (data.containsKey("pricePerUser") && data.get("pricePerUser") != null) {
            try { school.setPricePerUser(new java.math.BigDecimal(data.get("pricePerUser").toString())); }
            catch (Exception ignored) {}
        }
        if (data.containsKey("paymentPlan") && data.get("paymentPlan") != null)
            school.setPaymentPlan(data.get("paymentPlan").toString());
        if (data.containsKey("features"))          school.setFeatures(str(data, "features"));
        if (data.containsKey("isActive"))          school.setIsActive((Boolean) data.get("isActive"));
        if (data.containsKey("schoolId")) {
            Integer newSchoolId = intVal(data, "schoolId");
            if (newSchoolId == null || newSchoolId < 1)
                return ApiResponse.error("School ID must be a positive number (e.g. 1, 2, 3).");
            if (schoolRepository.existsBySchoolIdAndIdNot(newSchoolId, school.getId()))
                return ApiResponse.error("School ID '" + newSchoolId + "' is already in use by another school. Choose a different ID.");
            school.setSchoolId(newSchoolId);
        }
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
        m.put("schoolId", s.getSchoolId());
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
