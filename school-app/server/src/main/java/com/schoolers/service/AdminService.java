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

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
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
    @Autowired private ExpenseRepository expenseRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ParentProfileRepository parentProfileRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final String CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
    private static final SecureRandom RANDOM = new SecureRandom();

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

    public ApiResponse<Student> createStudent(Map<String, Object> body) {
        // Accept both camelCase frontend fields and snake_case backend fields
        String rollNumber = str(body, "rollNumber", str(body, "rollNo", null));
        if (rollNumber == null || rollNumber.isBlank())
            return ApiResponse.error("Roll number is required");

        String name = str(body, "name", null);
        if (name == null || name.isBlank()) return ApiResponse.error("Student name is required");

        String className = str(body, "className", str(body, "class", ""));
        String section   = str(body, "section", "");
        if (studentRepository.findDuplicateInClass(rollNumber, className, section).isPresent())
            return ApiResponse.error("Roll number " + rollNumber + " already exists in " + (className.isBlank() ? "this class" : className) + (section.isBlank() ? "" : " – " + section));

        Student student = Student.builder()
                .name(name)
                .rollNumber(rollNumber)
                .className(className)
                .section(section)
                .bloodGroup(str(body, "bloodGroup", null))
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

    public ApiResponse<Student> updateStudent(Long id, Map<String, Object> body) {
        try { return studentRepository.findById(id)
                .map(student -> {
                    if (body.containsKey("name"))          student.setName(str(body, "name", student.getName()));
                    if (body.containsKey("className") || body.containsKey("class"))
                        student.setClassName(str(body, "className", str(body, "class", student.getClassName())));
                    if (body.containsKey("section"))       student.setSection(str(body, "section", student.getSection()));

                    // Roll number duplicate check: scoped to class + section, excluding self
                    if (body.containsKey("rollNumber")) {
                        String newRoll = str(body, "rollNumber", student.getRollNumber());
                        String targetClass   = str(body, "className", str(body, "class", student.getClassName()));
                        String targetSection = str(body, "section", student.getSection());
                        studentRepository.findDuplicateInClass(newRoll, targetClass, targetSection)
                                .ifPresent(existing -> {
                                    if (!existing.getId().equals(id))
                                        throw new IllegalArgumentException(
                                            "Roll number " + newRoll + " already exists in " +
                                            (targetClass.isBlank() ? "this class" : targetClass) +
                                            (targetSection.isBlank() ? "" : " – " + targetSection));
                                });
                        student.setRollNumber(newRoll);
                    }
                    if (body.containsKey("bloodGroup"))
                        student.setBloodGroup(str(body, "bloodGroup", student.getBloodGroup()));
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

    public ApiResponse<String> deleteStudent(Long id) {
        if (!studentRepository.existsById(id)) return ApiResponse.error("Student not found with id: " + id);
        studentRepository.deleteById(id);
        return ApiResponse.success("Student deleted successfully", "Deleted");
    }

    // ── Teachers ───────────────────────────────────────────────────────────

    public ApiResponse<List<Teacher>> getTeachers() {
        return ApiResponse.success(teacherRepository.findAll());
    }

    public ApiResponse<Map<String, Object>> createTeacher(CreateTeacherRequest req) {
        if (req.getName() == null || req.getName().isBlank())
            return ApiResponse.error("Teacher name is required");
        if (req.getEmail() == null || !req.getEmail().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            return ApiResponse.error("Valid email is required");
        String normalizedEmail = req.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail))
            return ApiResponse.error("Email already registered: " + normalizedEmail);

        // Use admin-provided password if given, otherwise auto-generate
        String rawPassword = (req.getPassword() != null && !req.getPassword().isBlank())
                ? req.getPassword()
                : generatePassword();

        try {
            User user = userRepository.save(User.builder()
                    .name(req.getName().trim())
                    .email(normalizedEmail)
                    .mobile(req.getMobile() != null && !req.getMobile().isBlank() ? req.getMobile() : null)
                    .password(passwordEncoder.encode(rawPassword))
                    .tempPassword(rawPassword)
                    .role(User.Role.TEACHER)
                    .isActive(!"Inactive".equalsIgnoreCase(req.getStatus()))
                    .firstLogin(true)
                    .build());

            Teacher teacher = teacherRepository.save(Teacher.builder()
                    .user(user)
                    .name(req.getName().trim())
                    .employeeId(req.getEmpId() != null ? req.getEmpId() : "EMP" + System.currentTimeMillis() % 100000)
                    .subject(req.getSubject())
                    .department(req.getDepartment())
                    .classes(req.getClasses())
                    .qualification(req.getQualification())
                    .experience(req.getExperience())
                    .joiningDate(parseDate(req.getJoiningDate()))
                    .isActive(!"Inactive".equalsIgnoreCase(req.getStatus()))
                    .build());

            Map<String, Object> result = new HashMap<>();
            result.put("id", teacher.getId());
            result.put("userId", user.getId());
            result.put("name", user.getName());
            result.put("email", user.getEmail());
            result.put("mobile", user.getMobile());
            result.put("empId", teacher.getEmployeeId());
            result.put("subject", teacher.getSubject());
            result.put("department", teacher.getDepartment());
            result.put("classes", teacher.getClasses());
            result.put("qualification", teacher.getQualification());
            result.put("experience", teacher.getExperience());
            result.put("joiningDate", teacher.getJoiningDate());
            result.put("status", teacher.getIsActive() ? "Active" : "Inactive");
            result.put("generatedPassword", rawPassword);

            return ApiResponse.success("Teacher created successfully", result);

        } catch (Exception e) {
            log.severe("[createTeacher] DB error for email=" + normalizedEmail + ": " + e.getMessage());
            return ApiResponse.error("Failed to create teacher: " + e.getMessage());
        }
    }

    public ApiResponse<Teacher> updateTeacher(Long id, CreateTeacherRequest req) {
        return teacherRepository.findById(id)
                .map(teacher -> {
                    if (req.getName() != null && !req.getName().isBlank()) teacher.setName(req.getName().trim());
                    if (req.getSubject() != null)       teacher.setSubject(req.getSubject());
                    if (req.getDepartment() != null)    teacher.setDepartment(req.getDepartment());
                    if (req.getClasses() != null)       teacher.setClasses(req.getClasses());
                    if (req.getQualification() != null) teacher.setQualification(req.getQualification());
                    if (req.getExperience() != null)    teacher.setExperience(req.getExperience());
                    if (req.getJoiningDate() != null)   teacher.setJoiningDate(parseDate(req.getJoiningDate()));
                    if (req.getStatus() != null)        teacher.setIsActive(!"Inactive".equalsIgnoreCase(req.getStatus()));
                    // Update linked User name/mobile if provided
                    if (teacher.getUser() != null) {
                        User u = teacher.getUser();
                        if (req.getName() != null && !req.getName().isBlank()) u.setName(req.getName().trim());
                        if (req.getMobile() != null) u.setMobile(req.getMobile().isBlank() ? null : req.getMobile());
                        userRepository.save(u);
                    }
                    return ApiResponse.success("Teacher updated", teacherRepository.save(teacher));
                })
                .orElse(ApiResponse.error("Teacher not found"));
    }

    public ApiResponse<String> deleteTeacher(Long id) {
        return teacherRepository.findById(id)
                .map(teacher -> {
                    User linkedUser = teacher.getUser();
                    teacherRepository.deleteById(id);
                    if (linkedUser != null) {
                        userRepository.deleteById(linkedUser.getId());
                    }
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
                    user.setTempPassword(newPassword);   // store plaintext so admin can re-display it
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

    public ApiResponse<ClassRoom> createClass(ClassRoom classRoom) {
        return ApiResponse.success("Class created", classRoomRepository.save(classRoom));
    }

    public ApiResponse<ClassRoom> updateClass(Long id, ClassRoom updated) {
        return classRoomRepository.findById(id)
                .map(c -> {
                    if (updated.getName() != null)        c.setName(updated.getName());
                    if (updated.getSection() != null)     c.setSection(updated.getSection());
                    if (updated.getTeacherId() != null)   c.setTeacherId(updated.getTeacherId());
                    if (updated.getTeacherName() != null) c.setTeacherName(updated.getTeacherName());
                    if (updated.getSubject() != null)     c.setSubject(updated.getSubject());
                    if (updated.getCapacity() != null)    c.setCapacity(updated.getCapacity());
                    if (updated.getRoomNumber() != null)  c.setRoomNumber(updated.getRoomNumber());
                    if (updated.getIsActive() != null)    c.setIsActive(updated.getIsActive());
                    return ApiResponse.success("Class updated", classRoomRepository.save(c));
                })
                .orElse(ApiResponse.error("Class not found"));
    }

    public ApiResponse<String> deleteClass(Long id) {
        if (!classRoomRepository.existsById(id)) return ApiResponse.error("Class not found");
        classRoomRepository.deleteById(id);
        return ApiResponse.success("Class deleted", "Deleted");
    }

    // ── Fees ───────────────────────────────────────────────────────────────

    public ApiResponse<List<Fee>> getFees() {
        return ApiResponse.success(feeRepository.findAll());
    }

    public ApiResponse<Fee> createFee(Fee fee) {
        return ApiResponse.success("Fee record created", feeRepository.save(fee));
    }

    public ApiResponse<Fee> updateFee(Long id, Map<String, Object> body) {
        return feeRepository.findById(id)
                .map(fee -> {
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
        m.put("tempPassword", user.getTempPassword());
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
        List<User> parents = userRepository.findAll().stream()
                .filter(u -> u.getRole() == User.Role.PARENT)
                .toList();
        List<Map<String, Object>> result = parents.stream().map(u -> {
            ParentProfile profile = parentProfileRepository.findByUser(u).orElse(null);
            return parentToMap(u, profile);
        }).toList();
        return ApiResponse.success(result);
    }

    public ApiResponse<Map<String, Object>> createParent(Map<String, Object> body) {
        String name   = str(body, "name",   "").trim();
        String email  = str(body, "email",  "").trim().toLowerCase();
        String mobile = str(body, "mobile", null);

        if (name.isBlank())  return ApiResponse.error("Parent name is required");
        if (email.isBlank() || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
            return ApiResponse.error("Valid email is required");
        if (userRepository.existsByEmail(email))
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

            Map<String, Object> result = parentToMap(user, profile);
            result.put("generatedPassword", rawPassword);
            return ApiResponse.success("Parent created successfully", result);
        } catch (Exception e) {
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
                    if (name   != null && !name.isBlank()) user.setName(name.trim());
                    if (mobile != null) user.setMobile(mobile.isBlank() ? null : mobile);
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
                    user.setTempPassword(newPassword);
                    user.setFirstLogin(true);
                    userRepository.save(user);
                    return ApiResponse.success("Password reset successfully", newPassword);
                })
                .orElse(ApiResponse.error("Parent not found"));
    }

    // ── Auto-create class when student is added/updated ────────────────────

    private void ensureClassExists(String rawClassName, String section) {
        if (rawClassName == null || rawClassName.isBlank()) return;
        String trimmed = rawClassName.trim();
        // Normalize: purely numeric → "Class X"; special names kept as-is
        String normalized;
        if (trimmed.matches("\\d+")) {
            normalized = "Class " + trimmed;
        } else if (trimmed.toLowerCase().startsWith("class ")) {
            normalized = trimmed; // already has prefix
        } else {
            normalized = trimmed; // Nursery, LKG, UKG, etc.
        }
        String sec = (section != null && !section.isBlank()) ? section.trim() : "A";
        if (classRoomRepository.findByNameAndSection(normalized, sec).isPresent()) return;
        try {
            classRoomRepository.save(ClassRoom.builder()
                    .name(normalized)
                    .section(sec)
                    .capacity(40)
                    .isActive(true)
                    .build());
            log.info("[ensureClassExists] Auto-created: " + normalized + " - " + sec);
        } catch (Exception e) {
            log.warning("[ensureClassExists] Could not auto-create class: " + e.getMessage());
        }
    }

    // ── Helper ─────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }
}
