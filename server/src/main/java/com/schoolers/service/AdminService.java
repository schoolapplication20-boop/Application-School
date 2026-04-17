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
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.logging.Logger;
import java.util.List;
import java.util.Map;

@Service
public class AdminService {

    private static final Logger log = Logger.getLogger(AdminService.class.getName());

    @Autowired private StudentRepository studentRepository;
    @Autowired private TeacherRepository teacherRepository;
    @Autowired private ClassRoomRepository classRoomRepository;
    @Autowired private FeeRepository feeRepository;
    @Autowired private FeePaymentRepository feePaymentRepository;
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ParentProfileRepository parentProfileRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private SalaryRepository salaryRepository;
    @Autowired private LeaveRequestRepository leaveRequestRepository;
    @Autowired private TimetableRepository timetableRepository;
    @Autowired private HomeworkRepository homeworkRepository;
    @Autowired private AssignmentRepository assignmentRepository;
    @Autowired private MarksRepository marksRepository;
    @Autowired private HallTicketRepository hallTicketRepository;
    @Autowired private CertificateRepository certificateRepository;
    @Autowired private TransportStudentAssignmentRepository transportStudentAssignmentRepository;
    @Autowired private TransportFeeRepository transportFeeRepository;
    @Autowired private ClassFeeStructureRepository classFeeStructureRepository;
    @Autowired private StudentFeeAssignmentRepository studentFeeAssignmentRepository;
    @Autowired private FeeInstallmentRepository feeInstallmentRepository;

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
     * Derives a deterministic username:
     * firstName + lastName + last4OfAdmissionNumber (all lowercase, letters/digits only).
     * Falls back to rollNumber suffix if admission number is absent.
     */
    private String buildStudentUsername(String fullName, String admissionNumber, String rollNumber) {
        String[] parts = (fullName == null ? "student" : fullName.trim()).split("\\s+");
        String first = parts[0].toLowerCase().replaceAll("[^a-z0-9]", "");
        String last  = parts.length > 1 ? parts[parts.length - 1].toLowerCase().replaceAll("[^a-z0-9]", "") : "";
        String suffix;
        String src = (admissionNumber != null && !admissionNumber.isBlank()) ? admissionNumber.trim() : rollNumber;
        if (src != null && src.length() >= 4) {
            suffix = src.substring(src.length() - 4).toLowerCase().replaceAll("[^a-z0-9]", "");
        } else {
            suffix = src != null ? src.toLowerCase().replaceAll("[^a-z0-9]", "") : String.valueOf(RANDOM.nextInt(9000) + 1000);
        }
        return first + last + suffix;
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
            // Fallback: generate internal email from username
            email = username + "@student.schoolers.local";
            while (userRepository.existsByEmailIgnoreCase(email)) {
                username = username + "_s";
                email = username + "@student.schoolers.local";
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
        if (schoolId != null) {
            // Multi-tenant: scope all counts to the caller's school
            stats.put("totalStudents", studentRepository.countBySchoolId(schoolId));
            stats.put("totalTeachers", teacherRepository.countBySchoolId(schoolId));
            stats.put("totalClasses",  classRoomRepository.countBySchoolId(schoolId));
            BigDecimal rev = feeRepository.sumPaidFeesBySchool(schoolId);
            BigDecimal exp = expenseRepository.sumAllExpensesBySchool(schoolId);
            stats.put("totalRevenue",  rev != null ? rev : BigDecimal.ZERO);
            stats.put("totalExpenses", exp != null ? exp : BigDecimal.ZERO);
        } else {
            // Platform-level SUPER_ADMIN: aggregate across all schools
            stats.put("totalStudents", studentRepository.count());
            stats.put("totalTeachers", teacherRepository.count());
            stats.put("totalClasses",  classRoomRepository.count());
            BigDecimal rev = feeRepository.sumPaidFees();
            BigDecimal exp = expenseRepository.sumAllExpenses();
            stats.put("totalRevenue",  rev != null ? rev : BigDecimal.ZERO);
            stats.put("totalExpenses", exp != null ? exp : BigDecimal.ZERO);
        }
        return ApiResponse.success(stats);
    }

    // ── Students ───────────────────────────────────────────────────────────

    public ApiResponse<Page<Student>> getStudents(Long schoolId, String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (schoolId != null) {
            if (search != null && !search.isEmpty()) {
                return ApiResponse.success(studentRepository.searchStudentsBySchool(schoolId, search, pageable));
            }
            return ApiResponse.success(studentRepository.findBySchoolId(schoolId, pageable));
        }
        // Platform-level fallback
        if (search != null && !search.isEmpty()) {
            return ApiResponse.success(studentRepository.searchStudents(search, pageable));
        }
        return ApiResponse.success(studentRepository.findAll(pageable));
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

        // Student login email (required, real email — same flow as teacher)
        String studentEmail = str(body, "studentEmail", null);
        if (studentEmail == null || studentEmail.isBlank())
            return ApiResponse.<Map<String, Object>>error("Student login email is required");
        studentEmail = studentEmail.trim().toLowerCase();
        if (!EMAIL_PATTERN.matcher(studentEmail).matches())
            return ApiResponse.<Map<String, Object>>error("Please enter a valid email address for student login");

        // If email already exists, check if it belongs to an orphaned student account
        // (student record was deleted but the user account was left behind). If so, clean it up.
        final String finalStudentEmail = studentEmail;
        userRepository.findByEmailIgnoreCase(studentEmail).ifPresent(existingUser -> {
            if (existingUser.getRole() != null && existingUser.getRole().name().equals("STUDENT")) {
                boolean hasLinkedStudent = studentRepository.findByStudentUserId(existingUser.getId()).isPresent();
                if (!hasLinkedStudent) {
                    log.info("[createStudent] Cleaning up orphaned student user id=" + existingUser.getId() + " email=" + finalStudentEmail);
                    userRepository.deleteById(existingUser.getId());
                    userRepository.flush();
                }
            }
        });

        if (userRepository.existsByEmailIgnoreCase(studentEmail))
            return ApiResponse.<Map<String, Object>>error("Email '" + studentEmail + "' is already registered. Use a different email.");

        // Extract schoolId injected by AdminController from authenticated user
        Long schoolId = body.get("schoolId") != null
                ? Long.parseLong(body.get("schoolId").toString()) : null;

        String className = resolveClassName(str(body, "className", str(body, "class", "")));
        String section   = normalizeSection(str(body, "section", ""));

        // School-scoped duplicate roll-number check
        boolean duplicate = (schoolId != null)
                ? studentRepository.findDuplicateInClassAndSchool(schoolId, rollNumber, className, section).isPresent()
                : studentRepository.findDuplicateInClass(rollNumber, className, section).isPresent();
        if (duplicate)
            return ApiResponse.<Map<String, Object>>error("Roll number " + rollNumber + " already exists in " + (className.isBlank() ? "this class" : className) + (section.isBlank() ? "" : " – " + section));

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
            // Step 1: Link to existing parent user by mobile — do NOT auto-create a parent account
            String parentMobile = student.getParentMobile();
            if (parentMobile != null && !parentMobile.isBlank()) {
                userRepository.findByMobile(parentMobile.trim())
                        .filter(u -> u.getRole() == User.Role.PARENT)
                        .ifPresent(u -> student.setParentId(u.getId()));
            }
            // Step 2: Save the student record to obtain its generated ID
            Student saved = studentRepository.save(student);
            ensureClassExists(saved.getClassName(), saved.getSection(), schoolId);

            // Step 3: Create the student User account (pass schoolId for multi-tenant isolation)
            StudentUserResult studentUserResult = createStudentUser(
                    name, saved.getAdmissionNumber(), rollNumber, saved.getId(), studentEmail, schoolId);

            // Step 4: Back-patch the student row with the user ID
            if (studentUserResult != null) {
                saved.setStudentUserId(studentUserResult.user().getId());
                saved = studentRepository.save(saved);
            }

            log.info("[createStudent] Saved student id=" + saved.getId() + " roll=" + rollNumber
                    + (saved.getStudentUserId() != null ? " studentUserId=" + saved.getStudentUserId() : "")
                    + (saved.getParentId() != null ? " parentId=" + saved.getParentId() : ""));

            Map<String, Object> responseData = new LinkedHashMap<>();
            responseData.put("student", saved);

            // Student credentials
            if (studentUserResult != null) {
                responseData.put("studentEmail", studentUserResult.loginEmail());
                responseData.put("studentTempPassword", studentUserResult.rawPassword());
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
                        + (section.isBlank() ? "" : " – " + section);
            } else if (lowerDetail.contains("uk_users_email") || lowerDetail.contains("(email)")) {
                msg = "Email '" + studentEmail + "' is already registered. Please use a different email.";
            } else if (lowerDetail.contains("uk_users_mobile") || lowerDetail.contains("(mobile)")) {
                msg = "A phone number entered is already registered. Please check parent details.";
            } else if (lowerDetail.contains("duplicate") || lowerDetail.contains("unique")) {
                msg = "A duplicate entry was detected. Please check all fields and try again.";
            } else {
                msg = "Database error: " + detail;
            }
            log.severe("[createStudent] DataIntegrity error: " + detail);
            return ApiResponse.<Map<String, Object>>error(msg);

        } catch (Exception e) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            String msg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            log.severe("[createStudent] Unexpected error: " + msg);
            return ApiResponse.<Map<String, Object>>error("Failed to save student: " + msg);
        }
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

