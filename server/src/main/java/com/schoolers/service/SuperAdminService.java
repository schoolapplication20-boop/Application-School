package com.schoolers.service;

import com.schoolers.dto.AdminCreatedResponse;
import com.schoolers.dto.ApiResponse;
import com.schoolers.model.School;
import com.schoolers.model.User;
import com.schoolers.repository.*;
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

    @Autowired private UserRepository                    userRepository;
    @Autowired private SchoolRepository                  schoolRepository;
    @Autowired private PasswordEncoder                   passwordEncoder;
    @Autowired private AttendanceRepository              attendanceRepository;
    @Autowired private TeacherAttendanceRepository       teacherAttendanceRepository;
    @Autowired private MarksRepository                   marksRepository;
    @Autowired private HallTicketRepository              hallTicketRepository;
    @Autowired private CertificateRepository             certificateRepository;
    @Autowired private HomeworkRepository                homeworkRepository;
    @Autowired private AssignmentRepository              assignmentRepository;
    @Autowired private ClassDiaryRepository              classDiaryRepository;
    @Autowired private LeaveRequestRepository            leaveRequestRepository;
    @Autowired private FeePaymentRepository              feePaymentRepository;
    @Autowired private FeeInstallmentRepository          feeInstallmentRepository;
    @Autowired private StudentFeeAssignmentRepository    studentFeeAssignmentRepository;
    @Autowired private ClassFeeStructureRepository       classFeeStructureRepository;
    @Autowired private FeeRepository                     feeRepository;
    @Autowired private SalaryPaymentRepository           salaryPaymentRepository;
    @Autowired private SalaryRepository                  salaryRepository;
    @Autowired private TimetableRepository               timetableRepository;
    @Autowired private ExamScheduleRepository            examScheduleRepository;
    @Autowired private AnnouncementRepository            announcementRepository;
    @Autowired private AdmissionApplicationRepository    admissionApplicationRepository;
    @Autowired private ImportLogRepository               importLogRepository;
    @Autowired private AppNotificationRepository         appNotificationRepository;
    @Autowired private MessageRepository                 messageRepository;
    @Autowired private ChatMessageRepository             chatMessageRepository;
    @Autowired private ChatSessionRepository             chatSessionRepository;
    @Autowired private ClassRoomRepository               classRoomRepository;
    @Autowired private ExpenseRepository                 expenseRepository;
    @Autowired private HolidayRepository                 holidayRepository;
    @Autowired private StudentRepository                 studentRepository;
    @Autowired private TeacherRepository                 teacherRepository;
    @Autowired private TransportBusRepository            transportBusRepository;
    @Autowired private TransportRouteRepository          transportRouteRepository;
    @Autowired private TransportDriverRepository         transportDriverRepository;
    @Autowired private TransportStopRepository           transportStopRepository;
    @Autowired private TransportStudentAssignmentRepository transportStudentAssignmentRepository;
    @Autowired private TransportFeeRepository            transportFeeRepository;
    @Autowired private StudentTransportRepository        studentTransportRepository;

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

    /**
     * Returns ADMIN users only, scoped to the caller's school.
     * SUPER_ADMIN and APPLICATION_OWNER accounts are NEVER included, regardless of schoolId.
     */
    public ApiResponse<List<User>> getAdmins(Long schoolId) {
        List<User> admins;
        if (schoolId != null) {
            admins = userRepository.findByRoleAndSchoolId(User.Role.ADMIN, schoolId);
        } else {
            // Platform-level owner: see all school-level ADMINs across all schools
            admins = userRepository.findByRole(User.Role.ADMIN);
        }
        // Defensive: strip out any non-ADMIN entries (should never happen, but belt-and-suspenders)
        admins = admins.stream()
                .filter(u -> u.getRole() == User.Role.ADMIN)
                .collect(java.util.stream.Collectors.toList());
        return ApiResponse.success(admins);
    }

    /**
     * Creates a new school-level Super Admin.
     * Only the platform Application Owner (callerSchoolId == null) may call this.
     *
     * Enforces: exactly ONE SUPER_ADMIN per school.
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
            String permissions,
            Integer schoolNumber,
            Long callerSchoolId) {

        // ── Gate: only APPLICATION_OWNER (schoolId == null) may create SUPER_ADMINs ──
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
        if (schoolNumber == null || schoolNumber < 1)
            return ApiResponse.error("School ID is required and must be a positive number (e.g. 1, 2, 3).");
        if (schoolRepository.existsBySchoolId(schoolNumber))
            return ApiResponse.error("School ID '" + schoolNumber + "' is already in use by another school. Choose a different ID.");

        String rawPassword = generatePassword();

        try {
            // ── 1. Create school — mark setup complete immediately.
            // The owner fills all details in the wizard before submitting, so by the
            // time this record is saved the school is fully onboarded. SUPER_ADMIN
            // should go straight to dashboard on first login, never to setup screen.
            School school = schoolRepository.save(School.builder()
                    .name(schoolName.trim())
                    .code(normalizedCode)
                    .schoolId(schoolNumber)
                    .isSetupCompleted(true)
                    .isActive(true)
                    .build());
            log.info("[createSuperAdmin] Created school id=" + school.getId()
                    + " code=" + normalizedCode + " isSetupCompleted=true");

            // ── 2. Enforce one SUPER_ADMIN per school ─────────────────────────
            // Use the human-assigned display number as the FK — NOT the DB auto-generated PK.
            // This ensures school_id in users/students/teachers matches what is shown in the UI.
            Long displayIdAsLong = school.getSchoolId().longValue();

            if (userRepository.existsBySchoolIdAndRole(displayIdAsLong, User.Role.SUPER_ADMIN)) {
                return ApiResponse.error("A Super Admin already exists for school '"
                        + normalizedCode + "'. Each school can have only one Super Admin.");
            }

            // ── 3. Create Super Admin linked to the stub school ───────────────
            User user = userRepository.save(User.builder()
                    .name(name.trim())
                    .email(normalizedEmail)
                    .mobile(normalizedMobile)
                    .password(passwordEncoder.encode(rawPassword))
                    .tempPassword(rawPassword)
                    .role(User.Role.SUPER_ADMIN)
                    .schoolId(displayIdAsLong)   // store display number (1, 2, 3…) not DB PK
                    .isActive(true)
                    .firstLogin(true)            // forced password reset on first login
                    .permissions(permissions)
                    .build());
            log.info("[createSuperAdmin] Created super admin id=" + user.getId()
                    + " email=" + normalizedEmail + " displaySchoolId=" + displayIdAsLong);

            AdminCreatedResponse response = AdminCreatedResponse.builder()
                    .id(user.getId())
                    .name(user.getName())
                    .email(user.getEmail())
                    .mobile(user.getMobile())
                    .generatedPassword(rawPassword)
                    .schoolId(displayIdAsLong)   // frontend uses this for PUT /api/schools/{id}
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
            // schoolDbId is the value used by the frontend for PUT /api/schools/{id}.
            // It now stores the human-assigned display number (same as schools.school_id),
            // which is what the SchoolController path variable expects.
            dto.put("schoolDbId", sa.getSchoolId());
            dto.put("createdAt", sa.getCreatedAt());

            // Enrich with school details.
            // sa.getSchoolId() now stores the human-assigned display number (1, 2, 3…),
            // so we look up the school by that display number via findBySchoolId().
            if (sa.getSchoolId() != null) {
                schoolRepository.findBySchoolId(sa.getSchoolId().intValue()).ifPresent(school -> {
                    dto.put("schoolName",         school.getName());
                    dto.put("schoolCode",         school.getCode());
                    dto.put("schoolId",           school.getSchoolId());  // display number shown in UI
                    dto.put("needsSchoolSetup",   !Boolean.TRUE.equals(school.getIsSetupCompleted()));
                    dto.put("board",              school.getBoard());
                    dto.put("academicYear",       school.getAcademicYear());
                    dto.put("phone",              school.getPhone());
                    dto.put("schoolEmail",        school.getEmail());
                    dto.put("website",            school.getWebsite());
                    dto.put("city",               school.getCity());
                    dto.put("state",              school.getState());
                    dto.put("subscriptionPlan",   school.getSubscriptionPlan());
                    dto.put("subscriptionExpiry", school.getSubscriptionExpiry());
                    dto.put("permissions",        sa.getPermissions());
                    dto.put("schoolActive",       Boolean.TRUE.equals(school.getIsActive()));
                });
            } else {
                dto.put("needsSchoolSetup", true);
            }
            return dto;
        }).collect(Collectors.toList());

        return ApiResponse.success("Super admins fetched", result);
    }

    /**
     * Deletes a SUPER_ADMIN account.
     * Only APPLICATION_OWNER (callerSchoolId == null) may call this.
     * The linked school record is preserved so historical data is not lost.
     */
    @Transactional
    public ApiResponse<String> deleteSuperAdmin(Long id) {
        return userRepository.findById(id)
                .filter(u -> u.getRole() == User.Role.SUPER_ADMIN)
                .map(user -> {
                    userRepository.deleteById(id);
                    log.info("[deleteSuperAdmin] Deleted SUPER_ADMIN id=" + id
                            + " email=" + user.getEmail() + " schoolId=" + user.getSchoolId());
                    return ApiResponse.<String>success("Super Admin deleted successfully", "Deleted");
                })
                .orElse(ApiResponse.<String>error("Super Admin not found or is not a SUPER_ADMIN account."));
    }

    /**
     * Updates an ADMIN user. The caller's schoolId is enforced — a SUPER_ADMIN
     * from School A cannot update an ADMIN from School B.
     * Platform-level owners (callerSchoolId == null) may update any ADMIN.
     */
    public ApiResponse<User> updateAdmin(Long id, String name, String mobile,
                                         Boolean isActive, String permissions,
                                         Long callerSchoolId) {
        return userRepository.findById(id)
                .filter(u -> u.getRole() == User.Role.ADMIN)
                .map(user -> {
                    // School isolation: reject if the admin belongs to a different school
                    if (callerSchoolId != null && !callerSchoolId.equals(user.getSchoolId())) {
                        return ApiResponse.<User>error("Access denied: admin belongs to a different school.");
                    }
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

    /**
     * Deletes an ADMIN user. The caller's schoolId is enforced — a SUPER_ADMIN
     * from School A cannot delete an ADMIN from School B.
     * Platform-level owners (callerSchoolId == null) may delete any ADMIN.
     */
    public ApiResponse<String> deleteAdmin(Long id, Long callerSchoolId) {
        return userRepository.findById(id)
                .filter(u -> u.getRole() == User.Role.ADMIN)
                .map(user -> {
                    if (callerSchoolId != null && !callerSchoolId.equals(user.getSchoolId())) {
                        return ApiResponse.<String>error("Access denied: admin belongs to a different school.");
                    }
                    userRepository.deleteById(id);
                    return ApiResponse.success("Admin deleted", "Deleted");
                })
                .orElse(ApiResponse.<String>error("Admin not found"));
    }

    /**
     * Permanently deletes a school and ALL its related data from the database.
     * Only APPLICATION_OWNER can call this.
     * Deletion order respects foreign key dependencies.
     */
    @Transactional
    public ApiResponse<String> deleteSchool(Long schoolId) {
        School school = schoolRepository.findById(schoolId).orElse(null);
        if (school == null) return ApiResponse.error("School not found");

        String schoolName = school.getName();
        log.info("[deleteSchool] START — schoolId=" + schoolId + " name=" + schoolName);

        // ── 1. AI chat history ────────────────────────────────────────────────
        chatMessageRepository.deleteBySchoolId(schoolId);
        chatSessionRepository.deleteBySchoolId(schoolId);
        log.info("[deleteSchool] chat history deleted");

        // ── 2. App notifications ──────────────────────────────────────────────
        appNotificationRepository.deleteBySchoolId(schoolId);
        log.info("[deleteSchool] notifications deleted");

        // ── 3. Messages (broadcasts + 1-to-1) ────────────────────────────────
        messageRepository.deleteBySchoolId(schoolId);
        messageRepository.deleteBySenderSchoolId(schoolId);
        log.info("[deleteSchool] messages deleted");

        // ── 4. Announcements ──────────────────────────────────────────────────
        announcementRepository.deleteBySchoolId(schoolId);

        // ── 5. Attendance records ─────────────────────────────────────────────
        attendanceRepository.deleteBySchoolId(schoolId);
        teacherAttendanceRepository.deleteBySchoolId(schoolId);
        log.info("[deleteSchool] attendance deleted");

        // ── 6. Academic records ───────────────────────────────────────────────
        marksRepository.deleteBySchoolId(schoolId);
        hallTicketRepository.deleteBySchoolId(schoolId);
        certificateRepository.deleteBySchoolId(schoolId);
        homeworkRepository.deleteBySchoolId(schoolId);
        assignmentRepository.deleteBySchoolId(schoolId);
        classDiaryRepository.deleteBySchoolId(schoolId);
        examScheduleRepository.deleteBySchoolId(schoolId);
        timetableRepository.deleteBySchoolId(schoolId);
        log.info("[deleteSchool] academic records deleted");

        // ── 7. Leave requests ─────────────────────────────────────────────────
        leaveRequestRepository.deleteBySchoolId(schoolId);

        // ── 8. Fees (installments first — FK depends on assignment) ──────────
        feeInstallmentRepository.deleteBySchoolId(schoolId);
        studentFeeAssignmentRepository.deleteBySchoolId(schoolId);
        classFeeStructureRepository.deleteBySchoolId(schoolId);
        feePaymentRepository.deleteBySchoolId(schoolId);
        feeRepository.deleteBySchoolId(schoolId);
        log.info("[deleteSchool] fee records deleted");

        // ── 9. Salaries (payments first — FK depends on salary) ──────────────
        salaryPaymentRepository.deleteBySchoolId(schoolId);
        salaryRepository.deleteBySchoolId(schoolId);
        log.info("[deleteSchool] salary records deleted");

        // ── 10. Transport ────────────────────────────────────────────────────
        studentTransportRepository.deleteBySchoolId(schoolId);
        transportStudentAssignmentRepository.deleteBySchoolId(schoolId);
        transportFeeRepository.deleteBySchoolId(schoolId);
        transportStopRepository.deleteBySchoolId(schoolId);
        transportRouteRepository.deleteBySchoolId(schoolId);
        transportDriverRepository.deleteBySchoolId(schoolId);
        transportBusRepository.deleteBySchoolId(schoolId);
        log.info("[deleteSchool] transport records deleted");

        // ── 11. Expenses, holidays, import logs, admissions ──────────────────
        expenseRepository.deleteBySchoolId(schoolId);
        holidayRepository.deleteBySchoolId(schoolId);
        importLogRepository.deleteBySchoolId(schoolId);
        admissionApplicationRepository.deleteBySchoolId(schoolId);

        // ── 12. Class rooms ──────────────────────────────────────────────────
        classRoomRepository.deleteBySchoolId(schoolId);

        // ── 13. Students and teachers (user accounts included via cascade) ───
        // Delete student user accounts first
        studentRepository.findBySchoolId(schoolId).forEach(s -> {
            if (s.getStudentUserId() != null) userRepository.deleteById(s.getStudentUserId());
        });
        studentRepository.deleteBySchoolId(schoolId);

        // Delete teacher user accounts first
        teacherRepository.findBySchoolId(schoolId).forEach(t -> {
            if (t.getUser() != null) userRepository.deleteById(t.getUser().getId());
        });
        teacherRepository.deleteBySchoolId(schoolId);
        log.info("[deleteSchool] students and teachers deleted");

        // ── 14. Remaining users (ADMIN, SUPER_ADMIN) linked to this school ───
        userRepository.deleteBySchoolId(schoolId);

        // ── 15. Delete the school itself ─────────────────────────────────────
        schoolRepository.deleteById(schoolId);
        log.info("[deleteSchool] COMPLETE — school '" + schoolName + "' (id=" + schoolId + ") fully removed");

        return ApiResponse.success("School '" + schoolName + "' and all related data permanently deleted", "Deleted");
    }
}
