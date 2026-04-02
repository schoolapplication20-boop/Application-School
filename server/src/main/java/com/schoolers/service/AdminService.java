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

    private static final String CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final java.util.regex.Pattern EMAIL_PATTERN =
        java.util.regex.Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

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

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        String[] formats = {"yyyy-MM-dd", "dd MMM yyyy", "dd/MM/yyyy", "MM/dd/yyyy"};
        for (String fmt : formats) {
            try { return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern(fmt)); } catch (DateTimeParseException ignored) {}
        }
        return null;
    }

    // ── Dashboard ──────────────────────────────────────────────────────────

    public ApiResponse<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalStudents", studentRepository.count());
        stats.put("totalTeachers", teacherRepository.count());
        stats.put("totalUsers", userRepository.count());
        BigDecimal rev = feeRepository.sumPaidFees();
        BigDecimal exp = expenseRepository.sumAllExpenses();
        stats.put("totalRevenue",  rev != null ? rev : BigDecimal.ZERO);
        stats.put("totalExpenses", exp != null ? exp : BigDecimal.ZERO);
        stats.put("totalClasses",  classRoomRepository.count());
        return ApiResponse.success(stats);
    }

    // ── Students ───────────────────────────────────────────────────────────

    public ApiResponse<Page<Student>> getStudents(String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        if (search != null && !search.isEmpty()) {
            return ApiResponse.success(studentRepository.searchStudents(search, pageable));
        }
        return ApiResponse.success(studentRepository.findAll(pageable));
    }

    public ApiResponse<Student> getStudentById(Long id) {
        return studentRepository.findById(id)
                .map(ApiResponse::success)
                .orElse(ApiResponse.error("Student not found with id: " + id));
    }

    @Transactional
    public ApiResponse<Student> createStudent(Map<String, Object> body) {
        // Accept both camelCase frontend fields and snake_case backend fields
        String rollNumber = str(body, "rollNumber", str(body, "rollNo", null));
        if (rollNumber == null || rollNumber.isBlank())
            return ApiResponse.error("Roll number is required");
        rollNumber = rollNumber.trim();

        String name = str(body, "name", null);
        if (name == null || name.isBlank()) return ApiResponse.error("Student name is required");

        String className = resolveClassName(str(body, "className", str(body, "class", "")));
        String section   = normalizeSection(str(body, "section", ""));
        if (studentRepository.findDuplicateInClass(rollNumber, className, section).isPresent())
            return ApiResponse.error("Roll number " + rollNumber + " already exists in " + (className.isBlank() ? "this class" : className) + (section.isBlank() ? "" : " – " + section));

        Student student = Student.builder()
                .name(name)
                .rollNumber(rollNumber)
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
                .build();

        try {
            Student saved = studentRepository.save(student);
            log.info("[createStudent] Saved student id=" + saved.getId() + " roll=" + rollNumber);
            ensureClassExists(saved.getClassName(), saved.getSection());
            return ApiResponse.success("Student created successfully", saved);
        } catch (Exception e) {
            String msg = e.getMessage() != null && e.getMessage().contains("roll_number")
                ? "Roll number " + rollNumber + " already exists in " + className + (section.isBlank() ? "" : " – " + section)
                : "Failed to save student. Please try again.";
            log.severe("[createStudent] DB error: " + e.getMessage());
            return ApiResponse.error(msg);
        }
    }

    @Transactional
    public ApiResponse<Student> updateStudent(Long id, Map<String, Object> body) {
        try { return studentRepository.findById(id)
                .map(student -> {
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

                    if (body.containsKey("name"))          student.setName(str(body, "name", student.getName()));
                    student.setClassName(targetClass);
                    student.setSection(targetSection);
                    student.setRollNumber(targetRoll);
                    if (body.containsKey("parentName") || body.containsKey("fatherName"))
                        student.setParentName(str(body, "parentName", str(body, "fatherName", student.getParentName())));
                    if (body.containsKey("parentMobile") || body.containsKey("fatherPhone"))
                        student.setParentMobile(str(body, "parentMobile", str(body, "fatherPhone", student.getParentMobile())));
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
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(e.getMessage());
        }
    }

    @Transactional
    public ApiResponse<String> deleteStudent(Long id) {
        return studentRepository.findById(id).map(student -> {
            // Cascade: delete all related records first
            marksRepository.deleteByStudentId(id);
            hallTicketRepository.deleteByStudentId(id);
            certificateRepository.deleteByStudentId(id);
            transportStudentAssignmentRepository.deleteByStudentId(id);
            attendanceRepository.deleteByStudentId(id);
            feePaymentRepository.deleteByStudentId(id);
            feeRepository.deleteByStudentId(id);
            transportFeeRepository.deleteByStudentId(id);
            studentRepository.deleteById(id);
            log.info("[deleteStudent] Deleted student id=" + id + " and all related records");
            return ApiResponse.success("Student deleted successfully", "Deleted");
        }).orElse(ApiResponse.error("Student not found with id: " + id));
    }

    // ── Teachers ───────────────────────────────────────────────────────────

    public ApiResponse<List<Teacher>> getTeachers() {
        return ApiResponse.success(teacherRepository.findAll());
    }

    @Transactional   // rolls back BOTH saves atomically if teacherRepository.save() fails
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
        Long primaryClassId = "CLASS_TEACHER".equals(teacherType) ? req.getPrimaryClassId() : null;
        if ("CLASS_TEACHER".equals(teacherType) && primaryClassId == null)
            return ApiResponse.error("Primary class is required for a class teacher");

        String empId = (req.getEmpId() != null && !req.getEmpId().isBlank())
                ? req.getEmpId().trim()
                : "EMP" + System.currentTimeMillis() % 100000;

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
            } else if (hint.contains("employee_id") || hint.contains("teachers_employee_id_key")) {
                userMessage = "Employee ID '" + empId + "' is already assigned to another teacher. Please provide a unique employee ID.";
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
                    Long previousPrimaryClassId = teacher.getPrimaryClassId();
                    if (req.getName() != null && !req.getName().isBlank()) teacher.setName(req.getName().trim());
                    if (req.getSubject() != null)       teacher.setSubject(req.getSubject());
                    if (req.getDepartment() != null)    teacher.setDepartment(req.getDepartment());
                    if (req.getClasses() != null)       teacher.setClasses(req.getClasses());
                    if (req.getQualification() != null) teacher.setQualification(req.getQualification());
                    if (req.getExperience() != null)    teacher.setExperience(req.getExperience());
                    if (req.getJoiningDate() != null)   teacher.setJoiningDate(parseDate(req.getJoiningDate()));
                    if (req.getStatus() != null)        teacher.setIsActive(!"Inactive".equalsIgnoreCase(req.getStatus()));
                    if (req.getTeacherType() != null)   teacher.setTeacherType(normalizeTeacherType(req.getTeacherType()));
                    if (!"CLASS_TEACHER".equalsIgnoreCase(teacher.getTeacherType())) {
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

    public ApiResponse<Map<String, Object>> getTeacherById(Long id) {
        return teacherRepository.findById(id)
                .map(teacher -> {
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

    public ApiResponse<String> deleteTeacher(Long id) {
        return teacherRepository.findById(id)
                .map(teacher -> {
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

    public ApiResponse<String> resetTeacherPassword(Long teacherId, String newPassword) {
        return teacherRepository.findById(teacherId)
                .map(teacher -> {
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

    public ApiResponse<List<ClassRoom>> getClasses() {
        return ApiResponse.success(classRoomRepository.findAll());
    }

    @Transactional
    public ApiResponse<ClassRoom> createClass(ClassRoom classRoom) {
        String name = resolveClassName(classRoom.getName());
        String section = normalizeSection(classRoom.getSection());

        if (name.isBlank()) return ApiResponse.error("Class name is required");
        if (classRoomRepository.existsByNameIgnoreCaseAndSectionIgnoreCase(name, section))
            return ApiResponse.error("Class " + name + " - " + section + " already exists");

        classRoom.setName(name);
        classRoom.setSection(section);
        return ApiResponse.success("Class created", classRoomRepository.save(classRoom));
    }

    @Transactional
    public ApiResponse<ClassRoom> updateClass(Long id, ClassRoom updated) {
        try {
            return classRoomRepository.findById(id)
                .map(c -> {
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

                    classRoomRepository.findByNameIgnoreCaseAndSectionIgnoreCase(newName, newSection)
                            .ifPresent(existing -> {
                                if (!existing.getId().equals(id)) {
                                    throw new IllegalArgumentException("Class " + newName + " - " + newSection + " already exists");
                                }
                            });

                    if (!oldName.equalsIgnoreCase(newName) || !oldSection.equalsIgnoreCase(newSection)) {
                        studentRepository.findByClassNameIgnoreCaseAndSectionIgnoreCase(oldName, oldSection)
                                .forEach(student -> {
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
    public ApiResponse<String> deleteClass(Long id) {
        return classRoomRepository.findById(id)
                .map(classRoom -> {
                    String className = resolveClassName(classRoom.getName());
                    String section = normalizeSection(classRoom.getSection());
                    int deletedStudents = studentRepository.deleteByClassNameIgnoreCaseAndSectionIgnoreCase(className, section);
                    classRoomRepository.deleteById(classRoom.getId());
                    log.info("[deleteClass] Deleted class " + className + "-" + section + " and removed " + deletedStudents + " linked students");
                    return ApiResponse.success("Class deleted", "Deleted");
                })
                .orElse(ApiResponse.error("Class not found"));
    }

    // ── Fees ───────────────────────────────────────────────────────────────

    public ApiResponse<List<Fee>> getFees() {
        return ApiResponse.success(feeRepository.findAll());
    }

    public ApiResponse<List<Student>> searchStudentsForFee(String query) {
        if (query == null || query.trim().isEmpty()) return ApiResponse.success(java.util.Collections.emptyList());
        List<Student> results = studentRepository.searchByNameRollOrPhone(query.trim());
        return ApiResponse.success(results);
    }

    public ApiResponse<List<Fee>> getStudentFees(Long studentId) {
        List<Fee> fees = feeRepository.findByStudentIdOrderByCreatedAtDesc(studentId);
        return ApiResponse.success(fees);
    }

    public ApiResponse<List<FeePayment>> getStudentFeePayments(Long studentId) {
        return ApiResponse.success(feePaymentRepository.findByStudentIdOrderByPaymentDateDescCreatedAtDesc(studentId));
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
    public ApiResponse<Fee> collectCashFee(Long feeId, Map<String, Object> body) {
        return feeRepository.findById(feeId)
                .map(fee -> {
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
                            .build());

                    return ApiResponse.success("Cash payment recorded", savedFee);
                })
                .orElse(ApiResponse.error("Fee record not found"));
    }

    public ApiResponse<Fee> updateFee(Long id, Map<String, Object> body) {
        return feeRepository.findById(id)
                .map(fee -> {
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
    public ApiResponse<String> deleteFee(Long id) {
        if (!feeRepository.existsById(id)) return ApiResponse.error("Fee record not found");
        feeRepository.deleteById(id);
        return ApiResponse.success("Fee record deleted", "Deleted");
    }

    // ── Expenses ───────────────────────────────────────────────────────────

    public ApiResponse<List<Expense>> getExpenses() {
        return ApiResponse.success(expenseRepository.findAll());
    }

    public ApiResponse<Expense> createExpense(Expense expense) {
        return ApiResponse.success("Expense recorded", expenseRepository.save(expense));
    }

    public ApiResponse<Expense> updateExpense(Long id, Map<String, Object> body) {
        return expenseRepository.findById(id)
                .map(expense -> {
                    if (body.containsKey("category"))    expense.setCategory(str(body, "category", expense.getCategory()));
                    if (body.containsKey("description")) expense.setDescription(str(body, "description", expense.getDescription()));
                    if (body.containsKey("amount") && body.get("amount") != null) {
                        try { expense.setAmount(new java.math.BigDecimal(body.get("amount").toString())); }
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

    public ApiResponse<List<Map<String, Object>>> getParents() {
        List<Map<String, Object>> result = userRepository.findByRole(User.Role.PARENT).stream()
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
        if (rawClassName == null || rawClassName.isBlank()) return;

        String normalized = resolveClassName(rawClassName);

        // ── Normalize section ─────────────────────────────────────────────────
        String sec = normalizeSection(section);

        // ── Fast existence check (case-insensitive) ───────────────────────────
        if (classRoomRepository.existsByNameIgnoreCaseAndSectionIgnoreCase(normalized, sec)) {
            log.info("[ensureClassExists] Already exists: " + normalized + "-" + sec);
            return;
        }

        try {
            classRoomRepository.save(ClassRoom.builder()
                    .name(normalized)
                    .section(sec)
                    .capacity(40)
                    .isActive(true)
                    .build());
            log.info("[ensureClassExists] Auto-created class: " + normalized + "-" + sec);
        } catch (Exception e) {
            // Log full detail — never fail student creation because of a class side-effect
            log.severe("[ensureClassExists] Unexpected error for " + normalized + "-" + sec
                    + " | " + e.getClass().getName() + ": " + e.getMessage());
        }
    }

    // ── Helper ─────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }

    // ── Attendance Summary ────────────────────────────────────────────────────

    /** Class-wise attendance summary for a specific date (Admin/SuperAdmin view) */
    public ApiResponse<List<Map<String, Object>>> getClassAttendanceSummaries(LocalDate date) {
        List<ClassRoom> classes = classRoomRepository.findByIsActive(true);
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
        return "CLASS_TEACHER".equals(normalized) ? "CLASS_TEACHER" : "SUBJECT_TEACHER";
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
