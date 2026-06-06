package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.CreateTeacherRequest;
import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;
import java.util.Map;

@Service
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);

    @Autowired private StudentRepository studentRepository;
    @Autowired private TeacherRepository teacherRepository;
    @Autowired private ClassRoomRepository classRoomRepository;
    @Autowired private FeeRepository feeRepository;
    @Autowired private FeePaymentRepository feePaymentRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private UserRepository  userRepository;
    @Autowired private SchoolRepository schoolRepository;
    @Autowired private ParentProfileRepository parentProfileRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private EmailService emailService;
    @Autowired private SalaryRepository salaryRepository;
    @Autowired private LeaveRequestRepository leaveRequestRepository;
    @Autowired private TimetableRepository timetableRepository;
    @Autowired private AssignmentRepository assignmentRepository;
    @Autowired private MarksRepository marksRepository;
    @Autowired private HallTicketRepository hallTicketRepository;
    @Autowired private CertificateRepository certificateRepository;
    @Autowired private TransportStudentAssignmentRepository transportStudentAssignmentRepository;
    @Autowired private AdmissionApplicationRepository admissionApplicationRepository;
    @Autowired private ExamScheduleRepository examScheduleRepository;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;
    @Autowired private TransportFeeRepository transportFeeRepository;
    @Autowired private ClassFeeStructureRepository classFeeStructureRepository;
    @Autowired private StudentFeeAssignmentRepository studentFeeAssignmentRepository;
    @Autowired private FeeInstallmentRepository feeInstallmentRepository;
    @Autowired private AppNotificationRepository appNotificationRepository;
    @Autowired private ClassDiaryRepository classDiaryRepository;
    @Autowired private MessageRepository messageRepository;
    @Autowired private SalaryPaymentRepository salaryPaymentRepository;
    @Autowired private GradeScaleRepository gradeScaleRepository;
    @Autowired private AuditLogService auditLogService;
    private static final String CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final java.util.regex.Pattern EMAIL_PATTERN =
        java.util.regex.Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    /**
     * Returns true when a school-scoped admin is trying to access an entity
     * from a different school. Both IDs must be non-null to trigger a mismatch.
     * Platform-level SUPER_ADMINs (schoolId == null) always pass through.
     */
    private boolean schoolMismatch(Long authSchoolId, Long entitySchoolId) {
        return authSchoolId != null && entitySchoolId != null
                && !authSchoolId.equals(entitySchoolId);
    }

    private void cleanupOrphanUser(com.schoolers.model.User user) {
        if (user != null && user.getId() != null) {
            try { userRepository.deleteById(user.getId()); } catch (Exception ignored) {}
        }
    }

    private String generatePassword() {
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
        return sb.toString();
    }

    /**
     * Generates a secure password guaranteed to have at least one uppercase,
     * one lowercase, one digit, and one special character (min 8 chars).
     */
    private String generateStudentPassword() {
        String upper   = "ABCDEFGHJKMNPQRSTUVWXYZ";
        String lower   = "abcdefghjkmnpqrstuvwxyz";
        String digits  = "23456789";
        String special = "@#$!";
        String all     = upper + lower + digits + special;

        char[] pwd = new char[10];
        pwd[0] = upper .charAt(RANDOM.nextInt(upper.length()));
        pwd[1] = lower .charAt(RANDOM.nextInt(lower.length()));
        pwd[2] = digits.charAt(RANDOM.nextInt(digits.length()));
        pwd[3] = special.charAt(RANDOM.nextInt(special.length()));
        for (int i = 4; i < 10; i++) pwd[i] = all.charAt(RANDOM.nextInt(all.length()));
        // shuffle
        for (int i = 9; i > 0; i--) {
            int j = RANDOM.nextInt(i + 1);
            char tmp = pwd[i]; pwd[i] = pwd[j]; pwd[j] = tmp;
        }
        return new String(pwd);
    }

    /**
     * Username = admission number (lowercase, alphanumeric only).
     * Falls back to roll number, then a random suffix if neither is available.
     */
    private String buildStudentUsername(String fullName, String admissionNumber, String rollNumber) {
        String src = (admissionNumber != null && !admissionNumber.isBlank())
                ? admissionNumber.trim()
                : (rollNumber != null && !rollNumber.isBlank() ? rollNumber.trim() : null);
        if (src != null) {
            return src.toLowerCase().replaceAll("[^a-z0-9]", "");
        }
        // Last resort: name-based fallback
        String[] parts = (fullName == null ? "student" : fullName.trim()).split("\\s+");
        String base = parts[0].toLowerCase().replaceAll("[^a-z0-9]", "");
        return base + String.valueOf(RANDOM.nextInt(9000) + 1000);
    }

    /** Result wrapper for student user creation. loginEmail is what the student uses to log in. */
    private record StudentUserResult(User user, String loginEmail, String rawPassword) {}

    /**
     * Creates a User row for a student.
     * If studentEmail is a valid real email, it is used as the login email directly (same as teacher flow).
     * Otherwise falls back to generating an internal username@student.schoolers.local email.
     * Throws on DB error so the caller's @Transactional rolls back cleanly.
     * schoolId is stamped on the User row for multi-tenant isolation.
     */
    private StudentUserResult createStudentUser(String fullName, String admissionNumber,
                                                String rollNumber, Long studentId, String studentEmail) {
        return createStudentUser(fullName, admissionNumber, rollNumber, studentId, studentEmail, null);
    }

    private StudentUserResult createStudentUser(String fullName, String admissionNumber,
                                                String rollNumber, Long studentId, String studentEmail,
                                                Long schoolId) {
        String email;
        String username = buildStudentUsername(fullName, admissionNumber, rollNumber);

        // Handle username collisions by appending a counter
        int attempt = 0;
        String candidateUsername = username;
        while (userRepository.existsByUsername(candidateUsername)) {
            attempt++;
            candidateUsername = username + attempt;
        }
        username = candidateUsername;

        if (studentEmail != null && !studentEmail.isBlank()
                && EMAIL_PATTERN.matcher(studentEmail.trim().toLowerCase()).matches()) {
            // Use the real email provided by admin (teacher-style login)
            email = studentEmail.trim().toLowerCase();
        } else {
            // Auto-generate email from admission/roll number
            email = username + "@my-skoolz.com";
            while (userRepository.existsByEmailIgnoreCase(email)) {
                username = username + "_s";
                email = username + "@my-skoolz.com";
            }
        }

        String rawPassword = generateStudentPassword();
        User saved = userRepository.save(User.builder()
                .name(fullName != null ? fullName.trim() : "Student")
                .email(email)
                .username(username)
                .studentId(studentId)
                .password(passwordEncoder.encode(rawPassword))
                .tempPassword(rawPassword)
                .role(User.Role.STUDENT)
                .isActive(true)
                .firstLogin(true)
                .schoolId(schoolId)
                .build());

        log.info("[createStudentUser] Saved STUDENT user id=" + saved.getId()
                + " email=" + email + " studentId=" + studentId);
        return new StudentUserResult(saved, email, rawPassword);
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        String[] formats = {"yyyy-MM-dd", "dd MMM yyyy", "dd/MM/yyyy", "MM/dd/yyyy"};
        for (String fmt : formats) {
            try { return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern(fmt)); } catch (DateTimeParseException ignored) {}
        }
        return null;
    }

    // ── Dashboard ──────────────────────────────────────────────────────────

    public ApiResponse<Map<String, Object>> getDashboardStats(Long schoolId) {
        Map<String, Object> stats = new HashMap<>();
        int currentYear = java.time.LocalDate.now().getYear();
        String[] monthNames = {"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};

        if (schoolId != null) {
            // Single round-trip to the DB for all counts and aggregates.
            // Previously 11 sequential queries × ~40 ms Supabase latency = ~440 ms minimum.
            // Now: 1 query, all subqueries run in parallel inside PostgreSQL.
            String countSql =
                "SELECT " +
                "  (SELECT COUNT(*) FROM students       WHERE school_id = ?) AS total_students," +
                "  (SELECT COUNT(*) FROM teachers       WHERE school_id = ?) AS total_teachers," +
                "  (SELECT COUNT(*) FROM classrooms     WHERE school_id = ?) AS total_classes," +
                "  (SELECT COUNT(*) FROM exam_schedules WHERE school_id = ?) AS total_exams," +
                "  COALESCE((SELECT SUM(amount_paid) FROM fee_payments WHERE school_id = ?), 0) AS total_revenue," +
                "  COALESCE((SELECT SUM(amount)      FROM expenses     WHERE school_id = ?), 0) AS total_expenses," +
                "  (SELECT COUNT(*) FROM admission_applications WHERE school_id = ? AND status = 'PENDING') AS pending_apps";

            java.util.Map<String, Object> row = jdbcTemplate.queryForMap(countSql,
                schoolId, schoolId, schoolId, schoolId, schoolId, schoolId, schoolId);

            stats.put("totalStudents",        row.get("total_students"));
            stats.put("totalTeachers",        row.get("total_teachers"));
            stats.put("totalClasses",         row.get("total_classes"));
            stats.put("totalExams",           row.get("total_exams"));
            stats.put("totalRevenue",         row.get("total_revenue"));
            stats.put("totalExpenses",        row.get("total_expenses"));
            stats.put("pendingApplications",  row.get("pending_apps"));

            // Last 5 records — two small queries (LIMIT 5 each, index-backed)
            stats.put("recentApplications",
                admissionApplicationRepository.findTop5BySchoolIdOrderByCreatedAtDesc(schoolId));
            stats.put("recentFeePayments",
                feePaymentRepository.findTop5BySchoolIdOrderByPaymentDateDescCreatedAtDesc(schoolId));

            // Monthly chart — 2 GROUP BY aggregates (combined into one query)
            String monthlySql =
                "SELECT 'rev' AS kind, EXTRACT(MONTH FROM payment_date) AS m, COALESCE(SUM(amount_paid),0) AS total " +
                "  FROM fee_payments WHERE school_id = ? AND EXTRACT(YEAR FROM payment_date) = ? GROUP BY m " +
                "UNION ALL " +
                "SELECT 'exp' AS kind, EXTRACT(MONTH FROM date) AS m, COALESCE(SUM(amount),0) AS total " +
                "  FROM expenses WHERE school_id = ? AND EXTRACT(YEAR FROM date) = ? GROUP BY m";

            java.util.Map<Integer, BigDecimal> revByMonth = new java.util.HashMap<>();
            java.util.Map<Integer, BigDecimal> expByMonth = new java.util.HashMap<>();
            jdbcTemplate.query(monthlySql,
                rs -> {
                    String kind = rs.getString("kind");
                    int m = rs.getInt("m");
                    BigDecimal total = rs.getBigDecimal("total");
                    if ("rev".equals(kind)) revByMonth.put(m, total != null ? total : BigDecimal.ZERO);
                    else                    expByMonth.put(m, total != null ? total : BigDecimal.ZERO);
                },
                schoolId, currentYear, schoolId, currentYear);

            java.util.List<java.util.Map<String, Object>> monthly = new java.util.ArrayList<>();
            for (int m = 1; m <= 12; m++) {
                java.util.Map<String, Object> mo = new java.util.LinkedHashMap<>();
                mo.put("name",     monthNames[m - 1]);
                mo.put("revenue",  revByMonth.getOrDefault(m, BigDecimal.ZERO));
                mo.put("expenses", expByMonth.getOrDefault(m, BigDecimal.ZERO));
                monthly.add(mo);
            }
            stats.put("monthlyData", monthly);
        } else {
            // Platform-level: simple counts across all schools
            stats.put("totalStudents", studentRepository.count());
            stats.put("totalTeachers", teacherRepository.count());
            stats.put("totalClasses",  classRoomRepository.count());
            stats.put("totalExams",    examScheduleRepository.count());
            BigDecimal rev = feePaymentRepository.sumAmountPaidAll();
            BigDecimal exp = expenseRepository.sumAllExpenses();
            stats.put("totalRevenue",  rev != null ? rev : BigDecimal.ZERO);
            stats.put("totalExpenses", exp != null ? exp : BigDecimal.ZERO);
            stats.put("monthlyData",   java.util.List.of());
        }
        return ApiResponse.success(stats);
    }

    // ── Students ───────────────────────────────────────────────────────────

    public ApiResponse<Page<Student>> getStudents(Long schoolId, String search, String className, String status, int page, int size) {
        if (schoolId == null) return ApiResponse.success(Page.empty());
        size = Math.min(size, 200);
        Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
        // Escape LIKE wildcards so a search for "50%" doesn't match every row
        String s  = search    != null ? search.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") : "";
        String cn = className != null ? className.trim() : "";
        String st = status    != null ? status.trim()    : "";
        return ApiResponse.success(studentRepository.findByFilters(schoolId, s, cn, st, pageable));
    }

    public ApiResponse<Student> getStudentById(Long id, Long schoolId) {
        return studentRepository.findById(id)
                .map(s -> schoolMismatch(schoolId, s.getSchoolId())
                        ? ApiResponse.<Student>error("Student not found with id: " + id)
                        : ApiResponse.success(s))
                .orElse(ApiResponse.error("Student not found with id: " + id));
    }

    @Transactional
    public ApiResponse<Map<String, Object>> createStudent(Map<String, Object> body) {
        // Accept both camelCase frontend fields and snake_case backend fields
        String rollNumber = str(body, "rollNumber", str(body, "rollNo", null));
        if (rollNumber == null || rollNumber.isBlank())
            return ApiResponse.error("Roll number is required");
        rollNumber = rollNumber.trim();

        String name = str(body, "name", null);
        if (name == null || name.isBlank()) return ApiResponse.<Map<String, Object>>error("Student name is required");

        // Email is optional — if provided, a user account is created; if absent, the student
        // record is saved without an account (student can self-signup later via admission number).
        String studentEmailRaw = str(body, "studentEmail", null);
        boolean hasEmail = studentEmailRaw != null && !studentEmailRaw.isBlank();
        if (hasEmail) {
            if (!EMAIL_PATTERN.matcher(studentEmailRaw.trim().toLowerCase()).matches())
                return ApiResponse.<Map<String, Object>>error("A valid student email address is required");
            if (userRepository.existsByEmailIgnoreCase(studentEmailRaw.trim()))
                return ApiResponse.<Map<String, Object>>error("Email '" + studentEmailRaw.trim().toLowerCase() + "' is already registered. Use a different email.");
        }

        String parentMobileRaw = str(body, "parentMobile", str(body, "fatherPhone", str(body, "mobile", null)));
        if (parentMobileRaw == null || parentMobileRaw.isBlank())
            return ApiResponse.<Map<String, Object>>error("Father's phone number is required");

        // Extract schoolId injected by AdminController from authenticated user
        Long schoolId = body.get("schoolId") != null
                ? Long.parseLong(body.get("schoolId").toString()) : null;

        // Enforce per-school user limit
        ApiResponse<Map<String, Object>> limitErr = checkUserLimit(schoolId);
        if (limitErr != null) return limitErr;

        String className = resolveClassName(str(body, "className", str(body, "class", "")));
        String section   = normalizeSection(str(body, "section", ""));

        // Roll-number uniqueness is scoped to (school, class, section) only.
        // Without a schoolId there is no meaningful scope — skip the check.
        if (schoolId != null &&
                studentRepository.findDuplicateInClassAndSchool(schoolId, rollNumber, className, section).isPresent())
            return ApiResponse.<Map<String, Object>>error(
                "Roll number " + rollNumber + " already exists in " +
                (className.isBlank() ? "this class" : className) +
                (section.isBlank() ? "" : " – " + section) +
                " for this school.");

        // Validate roll number range and capacity
        if (schoolId != null && !className.isBlank()) {
            ClassRoom targetRoom = classRoomRepository
                    .findBySchoolIdAndNameIgnoreCaseAndSectionIgnoreCase(schoolId, className, section != null ? section : "")
                    .orElse(null);
            if (targetRoom != null && targetRoom.getCapacity() != null && targetRoom.getCapacity() > 0) {
                // Roll number must be within 1 to capacity
                try {
                    int rollInt = Integer.parseInt(rollNumber);
                    if (rollInt < 1 || rollInt > targetRoom.getCapacity()) {
                        return ApiResponse.<Map<String, Object>>error(
                            "Roll number must be between 1 and " + targetRoom.getCapacity()
                            + " (class capacity is " + targetRoom.getCapacity() + ").");
                    }
                } catch (NumberFormatException ignored) {}
                // Reject if class is already full
                long enrolled = studentRepository.countEnrolledForCapacity(
                        schoolId, className, section != null ? section : "");
                if (enrolled >= targetRoom.getCapacity()) {
                    return ApiResponse.<Map<String, Object>>error(
                        "Maximum capacity reached for this class. Cannot add more students.");
                }
            }
        }

        Student student = Student.builder()
                .name(name)
                .rollNumber(rollNumber)
                .admissionNumber(str(body, "admissionNumber", null))
                .className(className)
                .section(section)
                .parentName(str(body, "parentName", str(body, "fatherName", str(body, "parent", ""))))
                .parentMobile(str(body, "parentMobile", str(body, "fatherPhone", str(body, "mobile", ""))))
                .motherName(str(body, "motherName", null))
                .motherMobile(str(body, "motherMobile", str(body, "motherPhone", null)))
                .guardianName(str(body, "guardianName", null))
                .guardianMobile(str(body, "guardianMobile", str(body, "guardianPhone", null)))
                .dateOfBirth(parseDate(str(body, "dateOfBirth", str(body, "dob", null))))
                .address(str(body, "address", str(body, "permanentAddress", "")))
                .alternateAddress(str(body, "alternateAddress", null))
                .photoUrl(str(body, "photo", str(body, "photoUrl", null)))
                .idProof(str(body, "idProof", null))
                .idProofName(str(body, "idProofName", null))
                .tcDocument(str(body, "tcDocument", null))
                .tcDocumentName(str(body, "tcDocumentName", null))
                .bonafideDocument(str(body, "bonafideDocument", null))
                .bonafideDocumentName(str(body, "bonafideDocumentName", null))
                .isActive(!"Inactive".equalsIgnoreCase(str(body, "status", "Active")))
                .schoolId(schoolId)
                .build();

        try {
            // Step 1: Save the student record to obtain its generated ID
            Student saved = studentRepository.save(student);
            ensureClassExists(saved.getClassName(), saved.getSection(), schoolId);

            // Step 3: Create user account only when an email was provided.
            // Without an email the student record is saved first; the student can
            // self-signup later (via /auth/student-signup) or an admin can onboard them.
            String studentEmail = str(body, "studentEmail", null);
            StudentUserResult studentUserResult = hasEmail
                    ? createStudentUser(name, saved.getAdmissionNumber(), rollNumber, saved.getId(), studentEmail, schoolId)
                    : null;

            // Step 4: Back-patch the student row with the user ID
            if (studentUserResult != null) {
                saved.setStudentUserId(studentUserResult.user().getId());
                saved = studentRepository.save(saved);
            }

            log.info("[createStudent] Saved student id=" + saved.getId() + " roll=" + rollNumber
                    + (saved.getStudentUserId() != null ? " studentUserId=" + saved.getStudentUserId() : " (no account yet)")
                    + (saved.getParentId() != null ? " parentId=" + saved.getParentId() : ""));

            Map<String, Object> responseData = new LinkedHashMap<>();
            responseData.put("student", saved);

            // Student credentials (only when account was created)
            if (studentUserResult != null) {
                responseData.put("studentEmail", studentUserResult.loginEmail());
                responseData.put("studentUsername", studentUserResult.user().getUsername());
                responseData.put("studentTempPassword", studentUserResult.rawPassword());
                emailService.sendWelcomeEmail(studentUserResult.loginEmail(), name.trim(), "STUDENT", studentUserResult.rawPassword());
            }

            responseData.put("newParentCreated", false);
            return ApiResponse.success("Student created successfully", responseData);
        } catch (DataIntegrityViolationException e) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            // The top-level message rarely has useful detail; the root cause does
            String detail = e.getMostSpecificCause() != null
                    ? (e.getMostSpecificCause().getMessage() != null ? e.getMostSpecificCause().getMessage() : "")
                    : (e.getMessage() != null ? e.getMessage() : "");
            String lowerDetail = detail.toLowerCase();
            String msg;
            if (lowerDetail.contains("roll_number") || lowerDetail.contains("uq_roll_class_section")) {
                msg = "Roll number " + rollNumber + " already exists in " + className
                        + (section.isBlank() ? "" : " – " + section) + " for this school.";
            } else if (lowerDetail.contains("uk_users_email") || lowerDetail.contains("(email)")) {
                msg = "A duplicate email was detected. Please try again.";
            } else if (lowerDetail.contains("uk_users_mobile") || lowerDetail.contains("(mobile)")) {
                msg = "A phone number entered is already registered. Please check parent details.";
            } else if (lowerDetail.contains("duplicate") || lowerDetail.contains("unique")) {
                msg = "A duplicate entry was detected. Please check all fields and try again.";
            } else {
                msg = "Database error: " + detail;
            }
            log.error("[createStudent] DataIntegrity error: " + detail);
            return ApiResponse.<Map<String, Object>>error(msg);

        } catch (Exception e) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            log.error("[createStudent] Unexpected error: " + msg);
            return ApiResponse.<Map<String, Object>>error("Failed to save student: " + msg);
        }
    }

    /** Creates a user account for a student record that was imported without an email. */
    @Transactional
    public ApiResponse<Map<String, Object>> onboardStudentAccount(Long studentId, String email, Long callerSchoolId) {
        Student student = studentRepository.findById(studentId).orElse(null);
        if (student == null) return ApiResponse.error("Student not found");
        if (callerSchoolId != null && !callerSchoolId.equals(student.getSchoolId()))
            return ApiResponse.error("Student not found");
        if (student.getStudentUserId() != null)
            return ApiResponse.error("Student already has an account");
        if (email == null || email.isBlank())
            return ApiResponse.error("Email is required");
        if (!EMAIL_PATTERN.matcher(email.trim().toLowerCase()).matches())
            return ApiResponse.error("A valid email address is required");
        if (userRepository.existsByEmailIgnoreCase(email.trim()))
            return ApiResponse.error("Email '" + email.trim().toLowerCase() + "' is already registered");

        StudentUserResult result = createStudentUser(
                student.getName(), student.getAdmissionNumber(),
                student.getRollNumber(), student.getId(), email.trim(), student.getSchoolId());
        student.setStudentUserId(result.user().getId());
        studentRepository.save(student);

        emailService.sendWelcomeEmail(result.loginEmail(), student.getName(), "STUDENT", result.rawPassword());

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentEmail", result.loginEmail());
        data.put("studentTempPassword", result.rawPassword());
        return ApiResponse.success("Account created. Welcome email sent.", data);
    }

    @Transactional
    public ApiResponse<Student> updateStudent(Long id, Map<String, Object> body, Long schoolId) {
        try { return studentRepository.findById(id)
                .map(student -> {
                    if (schoolMismatch(schoolId, student.getSchoolId()))
                        return ApiResponse.<Student>error("Student not found");
                    String targetClass = body.containsKey("className") || body.containsKey("class")
                            ? resolveClassName(str(body, "className", str(body, "class", student.getClassName())))
                            : student.getClassName();
                    String targetSection = body.containsKey("section")
                            ? normalizeSection(str(body, "section", student.getSection()))
                            : normalizeSection(student.getSection());
                    String targetRoll = body.containsKey("rollNumber")
                            ? str(body, "rollNumber", student.getRollNumber()).trim()
                            : student.getRollNumber();

                    // Use the student's own school when the caller context has no school (APPLICATION_OWNER).
                    Long dupSchoolId = schoolId != null ? schoolId : student.getSchoolId();
                    if (dupSchoolId != null) {
                        studentRepository.findDuplicateInClassAndSchool(dupSchoolId, targetRoll, targetClass, targetSection)
                                .ifPresent(existing -> {
                                    if (!existing.getId().equals(id))
                                        throw new IllegalArgumentException(
                                            "Roll number " + targetRoll + " already exists in " +
                                            (targetClass.isBlank() ? "this class" : targetClass) +
                                            (targetSection.isBlank() ? "" : " – " + targetSection) +
                                            " for this school.");
                                });
                    }

                    // Capacity check when moving to a different class/section
                    boolean classChanging = !targetClass.equalsIgnoreCase(student.getClassName())
                            || !targetSection.equalsIgnoreCase(normalizeSection(student.getSection()));
                    if (classChanging && dupSchoolId != null && !targetClass.isBlank()) {
                        ClassRoom targetRoom = classRoomRepository
                                .findBySchoolIdAndNameIgnoreCaseAndSectionIgnoreCase(dupSchoolId, targetClass, targetSection)
                                .orElse(null);
                        if (targetRoom != null && targetRoom.getCapacity() != null && targetRoom.getCapacity() > 0) {
                            long enrolled = studentRepository.countEnrolledForCapacity(dupSchoolId, targetClass, targetSection);
                            if (enrolled >= targetRoom.getCapacity()) {
                                throw new IllegalArgumentException(
                                    "Maximum capacity reached for this class. Cannot add more students.");
                            }
                        }
                    }

                    if (body.containsKey("name"))            student.setName(str(body, "name", student.getName()));
                    if (body.containsKey("admissionNumber")) student.setAdmissionNumber(str(body, "admissionNumber", student.getAdmissionNumber()));
                    student.setClassName(targetClass);
                    student.setSection(targetSection);
                    student.setRollNumber(targetRoll);
                    if (body.containsKey("parentName") || body.containsKey("fatherName"))
                        student.setParentName(str(body, "parentName", str(body, "fatherName", student.getParentName())));
                    if (body.containsKey("parentMobile") || body.containsKey("fatherPhone")) {
                        String newMobile = str(body, "parentMobile", str(body, "fatherPhone", student.getParentMobile()));
                        String existingMobile = student.getParentMobile();
                        student.setParentMobile(newMobile);
                        // Only clear parentId when the mobile number actually changes
                        if (newMobile != null && !newMobile.isBlank()
                                && !newMobile.equals(existingMobile)) {
                            student.setParentId(null); // Parent link invalidated by mobile change
                        }
                    }
                    if (body.containsKey("motherName"))
                        student.setMotherName(str(body, "motherName", student.getMotherName()));
                    if (body.containsKey("motherMobile") || body.containsKey("motherPhone"))
                        student.setMotherMobile(str(body, "motherMobile", str(body, "motherPhone", student.getMotherMobile())));
                    if (body.containsKey("guardianName"))
                        student.setGuardianName(str(body, "guardianName", student.getGuardianName()));
                    if (body.containsKey("guardianMobile") || body.containsKey("guardianPhone"))
                        student.setGuardianMobile(str(body, "guardianMobile", str(body, "guardianPhone", student.getGuardianMobile())));
                    if (body.containsKey("dateOfBirth") || body.containsKey("dob"))
                        student.setDateOfBirth(parseDate(str(body, "dateOfBirth", str(body, "dob", null))));
                    if (body.containsKey("address") || body.containsKey("permanentAddress"))
                        student.setAddress(str(body, "address", str(body, "permanentAddress", student.getAddress())));
                    if (body.containsKey("alternateAddress"))
                        student.setAlternateAddress(str(body, "alternateAddress", student.getAlternateAddress()));
                    if (body.containsKey("status"))
                        student.setIsActive(!"Inactive".equalsIgnoreCase(str(body, "status", "Active")));
                    if (body.containsKey("photo") || body.containsKey("photoUrl"))
                        student.setPhotoUrl(str(body, "photo", str(body, "photoUrl", student.getPhotoUrl())));
                    if (body.containsKey("idProof"))
                        student.setIdProof(str(body, "idProof", student.getIdProof()));
                    if (body.containsKey("idProofName"))
                        student.setIdProofName(str(body, "idProofName", student.getIdProofName()));
                    if (body.containsKey("tcDocument"))
                        student.setTcDocument(str(body, "tcDocument", student.getTcDocument()));
                    if (body.containsKey("tcDocumentName"))
                        student.setTcDocumentName(str(body, "tcDocumentName", student.getTcDocumentName()));
                    if (body.containsKey("bonafideDocument"))
                        student.setBonafideDocument(str(body, "bonafideDocument", student.getBonafideDocument()));
                    if (body.containsKey("bonafideDocumentName"))
                        student.setBonafideDocumentName(str(body, "bonafideDocumentName", student.getBonafideDocumentName()));
                    Student saved = studentRepository.save(student);
                    ensureClassExists(saved.getClassName(), saved.getSection());
                    return ApiResponse.success("Student updated", saved);
                })
                .orElse(ApiResponse.error("Student not found"));
        } catch (DataIntegrityViolationException e) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            String detail = e.getMostSpecificCause() != null && e.getMostSpecificCause().getMessage() != null
                    ? e.getMostSpecificCause().getMessage() : e.getMessage();
            String lower = detail != null ? detail.toLowerCase() : "";
            String msg = lower.contains("roll_number") || lower.contains("uq_roll_class_section")
                    ? "Roll number already exists in this class and section for this school."
                    : lower.contains("(mobile)") || lower.contains("uk_users_mobile")
                        ? "A phone number is already registered. Please check parent details."
                        : lower.contains("duplicate") || lower.contains("unique")
                            ? "A duplicate entry was detected. Please check all fields."
                            : "Database error: " + detail;
            return ApiResponse.error(msg);
        } catch (Exception e) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            return ApiResponse.error(e.getMessage() != null ? e.getMessage() : "Failed to update student. Please try again.");
        }
    }

    /**
     * Deletes a student and ALL related records atomically.
     *
     * Deletion order (child → parent to satisfy FK constraints):
     *   1. marks, hall_tickets, certificates
     *   2. attendance, fee_payments, fees, transport_fees, transport_student_assignments
     *   3. leave_requests
     *   4. student row
     *   5. linked User login account (resolved via studentUserId on Student OR studentId on User)
     *
     * The entire operation runs inside a single @Transactional boundary.
     * If the login-account deletion throws, the exception propagates and Spring
     * rolls back the whole transaction — no partial deletes, no orphan records.
     */
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<String> deleteStudent(Long id, Long schoolId) {
        Student student = studentRepository.findById(id).orElse(null);
        if (student == null) {
            log.warn("[deleteStudent] Student not found id=" + id);
            return ApiResponse.error("Student not found with id: " + id);
        }
        if (schoolMismatch(schoolId, student.getSchoolId())) {
            log.warn("[deleteStudent] Cross-school access denied id=" + id + " authSchool=" + schoolId);
            return ApiResponse.error("Student not found with id: " + id);
        }

        String studentName = student.getName();
        Long linkedUserId = student.getStudentUserId();

        log.info("[deleteStudent] START — studentId=" + id
                + " name=" + studentName
                + " linkedUserId=" + linkedUserId);

        // ── Step 1: Academic / result records ──────────────────────────────────
        int marks       = (int) marksRepository.countByStudentId(id);
        marksRepository.deleteByStudentId(id);
        log.info("[deleteStudent] marks deleted=" + marks);

        hallTicketRepository.deleteByStudentId(id);
        certificateRepository.deleteByStudentId(id);
        log.info("[deleteStudent] hall tickets & certificates deleted");

        // ── Step 2: Attendance, fees, transport ───────────────────────────────
        attendanceRepository.deleteByStudentId(id);
        feePaymentRepository.deleteByStudentId(id);
        feeRepository.deleteByStudentId(id);
        transportFeeRepository.deleteByStudentId(id);
        transportStudentAssignmentRepository.deleteByStudentId(id);
        log.info("[deleteStudent] attendance, fees, transport records deleted");

        // ── Step 3: Fee assignments (with installments) ───────────────────────────
        // Note: feePaymentRepository.deleteByStudentId already called in Step 2 above.
        List<com.schoolers.model.StudentFeeAssignment> feeAssignments =
                studentFeeAssignmentRepository.findByStudentId(id);
        for (com.schoolers.model.StudentFeeAssignment fa : feeAssignments) {
            feeInstallmentRepository.deleteByAssignmentId(fa.getId());
        }
        studentFeeAssignmentRepository.deleteByStudentId(id);
        log.info("[deleteStudent] fee payments, assignments & installments deleted");

        // ── Step 4: Leave requests ─────────────────────────────────────────────
        leaveRequestRepository.deleteByRequesterId(id);
        log.info("[deleteStudent] leave requests deleted");

        // ── Step 5: Notifications & direct messages for this student ──────────
        if (linkedUserId != null) {
            appNotificationRepository.deleteByUserId(linkedUserId);
            messageRepository.deleteByTargetStudentId(id);
        }
        log.info("[deleteStudent] notifications & targeted messages deleted");

        // ── Step 6: Delete the student row ────────────────────────────────────
        studentRepository.deleteById(id);
        studentRepository.flush();
        log.info("[deleteStudent] student row deleted id=" + id);

        // ── Step 5: Delete the linked User login account ──────────────────────
        // Resolve via student.studentUserId first; fall back to user.studentId FK.
        com.schoolers.model.User loginUser = null;
        if (linkedUserId != null) {
            loginUser = userRepository.findById(linkedUserId).orElse(null);
        }
        if (loginUser == null) {
            // Fallback: find by the studentId column on the User row
            loginUser = userRepository.findByStudentId(id).orElse(null);
        }

        if (loginUser != null) {
            Long userId    = loginUser.getId();
            String email   = loginUser.getEmail();
            // This delete is NOT wrapped in try/catch — any failure propagates
            // and Spring rolls back the entire transaction automatically.
            userRepository.deleteById(userId);
            userRepository.flush();
            log.info("[deleteStudent] login account deleted userId=" + userId + " email=" + email);
        } else {
            log.warn("[deleteStudent] No login account found for studentId=" + id
                    + " (studentUserId=" + linkedUserId + ") — skipping user deletion");
        }

        log.info("[deleteStudent] COMPLETE — studentId=" + id + " name=" + studentName);
        auditLogService.log(null, "SYSTEM", "ADMIN", schoolId, "DELETE", "Student", id,
                "Deleted student: " + studentName, null);
        return ApiResponse.success("Student and login account deleted successfully", "Deleted");
    }

    /** Returns the student's login username and temp password (only while firstLogin is still true).
     *  If the student has no linked user account, one is auto-created on demand. */
    @Transactional
    public ApiResponse<Map<String, Object>> getStudentCredentials(Long studentId, Long schoolId) {
        return studentRepository.findById(studentId).map(student -> {
            if (schoolMismatch(schoolId, student.getSchoolId()))
                return ApiResponse.<Map<String, Object>>error("Student not found.");
            // Auto-create credentials if the student has no linked user account
            if (student.getStudentUserId() == null) {
                StudentUserResult result = createStudentUser(
                        student.getName(), student.getAdmissionNumber(), student.getRollNumber(), student.getId(), null, student.getSchoolId());
                if (result == null)
                    return ApiResponse.<Map<String, Object>>error("Could not create login account for this student.");
                student.setStudentUserId(result.user().getId());
                studentRepository.save(student);
                Map<String, Object> creds = new LinkedHashMap<>();
                creds.put("email", result.loginEmail());
                creds.put("firstLogin", true);
                creds.put("tempPassword", result.rawPassword());
                creds.put("isActive", true);
                return ApiResponse.success("Login account created and credentials retrieved", creds);
            }
            return userRepository.findById(student.getStudentUserId()).map(user -> {
                Map<String, Object> creds = new LinkedHashMap<>();
                creds.put("email", user.getEmail());
                creds.put("firstLogin", Boolean.TRUE.equals(user.getFirstLogin()));
                // Only expose plain-text password while the student hasn't logged in yet
                creds.put("tempPassword", Boolean.TRUE.equals(user.getFirstLogin()) ? user.getTempPassword() : null);
                creds.put("isActive", user.getIsActive());
                return ApiResponse.success("Credentials retrieved", creds);
            }).orElse(ApiResponse.<Map<String, Object>>error("Student user account not found."));
        }).orElse(ApiResponse.<Map<String, Object>>error("Student not found."));
    }

    // ── Teachers ───────────────────────────────────────────────────────────

    public ApiResponse<List<Map<String, Object>>> getTeachers(Long schoolId) {
        if (schoolId == null) return ApiResponse.success(java.util.List.of());
        List<Teacher> teachers = teacherRepository.findBySchoolId(schoolId);

        // Batch-load all referenced classrooms in one query to avoid N+1
        java.util.Set<Long> primaryClassIds = teachers.stream()
                .map(Teacher::getPrimaryClassId)
                .filter(id -> id != null)
                .collect(java.util.stream.Collectors.toSet());
        Map<Long, com.schoolers.model.ClassRoom> classRoomMap = classRoomRepository.findAllById(primaryClassIds)
                .stream()
                .collect(java.util.stream.Collectors.toMap(
                        com.schoolers.model.ClassRoom::getId, cr -> cr));

        List<Map<String, Object>> result = teachers.stream().map(t -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id",             t.getId());
            map.put("name",           t.getName());
            map.put("employeeId",     t.getEmployeeId());
            map.put("subject",        t.getSubject());
            map.put("department",     t.getDepartment());
            map.put("classes",        t.getClasses());
            map.put("qualification",  t.getQualification());
            map.put("experience",     t.getExperience());
            map.put("joiningDate",    t.getJoiningDate());
            map.put("teacherType",    t.getTeacherType() != null ? t.getTeacherType() : "SUBJECT_TEACHER");
            map.put("primaryClassId", t.getPrimaryClassId());
            map.put("isActive",       t.getIsActive());
            map.put("schoolId",       t.getSchoolId());
            if (t.getUser() != null) {
                map.put("userId", t.getUser().getId());
                map.put("email",  t.getUser().getEmail());
                map.put("mobile", t.getUser().getMobile());
            }
            // Resolve primary class name from the pre-loaded map (no extra DB call)
            if (t.getPrimaryClassId() != null) {
                com.schoolers.model.ClassRoom cr = classRoomMap.get(t.getPrimaryClassId());
                if (cr != null) {
                    map.put("primaryClassName",
                            cr.getName() + (cr.getSection() != null && !cr.getSection().isBlank()
                                    ? " - " + cr.getSection() : ""));
                }
            }
            return map;
        }).toList();

        return ApiResponse.success(result);
    }

    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<Map<String, Object>> createTeacher(CreateTeacherRequest req) {

        // ── Input validation (fast-fail before touching the DB) ────────────────
        if (req.getName() == null || req.getName().isBlank())
            return ApiResponse.error("Teacher name is required");

        if (req.getEmail() == null || !EMAIL_PATTERN.matcher(req.getEmail()).matches())
            return ApiResponse.error("A valid email address is required");

        if (req.getMobile() == null || req.getMobile().isBlank())
            return ApiResponse.error("Mobile number is required");

        String normalizedEmail  = req.getEmail().trim().toLowerCase();
        String normalizedMobile = req.getMobile().trim();

        // Enforce per-school user limit
        ApiResponse<Map<String, Object>> limitErr = checkUserLimit(req.getSchoolId());
        if (limitErr != null) return limitErr;

        // Case-insensitive pre-check — prevents duplicate accounts regardless of email casing
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail))
            return ApiResponse.error("Email '" + normalizedEmail + "' is already registered. Use a different email.");

        if (userRepository.existsByMobile(normalizedMobile))
            return ApiResponse.error("Mobile number '" + normalizedMobile + "' is already registered. Use a different number.");

        String rawPassword = (req.getPassword() != null && !req.getPassword().isBlank())
                ? req.getPassword()
                : generatePassword();

        String teacherType = normalizeTeacherType(req.getTeacherType());
        Long primaryClassId = isClassTeacherRole(teacherType) ? req.getPrimaryClassId() : null;
        if (isClassTeacherRole(teacherType) && primaryClassId == null)
            return ApiResponse.error("Primary class is required for a class teacher");

        String empId = (req.getEmpId() != null && !req.getEmpId().isBlank())
                ? req.getEmpId().trim()
                : "EMP" + System.currentTimeMillis() % 100000;

        // School-scoped employee ID uniqueness check (not global)
        if (req.getSchoolId() != null && teacherRepository.existsByEmployeeIdAndSchoolId(empId, req.getSchoolId()))
            return ApiResponse.error("Employee ID '" + empId + "' is already assigned to another teacher in this school. Please provide a unique employee ID.");

        User user = null;
        try {
            user = userRepository.save(User.builder()
                    .name(req.getName().trim())
                    .email(normalizedEmail)
                    .mobile(normalizedMobile)
                    .password(passwordEncoder.encode(rawPassword))
                    .tempPassword(rawPassword)
                    .role(User.Role.TEACHER)
                    .isActive(!"Inactive".equalsIgnoreCase(req.getStatus()))
                    .firstLogin(true)
                    .schoolId(req.getSchoolId())
                    .build());

            Teacher teacher = teacherRepository.save(Teacher.builder()
                    .user(user)
                    .name(req.getName().trim())
                    .employeeId(empId)
                    .subject(req.getSubject())
                    .department(req.getDepartment())
                    .classes(req.getClasses())
                    .qualification(req.getQualification())
                    .experience(req.getExperience())
                    .joiningDate(parseDate(req.getJoiningDate()))
                    .isActive(!"Inactive".equalsIgnoreCase(req.getStatus()))
                    .teacherType(teacherType)
                    .primaryClassId(primaryClassId)
                    .schoolId(req.getSchoolId())
                    .build());

            syncPrimaryClassAssignment(teacher, null);

            log.info("[createTeacher] Saved teacher id=" + teacher.getId()
                    + " empId=" + empId + " email=" + normalizedEmail);

            emailService.sendWelcomeEmail(normalizedEmail, req.getName().trim(), "TEACHER", rawPassword);

            Map<String, Object> result = new HashMap<>();
            result.put("id",                teacher.getId());
            result.put("userId",            user.getId());
            result.put("name",              user.getName());
            result.put("email",             user.getEmail());
            result.put("mobile",            user.getMobile());
            result.put("empId",             teacher.getEmployeeId());
            result.put("subject",           teacher.getSubject());
            result.put("department",        teacher.getDepartment());
            result.put("classes",           teacher.getClasses());
            result.put("qualification",     teacher.getQualification());
            result.put("experience",        teacher.getExperience());
            result.put("joiningDate",       teacher.getJoiningDate());
            result.put("status",            teacher.getIsActive() ? "Active" : "Inactive");
            result.put("teacherType",       teacher.getTeacherType());
            result.put("primaryClassId",    teacher.getPrimaryClassId());
            result.put("generatedPassword", rawPassword);

            return ApiResponse.success("Teacher created successfully", result);

        } catch (DataIntegrityViolationException e) {
            cleanupOrphanUser(user);
            String hint = e.getMessage() != null ? e.getMessage().toLowerCase() : "";
            String userMessage;
            if (hint.contains("email") || hint.contains("uk_users_email")) {
                userMessage = "Email '" + normalizedEmail + "' was just registered by another request. Please use a different email.";
            } else if (hint.contains("mobile") || hint.contains("uk_users_mobile")) {
                userMessage = "Mobile number '" + normalizedMobile + "' was just registered by another request. Please use a different number.";
            } else if (hint.contains("employee_id") || hint.contains("unique_school_emp") || hint.contains("teachers_employee_id_key")) {
                userMessage = "Employee ID '" + empId + "' is already assigned to another teacher in this school. Please provide a unique employee ID.";
            } else {
                userMessage = "A data conflict occurred (duplicate entry). Please verify the email, mobile, and employee ID are unique.";
            }
            log.warn("[createTeacher] Constraint violation — email=" + normalizedEmail
                    + " empId=" + empId + " | " + e.getMessage());
            return ApiResponse.error(userMessage);

        } catch (DataAccessException e) {
            cleanupOrphanUser(user);
            log.error("[createTeacher] Database access failure — email=" + normalizedEmail
                    + " | " + e.getClass().getSimpleName() + ": " + e.getMessage());
            return ApiResponse.error("A database error occurred while creating the teacher. Please try again in a moment.");

        } catch (Exception e) {
            cleanupOrphanUser(user);
            log.error("[createTeacher] Unexpected error — email=" + normalizedEmail
                    + " | " + e.getClass().getName() + ": " + e.getMessage());
            return ApiResponse.error("An unexpected error occurred: " + e.getMessage());
        }
    }

    public ApiResponse<Teacher> updateTeacher(Long id, CreateTeacherRequest req) {
        return teacherRepository.findById(id)
                .map(teacher -> {
                    if (schoolMismatch(req.getSchoolId(), teacher.getSchoolId()))
                        return ApiResponse.<Teacher>error("Teacher not found");
                    Long previousPrimaryClassId = teacher.getPrimaryClassId();

                    // Employee ID: validate uniqueness within the school before updating
                    if (req.getEmpId() != null && !req.getEmpId().isBlank()) {
                        String newEmpId = req.getEmpId().trim();
                        if (!newEmpId.equals(teacher.getEmployeeId())) {
                            Long schoolId = teacher.getSchoolId();
                            if (schoolId != null && teacherRepository
                                    .existsByEmployeeIdAndSchoolIdAndIdNot(newEmpId, schoolId, teacher.getId())) {
                                return ApiResponse.<Teacher>error("Employee ID '" + newEmpId
                                        + "' is already assigned to another teacher in this school. Please provide a unique employee ID.");
                            }
                            teacher.setEmployeeId(newEmpId);
                        }
                    }

                    if (req.getName() != null && !req.getName().isBlank()) teacher.setName(req.getName().trim());
                    if (req.getSubject() != null)       teacher.setSubject(req.getSubject());
                    if (req.getDepartment() != null)    teacher.setDepartment(req.getDepartment());
                    if (req.getClasses() != null)       teacher.setClasses(req.getClasses());
                    if (req.getQualification() != null) teacher.setQualification(req.getQualification());
                    if (req.getExperience() != null)    teacher.setExperience(req.getExperience());
                    if (req.getJoiningDate() != null)   teacher.setJoiningDate(parseDate(req.getJoiningDate()));
                    if (req.getStatus() != null)        teacher.setIsActive(!"Inactive".equalsIgnoreCase(req.getStatus()));
                    if (req.getTeacherType() != null)   teacher.setTeacherType(normalizeTeacherType(req.getTeacherType()));
                    if (!isClassTeacherRole(teacher.getTeacherType())) {
                        teacher.setPrimaryClassId(null);
                    } else if (req.getPrimaryClassId() != null || teacher.getPrimaryClassId() != null) {
                        teacher.setPrimaryClassId(req.getPrimaryClassId());
                    }
                    // Update linked User name/mobile if provided
                    if (teacher.getUser() != null) {
                        User u = teacher.getUser();
                        if (req.getName() != null && !req.getName().isBlank()) u.setName(req.getName().trim());
                        if (req.getMobile() != null && !req.getMobile().isBlank()) {
                            String newMobile = req.getMobile().trim();
                            if (userRepository.existsByMobileAndIdNot(newMobile, u.getId()))
                                return ApiResponse.<Teacher>error("Mobile number '" + newMobile + "' is already registered to another user.");
                            u.setMobile(newMobile);
                        }
                        userRepository.save(u);
                    }
                    Teacher saved = teacherRepository.save(teacher);
                    syncPrimaryClassAssignment(saved, previousPrimaryClassId);
                    return ApiResponse.success("Teacher updated", saved);
                })
                .orElse(ApiResponse.error("Teacher not found"));
    }

    public ApiResponse<Map<String, Object>> getTeacherById(Long id, Long schoolId) {
        return teacherRepository.findById(id)
                .map(teacher -> {
                    if (schoolMismatch(schoolId, teacher.getSchoolId()))
                        return ApiResponse.<Map<String, Object>>error("Teacher not found");
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("id", teacher.getId());
                    result.put("name", teacher.getName());
                    result.put("employeeId", teacher.getEmployeeId());
                    result.put("subject", teacher.getSubject());
                    result.put("department", teacher.getDepartment());
                    result.put("classes", teacher.getClasses());
                    result.put("qualification", teacher.getQualification());
                    result.put("experience", teacher.getExperience());
                    result.put("joiningDate", teacher.getJoiningDate());
                    result.put("teacherType", teacher.getTeacherType());
                    result.put("primaryClassId", teacher.getPrimaryClassId());
                    result.put("isActive", teacher.getIsActive());
                    if (teacher.getUser() != null) {
                        result.put("email", teacher.getUser().getEmail());
                        result.put("mobile", teacher.getUser().getMobile());
                    }
                    if (teacher.getPrimaryClassId() != null) {
                        classRoomRepository.findById(teacher.getPrimaryClassId())
                                .ifPresent(classRoom -> result.put("primaryClass", classRoom));
                    }
                    result.put("assignedClasses", classRoomRepository.findByTeacherId(teacher.getId()));
                    return ApiResponse.success(result);
                })
                .orElse(ApiResponse.error("Teacher not found"));
    }

    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<String> deleteTeacher(Long id, Long schoolId) {
        Teacher teacher = teacherRepository.findById(id).orElse(null);
        if (teacher == null) return ApiResponse.error("Teacher not found");
        if (schoolMismatch(schoolId, teacher.getSchoolId()))
            return ApiResponse.error("Teacher not found");

        User linkedUser = teacher.getUser();
        Long linkedUserId = linkedUser != null ? linkedUser.getId() : null;

        // ── Step 1: Timetable, homework, assignments, marks ───────────────────
        timetableRepository.deleteByTeacherId(id);
        assignmentRepository.deleteByTeacherId(id);
        marksRepository.deleteByTeacherId(id);
        classDiaryRepository.deleteByTeacherId(id);
        log.info("[deleteTeacher] academic records deleted for teacherId=" + id);

        // ── Step 2: Messages sent by this teacher ─────────────────────────────
        if (linkedUserId != null) {
            messageRepository.deleteBySenderId(linkedUserId);
        }

        // ── Step 3: Leave requests submitted by this teacher ──────────────────
        if (linkedUserId != null) {
            leaveRequestRepository.deleteByRequesterId(linkedUserId);
        }

        // ── Step 4: Salary records and their payments ─────────────────────────
        List<com.schoolers.model.Salary> salaries = salaryRepository.findByStaffId(id);
        for (com.schoolers.model.Salary sal : salaries) {
            salaryPaymentRepository.deleteBySalaryId(sal.getId());
        }
        salaryRepository.deleteByStaffId(id);
        log.info("[deleteTeacher] salary & payments deleted for teacherId=" + id);

        // ── Step 5: Notifications for this teacher's user account ─────────────
        if (linkedUserId != null) {
            appNotificationRepository.deleteByUserId(linkedUserId);
        }

        // ── Step 6: Reset classroom teacherId if this teacher was class teacher
        classRoomRepository.findByTeacherId(id).forEach(cls -> {
            cls.setTeacherId(null);
            cls.setTeacherName(null);
            classRoomRepository.save(cls);
        });
        log.info("[deleteTeacher] classroom assignments reset for teacherId=" + id);

        // ── Step 7: Delete teacher row then linked user account ───────────────
        teacherRepository.deleteById(id);
        teacherRepository.flush();
        if (linkedUser != null) {
            userRepository.deleteById(linkedUserId);
        }
        log.info("[deleteTeacher] COMPLETE — teacherId=" + id);
        auditLogService.log(null, "SYSTEM", "ADMIN", schoolId, "DELETE", "Teacher", id,
                "Deleted teacher id=" + id, null);
        return ApiResponse.success("Teacher and all related records deleted", "Deleted");
    }

    public ApiResponse<String> resetTeacherPassword(Long teacherId, String newPassword, Long schoolId) {
        if (newPassword == null || newPassword.length() < 8)
            return ApiResponse.error("Password must be at least 8 characters.");
        if (!newPassword.matches(".*[A-Z].*"))
            return ApiResponse.error("Password must contain at least one uppercase letter.");
        if (!newPassword.matches(".*[0-9].*"))
            return ApiResponse.error("Password must contain at least one number.");
        if (!newPassword.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?].*"))
            return ApiResponse.error("Password must contain at least one special character.");
        return teacherRepository.findById(teacherId)
                .map(teacher -> {
                    if (schoolMismatch(schoolId, teacher.getSchoolId()))
                        return ApiResponse.<String>error("Teacher not found");
                    User user = teacher.getUser();
                    if (user == null) return ApiResponse.<String>error("Teacher has no login account.");
                    user.setPassword(passwordEncoder.encode(newPassword));
                    user.setTempPassword(null);
                    user.setFirstLogin(true);
                    userRepository.save(user);
                    auditLogService.log(null, "SYSTEM", "ADMIN", schoolId, "PASSWORD_RESET", "Teacher", teacherId,
                            "Password reset for teacher id=" + teacherId, null);
                    return ApiResponse.success("Password reset successfully", "Password updated");
                })
                .orElse(ApiResponse.error("Teacher not found"));
    }

    // ── Classes ────────────────────────────────────────────────────────────

    public ApiResponse<List<Map<String, Object>>> getClasses(Long schoolId) {
        if (schoolId == null) return ApiResponse.success(java.util.List.of());
        List<ClassRoom> rooms = classRoomRepository.findBySchoolId(schoolId);

        List<Map<String, Object>> result = rooms.stream().map(room -> {
            Long sid = schoolId != null ? schoolId : room.getSchoolId();
            long enrolled = (sid != null)
                    ? studentRepository.countEnrolledForCapacity(sid, room.getName(), room.getSection() != null ? room.getSection() : "")
                    : studentRepository.countByClassNameIgnoreCaseAndSectionIgnoreCase(room.getName(), room.getSection() != null ? room.getSection() : "");
            Map<String, Object> dto = new java.util.LinkedHashMap<>();
            dto.put("id",          room.getId());
            dto.put("name",        room.getName());
            dto.put("section",     room.getSection());
            dto.put("teacherId",   room.getTeacherId());
            dto.put("teacherName", room.getTeacherName());
            dto.put("capacity",    room.getCapacity());
            dto.put("isActive",    room.getIsActive());
            dto.put("schoolId",    room.getSchoolId());
            dto.put("enrolled",    enrolled);
            return dto;
        }).collect(java.util.stream.Collectors.toList());

        return ApiResponse.success(result);
    }

    public ApiResponse<Map<String, Object>> getClassCapacityInfo(String className, String section, Long schoolId) {
        String resolvedClass   = resolveClassName(className != null ? className : "");
        String resolvedSection = section != null ? section.trim() : "";
        if (resolvedClass.isBlank()) return ApiResponse.error("className is required");

        // Look up class — prefer school-scoped, fall back to unscoped (handles both null and non-null schoolId)
        ClassRoom room = (schoolId != null)
                ? classRoomRepository.findBySchoolIdAndNameIgnoreCaseAndSectionIgnoreCase(schoolId, resolvedClass, resolvedSection).orElse(null)
                : classRoomRepository.findByNameIgnoreCaseAndSectionIgnoreCase(resolvedClass, resolvedSection).orElse(null);

        if (room == null) return ApiResponse.error("Class not found");

        Long effectiveSchoolId = schoolId != null ? schoolId : room.getSchoolId();
        // Always use the authoritative capacity-count query (case-insensitive, handles null isActive)
        long enrolled = (effectiveSchoolId != null)
                ? studentRepository.countEnrolledForCapacity(effectiveSchoolId, resolvedClass, resolvedSection)
                : studentRepository.countByClassNameIgnoreCaseAndSectionIgnoreCase(resolvedClass, resolvedSection);

        int capacity = room.getCapacity() != null ? room.getCapacity() : 0;
        boolean isFull = capacity > 0 && enrolled >= capacity;

        Map<String, Object> info = new java.util.LinkedHashMap<>();
        info.put("className",  room.getName());
        info.put("section",    room.getSection());
        info.put("capacity",   capacity);
        info.put("enrolled",   enrolled);
        info.put("available",  capacity > 0 ? Math.max(0, capacity - enrolled) : -1);
        info.put("isFull",     isFull);
        return ApiResponse.success(info);
    }

    @Transactional
    public ApiResponse<ClassRoom> createClass(ClassRoom classRoom, Long schoolId) {
        String name = resolveClassName(classRoom.getName());
        String section = normalizeSection(classRoom.getSection());

        if (name.isBlank()) return ApiResponse.error("Class name is required");

        // Validate that the assigned teacher is eligible to be a class teacher
        if (classRoom.getTeacherId() != null) {
            Teacher t = teacherRepository.findById(classRoom.getTeacherId()).orElse(null);
            if (t == null || !isClassTeacherRole(t.getTeacherType()))
                return ApiResponse.error("Only Class Teachers or Class+Subject Teachers can be assigned as class teacher");
            // Prevent duplicate: one teacher can be class teacher for only one class
            List<ClassRoom> alreadyAssigned = (schoolId != null)
                    ? classRoomRepository.findBySchoolIdAndTeacherId(schoolId, classRoom.getTeacherId())
                    : classRoomRepository.findByTeacherId(classRoom.getTeacherId());
            if (!alreadyAssigned.isEmpty())
                return ApiResponse.error("This teacher is already assigned as Class Teacher for another class");
        }

        // School-scoped duplicate check
        boolean exists = (schoolId != null)
                ? classRoomRepository.existsBySchoolIdAndNameIgnoreCaseAndSectionIgnoreCase(schoolId, name, section)
                : classRoomRepository.existsByNameIgnoreCaseAndSectionIgnoreCase(name, section);
        if (exists)
            return ApiResponse.error("Class " + name + " - " + section + " already exists");

        classRoom.setName(name);
        classRoom.setSection(section);
        classRoom.setSchoolId(schoolId);
        return ApiResponse.success("Class created", classRoomRepository.save(classRoom));
    }

    @Transactional
    public ApiResponse<ClassRoom> updateClass(Long id, ClassRoom updated, Long schoolId) {
        try {
            return classRoomRepository.findById(id)
                .map(c -> {
                    if (schoolMismatch(schoolId, c.getSchoolId()))
                        return ApiResponse.<ClassRoom>error("Class not found");
                    String oldName = c.getName();
                    String oldSection = normalizeSection(c.getSection());

                    if (updated.getName() != null)        c.setName(resolveClassName(updated.getName()));
                    if (updated.getSection() != null)     c.setSection(normalizeSection(updated.getSection()));
                    if (updated.getTeacherId() != null && !updated.getTeacherId().equals(c.getTeacherId())) {
                        // Validate new teacher is eligible for class teacher role
                        Teacher candidateTeacher = teacherRepository.findById(updated.getTeacherId()).orElse(null);
                        if (candidateTeacher == null || !isClassTeacherRole(candidateTeacher.getTeacherType()))
                            return ApiResponse.<ClassRoom>error("Only Class Teachers or Class+Subject Teachers can be assigned as class teacher");
                        // Prevent duplicate: reject if teacher is already class teacher for a different class
                        List<ClassRoom> alreadyAssigned = (c.getSchoolId() != null)
                                ? classRoomRepository.findBySchoolIdAndTeacherId(c.getSchoolId(), updated.getTeacherId())
                                : classRoomRepository.findByTeacherId(updated.getTeacherId());
                        if (alreadyAssigned.stream().anyMatch(room -> !room.getId().equals(id)))
                            return ApiResponse.<ClassRoom>error("This teacher is already assigned as Class Teacher for another class");
                        // Remove class from previous teacher's classes text field
                        if (c.getTeacherId() != null) {
                            teacherRepository.findById(c.getTeacherId()).ifPresent(prev ->
                                removeClassFromTeacherClasses(prev, c.getName(), normalizeSection(c.getSection())));
                        }
                        c.setTeacherId(updated.getTeacherId());
                        // Add class to new teacher's classes text field
                        teacherRepository.findById(updated.getTeacherId()).ifPresent(newT ->
                            addClassToTeacherClasses(newT, resolveClassName(updated.getName() != null ? updated.getName() : c.getName()),
                                normalizeSection(updated.getSection() != null ? updated.getSection() : c.getSection())));
                    } else if (updated.getTeacherId() != null) {
                        c.setTeacherId(updated.getTeacherId());
                    }
                    if (updated.getTeacherName() != null) c.setTeacherName(updated.getTeacherName());
                    if (updated.getCapacity() != null)    c.setCapacity(updated.getCapacity());
                    if (updated.getIsActive() != null)    c.setIsActive(updated.getIsActive());

                    String newName = resolveClassName(c.getName());
                    String newSection = normalizeSection(c.getSection());
                    c.setName(newName);
                    c.setSection(newSection);

                    // School-scoped duplicate check on rename
                    Long roomSchoolId = c.getSchoolId();
                    if (roomSchoolId != null) {
                        classRoomRepository.findBySchoolIdAndNameIgnoreCaseAndSectionIgnoreCase(roomSchoolId, newName, newSection)
                                .ifPresent(existing -> {
                                    if (!existing.getId().equals(id))
                                        throw new IllegalArgumentException("Class " + newName + " - " + newSection + " already exists");
                                });
                    } else {
                        classRoomRepository.findByNameIgnoreCaseAndSectionIgnoreCase(newName, newSection)
                                .ifPresent(existing -> {
                                    if (!existing.getId().equals(id))
                                        throw new IllegalArgumentException("Class " + newName + " - " + newSection + " already exists");
                                });
                    }

                    if (!oldName.equalsIgnoreCase(newName) || !oldSection.equalsIgnoreCase(newSection)) {
                        if (roomSchoolId != null) {
                            // Bulk update: single JPQL UPDATE instead of per-student save
                            studentRepository.bulkUpdateClassName(oldName, oldSection, newName, newSection, roomSchoolId);
                        } else {
                            // Fallback for legacy null-schoolId records (no bulk method without schoolId scope)
                            studentRepository.findByClassNameIgnoreCaseAndSectionIgnoreCase(oldName, oldSection)
                                    .forEach(s -> {
                                        s.setClassName(newName);
                                        s.setSection(newSection);
                                        studentRepository.save(s);
                                    });
                        }
                    }

                    return ApiResponse.success("Class updated", classRoomRepository.save(c));
                })
                .orElse(ApiResponse.error("Class not found"));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(e.getMessage());
        } catch (DataIntegrityViolationException e) {
            // no-op: transaction rollback not available without JPA
            return ApiResponse.error("Unable to update class because some students would duplicate roll numbers in " +
                    resolveClassName(updated.getName()) + " - " + normalizeSection(updated.getSection()));
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<String> deleteClass(Long id, Long schoolId) {
        ClassRoom classRoom = classRoomRepository.findById(id).orElse(null);
        if (classRoom == null) return ApiResponse.error("Class not found");
        if (schoolMismatch(schoolId, classRoom.getSchoolId()))
            return ApiResponse.error("Class not found");

        String className   = resolveClassName(classRoom.getName());
        String section     = normalizeSection(classRoom.getSection());
        Long   classSchoolId = classRoom.getSchoolId();
        String classSection  = className + (section != null && !section.isBlank() ? "-" + section : "");

        // ── Step 1: Cascade-delete every student in this class ────────────────
        List<Student> students = (classSchoolId != null)
                ? studentRepository.findBySchoolIdAndClassNameIgnoreCaseAndSectionIgnoreCase(classSchoolId, className, section)
                : studentRepository.findByClassNameIgnoreCaseAndSectionIgnoreCase(className, section);

        for (Student s : students) {
            Long sid = s.getId();
            Long sUserId = s.getStudentUserId();

            marksRepository.deleteByStudentId(sid);
            hallTicketRepository.deleteByStudentId(sid);
            certificateRepository.deleteByStudentId(sid);
            attendanceRepository.deleteByStudentId(sid);
            feeRepository.deleteByStudentId(sid);
            feePaymentRepository.deleteByStudentId(sid);
            transportFeeRepository.deleteByStudentId(sid);
            transportStudentAssignmentRepository.deleteByStudentId(sid);
            leaveRequestRepository.deleteByRequesterId(sid);
            messageRepository.deleteByTargetStudentId(sid);
            List<com.schoolers.model.StudentFeeAssignment> fas =
                    studentFeeAssignmentRepository.findByStudentId(sid);
            for (com.schoolers.model.StudentFeeAssignment fa : fas) {
                feeInstallmentRepository.deleteByAssignmentId(fa.getId());
            }
            studentFeeAssignmentRepository.deleteByStudentId(sid);
            if (sUserId != null) {
                appNotificationRepository.deleteByUserId(sUserId);
                userRepository.deleteById(sUserId);
            }
            studentRepository.deleteById(sid);
        }
        log.info("[deleteClass] cascade-deleted " + students.size() + " students for class " + classSection);

        // ── Step 2: Class-level records ────────────────────────────────────────
        attendanceRepository.deleteByClassId(id);
        timetableRepository.deleteByClassSection(classSection);
        messageRepository.deleteByClassSection(classSection);
        leaveRequestRepository.deleteByClassSection(classSection);
        classDiaryRepository.deleteByClassNameAndSection(className, section);
        log.info("[deleteClass] class-level records deleted for " + classSection);

        // ── Step 3: Reset teacher's primaryClassId if pointing to this class ──
        teacherRepository.findAllByPrimaryClassId(id).forEach(t -> {
            t.setPrimaryClassId(null);
            teacherRepository.save(t);
        });

        // ── Step 4: Delete the classroom row ──────────────────────────────────
        classRoomRepository.deleteById(id);
        log.info("[deleteClass] COMPLETE — classId=" + id + " (" + classSection + ")");
        return ApiResponse.success("Class and all related data deleted", "Deleted");
    }

    // ── Fees ───────────────────────────────────────────────────────────────

    public ApiResponse<List<Fee>> getFees(Long schoolId) {
        if (schoolId == null) return ApiResponse.success(java.util.List.of());
        return ApiResponse.success(feeRepository.findBySchoolId(schoolId));
    }

    public ApiResponse<List<Student>> searchStudentsForFee(Long schoolId, String query, String className, String section) {
        boolean hasQuery  = query     != null && !query.trim().isEmpty();
        boolean hasCls    = className != null && !className.trim().isEmpty();
        boolean hasSec    = section   != null && !section.trim().isEmpty();

        if (!hasQuery && !hasCls) return ApiResponse.success(java.util.Collections.emptyList());

        List<Student> results;

        if (hasQuery) {
            // Name / roll / phone search
            results = (schoolId != null)
                    ? studentRepository.searchBySchoolAndNameRollOrPhone(schoolId, query.trim())
                    : studentRepository.searchByNameRollOrPhone(query.trim());

            // Narrow by class + section using exact matching (not CONTAINS)
            if (hasCls) {
                final String clsLc  = className.trim().toLowerCase();
                final String secLc  = hasSec ? section.trim().toLowerCase() : "";
                final String combined = clsLc + (hasSec ? " - " + secLc : "");
                results = results.stream()
                        .filter(s -> {
                            String sc = s.getClassName() != null ? s.getClassName().toLowerCase() : "";
                            return sc.equals(clsLc) || sc.equals(combined);
                        })
                        .filter(s -> !hasSec || (s.getSection() != null && s.getSection().toLowerCase().equals(secLc)))
                        .toList();
            }
        } else {
            // Class-only filter — use the flexible query that handles both storage formats:
            //   separate fields (className="Class 10", section="A") and
            //   combined className ("Class 10 - A")
            String cls      = className.trim();
            String sec      = hasSec ? section.trim() : "";
            String combined = cls + (hasSec ? " - " + sec : "");
            results = (schoolId != null)
                    ? studentRepository.findBySchoolIdAndClassFlexible(schoolId, combined, cls, sec)
                    : studentRepository.findByClassFlexible(combined, cls, sec);
        }

        return ApiResponse.success(results);
    }

    public ApiResponse<List<Fee>> getStudentFees(Long studentId, Long schoolId) {
        if (schoolId != null) {
            return ApiResponse.success(feeRepository.findBySchoolIdAndStudentId(schoolId, studentId));
        }
        return ApiResponse.success(feeRepository.findByStudentIdOrderByCreatedAtDesc(studentId));
    }

    public ApiResponse<List<FeePayment>> getStudentFeePayments(Long studentId, Long schoolId) {
        List<FeePayment> payments = feePaymentRepository
                .findByStudentIdOrderByPaymentDateDescCreatedAtDesc(studentId);
        if (schoolId != null) {
            payments = payments.stream()
                    .filter(p -> p.getSchoolId() == null || schoolId.equals(p.getSchoolId()))
                    .toList();
        }
        return ApiResponse.success(payments);
    }

    @Transactional
    public ApiResponse<Fee> createFee(Fee fee) {
        if (fee == null) return ApiResponse.error("Fee details are required");
        if (fee.getStudentId() == null) return ApiResponse.error("Student is required");
        if (fee.getAmount() == null || fee.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return ApiResponse.error("Fee amount must be greater than zero");
        }
        if (fee.getFeeType() == null || fee.getFeeType().isBlank()) {
            return ApiResponse.error("Fee type is required");
        }

        Student student = studentRepository.findById(fee.getStudentId()).orElse(null);
        if (student == null) return ApiResponse.error("Student not found");

        // Tenant isolation: reject if the student belongs to a different school
        if (fee.getSchoolId() != null && student.getSchoolId() != null
                && !fee.getSchoolId().equals(student.getSchoolId()))
            return ApiResponse.error("Student not found");

        fee.setStudentName(student.getName());
        fee.setRollNumber(student.getRollNumber());
        fee.setClassName(student.getClassName());
        fee.setSchoolId(student.getSchoolId());

        BigDecimal paidAmount = fee.getPaidAmount() != null ? fee.getPaidAmount() : BigDecimal.ZERO;
        if (paidAmount.compareTo(BigDecimal.ZERO) < 0) {
            return ApiResponse.error("Paid amount cannot be negative");
        }
        if (paidAmount.compareTo(fee.getAmount()) > 0) {
            return ApiResponse.error("Paid amount cannot exceed total amount");
        }
        fee.setPaidAmount(paidAmount);

        if (fee.getReceiptNumber() != null && !fee.getReceiptNumber().isBlank() &&
                feeRepository.existsByReceiptNumber(fee.getReceiptNumber().trim())) {
            return ApiResponse.error("Duplicate receipt number: " + fee.getReceiptNumber().trim());
        }
        if (fee.getReceiptNumber() != null) fee.setReceiptNumber(fee.getReceiptNumber().trim());

        if (fee.getPaymentMethod() != null && fee.getPaymentMethod().isBlank()) fee.setPaymentMethod(null);
        if (fee.getReceivedBy() != null && fee.getReceivedBy().isBlank()) fee.setReceivedBy(null);
        if (fee.getRemarks() != null && fee.getRemarks().isBlank()) fee.setRemarks(null);

        if (paidAmount.compareTo(fee.getAmount()) >= 0) {
            fee.setStatus(Fee.Status.PAID);
            if (fee.getPaidDate() == null) fee.setPaidDate(LocalDate.now());
        } else if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            fee.setStatus(Fee.Status.PARTIAL);
        } else if (fee.getStatus() == null) {
            fee.setStatus(Fee.Status.PENDING);
        }

        return ApiResponse.success("Fee record created", feeRepository.save(fee));
    }

    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<Fee> collectCashFee(Long feeId, Map<String, Object> body, Long schoolId) {
        return feeRepository.findById(feeId)
                .map(fee -> {
                    if (schoolMismatch(schoolId, fee.getSchoolId()))
                        return ApiResponse.<Fee>error("Fee record not found");
                    // Parse amount
                    BigDecimal amountPaid;
                    try {
                        amountPaid = new BigDecimal(body.get("amountPaid").toString());
                    } catch (Exception e) {
                        return ApiResponse.<Fee>error("Invalid amount");
                    }
                    if (amountPaid.compareTo(BigDecimal.ZERO) <= 0) {
                        return ApiResponse.<Fee>error("Amount must be greater than zero");
                    }
                    BigDecimal currentPaid = fee.getPaidAmount() != null ? fee.getPaidAmount() : BigDecimal.ZERO;
                    BigDecimal pending = fee.getAmount().subtract(currentPaid);
                    if (amountPaid.compareTo(pending) > 0) {
                        return ApiResponse.<Fee>error("Amount exceeds pending balance of ₹" + pending);
                    }

                    // Duplicate receipt check
                    String receiptNumber = str(body, "receiptNumber", null);
                    if (receiptNumber == null || receiptNumber.isBlank()) {
                        return ApiResponse.<Fee>error("Receipt number is required");
                    }
                    String normalizedReceiptNumber = receiptNumber.trim();
                    if (feeRepository.existsByReceiptNumber(normalizedReceiptNumber)
                            || feePaymentRepository.existsByReceiptNumber(normalizedReceiptNumber)) {
                        return ApiResponse.<Fee>error("Duplicate receipt number: " + normalizedReceiptNumber);
                    }

                    BigDecimal newPaid = currentPaid.add(amountPaid);
                    fee.setPaidAmount(newPaid);
                    fee.setPaymentMethod("CASH");
                    fee.setReceiptNumber(normalizedReceiptNumber);
                    fee.setReceivedBy(str(body, "receivedBy", null));
                    fee.setRemarks(str(body, "remarks", null));

                    // Payment date
                    String paidDateStr = str(body, "paidDate", null);
                    LocalDate paymentDate = LocalDate.now();
                    if (paidDateStr != null) {
                        try { fee.setPaidDate(LocalDate.parse(paidDateStr)); } catch (Exception ignored) {}
                        if (fee.getPaidDate() != null) paymentDate = fee.getPaidDate();
                    } else {
                        fee.setPaidDate(paymentDate);
                    }

                    // Status transition
                    if (newPaid.compareTo(fee.getAmount()) >= 0) {
                        fee.setStatus(Fee.Status.PAID);
                    } else if (newPaid.compareTo(BigDecimal.ZERO) > 0) {
                        fee.setStatus(Fee.Status.PARTIAL);
                    }

                    Fee savedFee = feeRepository.save(fee);

                    feePaymentRepository.save(FeePayment.builder()
                            .feeId(savedFee.getId())
                            .studentId(savedFee.getStudentId())
                            .studentName(savedFee.getStudentName())
                            .rollNumber(savedFee.getRollNumber())
                            .className(savedFee.getClassName())
                            .feeType(savedFee.getFeeType())
                            .amountPaid(amountPaid)
                            .paymentDate(paymentDate)
                            .paymentMode("CASH")
                            .receiptNumber(normalizedReceiptNumber)
                            .receivedBy(savedFee.getReceivedBy())
                            .remarks(savedFee.getRemarks())
                            .schoolId(savedFee.getSchoolId())
                            .build());

                    return ApiResponse.success("Cash payment recorded", savedFee);
                })
                .orElse(ApiResponse.error("Fee record not found"));
    }

    public ApiResponse<Fee> updateFee(Long id, Map<String, Object> body, Long schoolId) {
        return feeRepository.findById(id)
                .map(fee -> {
                    if (schoolMismatch(schoolId, fee.getSchoolId()))
                        return ApiResponse.<Fee>error("Fee not found");
                    if (body.containsKey("paidAmount") && body.get("paidAmount") != null) {
                        try {
                            BigDecimal paid = new BigDecimal(body.get("paidAmount").toString());
                            if (paid.compareTo(BigDecimal.ZERO) >= 0) {
                                fee.setPaidAmount(paid);
                                if (paid.compareTo(fee.getAmount()) >= 0) {
                                    fee.setStatus(Fee.Status.PAID);
                                } else if (paid.compareTo(BigDecimal.ZERO) > 0) {
                                    fee.setStatus(Fee.Status.PARTIAL);
                                }
                            }
                        } catch (Exception ignored) {}
                    }
                    if (body.containsKey("status")) {
                        try { fee.setStatus(Fee.Status.valueOf(str(body, "status", "PENDING").toUpperCase())); }
                        catch (IllegalArgumentException ignored) {}
                    }
                    if (body.containsKey("paidDate") && body.get("paidDate") != null) {
                        try { fee.setPaidDate(java.time.LocalDate.parse(str(body, "paidDate", null))); }
                        catch (Exception ignored) {}
                    }
                    if (body.containsKey("paymentMethod")) fee.setPaymentMethod(str(body, "paymentMethod", fee.getPaymentMethod()));
                    if (body.containsKey("transactionId")) fee.setTransactionId(str(body, "transactionId", fee.getTransactionId()));
                    return ApiResponse.success("Fee updated", feeRepository.save(fee));
                })
                .orElse(ApiResponse.error("Fee not found"));
    }

    @Transactional
    public ApiResponse<String> deleteFee(Long id, Long schoolId) {
        Fee fee = feeRepository.findById(id).orElse(null);
        if (fee == null) return ApiResponse.error("Fee record not found");
        if (schoolMismatch(schoolId, fee.getSchoolId()))
            return ApiResponse.error("Fee record not found");
        feeRepository.deleteById(id);
        return ApiResponse.success("Fee record deleted", "Deleted");
    }

    // ── Class Fee Structure ─────────────────────────────────────────────────

    public ApiResponse<List<ClassFeeStructure>> getClassFeeStructures(Long schoolId) {
        if (schoolId == null) return ApiResponse.success(java.util.List.of());
        return ApiResponse.success(classFeeStructureRepository.findBySchoolId(schoolId));
    }

    @Transactional
    public ApiResponse<ClassFeeStructure> saveClassFeeStructure(Map<String, Object> body) {
        String className    = str(body, "className", null);
        String academicYear = str(body, "academicYear", currentAcademicYear());
        Long   schoolId     = body.get("schoolId") != null
                ? Long.parseLong(body.get("schoolId").toString()) : null;

        if (className == null || className.isBlank()) return ApiResponse.error("Class name is required");

        ClassFeeStructure cfs;
        if (schoolId != null) {
            // 1. Try school-scoped lookup first
            var schoolScoped = classFeeStructureRepository
                    .findByClassNameAndAcademicYearAndSchoolId(className, academicYear, schoolId);
            if (schoolScoped.isPresent()) {
                cfs = schoolScoped.get();
            } else {
                // 2. Fall back to old null-school record and migrate it to this school
                var nullScoped = classFeeStructureRepository
                        .findByClassNameAndAcademicYearAndSchoolIdIsNull(className, academicYear);
                if (nullScoped.isPresent()) {
                    cfs = nullScoped.get();
                    cfs.setSchoolId(schoolId); // migrate old record to this school
                } else {
                    cfs = ClassFeeStructure.builder()
                            .className(className).academicYear(academicYear).schoolId(schoolId).build();
                }
            }
        } else {
            cfs = classFeeStructureRepository
                    .findByClassNameAndAcademicYear(className, academicYear)
                    .orElse(ClassFeeStructure.builder().className(className).academicYear(academicYear).build());
        }

        try {
            if (body.containsKey("tuitionFee"))   cfs.setTuitionFee(new BigDecimal(body.get("tuitionFee").toString()));
            if (body.containsKey("transportFee"))  cfs.setTransportFee(new BigDecimal(body.get("transportFee").toString()));
            if (body.containsKey("labFee"))        cfs.setLabFee(new BigDecimal(body.get("labFee").toString()));
            if (body.containsKey("examFee"))       cfs.setExamFee(new BigDecimal(body.get("examFee").toString()));
            if (body.containsKey("sportsFee"))     cfs.setSportsFee(new BigDecimal(body.get("sportsFee").toString()));
            if (body.containsKey("otherFee"))      cfs.setOtherFee(new BigDecimal(body.get("otherFee").toString()));
        } catch (Exception e) {
            return ApiResponse.error("Invalid fee amount");
        }

        ClassFeeStructure saved = classFeeStructureRepository.save(cfs);
        BigDecimal totalFee = saved.getTotalFee();

        // Auto-apply fee structure to all students in this class
        int updatedCount = 0;
        if (schoolId != null && totalFee.compareTo(BigDecimal.ZERO) > 0) {
            List<Student> students = studentRepository.findBySchoolIdAndClassName(schoolId, className);
            List<StudentFeeAssignment> toSave = new java.util.ArrayList<>();
            for (Student student : students) {
                StudentFeeAssignment assignment = studentFeeAssignmentRepository
                        .findByStudentIdAndAcademicYearAndSchoolId(student.getId(), academicYear, schoolId)
                        .orElse(StudentFeeAssignment.builder()
                                .studentId(student.getId())
                                .academicYear(academicYear)
                                .schoolId(schoolId)
                                .paidAmount(BigDecimal.ZERO)
                                .status(StudentFeeAssignment.Status.PENDING)
                                .build());

                assignment.setStudentName(student.getName());
                assignment.setRollNumber(student.getRollNumber());
                assignment.setClassName(student.getClassName());
                assignment.setTotalFee(totalFee);

                BigDecimal paid = assignment.getPaidAmount() != null ? assignment.getPaidAmount() : BigDecimal.ZERO;
                if (paid.compareTo(totalFee) >= 0)             assignment.setStatus(StudentFeeAssignment.Status.PAID);
                else if (paid.compareTo(BigDecimal.ZERO) > 0)  assignment.setStatus(StudentFeeAssignment.Status.PARTIAL);
                else                                            assignment.setStatus(StudentFeeAssignment.Status.PENDING);

                toSave.add(assignment);
            }
            studentFeeAssignmentRepository.saveAll(toSave);
            updatedCount = toSave.size();
        }

        String msg = updatedCount > 0
                ? "Fee structure saved and applied to " + updatedCount + " student" + (updatedCount == 1 ? "" : "s")
                : "Fee structure saved";
        return ApiResponse.success(msg, saved);
    }

    @Transactional
    public ApiResponse<String> deleteClassFeeStructure(Long id, Long schoolId) {
        ClassFeeStructure cfs = classFeeStructureRepository.findById(id).orElse(null);
        if (cfs == null) return ApiResponse.error("Fee structure not found");
        if (schoolMismatch(schoolId, cfs.getSchoolId()))
            return ApiResponse.error("Fee structure not found");
        classFeeStructureRepository.deleteById(id);
        return ApiResponse.success("Fee structure deleted", "Deleted");
    }

    // ── Student Fee Assignment ───────────────────────────────────────────────

    public ApiResponse<List<StudentFeeAssignment>> getAllStudentFeeAssignments(Long schoolId) {
        if (schoolId == null) return ApiResponse.success(java.util.List.of());
        // Filter via student ownership since StudentFeeAssignment has schoolId column
        List<StudentFeeAssignment> all = studentFeeAssignmentRepository.findAllByOrderByCreatedAtDesc();
        java.util.Set<Long> schoolStudentIds = studentRepository.findBySchoolId(schoolId)
                .stream().map(Student::getId).collect(java.util.stream.Collectors.toSet());
        return ApiResponse.success(all.stream().filter(a -> schoolStudentIds.contains(a.getStudentId())).toList());
    }

    public ApiResponse<StudentFeeAssignment> getStudentFeeAssignment(Long studentId, Long schoolId) {
        if (schoolId != null) {
            Student student = studentRepository.findById(studentId).orElse(null);
            if (student == null || schoolMismatch(schoolId, student.getSchoolId()))
                return ApiResponse.error("No fee assignment found for this student");
        }
        return studentFeeAssignmentRepository.findFirstByStudentIdOrderByCreatedAtDesc(studentId)
                .map(a -> ApiResponse.success(a))
                .orElse(ApiResponse.error("No fee assignment found for this student"));
    }

    public ApiResponse<List<FeePayment>> getAssignmentPayments(Long assignmentId, Long schoolId) {
        if (schoolId != null) {
            StudentFeeAssignment assignment = studentFeeAssignmentRepository.findById(assignmentId).orElse(null);
            if (assignment != null) {
                Student student = studentRepository.findById(assignment.getStudentId()).orElse(null);
                if (student == null || schoolMismatch(schoolId, student.getSchoolId()))
                    return ApiResponse.error("Unauthorized");
            }
        }
        return ApiResponse.success(
                feePaymentRepository.findByAssignmentIdOrderByPaymentDateDescCreatedAtDesc(assignmentId));
    }

    @Transactional
    public ApiResponse<String> deleteStudentFeeAssignment(Long id, Long schoolId) {
        StudentFeeAssignment assignment = studentFeeAssignmentRepository.findById(id).orElse(null);
        if (assignment == null) return ApiResponse.error("Fee assignment not found");
        if (schoolId != null) {
            Student student = studentRepository.findById(assignment.getStudentId()).orElse(null);
            if (student == null || schoolMismatch(schoolId, student.getSchoolId()))
                return ApiResponse.error("Unauthorized");
        }
        studentFeeAssignmentRepository.deleteById(id);
        return ApiResponse.success("Fee assignment deleted successfully");
    }

    @Transactional
    public ApiResponse<StudentFeeAssignment> assignStudentFee(Map<String, Object> body) {
        try {
            Object sidObj = body.get("studentId");
            if (sidObj == null) return ApiResponse.error("Student ID is required");
            Long studentId;
            try { studentId = Long.parseLong(sidObj.toString()); }
            catch (Exception e) { return ApiResponse.error("Invalid student ID"); }

            if (body.get("totalFee") == null || body.get("totalFee").toString().isBlank())
                return ApiResponse.error("Total fee is required");
            BigDecimal totalFee;
            try {
                totalFee = new BigDecimal(body.get("totalFee").toString());
                if (totalFee.compareTo(BigDecimal.ZERO) <= 0) return ApiResponse.error("Total fee must be greater than zero");
            } catch (Exception e) {
                return ApiResponse.error("Invalid total fee amount");
            }

            Student student = studentRepository.findById(studentId).orElse(null);
            if (student == null) return ApiResponse.error("Student not found with ID: " + studentId);

            Object scObj = body.get("schoolId");
            if (scObj != null) {
                try {
                    Long schoolId = Long.parseLong(scObj.toString());
                    if (schoolMismatch(schoolId, student.getSchoolId()))
                        return ApiResponse.error("Student does not belong to your school");
                } catch (Exception ignored) {}
            }

            String academicYear = str(body, "academicYear", currentAcademicYear());
            if (academicYear == null || academicYear.isBlank()) academicYear = currentAcademicYear();

            StudentFeeAssignment assignment = studentFeeAssignmentRepository
                    .findByStudentIdAndAcademicYear(studentId, academicYear)
                    .orElse(StudentFeeAssignment.builder()
                            .studentId(studentId)
                            .academicYear(academicYear)
                            .paidAmount(BigDecimal.ZERO)
                            .status(StudentFeeAssignment.Status.PENDING)
                            .build());

            assignment.setStudentName(student.getName());
            assignment.setRollNumber(student.getRollNumber());
            assignment.setClassName(student.getClassName());
            assignment.setTotalFee(totalFee);

            String remarks = str(body, "remarks", null);
            assignment.setRemarks(remarks != null && !remarks.isBlank() ? remarks : null);

            // Parse dueDate only if non-empty
            String dueDateStr = str(body, "dueDate", null);
            if (dueDateStr != null && !dueDateStr.isBlank()) {
                try { assignment.setDueDate(LocalDate.parse(dueDateStr)); } catch (Exception ignored) {}
            }

            // Optional term fees (kept for backwards compatibility)
            try {
                if (body.get("term1Fee") != null && !body.get("term1Fee").toString().isBlank())
                    assignment.setTerm1Fee(new BigDecimal(body.get("term1Fee").toString()));
                else assignment.setTerm1Fee(null);
                if (body.get("term2Fee") != null && !body.get("term2Fee").toString().isBlank())
                    assignment.setTerm2Fee(new BigDecimal(body.get("term2Fee").toString()));
                else assignment.setTerm2Fee(null);
                if (body.get("term3Fee") != null && !body.get("term3Fee").toString().isBlank())
                    assignment.setTerm3Fee(new BigDecimal(body.get("term3Fee").toString()));
                else assignment.setTerm3Fee(null);
            } catch (Exception ignored) {}

            // Recalculate status
            BigDecimal paid = assignment.getPaidAmount() != null ? assignment.getPaidAmount() : BigDecimal.ZERO;
            if (paid.compareTo(totalFee) >= 0) assignment.setStatus(StudentFeeAssignment.Status.PAID);
            else if (paid.compareTo(BigDecimal.ZERO) > 0) assignment.setStatus(StudentFeeAssignment.Status.PARTIAL);
            else assignment.setStatus(StudentFeeAssignment.Status.PENDING);

            StudentFeeAssignment saved = studentFeeAssignmentRepository.save(assignment);

            // ── Installments ──────────────────────────────────────────────────────
            // Accept a JSON array: [{termName, amount, dueDate}, ...]
            // On every save we replace all installments so admin can fully re-configure.
            // Only replace if a non-empty installments list is actually sent.
            Object instObj = body.get("installments");
            if (instObj instanceof java.util.List<?> rawList && !rawList.isEmpty()) {
                // Delete existing pending installments; keep paid ones intact
                List<FeeInstallment> existing = feeInstallmentRepository.findByAssignmentIdOrderByCreatedAtAsc(saved.getId());
                existing.stream()
                        .filter(i -> i.getStatus() == FeeInstallment.Status.PENDING)
                        .forEach(i -> feeInstallmentRepository.deleteById(i.getId()));

                for (Object rawInst : rawList) {
                    if (!(rawInst instanceof Map<?, ?> instMap)) continue;
                    String termName = instMap.get("termName") != null ? instMap.get("termName").toString().trim() : "Term";
                    if (termName.isBlank()) continue;
                    if (instMap.get("amount") == null || instMap.get("amount").toString().isBlank()) continue;
                    BigDecimal instAmt;
                    try { instAmt = new BigDecimal(instMap.get("amount").toString()); }
                    catch (Exception e) { continue; }
                    if (instAmt.compareTo(BigDecimal.ZERO) <= 0) continue;

                    LocalDate instDue = null;
                    if (instMap.get("dueDate") != null && !instMap.get("dueDate").toString().isBlank()) {
                        try { instDue = LocalDate.parse(instMap.get("dueDate").toString()); } catch (Exception ignored2) {}
                    }
                    feeInstallmentRepository.save(FeeInstallment.builder()
                            .assignmentId(saved.getId())
                            .termName(termName)
                            .amount(instAmt)
                            .dueDate(instDue)
                            .status(FeeInstallment.Status.PENDING)
                            .build());
                }
            }

            return ApiResponse.success("Fee assigned", saved);
        } catch (Exception e) {
            log.error("[assignStudentFee] Unexpected error: " + e.getMessage());
            return ApiResponse.error("Failed to save fee assignment. Please try again.");
        }
    }

    @Transactional
    public ApiResponse<StudentFeeAssignment> collectAssignmentFee(Long assignmentId, Map<String, Object> body, Long schoolId) {
        StudentFeeAssignment assignment = studentFeeAssignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null) return ApiResponse.error("Fee assignment not found");
        if (schoolId != null) {
            Student student = studentRepository.findById(assignment.getStudentId()).orElse(null);
            if (student == null || schoolMismatch(schoolId, student.getSchoolId()))
                return ApiResponse.error("Unauthorized");
        }

        BigDecimal amountPaid;
        try {
            amountPaid = new BigDecimal(body.get("amountPaid").toString());
        } catch (Exception e) {
            return ApiResponse.error("Invalid amount");
        }
        if (amountPaid.compareTo(BigDecimal.ZERO) <= 0) return ApiResponse.error("Amount must be greater than zero");

        BigDecimal currentPaid = assignment.getPaidAmount() != null ? assignment.getPaidAmount() : BigDecimal.ZERO;
        if (assignment.getTotalFee() == null) return ApiResponse.error("Fee assignment is incomplete — no total fee set.");
        BigDecimal due = assignment.getTotalFee().subtract(currentPaid);
        if (amountPaid.compareTo(due) > 0) return ApiResponse.error("Amount exceeds due balance of ₹" + due);

        String receiptNumber = str(body, "receiptNumber", null);
        if (receiptNumber == null || receiptNumber.isBlank()) return ApiResponse.error("Receipt number is required");
        receiptNumber = receiptNumber.trim();
        if (feePaymentRepository.existsByReceiptNumber(receiptNumber))
            return ApiResponse.error("Duplicate receipt number: " + receiptNumber);

        String paidDateStr = str(body, "paidDate", null);
        LocalDate paymentDate = LocalDate.now();
        if (paidDateStr != null) {
            try {
                paymentDate = LocalDate.parse(paidDateStr);
                if (paymentDate.isAfter(LocalDate.now()))
                    return ApiResponse.error("Payment date cannot be in the future");
            } catch (Exception ignored) {}
        }

        BigDecimal newPaid = currentPaid.add(amountPaid);
        assignment.setPaidAmount(newPaid);
        if (newPaid.compareTo(assignment.getTotalFee()) >= 0) assignment.setStatus(StudentFeeAssignment.Status.PAID);
        else assignment.setStatus(StudentFeeAssignment.Status.PARTIAL);

        StudentFeeAssignment saved = studentFeeAssignmentRepository.save(assignment);

        String term = str(body, "term", null);
        feePaymentRepository.save(FeePayment.builder()
                .feeId(0L)                          // 0 = new assignment-based payment (fee_id NOT NULL legacy constraint)
                .assignmentId(saved.getId())
                .studentId(saved.getStudentId())
                .studentName(saved.getStudentName())
                .rollNumber(saved.getRollNumber())
                .className(saved.getClassName())
                .feeType("Fee Payment")
                .term(term != null && !term.isBlank() ? term : null)
                .amountPaid(amountPaid)
                .paymentDate(paymentDate)
                .paymentMode("CASH")
                .receiptNumber(receiptNumber)
                .receivedBy(str(body, "receivedBy", null))
                .remarks(str(body, "remarks", null))
                .build());

        return ApiResponse.success("Payment recorded", saved);
    }

    public ApiResponse<List<FeePayment>> getAllFeePayments(Long schoolId) {
        if (schoolId == null) return ApiResponse.success(java.util.List.of());
        return ApiResponse.success(
                feePaymentRepository.findBySchoolIdOrderByPaymentDateDescCreatedAtDesc(schoolId));
    }

    // ── Installment management ─────────────────────────────────────────────

    public ApiResponse<List<FeeInstallment>> getInstallments(Long assignmentId, Long schoolId) {
        if (schoolId != null) {
            StudentFeeAssignment assignment = studentFeeAssignmentRepository.findById(assignmentId).orElse(null);
            if (assignment != null) {
                Student student = studentRepository.findById(assignment.getStudentId()).orElse(null);
                if (student == null || schoolMismatch(schoolId, student.getSchoolId()))
                    return ApiResponse.error("Unauthorized");
            }
        }
        return ApiResponse.success(
                feeInstallmentRepository.findByAssignmentIdOrderByDueDateAsc(assignmentId));
    }

    /**
     * Record a cash payment for a specific installment.
     * Marks the installment PAID and updates the parent assignment's paidAmount.
     */
    @Transactional
    public ApiResponse<FeeInstallment> collectInstallmentFee(Long installmentId, Map<String, Object> body) {
        FeeInstallment installment = feeInstallmentRepository.findById(installmentId).orElse(null);
        if (installment == null) return ApiResponse.error("Installment not found");
        if (installment.getStatus() == FeeInstallment.Status.PAID)
            return ApiResponse.error("This installment is already paid");

        StudentFeeAssignment assignment = studentFeeAssignmentRepository
                .findById(installment.getAssignmentId()).orElse(null);
        if (assignment == null) return ApiResponse.error("Fee assignment not found");

        // Use the receipt number sent by the frontend (same as collectAssignmentFee).
        // The frontend generates a timestamped receipt; we validate uniqueness here.
        String receiptNumber = str(body, "receiptNumber", null);
        if (receiptNumber == null || receiptNumber.isBlank()) return ApiResponse.error("Receipt number is required");
        receiptNumber = receiptNumber.trim();
        if (feePaymentRepository.existsByReceiptNumber(receiptNumber))
            return ApiResponse.error("Duplicate receipt number: " + receiptNumber + ". Please try again.");

        String paidDateStr = str(body, "paidDate", null);
        LocalDate paymentDate = LocalDate.now();
        if (paidDateStr != null && !paidDateStr.isBlank()) {
            try {
                paymentDate = LocalDate.parse(paidDateStr);
                if (paymentDate.isAfter(LocalDate.now()))
                    return ApiResponse.error("Payment date cannot be in the future");
            } catch (Exception ignored) {}
        }

        // Determine actual amount paid (frontend sends amountPaid; fall back to full amount)
        BigDecimal amountPaid;
        try {
            amountPaid = new BigDecimal(body.get("amountPaid").toString());
        } catch (Exception e) {
            return ApiResponse.error("Invalid amount");
        }
        if (amountPaid.compareTo(BigDecimal.ZERO) <= 0) return ApiResponse.error("Amount must be greater than zero");

        // Effective amount due = base installment amount + any carry-over from previous term
        BigDecimal base      = installment.getAmount()   != null ? installment.getAmount()   : BigDecimal.ZERO;
        BigDecimal carryOver = installment.getCarryOver() != null ? installment.getCarryOver() : BigDecimal.ZERO;
        BigDecimal prevPaid  = installment.getPaidAmount() != null ? installment.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal effectiveDue = base.add(carryOver).subtract(prevPaid);

        if (amountPaid.compareTo(effectiveDue) > 0)
            return ApiResponse.error("Amount ₹" + amountPaid + " exceeds due amount ₹" + effectiveDue);

        // Update installment with actual paid amount
        BigDecimal totalPaidForTerm = prevPaid.add(amountPaid);
        installment.setPaidAmount(totalPaidForTerm);
        installment.setPaidDate(paymentDate);

        BigDecimal shortage = base.add(carryOver).subtract(totalPaidForTerm);
        boolean fullyCovered = shortage.compareTo(BigDecimal.ZERO) <= 0;

        if (fullyCovered) {
            installment.setStatus(FeeInstallment.Status.PAID);
        } else {
            // Partial payment — roll the shortage to the next pending term
            installment.setStatus(FeeInstallment.Status.PARTIAL);
            feeInstallmentRepository.findNextPending(installment.getAssignmentId(), installment.getId())
                .ifPresent(next -> {
                    BigDecimal existingCarry = next.getCarryOver() != null ? next.getCarryOver() : BigDecimal.ZERO;
                    next.setCarryOver(existingCarry.add(shortage));
                    feeInstallmentRepository.save(next);
                    log.info("[collectInstallmentFee] ₹{} shortage from '{}' rolled over to '{}'",
                        shortage, installment.getTermName(), next.getTermName());
                });
        }
        FeeInstallment savedInst = feeInstallmentRepository.save(installment);

        // Update assignment totals with actual amount paid
        BigDecimal currentPaid = assignment.getPaidAmount() != null ? assignment.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal newPaid = currentPaid.add(amountPaid);
        assignment.setPaidAmount(newPaid);
        if (newPaid.compareTo(assignment.getTotalFee()) >= 0) assignment.setStatus(StudentFeeAssignment.Status.PAID);
        else assignment.setStatus(StudentFeeAssignment.Status.PARTIAL);
        studentFeeAssignmentRepository.save(assignment);

        // Record in fee_payments table
        feePaymentRepository.save(FeePayment.builder()
                .feeId(0L)
                .assignmentId(assignment.getId())
                .studentId(assignment.getStudentId())
                .schoolId(assignment.getSchoolId())
                .studentName(assignment.getStudentName())
                .rollNumber(assignment.getRollNumber())
                .className(assignment.getClassName())
                .feeType("Fee Payment")
                .term(installment.getTermName())
                .amountPaid(amountPaid)
                .paymentDate(paymentDate)
                .paymentMode(str(body, "paymentMode", "CASH"))
                .receiptNumber(receiptNumber)
                .receivedBy(str(body, "receivedBy", null))
                .remarks(str(body, "remarks", null))
                .build());

        String msg = fullyCovered
            ? "Payment recorded for " + installment.getTermName()
            : "Partial payment recorded. ₹" + shortage.setScale(0, java.math.RoundingMode.HALF_UP)
              + " carried over to the next term.";
        return ApiResponse.success(msg, savedInst);
    }

    /**
     * Returns comprehensive fee data for a student (used by the student portal).
     * Includes the assignment, installments, payments, and a summary map.
     */
    public ApiResponse<Map<String, Object>> getStudentFeeData(Long studentId) {
        Map<String, Object> result = new LinkedHashMap<>();

        StudentFeeAssignment assignment = studentFeeAssignmentRepository
                .findFirstByStudentIdOrderByCreatedAtDesc(studentId).orElse(null);

        // If no assignment exists yet, try to auto-create one from the class fee structure
        if (assignment == null) {
            Student student = studentRepository.findById(studentId).orElse(null);
            if (student != null && student.getSchoolId() != null && student.getClassName() != null) {
                // Find the fee structure for this student's class in their school
                ClassFeeStructure cfs = classFeeStructureRepository
                        .findByClassNameAndAcademicYearAndSchoolId(student.getClassName(), currentAcademicYear(), student.getSchoolId())
                        .orElse(null);
                if (cfs == null) {
                    // Fall back: any structure for this class in this school, regardless of academic year
                    cfs = classFeeStructureRepository.findBySchoolId(student.getSchoolId()).stream()
                            .filter(c -> c.getClassName().equalsIgnoreCase(student.getClassName()))
                            .findFirst().orElse(null);
                }
                if (cfs != null && cfs.getTotalFee().compareTo(BigDecimal.ZERO) > 0) {
                    String year = cfs.getAcademicYear() != null ? cfs.getAcademicYear() : currentAcademicYear();
                    StudentFeeAssignment newAssignment = StudentFeeAssignment.builder()
                            .studentId(studentId)
                            .studentName(student.getName())
                            .rollNumber(student.getRollNumber())
                            .className(student.getClassName())
                            .academicYear(year)
                            .totalFee(cfs.getTotalFee())
                            .paidAmount(BigDecimal.ZERO)
                            .status(StudentFeeAssignment.Status.PENDING)
                            .schoolId(student.getSchoolId())
                            .build();
                    assignment = studentFeeAssignmentRepository.save(newAssignment);
                }
            }
        }

        if (assignment == null) {
            Map<String, Object> emptySummary = new LinkedHashMap<>();
            emptySummary.put("totalFee",   0);
            emptySummary.put("paidAmount", 0);
            emptySummary.put("dueAmount",  0);
            emptySummary.put("nextDueDate", null);
            emptySummary.put("status", null);
            emptySummary.put("academicYear", null);
            result.put("assignment", null);
            result.put("installments", List.of());
            result.put("payments", List.of());
            result.put("classFeeStructure", null);
            result.put("summary", emptySummary);
            return ApiResponse.success(result);
        }

        List<FeeInstallment> installments =
                feeInstallmentRepository.findByAssignmentIdOrderByDueDateAsc(assignment.getId());
        List<FeePayment> payments =
                feePaymentRepository.findByAssignmentIdOrderByPaymentDateDescCreatedAtDesc(assignment.getId());

        BigDecimal totalFee   = assignment.getTotalFee() != null ? assignment.getTotalFee() : BigDecimal.ZERO;
        BigDecimal paidAmount = assignment.getPaidAmount() != null ? assignment.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal dueAmount  = totalFee.subtract(paidAmount).max(BigDecimal.ZERO);

        LocalDate nextDue = installments.stream()
                .filter(i -> i.getStatus() == FeeInstallment.Status.PENDING && i.getDueDate() != null)
                .map(FeeInstallment::getDueDate)
                .min(LocalDate::compareTo)
                .orElse(assignment.getDueDate());

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalFee",   totalFee);
        summary.put("paidAmount", paidAmount);
        summary.put("dueAmount",  dueAmount);
        summary.put("nextDueDate", nextDue);
        summary.put("status", assignment.getStatus());
        summary.put("academicYear", assignment.getAcademicYear());

        // Include class fee structure (fee type breakdown) if available
        ClassFeeStructure cfs = null;
        if (assignment.getClassName() != null && assignment.getAcademicYear() != null) {
            Student student = studentRepository.findById(studentId).orElse(null);
            if (student != null && student.getSchoolId() != null) {
                cfs = classFeeStructureRepository
                        .findByClassNameAndAcademicYearAndSchoolId(
                                assignment.getClassName(), assignment.getAcademicYear(), student.getSchoolId())
                        .orElse(null);
            }
            if (cfs == null) {
                cfs = classFeeStructureRepository
                        .findByClassNameAndAcademicYear(assignment.getClassName(), assignment.getAcademicYear())
                        .orElse(null);
            }
        }

        result.put("assignment",        assignment);
        result.put("installments",      installments);
        result.put("payments",          payments);
        result.put("classFeeStructure", cfs);
        result.put("summary",           summary);
        return ApiResponse.success(result);
    }

    // ── Expenses ───────────────────────────────────────────────────────────

    public ApiResponse<List<Expense>> getExpenses(
            Long schoolId, String status, String dateFrom, String dateTo, String search) {

        String statusParam   = (status   != null && !status.isBlank())   ? status.toUpperCase()  : null;
        String dateFromParam = (dateFrom != null && !dateFrom.isBlank()) ? dateFrom              : null;
        String dateToParam   = (dateTo   != null && !dateTo.isBlank())   ? dateTo                : null;
        String searchParam   = (search   != null && !search.isBlank())   ? search.trim()         : null;

        if (schoolId == null) return ApiResponse.success(java.util.List.of());
        return ApiResponse.success(
                expenseRepository.findFilteredBySchool(schoolId, statusParam, dateFromParam, dateToParam, searchParam));
    }

    public ApiResponse<Expense> createExpense(Map<String, Object> body) {
        try {
            String title = str(body, "title", "");
            if (title.isBlank()) return ApiResponse.error("Title is required");

            String amtRaw = body.get("amount") != null ? body.get("amount").toString() : "";
            if (amtRaw.isBlank()) return ApiResponse.error("Amount is required");

            BigDecimal amount;
            try { amount = new BigDecimal(amtRaw); }
            catch (Exception e) { return ApiResponse.error("Invalid amount"); }
            if (amount.compareTo(BigDecimal.ZERO) <= 0) return ApiResponse.error("Amount must be greater than 0");

            if (body.get("date") == null || body.get("date").toString().isBlank())
                return ApiResponse.error("Date is required");

            LocalDate date;
            try { date = LocalDate.parse(body.get("date").toString()); }
            catch (Exception e) { return ApiResponse.error("Invalid date format"); }

            Expense.PaymentStatus status = Expense.PaymentStatus.UNPAID;
            try { status = Expense.PaymentStatus.valueOf(str(body, "status", "UNPAID").toUpperCase()); }
            catch (Exception ignored) {}

            Long schoolId = body.get("schoolId") != null
                    ? Long.parseLong(body.get("schoolId").toString()) : null;
            Long addedById = body.get("addedById") != null
                    ? Long.parseLong(body.get("addedById").toString()) : null;

            Expense expense = Expense.builder()
                    .title(title)
                    .amount(amount)
                    .date(date)
                    .paymentMode(str(body, "paymentMode", null))
                    .status(status)
                    .description(str(body, "description", null))
                    .addedBy(str(body, "addedBy", "Admin"))
                    .addedById(addedById)
                    .schoolId(schoolId)
                    .build();

            log.info("[createExpense] Saving expense title='" + title + "' amount=" + amount
                    + " date=" + date + " schoolId=" + schoolId);
            return ApiResponse.success("Expense added successfully", expenseRepository.save(expense));
        } catch (Exception e) {
            return ApiResponse.error("Failed to create expense: " + e.getMessage());
        }
    }

    public ApiResponse<Expense> updateExpense(Long id, Map<String, Object> body, Long schoolId) {
        return expenseRepository.findById(id)
                .map(expense -> {
                    // School isolation: reject cross-school updates
                    if (schoolId != null && expense.getSchoolId() != null
                            && !schoolId.equals(expense.getSchoolId()))
                        return ApiResponse.<Expense>error("Expense not found");
                    if (body.containsKey("title"))       expense.setTitle(str(body, "title", expense.getTitle()));
                    if (body.containsKey("description")) expense.setDescription(str(body, "description", expense.getDescription()));
                    if (body.containsKey("paymentMode")) expense.setPaymentMode(str(body, "paymentMode", expense.getPaymentMode()));
                    if (body.containsKey("status") && body.get("status") != null) {
                        try { expense.setStatus(Expense.PaymentStatus.valueOf(body.get("status").toString().toUpperCase())); }
                        catch (Exception ignored) {}
                    }
                    if (body.containsKey("amount") && body.get("amount") != null) {
                        try { expense.setAmount(new BigDecimal(body.get("amount").toString())); }
                        catch (Exception ignored) {}
                    }
                    if (body.containsKey("date") && body.get("date") != null) {
                        try { expense.setDate(LocalDate.parse(body.get("date").toString())); }
                        catch (Exception ignored) {}
                    }
                    return ApiResponse.success("Expense updated", expenseRepository.save(expense));
                })
                .orElse(ApiResponse.error("Expense not found"));
    }

    @Transactional
    public ApiResponse<String> deleteExpense(Long id, Long schoolId) {
        Expense expense = expenseRepository.findById(id).orElse(null);
        if (expense == null) return ApiResponse.error("Expense not found");
        if (schoolId != null && expense.getSchoolId() != null && !schoolId.equals(expense.getSchoolId()))
            return ApiResponse.error("Expense not found");
        expenseRepository.deleteById(id);
        return ApiResponse.success("Expense deleted", "Deleted");
    }

    public ApiResponse<Map<String, Object>> getExpenseSummary(Long schoolId) {
        LocalDate now = LocalDate.now();
        int month = now.getMonthValue(), year = now.getYear();

        BigDecimal total, paid, unpaid;
        if (schoolId != null) {
            total  = expenseRepository.sumBySchoolAndMonth(schoolId, month, year);
            // School-scoped paid/unpaid: computed via in-memory filter from findFilteredBySchool
            List<Expense> schoolExpenses = expenseRepository.findFilteredBySchool(
                    schoolId, null, now.withDayOfMonth(1).toString(), now.toString(), null);
            paid   = schoolExpenses.stream()
                    .filter(e -> e.getStatus() == Expense.PaymentStatus.PAID)
                    .map(Expense::getAmount).filter(a -> a != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            unpaid = schoolExpenses.stream()
                    .filter(e -> e.getStatus() == Expense.PaymentStatus.UNPAID)
                    .map(Expense::getAmount).filter(a -> a != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            total  = paid.add(unpaid);
        } else {
            total  = expenseRepository.sumByMonth(month, year);
            paid   = expenseRepository.sumPaidByMonth(month, year);
            unpaid = expenseRepository.sumUnpaidByMonth(month, year);
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalMonthly", total  != null ? total  : BigDecimal.ZERO);
        summary.put("totalPaid",    paid   != null ? paid   : BigDecimal.ZERO);
        summary.put("totalUnpaid",  unpaid != null ? unpaid : BigDecimal.ZERO);
        summary.put("currentMonth", now.getMonth().getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH));
        summary.put("currentYear",  year);
        return ApiResponse.success(summary);
    }

    // ── Parents ────────────────────────────────────────────────────────────

    private Map<String, Object> parentToMap(User user, ParentProfile profile) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", user.getId());
        m.put("name", user.getName());
        m.put("email", user.getEmail());
        m.put("mobile", user.getMobile());
        m.put("isActive", user.getIsActive());
        m.put("firstLogin", user.getFirstLogin());
        // tempPassword intentionally omitted — plain-text password must not appear in list/update responses.
        // createParent() explicitly adds "generatedPassword" only in the creation response.
        m.put("createdAt", user.getCreatedAt());
        if (profile != null) {
            m.put("profileId", profile.getId());
            m.put("relation", profile.getRelation());
            m.put("occupation", profile.getOccupation());
            m.put("address", profile.getAddress());
            m.put("alternateMobile", profile.getAlternateMobile());
        }
        return m;
    }

    public ApiResponse<List<Map<String, Object>>> getParents(Long schoolId) {
        return ApiResponse.success(java.util.Collections.emptyList());
    }

    @Transactional
    public ApiResponse<Map<String, Object>> createParent(Map<String, Object> body) {
        return ApiResponse.error("Parent role has been removed from this application.");
    }

    public ApiResponse<Map<String, Object>> updateParent(Long id, Map<String, Object> body) {
        Long schoolId = body.get("schoolId") instanceof Number n ? n.longValue() : null;
        return userRepository.findById(id)
                .filter(u -> schoolId == null || schoolId.equals(u.getSchoolId()))
                .map(user -> {
                    String name   = str(body, "name",   null);
                    String mobile = str(body, "mobile", null);
                    Object active = body.get("isActive");
                    if (name != null && !name.isBlank()) user.setName(name.trim());
                    if (mobile != null && !mobile.isBlank()) {
                        String newMobile = mobile.trim();
                        if (userRepository.existsByMobileAndIdNot(newMobile, user.getId()))
                            return ApiResponse.<Map<String,Object>>error("Mobile number '" + newMobile + "' is already registered to another user.");
                        user.setMobile(newMobile);
                    }
                    if (active instanceof Boolean) user.setIsActive((Boolean) active);
                    userRepository.save(user);

                    ParentProfile profile = parentProfileRepository.findByUser(user)
                            .orElse(ParentProfile.builder().user(user).build());
                    if (name != null && !name.isBlank()) profile.setName(name.trim());
                    if (body.containsKey("relation"))       profile.setRelation(str(body, "relation", null));
                    if (body.containsKey("occupation"))     profile.setOccupation(str(body, "occupation", null));
                    if (body.containsKey("address"))        profile.setAddress(str(body, "address", null));
                    if (body.containsKey("alternateMobile")) profile.setAlternateMobile(str(body, "alternateMobile", null));
                    if (active instanceof Boolean)          profile.setIsActive((Boolean) active);
                    parentProfileRepository.save(profile);

                    return ApiResponse.success("Parent updated", parentToMap(user, profile));
                })
                .orElse(ApiResponse.error("Parent not found"));
    }

    @Transactional
    public ApiResponse<String> deleteParent(Long id, Long schoolId) {
        return userRepository.findById(id)
                .filter(u -> schoolId == null || schoolId.equals(u.getSchoolId()))
                .map(user -> {
                    // Unlink any students who reference this parent
                    studentRepository.findByParentId(id).forEach(s -> {
                        s.setParentId(null);
                        studentRepository.save(s);
                    });
                    parentProfileRepository.findByUser(user)
                            .ifPresent(p -> parentProfileRepository.deleteById(p.getId()));
                    userRepository.deleteById(id);
                    return ApiResponse.success("Parent deleted", "Deleted");
                })
                .orElse(ApiResponse.error("Parent not found"));
    }

    public ApiResponse<String> resetParentPassword(Long id, String newPassword, Long schoolId) {
        return userRepository.findById(id)
                .filter(u -> schoolId == null || schoolId.equals(u.getSchoolId()))
                .map(user -> {
                    user.setPassword(passwordEncoder.encode(newPassword));
                    user.setTempPassword(null);
                    user.setFirstLogin(true);
                    userRepository.save(user);
                    return ApiResponse.success("Password reset successfully", "Password updated");
                })
                .orElse(ApiResponse.error("Parent not found"));
    }

    // ── Auto-create class when student is added/updated ────────────────────
    //
    // Design:
    //   • Called from an afterCommit() hook, so there is NO outer transaction.
    //     classRoomRepository calls each open/commit their own transaction.
    //   • Uses case-insensitive existence check to prevent "Class 6" vs "class 6"
    //     duplicates even if the admin typed the name in a different case.
    //   • saveAndFlush() forces the INSERT immediately so DataIntegrityViolationException
    //     is thrown inside this try-block rather than silently at commit time.
    //   • Catching DataIntegrityViolationException is the correct handling for a
    //     concurrent-insert race: two requests both passed the existence check, one
    //     wins the INSERT, the other gets the constraint violation — both are safe.

    // ── Shared class-name normalizer ────────────────────────────────────────
    //    Keeps create (ensureClassExists) and delete in sync with the same format.
    private String normalizeClassName(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String t = raw.trim();
        if (t.matches("\\d+"))                                    return "Class " + t;
        if (t.toLowerCase().startsWith("class ") && t.length() > 6) return "Class " + t.substring(6).trim();
        return canonicalizeWords(t);
    }

    private String resolveClassName(String rawClassName) {
        String normalized = normalizeClassName(rawClassName);
        return normalized;
    }

    private String normalizeSection(String section) {
        return (section != null && !section.isBlank()) ? section.trim().toUpperCase() : "A";
    }

    private String canonicalizeWords(String raw) {
        String[] parts = raw.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (sb.length() > 0) sb.append(' ');
            if (part.matches("[A-Za-z]{1,3}")) {
                sb.append(part.toUpperCase());
            } else {
                sb.append(Character.toUpperCase(part.charAt(0)));
                if (part.length() > 1) sb.append(part.substring(1).toLowerCase());
            }
        }
        return sb.toString();
    }

    private void ensureClassExists(String rawClassName, String section) {
        ensureClassExists(rawClassName, section, null);
    }

    private void ensureClassExists(String rawClassName, String section, Long schoolId) {
        if (rawClassName == null || rawClassName.isBlank()) return;

        String normalized = resolveClassName(rawClassName);
        String sec = normalizeSection(section);

        // ── Fast existence check (school-scoped) ──────────────────────────────
        boolean exists = (schoolId != null)
                ? classRoomRepository.existsBySchoolIdAndNameIgnoreCaseAndSectionIgnoreCase(schoolId, normalized, sec)
                : classRoomRepository.existsByNameIgnoreCaseAndSectionIgnoreCase(normalized, sec);

        if (exists) {
            log.info("[ensureClassExists] Already exists: " + normalized + "-" + sec);
            return;
        }

        classRoomRepository.save(ClassRoom.builder()
                .name(normalized)
                .section(sec)
                .capacity(40)
                .isActive(true)
                .schoolId(schoolId)
                .build());
        log.info("[ensureClassExists] Auto-created class: " + normalized + "-" + sec
                + (schoolId != null ? " schoolId=" + schoolId : ""));
    }

    // ── Helper ─────────────────────────────────────────────────────────────

    private String currentAcademicYear() {
        int year = LocalDate.now().getYear();
        int month = LocalDate.now().getMonthValue();
        int start = month >= 4 ? year : year - 1;
        return start + "-" + String.valueOf(start + 1).substring(2);
    }

    @SuppressWarnings("unchecked")
    /** Returns an error ApiResponse if the school's user limit would be exceeded, null if OK. */
    private <T> ApiResponse<T> checkUserLimit(Long schoolId) {
        if (schoolId == null) return null;
        com.schoolers.model.School school = schoolRepository.findById(schoolId).orElse(null);
        if (school == null || school.getUserLimit() == null) return null; // no limit set
        long current = userRepository.countBySchoolId(schoolId);
        if (current >= school.getUserLimit())
            return ApiResponse.error("User limit reached (" + current + "/" + school.getUserLimit()
                    + "). Please ask the platform owner to increase the limit.");
        return null;
    }

    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }

    // ── Attendance Summary ────────────────────────────────────────────────────

    /** Class-wise attendance summary for a specific date (Admin/SuperAdmin view) */
    public ApiResponse<List<Map<String, Object>>> getClassAttendanceSummaries(LocalDate date, Long schoolId) {
        List<ClassRoom> classes = (schoolId != null)
                ? classRoomRepository.findBySchoolIdAndIsActive(schoolId, true)
                : classRoomRepository.findByIsActive(true);
        List<Map<String, Object>> result = new java.util.ArrayList<>();

        for (ClassRoom cls : classes) {
            Long clsSchool = schoolId != null ? schoolId : cls.getSchoolId();
            List<Object[]> rows = (clsSchool != null)
                    ? attendanceRepository.countByStatusForSchoolAndClassAndDate(clsSchool, cls.getId(), date)
                    : attendanceRepository.countByStatusForClassAndDate(cls.getId(), date);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("classId",   cls.getId());
            entry.put("className", cls.getName());
            entry.put("section",   cls.getSection());
            entry.put("teacherId", cls.getTeacherId());
            entry.put("teacherName", cls.getTeacherName());

            long present = 0, absent = 0, leave = 0, others = 0;
            for (Object[] row : rows) {
                String status = row[0].toString();
                long count    = ((Number) row[1]).longValue();
                switch (status) {
                    case "PRESENT" -> present += count;
                    case "ABSENT"  -> absent  += count;
                    case "LEAVE"   -> leave   += count;
                    case "OTHERS"  -> others  += count;
                }
            }
            entry.put("present", present);
            entry.put("absent",  absent);
            entry.put("leave",   leave);
            entry.put("others",  others);
            entry.put("total",   present + absent + leave + others);
            result.add(entry);
        }
        return ApiResponse.success(result);
    }

    /** Attendance summary for a specific teacher's primary class */
    public ApiResponse<Map<String, Object>> getTeacherAttendanceSummary(Long teacherId, LocalDate date, Long schoolId) {
        return teacherRepository.findById(teacherId)
                .map(teacher -> {
                    // Enforce school-level access
                    if (schoolMismatch(schoolId, teacher.getSchoolId()))
                        return ApiResponse.<Map<String, Object>>error("Access denied: teacher belongs to another school");

                    Long classId = teacher.getPrimaryClassId();
                    if (classId == null) return ApiResponse.<Map<String, Object>>error("Teacher has no primary class assigned");
                    ClassRoom classRoom = classRoomRepository.findById(classId).orElse(null);
                    Long effectiveSchoolId = schoolId != null ? schoolId : teacher.getSchoolId();

                    List<Object[]> rows = (effectiveSchoolId != null)
                            ? attendanceRepository.countByStatusForSchoolAndClassAndDate(effectiveSchoolId, classId, date)
                            : attendanceRepository.countByStatusForClassAndDate(classId, date);
                    long present = 0, absent = 0, leave = 0, others = 0;
                    for (Object[] row : rows) {
                        String status = row[0].toString();
                        long count    = ((Number) row[1]).longValue();
                        switch (status) {
                            case "PRESENT" -> present += count;
                            case "ABSENT"  -> absent  += count;
                            case "LEAVE"   -> leave   += count;
                            case "OTHERS"  -> others  += count;
                        }
                    }

                    Map<String, Object> summary = new LinkedHashMap<>();
                    summary.put("teacherId",    teacherId);
                    summary.put("teacherName",  teacher.getName());
                    summary.put("teacherType",  teacher.getTeacherType());
                    summary.put("primaryClassId", classId);
                    summary.put("primaryClassName", classRoom != null ? classRoom.getName() : null);
                    summary.put("primarySection", classRoom != null ? classRoom.getSection() : null);
                    summary.put("date",         date);
                    summary.put("present",      present);
                    summary.put("absent",       absent);
                    summary.put("leave",        leave);
                    summary.put("others",       others);
                    summary.put("total",        present + absent + leave + others);

                    // Also include range summary for the past 30 days
                    LocalDate start = date.minusDays(29);
                    List<Object[]> rangeRows = (effectiveSchoolId != null)
                            ? attendanceRepository.countByStatusForSchoolAndClassAndDateRange(effectiveSchoolId, classId, start, date)
                            : attendanceRepository.countByStatusForClassAndDateRange(classId, start, date);
                    long rPresent = 0, rAbsent = 0, rLeave = 0, rOthers = 0;
                    for (Object[] row : rangeRows) {
                        String status = row[0].toString();
                        long count    = ((Number) row[1]).longValue();
                        switch (status) {
                            case "PRESENT" -> rPresent += count;
                            case "ABSENT"  -> rAbsent  += count;
                            case "LEAVE"   -> rLeave   += count;
                            case "OTHERS"  -> rOthers  += count;
                        }
                    }
                    Map<String, Object> range30 = new LinkedHashMap<>();
                    range30.put("present", rPresent);
                    range30.put("absent",  rAbsent);
                    range30.put("leave",   rLeave);
                    range30.put("others",  rOthers);
                    range30.put("total",   rPresent + rAbsent + rLeave + rOthers);
                    summary.put("last30Days", range30);

                    return ApiResponse.success(summary);
                })
                .orElse(ApiResponse.error("Teacher not found"));
    }

    public ApiResponse<Map<String, Object>> getClassAttendanceDetails(Long classId, LocalDate date, Long schoolId) {
        ClassRoom classRoom = classRoomRepository.findById(classId).orElse(null);
        if (classRoom == null) return ApiResponse.error("Class not found");
        if (schoolMismatch(schoolId, classRoom.getSchoolId()))
            return ApiResponse.error("Access denied: class belongs to another school");

        Long effectiveSchoolId = schoolId != null ? schoolId : classRoom.getSchoolId();
        List<Attendance> records = (effectiveSchoolId != null)
                ? attendanceRepository.findBySchoolIdAndClassIdAndDate(effectiveSchoolId, classId, date)
                : attendanceRepository.findByClassIdAndDate(classId, date);
        List<Map<String, Object>> details = records.stream()
                .sorted(Comparator.comparing(Attendance::getStudentId))
                .map(record -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", record.getId());
                    item.put("studentId", record.getStudentId());
                    item.put("status", record.getStatus());
                    item.put("date", record.getDate());
                    item.put("markedBy", record.getMarkedBy());
                    studentRepository.findById(record.getStudentId()).ifPresent(student -> {
                        item.put("studentName", student.getName());
                        item.put("rollNumber", student.getRollNumber());
                    });
                    return item;
                })
                .toList();

        List<Object[]> rows = (effectiveSchoolId != null)
                ? attendanceRepository.countByStatusForSchoolAndClassAndDate(effectiveSchoolId, classId, date)
                : attendanceRepository.countByStatusForClassAndDate(classId, date);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("classId", classRoom.getId());
        response.put("className", classRoom.getName());
        response.put("section", classRoom.getSection());
        response.put("date", date);
        response.put("summary", buildAttendanceSummary(rows));
        response.put("records", details);
        return ApiResponse.success(response);
    }

    private Map<String, Object> buildAttendanceSummary(List<Object[]> rows) {
        long present = 0, absent = 0, leave = 0, others = 0;
        for (Object[] row : rows) {
            String status = row[0].toString();
            long count = ((Number) row[1]).longValue();
            switch (status) {
                case "PRESENT" -> present += count;
                case "ABSENT" -> absent += count;
                case "LEAVE" -> leave += count;
                case "OTHERS" -> others += count;
                default -> { }
            }
        }
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("present", present);
        summary.put("absent", absent);
        summary.put("leave", leave);
        summary.put("others", others);
        summary.put("total", present + absent + leave + others);
        return summary;
    }

    private String normalizeTeacherType(String teacherType) {
        if (teacherType == null || teacherType.isBlank()) return "SUBJECT_TEACHER";
        String normalized = teacherType.trim().toUpperCase();
        if ("CLASS_TEACHER".equals(normalized)) return "CLASS_TEACHER";
        if ("BOTH".equals(normalized)) return "BOTH";
        return "SUBJECT_TEACHER";
    }

    private boolean isClassTeacherRole(String teacherType) {
        return "CLASS_TEACHER".equalsIgnoreCase(teacherType) || "BOTH".equalsIgnoreCase(teacherType);
    }

    private void syncPrimaryClassAssignment(Teacher teacher, Long previousPrimaryClassId) {
        if (previousPrimaryClassId != null && !previousPrimaryClassId.equals(teacher.getPrimaryClassId())) {
            classRoomRepository.findById(previousPrimaryClassId).ifPresent(oldClass -> {
                if (teacher.getId().equals(oldClass.getTeacherId())) {
                    oldClass.setTeacherId(null);
                    oldClass.setTeacherName(null);
                    classRoomRepository.save(oldClass);
                }
                // Remove old class from teacher.classes text field
                removeClassFromTeacherClasses(teacher, oldClass.getName(), normalizeSection(oldClass.getSection()));
            });
        }

        if (teacher.getPrimaryClassId() != null) {
            classRoomRepository.findById(teacher.getPrimaryClassId()).ifPresent(classRoom -> {
                classRoom.setTeacherId(teacher.getId());
                classRoom.setTeacherName(teacher.getName());
                classRoomRepository.save(classRoom);
                // Sync teacher.classes text field so subject-teacher lookup also works
                addClassToTeacherClasses(teacher, classRoom.getName(), normalizeSection(classRoom.getSection()));
            });
        }
    }

    private void addClassToTeacherClasses(Teacher teacher, String className, String section) {
        String label    = className + (section != null && !section.isBlank() ? " - " + section : "");
        String existing = teacher.getClasses() != null ? teacher.getClasses().trim() : "";
        boolean present = java.util.Arrays.stream(existing.split(","))
                .map(String::trim).anyMatch(c -> c.equalsIgnoreCase(label));
        if (!present) {
            teacher.setClasses(existing.isBlank() ? label : existing + ", " + label);
            teacherRepository.save(teacher);
        }
    }

    /**
     * Year-end rollover:
     *   1. Updates school.academicYear to newAcademicYear
     *   2. Optionally copies class fee structures from the old year to the new year
     */
    @Transactional
    public ApiResponse<Map<String, Object>> yearRollover(Long schoolId, String newAcademicYear, boolean copyFeeStructures) {
        if (schoolId == null) return ApiResponse.error("School not found.");
        if (newAcademicYear == null || !newAcademicYear.matches("\\d{4}-\\d{2,4}"))
            return ApiResponse.error("Academic year must be in format YYYY-YY (e.g. 2026-27).");

        com.schoolers.model.School school = schoolRepository.findById(schoolId).orElse(null);
        if (school == null) school = schoolRepository.findBySchoolId(schoolId.intValue()).orElse(null);
        if (school == null) return ApiResponse.error("School record not found.");

        String oldYear = school.getAcademicYear();
        if (newAcademicYear.equals(oldYear))
            return ApiResponse.error("New academic year must differ from the current year (" + oldYear + ").");
        school.setAcademicYear(newAcademicYear);
        schoolRepository.save(school);

        int feeStructuresCopied = 0;
        if (copyFeeStructures && oldYear != null && !oldYear.isBlank()) {
            List<com.schoolers.model.ClassFeeStructure> oldStructures =
                    classFeeStructureRepository.findBySchoolId(school.getId());
            oldStructures = oldStructures.stream()
                    .filter(s -> oldYear.equals(s.getAcademicYear()))
                    .collect(java.util.stream.Collectors.toList());

            for (com.schoolers.model.ClassFeeStructure old : oldStructures) {
                // Skip if a structure for this class already exists in the new year
                boolean exists = classFeeStructureRepository
                        .findByClassNameAndAcademicYearAndSchoolId(old.getClassName(), newAcademicYear, school.getId())
                        .isPresent();
                if (exists) continue;
                com.schoolers.model.ClassFeeStructure fresh = com.schoolers.model.ClassFeeStructure.builder()
                        .className(old.getClassName())
                        .academicYear(newAcademicYear)
                        .schoolId(school.getId())
                        .tuitionFee(old.getTuitionFee())
                        .transportFee(old.getTransportFee())
                        .labFee(old.getLabFee())
                        .examFee(old.getExamFee())
                        .sportsFee(old.getSportsFee())
                        .otherFee(old.getOtherFee())
                        .build();
                classFeeStructureRepository.save(fresh);
                feeStructuresCopied++;
            }
        }

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("previousYear",       oldYear);
        result.put("newYear",            newAcademicYear);
        result.put("feeStructuresCopied", feeStructuresCopied);
        return ApiResponse.success("Academic year updated to " + newAcademicYear, result);
    }

    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<Map<String, Object>> promoteStudents(
            Long schoolId, String fromClass, String fromSection, String toClass, String toSection) {

        if (fromClass == null || fromClass.isBlank()) return ApiResponse.error("Source class is required");
        if (toClass == null || toClass.isBlank())     return ApiResponse.error("Target class is required");

        String src = resolveClassName(fromClass.trim());
        String srcSec = fromSection != null ? normalizeSection(fromSection.trim()) : "";
        String dst = resolveClassName(toClass.trim());
        String dstSec = toSection != null ? normalizeSection(toSection.trim()) : "";

        List<Student> batch = (schoolId != null)
                ? studentRepository.findBySchoolIdAndClassNameIgnoreCaseAndSectionIgnoreCase(schoolId, src, srcSec)
                : studentRepository.findByClassNameIgnoreCaseAndSectionIgnoreCase(src, srcSec);

        if (batch.isEmpty()) {
            return ApiResponse.error("No students found in " + src + (srcSec.isBlank() ? "" : "-" + srcSec));
        }

        // Capacity check: ensure the target class can absorb the incoming batch
        if (schoolId != null) {
            com.schoolers.model.ClassRoom targetRoom = classRoomRepository
                    .findBySchoolIdAndNameIgnoreCaseAndSectionIgnoreCase(schoolId, dst, dstSec)
                    .orElse(null);
            if (targetRoom != null && targetRoom.getCapacity() != null) {
                long alreadyInTarget = studentRepository.countEnrolledForCapacity(schoolId, dst, dstSec);
                long available = targetRoom.getCapacity() - alreadyInTarget;
                if (batch.size() > available) {
                    return ApiResponse.error("Target class is full — cannot promote " + batch.size()
                            + " students, only " + Math.max(0, available) + " spots remaining");
                }
            }
        }

        batch.forEach(s -> {
            s.setClassName(dst);
            s.setSection(dstSec.isBlank() ? null : dstSec);
        });
        studentRepository.saveAll(batch);

        Map<String, Object> result = new HashMap<>();
        result.put("promoted", batch.size());
        result.put("fromClass", src + (srcSec.isBlank() ? "" : "-" + srcSec));
        result.put("toClass",   dst + (dstSec.isBlank() ? "" : "-" + dstSec));
        return ApiResponse.success("Promoted " + batch.size() + " students to " + dst, result);
    }

    // ── Grade Scales ──────────────────────────────────────────────────────────

    private static final List<Map<String, Object>> DEFAULT_GRADE_SCALE = List.of(
        Map.of("grade", "O",   "minPercentage", new java.math.BigDecimal("90.00"), "displayOrder", 1),
        Map.of("grade", "A+",  "minPercentage", new java.math.BigDecimal("80.00"), "displayOrder", 2),
        Map.of("grade", "A",   "minPercentage", new java.math.BigDecimal("70.00"), "displayOrder", 3),
        Map.of("grade", "B+",  "minPercentage", new java.math.BigDecimal("60.00"), "displayOrder", 4),
        Map.of("grade", "B",   "minPercentage", new java.math.BigDecimal("50.00"), "displayOrder", 5),
        Map.of("grade", "B-",  "minPercentage", new java.math.BigDecimal("40.00"), "displayOrder", 6),
        Map.of("grade", "C",   "minPercentage", new java.math.BigDecimal("33.00"), "displayOrder", 7),
        Map.of("grade", "F",   "minPercentage", new java.math.BigDecimal("0.00"),  "displayOrder", 8)
    );

    public ApiResponse<List<GradeScale>> getGradeScales(Long schoolId) {
        if (schoolId == null) return ApiResponse.success(toDefaultEntities(null));
        List<GradeScale> scales = gradeScaleRepository.findBySchoolIdOrderByMinPercentageDesc(schoolId);
        return ApiResponse.success(scales.isEmpty() ? toDefaultEntities(schoolId) : scales);
    }

    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<List<GradeScale>> saveGradeScales(Long schoolId, List<Map<String, Object>> items) {
        if (schoolId == null) return ApiResponse.error("School ID required");
        if (items == null || items.isEmpty()) return ApiResponse.error("At least one grade entry is required");

        List<GradeScale> scales = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            Map<String, Object> item = items.get(i);
            Object gradeVal = item.get("grade");
            Object pctVal   = item.get("minPercentage");
            if (gradeVal == null || gradeVal.toString().isBlank()) continue;
            java.math.BigDecimal pct;
            try { pct = new java.math.BigDecimal(pctVal.toString()); }
            catch (Exception e) { return ApiResponse.error("Invalid minPercentage at row " + (i + 1)); }
            if (pct.compareTo(java.math.BigDecimal.ZERO) < 0 || pct.compareTo(new java.math.BigDecimal("100")) > 0)
                return ApiResponse.error("Percentage must be 0–100 at row " + (i + 1));
            int order = (item.get("displayOrder") != null)
                    ? Integer.parseInt(item.get("displayOrder").toString()) : (i + 1);
            scales.add(GradeScale.builder()
                    .schoolId(schoolId).grade(gradeVal.toString().trim())
                    .minPercentage(pct).displayOrder(order).build());
        }
        if (scales.isEmpty()) return ApiResponse.error("No valid grade entries provided");

        gradeScaleRepository.deleteBySchoolId(schoolId);
        return ApiResponse.success("Grade scale saved", gradeScaleRepository.saveAll(scales));
    }

    private List<GradeScale> toDefaultEntities(Long schoolId) {
        return DEFAULT_GRADE_SCALE.stream().map(m -> GradeScale.builder()
                .schoolId(schoolId)
                .grade((String) m.get("grade"))
                .minPercentage((java.math.BigDecimal) m.get("minPercentage"))
                .displayOrder((Integer) m.get("displayOrder"))
                .build()).collect(java.util.stream.Collectors.toList());
    }

    private void removeClassFromTeacherClasses(Teacher teacher, String className, String section) {
        if (teacher.getClasses() == null || teacher.getClasses().isBlank()) return;
        String label = className + (section != null && !section.isBlank() ? " - " + section : "");
        String updated = java.util.Arrays.stream(teacher.getClasses().split(","))
                .map(String::trim).filter(c -> !c.equalsIgnoreCase(label))
                .collect(java.util.stream.Collectors.joining(", "));
        teacher.setClasses(updated.isBlank() ? null : updated);
        teacherRepository.save(teacher);
    }
}