                    studentRepository.findDuplicateInClass(targetRoll, targetClass, targetSection)
                            .ifPresent(existing -> {
                                if (!existing.getId().equals(id))
                                    throw new IllegalArgumentException(
                                        "Roll number " + targetRoll + " already exists in " +
                                        (targetClass.isBlank() ? "this class" : targetClass) +
                                        (targetSection.isBlank() ? "" : " – " + targetSection));
                            });

                    if (body.containsKey("name"))            student.setName(str(body, "name", student.getName()));
                    if (body.containsKey("admissionNumber")) student.setAdmissionNumber(str(body, "admissionNumber", student.getAdmissionNumber()));
                    student.setClassName(targetClass);
                    student.setSection(targetSection);
                    student.setRollNumber(targetRoll);
                    if (body.containsKey("parentName") || body.containsKey("fatherName"))
                        student.setParentName(str(body, "parentName", str(body, "fatherName", student.getParentName())));
                    if (body.containsKey("parentMobile") || body.containsKey("fatherPhone")) {
                        String newMobile = str(body, "parentMobile", str(body, "fatherPhone", student.getParentMobile()));
                        student.setParentMobile(newMobile);
                        if (newMobile != null && !newMobile.isBlank()) {
                            // Link to existing PARENT user only — do NOT auto-create one
                            Long parentId = userRepository.findByMobile(newMobile.trim())
                                    .filter(u -> u.getRole() == User.Role.PARENT)
                                    .map(User::getId)
                                    .orElse(null);
                            student.setParentId(parentId);
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
                    ? "Roll number already exists in this class/section."
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
            log.warning("[deleteStudent] Student not found id=" + id);
            return ApiResponse.error("Student not found with id: " + id);
        }
        if (schoolMismatch(schoolId, student.getSchoolId())) {
            log.warning("[deleteStudent] Cross-school access denied id=" + id + " authSchool=" + schoolId);
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

        // ── Step 3: Leave requests ────────────────────────────────────────────
        leaveRequestRepository.deleteByRequesterId(id);
        log.info("[deleteStudent] leave requests deleted");

        // ── Step 4: Delete the student row ────────────────────────────────────
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
            log.warning("[deleteStudent] No login account found for studentId=" + id
                    + " (studentUserId=" + linkedUserId + ") — skipping user deletion");
        }

        log.info("[deleteStudent] COMPLETE — studentId=" + id + " name=" + studentName);
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
                        student.getName(), student.getAdmissionNumber(), student.getRollNumber(), student.getId(), null);
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
        List<Teacher> teachers = schoolId != null
                ? teacherRepository.findBySchoolId(schoolId)
                : teacherRepository.findAll();

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
            // Resolve primary class name so the frontend doesn't need a separate lookup
            if (t.getPrimaryClassId() != null) {
                classRoomRepository.findById(t.getPrimaryClassId()).ifPresent(cr -> {
                    map.put("primaryClassName",
                            cr.getName() + (cr.getSection() != null && !cr.getSection().isBlank()
                                    ? " - " + cr.getSection() : ""));
                });
            }
            return map;
        }).toList();

        return ApiResponse.success(result);
    }

    public ApiResponse<Map<String, Object>> createTeacher(CreateTeacherRequest req) {

        // ── Input validation (fast-fail before touching the DB) ────────────────
        if (req.getName() == null || req.getName().isBlank())
            return ApiResponse.error("Teacher name is required");

        if (req.getEmail() == null || !EMAIL_PATTERN.matcher(req.getEmail()).matches())
            return ApiResponse.error("A valid email address is required");

        String normalizedEmail  = req.getEmail().trim().toLowerCase();
        String normalizedMobile = (req.getMobile() != null && !req.getMobile().isBlank())
                ? req.getMobile().trim() : null;

        // Case-insensitive pre-check — prevents duplicate accounts regardless of email casing
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail))
            return ApiResponse.error("Email '" + normalizedEmail + "' is already registered. Use a different email.");

        if (normalizedMobile != null && userRepository.existsByMobile(normalizedMobile))
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
            log.warning("[createTeacher] Constraint violation — email=" + normalizedEmail
                    + " empId=" + empId + " | " + e.getMessage());
            return ApiResponse.error(userMessage);

        } catch (DataAccessException e) {
            cleanupOrphanUser(user);
            log.severe("[createTeacher] Database access failure — email=" + normalizedEmail
                    + " | " + e.getClass().getSimpleName() + ": " + e.getMessage());
            return ApiResponse.error("A database error occurred while creating the teacher. Please try again in a moment.");

        } catch (Exception e) {
            cleanupOrphanUser(user);
            log.severe("[createTeacher] Unexpected error — email=" + normalizedEmail
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

    public ApiResponse<String> deleteTeacher(Long id, Long schoolId) {
        return teacherRepository.findById(id)
                .map(teacher -> {
                    if (schoolMismatch(schoolId, teacher.getSchoolId()))
                        return ApiResponse.<String>error("Teacher not found");
                    User linkedUser = teacher.getUser();
                    // Cascade: delete all related records first
                    timetableRepository.deleteByTeacherId(id);
                    homeworkRepository.deleteByTeacherId(id);
                    assignmentRepository.deleteByTeacherId(id);
                    marksRepository.deleteByTeacherId(id);
                    if (linkedUser != null) {
                        salaryRepository.deleteByStaffId(linkedUser.getId());
                        leaveRequestRepository.deleteByRequesterId(linkedUser.getId());
                    }
                    teacherRepository.deleteById(id);
                    if (linkedUser != null) {
                        userRepository.deleteById(linkedUser.getId());
                    }
                    log.info("[deleteTeacher] Deleted teacher id=" + id + " and all related records");
                    return ApiResponse.success("Teacher and login account removed", "Deleted");
                })
                .orElse(ApiResponse.error("Teacher not found"));
    }

    public ApiResponse<String> resetTeacherPassword(Long teacherId, String newPassword, Long schoolId) {
        return teacherRepository.findById(teacherId)
                .map(teacher -> {
                    if (schoolMismatch(schoolId, teacher.getSchoolId()))
                        return ApiResponse.<String>error("Teacher not found");
                    User user = teacher.getUser();
                    if (user == null) return ApiResponse.<String>error("Teacher has no login account.");
                    user.setPassword(passwordEncoder.encode(newPassword));
                    user.setTempPassword(null);
                    user.setFirstLogin(true);            // force password change on next login
                    userRepository.save(user);
                    return ApiResponse.success("Password reset successfully", newPassword);
                })
                .orElse(ApiResponse.error("Teacher not found"));
    }

    // ── Classes ────────────────────────────────────────────────────────────

    public ApiResponse<List<ClassRoom>> getClasses(Long schoolId) {
        if (schoolId != null) {
            return ApiResponse.success(classRoomRepository.findBySchoolId(schoolId));
        }
        return ApiResponse.success(classRoomRepository.findAll());
    }

    @Transactional
    public ApiResponse<ClassRoom> createClass(ClassRoom classRoom, Long schoolId) {
        String name = resolveClassName(classRoom.getName());
        String section = normalizeSection(classRoom.getSection());

        if (name.isBlank()) return ApiResponse.error("Class name is required");

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
                    if (updated.getTeacherId() != null)   c.setTeacherId(updated.getTeacherId());
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
                        // Only cascade rename to students in the same school
                        List<?> studentsToRename = (roomSchoolId != null)
                                ? studentRepository.findBySchoolIdAndClassNameIgnoreCaseAndSectionIgnoreCase(roomSchoolId, oldName, oldSection)
                                : studentRepository.findByClassNameIgnoreCaseAndSectionIgnoreCase(oldName, oldSection);
                        studentsToRename.forEach(s -> {
                            Student student = (Student) s;
                            student.setClassName(newName);
                            student.setSection(newSection);
                            studentRepository.save(student);
                        });
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

    @Transactional
    public ApiResponse<String> deleteClass(Long id, Long schoolId) {
        return classRoomRepository.findById(id)
                .map(classRoom -> {
                    if (schoolMismatch(schoolId, classRoom.getSchoolId()))
                        return ApiResponse.<String>error("Class not found");
                    String className = resolveClassName(classRoom.getName());
                    String section = normalizeSection(classRoom.getSection());
                    Long classSchoolId = classRoom.getSchoolId();
                    int deletedStudents = (classSchoolId != null)
                            ? studentRepository.deleteBySchoolIdAndClassNameIgnoreCaseAndSectionIgnoreCase(classSchoolId, className, section)
                            : studentRepository.deleteByClassNameIgnoreCaseAndSectionIgnoreCase(className, section);
                    classRoomRepository.deleteById(classRoom.getId());
                    log.info("[deleteClass] Deleted class " + className + "-" + section + " schoolId=" + classSchoolId + " students removed=" + deletedStudents);
                    return ApiResponse.success("Class deleted", "Deleted");
                })
                .orElse(ApiResponse.error("Class not found"));
    }

    // ── Fees ───────────────────────────────────────────────────────────────

    public ApiResponse<List<Fee>> getFees(Long schoolId) {
        if (schoolId != null) {
            return ApiResponse.success(feeRepository.findBySchoolId(schoolId));
        }
        return ApiResponse.success(feeRepository.findAll());
    }

    public ApiResponse<List<Student>> searchStudentsForFee(Long schoolId, String query) {
        if (query == null || query.trim().isEmpty()) return ApiResponse.success(java.util.Collections.emptyList());
        List<Student> results = (schoolId != null)
                ? studentRepository.searchBySchoolAndNameRollOrPhone(schoolId, query.trim())
                : studentRepository.searchByNameRollOrPhone(query.trim());
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

        fee.setStudentName(student.getName());
        fee.setRollNumber(student.getRollNumber());
        fee.setClassName(student.getClassName());
        // Inherit school from student for multi-tenant isolation
        if (fee.getSchoolId() == null) fee.setSchoolId(student.getSchoolId());

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

    @Transactional
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
        if (schoolId != null) {
            return ApiResponse.success(classFeeStructureRepository.findBySchoolId(schoolId));
        }
        return ApiResponse.success(classFeeStructureRepository.findAll());
    }

    @Transactional
    public ApiResponse<ClassFeeStructure> saveClassFeeStructure(Map<String, Object> body) {
        String className    = str(body, "className", null);
        String academicYear = str(body, "academicYear", "2024-25");
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
        return ApiResponse.success("Fee structure saved", classFeeStructureRepository.save(cfs));
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
        List<StudentFeeAssignment> all = studentFeeAssignmentRepository.findAllByOrderByCreatedAtDesc();
        if (schoolId != null) {
            // Filter via student ownership since StudentFeeAssignment has no schoolId column
            java.util.Set<Long> schoolStudentIds = studentRepository.findBySchoolId(schoolId)
                    .stream().map(Student::getId).collect(java.util.stream.Collectors.toSet());
            all = all.stream().filter(a -> schoolStudentIds.contains(a.getStudentId())).toList();
        }
        return ApiResponse.success(all);
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

    public ApiResponse<List<FeePayment>> getAssignmentPayments(Long assignmentId) {
        return ApiResponse.success(
                feePaymentRepository.findByAssignmentIdOrderByPaymentDateDescCreatedAtDesc(assignmentId));
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

            String academicYear = str(body, "academicYear", "2024-25");
            if (academicYear == null || academicYear.isBlank()) academicYear = "2024-25";

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
            log.severe("[assignStudentFee] Unexpected error: " + e.getMessage());
            return ApiResponse.error("Failed to save assignment: " + e.getMessage());
        }
    }

    @Transactional
    public ApiResponse<StudentFeeAssignment> collectAssignmentFee(Long assignmentId, Map<String, Object> body) {
        StudentFeeAssignment assignment = studentFeeAssignmentRepository.findById(assignmentId).orElse(null);
        if (assignment == null) return ApiResponse.error("Fee assignment not found");

        BigDecimal amountPaid;
        try {
            amountPaid = new BigDecimal(body.get("amountPaid").toString());
        } catch (Exception e) {
            return ApiResponse.error("Invalid amount");
        }
        if (amountPaid.compareTo(BigDecimal.ZERO) <= 0) return ApiResponse.error("Amount must be greater than zero");

        BigDecimal currentPaid = assignment.getPaidAmount() != null ? assignment.getPaidAmount() : BigDecimal.ZERO;
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
            try { paymentDate = LocalDate.parse(paidDateStr); } catch (Exception ignored) {}
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
        if (schoolId != null) {
            return ApiResponse.success(
                    feePaymentRepository.findBySchoolIdOrderByPaymentDateDescCreatedAtDesc(schoolId));
        }
        return ApiResponse.success(
                feePaymentRepository.findAll(
                        org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.DESC, "createdAt")));
    }

    // ── Installment management ─────────────────────────────────────────────

    public ApiResponse<List<FeeInstallment>> getInstallments(Long assignmentId) {
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

        String receiptNumber = str(body, "receiptNumber", null);
        if (receiptNumber == null || receiptNumber.isBlank()) return ApiResponse.error("Receipt number is required");
        receiptNumber = receiptNumber.trim();
        if (feePaymentRepository.existsByReceiptNumber(receiptNumber))
            return ApiResponse.error("Duplicate receipt number: " + receiptNumber);

        String paidDateStr = str(body, "paidDate", null);
        LocalDate paymentDate = LocalDate.now();
        if (paidDateStr != null && !paidDateStr.isBlank()) {
            try { paymentDate = LocalDate.parse(paidDateStr); } catch (Exception ignored) {}
        }

        // Mark installment paid
        installment.setStatus(FeeInstallment.Status.PAID);
        installment.setPaidDate(paymentDate);
        FeeInstallment savedInst = feeInstallmentRepository.save(installment);

        // Update assignment totals
        BigDecimal currentPaid = assignment.getPaidAmount() != null ? assignment.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal newPaid = currentPaid.add(installment.getAmount());
        assignment.setPaidAmount(newPaid);
        if (newPaid.compareTo(assignment.getTotalFee()) >= 0) assignment.setStatus(StudentFeeAssignment.Status.PAID);
        else assignment.setStatus(StudentFeeAssignment.Status.PARTIAL);
        studentFeeAssignmentRepository.save(assignment);

        // Record in fee_payments table
        feePaymentRepository.save(FeePayment.builder()
                .feeId(0L)
                .assignmentId(assignment.getId())
                .studentId(assignment.getStudentId())
                .studentName(assignment.getStudentName())
                .rollNumber(assignment.getRollNumber())
                .className(assignment.getClassName())
                .feeType("Fee Payment")
                .term(installment.getTermName())
                .amountPaid(installment.getAmount())
                .paymentDate(paymentDate)
                .paymentMode("CASH")
                .receiptNumber(receiptNumber)
                .receivedBy(str(body, "receivedBy", null))
                .remarks(str(body, "remarks", null))
                .build());

        return ApiResponse.success("Payment recorded for " + installment.getTermName(), savedInst);
    }

    /**
     * Returns comprehensive fee data for a student (used by the student portal).
     * Includes the assignment, installments, payments, and a summary map.
     */
    public ApiResponse<Map<String, Object>> getStudentFeeData(Long studentId) {
        Map<String, Object> result = new LinkedHashMap<>();

        StudentFeeAssignment assignment = studentFeeAssignmentRepository
                .findFirstByStudentIdOrderByCreatedAtDesc(studentId).orElse(null);

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

        if (schoolId != null) {
            return ApiResponse.success(
                    expenseRepository.findFilteredBySchool(schoolId, statusParam, dateFromParam, dateToParam, searchParam));
        }
        return ApiResponse.success(
                expenseRepository.findFiltered(statusParam, dateFromParam, dateToParam, searchParam));
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

            Expense expense = Expense.builder()
                    .title(title)
                    .amount(amount)
                    .date(date)
                    .paymentMode(str(body, "paymentMode", null))
                    .status(status)
                    .description(str(body, "description", null))
                    .addedBy(str(body, "addedBy", "Admin"))
                    .addedById(body.get("addedById") != null ? Long.parseLong(body.get("addedById").toString()) : null)
                    .build();

            return ApiResponse.success("Expense recorded", expenseRepository.save(expense));
        } catch (Exception e) {
            return ApiResponse.error("Failed to create expense: " + e.getMessage());
        }
    }

    public ApiResponse<Expense> updateExpense(Long id, Map<String, Object> body) {
        return expenseRepository.findById(id)
                .map(expense -> {
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

    public ApiResponse<String> deleteExpense(Long id) {
        if (!expenseRepository.existsById(id)) return ApiResponse.error("Expense not found");
        expenseRepository.deleteById(id);
        return ApiResponse.success("Expense deleted", "Deleted");
    }

    public ApiResponse<Map<String, Object>> getExpenseSummary(Long schoolId) {
        LocalDate now = LocalDate.now();
        int month = now.getMonthValue(), year = now.getYear();

        BigDecimal total, paid, unpaid;
        if (schoolId != null) {
            total  = expenseRepository.sumBySchoolAndMonth(schoolId, month, year);
            // School-scoped paid/unpaid: fall back to in-memory filter from findFilteredBySchool
            paid   = expenseRepository.sumBySchoolAndMonth(schoolId, month, year); // reuse total; separate breakdowns below
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
        List<User> parentUsers = (schoolId != null)
                ? userRepository.findByRoleAndSchoolId(User.Role.PARENT, schoolId)
                : userRepository.findByRole(User.Role.PARENT);
        List<Map<String, Object>> result = parentUsers.stream()
                .map(u -> {
                    ParentProfile profile = parentProfileRepository.findByUser(u).orElse(null);
                    return parentToMap(u, profile);
                }).toList();
        return ApiResponse.success(result);
    }

    @Transactional
    public ApiResponse<Map<String, Object>> createParent(Map<String, Object> body) {
        String name   = str(body, "name",   "").trim();
        String email  = str(body, "email",  "").trim().toLowerCase();
        String mobile = str(body, "mobile", null);

        if (name.isBlank())  return ApiResponse.error("Parent name is required");
        if (email.isBlank() || !EMAIL_PATTERN.matcher(email).matches())
            return ApiResponse.error("Valid email is required");
        // Case-insensitive check so Admin@x.com and admin@x.com are treated as the same
        if (userRepository.existsByEmailIgnoreCase(email))
            return ApiResponse.error("Email already registered: " + email);
        if (mobile != null && !mobile.isBlank() && userRepository.existsByMobile(mobile))
            return ApiResponse.error("Mobile number already registered");

        String rawPassword = (str(body, "password", "").isBlank())
                ? generatePassword() : str(body, "password", "");

        try {
            User user = userRepository.save(User.builder()
                    .name(name)
                    .email(email)
                    .mobile(mobile != null && !mobile.isBlank() ? mobile : null)
                    .password(passwordEncoder.encode(rawPassword))
                    .tempPassword(rawPassword)
                    .role(User.Role.PARENT)
                    .isActive(true)
                    .firstLogin(true)
                    .build());

            ParentProfile profile = parentProfileRepository.save(ParentProfile.builder()
                    .user(user)
                    .name(name)
                    .relation(str(body, "relation", null))
                    .occupation(str(body, "occupation", null))
                    .address(str(body, "address", null))
                    .alternateMobile(str(body, "alternateMobile", null))
                    .isActive(true)
                    .build());

            log.info("[createParent] Saved parent userId=" + user.getId() + " email=" + email);

            Map<String, Object> result = parentToMap(user, profile);
            result.put("generatedPassword", rawPassword);
            return ApiResponse.success("Parent created successfully", result);
        } catch (Exception e) {
            // no-op: transaction rollback not available without JPA
            log.severe("[createParent] error: " + e.getMessage());
            return ApiResponse.error("Failed to create parent: " + e.getMessage());
        }
    }

    public ApiResponse<Map<String, Object>> updateParent(Long id, Map<String, Object> body) {
        return userRepository.findById(id)
                .filter(u -> u.getRole() == User.Role.PARENT)
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

    @org.springframework.transaction.annotation.Transactional
    public ApiResponse<String> deleteParent(Long id) {
        return userRepository.findById(id)
                .filter(u -> u.getRole() == User.Role.PARENT)
                .map(user -> {
                    parentProfileRepository.findByUser(user)
                            .ifPresent(p -> parentProfileRepository.deleteById(p.getId()));
                    userRepository.deleteById(id);
                    return ApiResponse.success("Parent deleted", "Deleted");
                })
                .orElse(ApiResponse.error("Parent not found"));
    }

    public ApiResponse<String> resetParentPassword(Long id, String newPassword) {
        return userRepository.findById(id)
                .filter(u -> u.getRole() == User.Role.PARENT)
                .map(user -> {
                    user.setPassword(passwordEncoder.encode(newPassword));
                    user.setTempPassword(null);
                    user.setFirstLogin(true);
                    userRepository.save(user);
                    return ApiResponse.success("Password reset successfully", newPassword);
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

    @SuppressWarnings("unchecked")
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
            List<Object[]> rows = attendanceRepository.countByStatusForClassAndDate(cls.getId(), date);
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
    public ApiResponse<Map<String, Object>> getTeacherAttendanceSummary(Long teacherId, LocalDate date) {
        return teacherRepository.findById(teacherId)
                .map(teacher -> {
                    Long classId = teacher.getPrimaryClassId();
                    if (classId == null) return ApiResponse.<Map<String, Object>>error("Teacher has no primary class assigned");
                    ClassRoom classRoom = classRoomRepository.findById(classId).orElse(null);

                    List<Object[]> rows = attendanceRepository.countByStatusForClassAndDate(classId, date);
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
                    List<Object[]> rangeRows = attendanceRepository.countByStatusForClassAndDateRange(classId, start, date);
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

    public ApiResponse<Map<String, Object>> getClassAttendanceDetails(Long classId, LocalDate date) {
        ClassRoom classRoom = classRoomRepository.findById(classId).orElse(null);
        if (classRoom == null) return ApiResponse.error("Class not found");

        List<Attendance> records = attendanceRepository.findByClassIdAndDate(classId, date);
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

        List<Object[]> rows = attendanceRepository.countByStatusForClassAndDate(classId, date);
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
            });
        }

        if (teacher.getPrimaryClassId() != null) {
            classRoomRepository.findById(teacher.getPrimaryClassId()).ifPresent(classRoom -> {
                classRoom.setTeacherId(teacher.getId());
                classRoom.setTeacherName(teacher.getName());
                classRoomRepository.save(classRoom);
            });
        }
    }
}
