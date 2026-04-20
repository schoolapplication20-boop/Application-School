package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
public class TeacherService {

    @Autowired
    private ClassRoomRepository classRoomRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private MarksRepository marksRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private TeacherRepository teacherRepository;

    @Autowired
    private UserRepository userRepository;

    // ── Classes ────────────────────────────────────────────────────────────────

    public ApiResponse<List<ClassRoom>> getTeacherClasses(Long teacherId) {
        if (teacherId == null) return ApiResponse.success(new ArrayList<>());

        List<ClassRoom> linked = new ArrayList<>();

        Teacher teacher = teacherRepository.findById(teacherId).orElse(null);
        if (teacher == null) return ApiResponse.success(linked);

        Long schoolId = teacher.getSchoolId();

        // 1. Primary class (class teacher role) — direct ID lookup; most reliable
        if (teacher.getPrimaryClassId() != null) {
            classRoomRepository.findById(teacher.getPrimaryClassId())
                .ifPresent(cls -> addIfAbsent(linked, cls));
        }

        // 2. Classrooms where classroom.teacher_id = this teacher (set by AdminService on assignment)
        classRoomRepository.findByTeacherId(teacherId)
            .forEach(cls -> addIfAbsent(linked, cls));

        // 3. Classrooms from the teacher's `classes` text field (subject-teacher assignments).
        //    Possible formats written by the admin:
        //      • "9-A, 10-B"          — plain number dash section (text input placeholder)
        //      • "Class 9 - A"        — full name with space-dash-space (Assign Classes modal)
        //      • "9 - A"              — number space-dash-space section
        //    Classrooms are always stored in DB as "Class N" (normalized by resolveClassName).
        //    So we must normalize the raw name before lookup.
        if (teacher.getClasses() != null && !teacher.getClasses().isBlank()) {
            // Get all classrooms for this school once (avoids N+1 queries)
            List<ClassRoom> schoolRooms = (schoolId != null)
                ? classRoomRepository.findBySchoolId(schoolId)
                : classRoomRepository.findAll();

            for (String entry : teacher.getClasses().split(",")) {
                String trimmed = entry.trim();
                if (trimmed.isEmpty()) continue;

                // Split on first " - " or "-" to separate name from section
                String[] parts = trimmed.split("\\s*-\\s*", 2);
                String rawName = parts[0].trim();
                String section = parts.length == 2 ? parts[1].trim().toUpperCase() : null;

                // Normalize: "9" → "Class 9", "class 9" → "Class 9", "Class 9" → "Class 9"
                String normalizedName = normalizeForLookup(rawName);

                schoolRooms.stream()
                    .filter(cls -> {
                        boolean nameMatch = cls.getName().equalsIgnoreCase(normalizedName)
                                        || cls.getName().equalsIgnoreCase(rawName);
                        if (!nameMatch) return false;
                        if (section == null) return true;
                        return section.equalsIgnoreCase(cls.getSection());
                    })
                    .forEach(cls -> addIfAbsent(linked, cls));
            }
        }

        return ApiResponse.success(linked);
    }

    /** Mirror of AdminService.resolveClassName — normalizes "9" → "Class 9". */
    private String normalizeForLookup(String raw) {
        if (raw == null || raw.isBlank()) return raw;
        String t = raw.trim();
        if (t.matches("\\d+")) return "Class " + t;                        // "9"      → "Class 9"
        if (t.toLowerCase().startsWith("class ") && t.length() > 6)
            return "Class " + t.substring(6).trim();                        // "class 9" → "Class 9"
        // Title-case words (e.g. "class nine" → not handled, left as-is)
        return t;
    }

    private void addIfAbsent(List<ClassRoom> list, ClassRoom cls) {
        if (list.stream().noneMatch(c -> c.getId().equals(cls.getId()))) {
            list.add(cls);
        }
    }

    public ApiResponse<Map<String, Object>> getTeacherProfile(Long teacherId) {
        return teacherRepository.findById(teacherId)
                .map(teacher -> {
                    Map<String, Object> profile = new LinkedHashMap<>();
                    profile.put("id", teacher.getId());
                    profile.put("name", teacher.getName());
                    profile.put("employeeId", teacher.getEmployeeId());
                    String subjectStr = teacher.getSubject() != null ? teacher.getSubject() : "";
                    profile.put("subject", subjectStr);
                    profile.put("subjects", java.util.Arrays.stream(subjectStr.split(","))
                            .map(String::trim).filter(s -> !s.isEmpty()).collect(java.util.stream.Collectors.toList()));
                    profile.put("department", teacher.getDepartment());
                    profile.put("classes", teacher.getClasses());
                    profile.put("teacherType", teacher.getTeacherType());
                    profile.put("primaryClassId", teacher.getPrimaryClassId());
                    profile.put("qualification", teacher.getQualification());
                    profile.put("experience", teacher.getExperience());
                    profile.put("joiningDate", teacher.getJoiningDate());
                    profile.put("isActive", teacher.getIsActive());
                    profile.put("assignedClasses", classRoomRepository.findByTeacherId(teacherId));
                    if (teacher.getPrimaryClassId() != null) {
                        classRoomRepository.findById(teacher.getPrimaryClassId())
                                .ifPresent(classRoom -> profile.put("primaryClass", classRoom));
                    }
                    return ApiResponse.success(profile);
                })
                .orElse(ApiResponse.error("Teacher not found"));
    }

    // ── Students in a class ───────────────────────────────────────────────────

    public ApiResponse<List<Student>> getClassStudents(Long classId) {
        return classRoomRepository.findById(classId)
                .map(cls -> {
                    String name    = cls.getName();
                    String section = normalizeSection(cls.getSection());
                    // Combined format covers students stored as "LKG-B" (className) with section=null
                    String combined = name + "-" + section;

                    List<Student> students = cls.getSchoolId() != null
                            ? studentRepository.findBySchoolIdAndClassFlexible(cls.getSchoolId(), combined, name, section)
                            : studentRepository.findByClassFlexible(combined, name, section);

                    students.sort(Comparator.comparing(Student::getName));
                    return ApiResponse.success(students);
                })
                .orElse(ApiResponse.error("Class not found"));
    }

    public ApiResponse<List<Student>> getClassStudents(Long teacherId, Long classId) {
        ApiResponse<ClassRoom> access = validateClassTeacherAccess(teacherId, classId, true);
        if (!access.isSuccess()) return ApiResponse.error(access.getMessage());
        return getClassStudents(classId);
    }

    @Transactional
    public ApiResponse<Student> createStudentForClass(Long teacherId, Long classId, Map<String, Object> body) {
        ApiResponse<ClassRoom> access = validateClassTeacherAccess(teacherId, classId, true);
        if (!access.isSuccess()) return ApiResponse.error(access.getMessage());

        ClassRoom classRoom = access.getData();
        String name = str(body, "name", null);
        String rollNumber = str(body, "rollNumber", str(body, "rollNo", null));
        if (name == null || name.isBlank()) return ApiResponse.error("Student name is required");
        if (rollNumber == null || rollNumber.isBlank()) return ApiResponse.error("Roll number is required");

        String section = normalizeSection(classRoom.getSection());
        if (studentRepository.findDuplicateInClass(rollNumber.trim(), classRoom.getName(), section).isPresent()) {
            return ApiResponse.error("Roll number " + rollNumber.trim() + " already exists in " + classRoom.getName() + " - " + section);
        }

        Student student = Student.builder()
                .name(name.trim())
                .rollNumber(rollNumber.trim())
                .className(classRoom.getName())
                .section(section)
                .parentId(resolveParentUserId(str(body, "parentMobile", str(body, "mobile", null))))
                .parentName(str(body, "parentName", str(body, "parent", null)))
                .parentMobile(str(body, "parentMobile", str(body, "mobile", null)))
                .motherName(str(body, "motherName", null))
                .motherMobile(str(body, "motherMobile", null))
                .guardianName(str(body, "guardianName", null))
                .guardianMobile(str(body, "guardianMobile", null))
                .bloodGroup(str(body, "bloodGroup", null))
                .address(str(body, "address", null))
                .alternateAddress(str(body, "alternateAddress", null))
                .dateOfBirth(parseDate(str(body, "dateOfBirth", str(body, "dob", null))))
                .isActive(!"Inactive".equalsIgnoreCase(str(body, "status", "Active")))
                .build();

        return ApiResponse.success("Student created successfully", studentRepository.save(student));
    }

    @Transactional
    public ApiResponse<Student> updateStudentForClass(Long teacherId, Long classId, Long studentId, Map<String, Object> body) {
        ApiResponse<ClassRoom> access = validateClassTeacherAccess(teacherId, classId, true);
        if (!access.isSuccess()) return ApiResponse.error(access.getMessage());

        ClassRoom classRoom = access.getData();
        return studentRepository.findById(studentId)
                .map(student -> {
                    if (!belongsToClass(student, classRoom)) {
                        return ApiResponse.<Student>error("Student does not belong to this class");
                    }

                    String targetRoll = body.containsKey("rollNumber") || body.containsKey("rollNo")
                            ? str(body, "rollNumber", str(body, "rollNo", student.getRollNumber())).trim()
                            : student.getRollNumber();
                    studentRepository.findDuplicateInClass(targetRoll, classRoom.getName(), normalizeSection(classRoom.getSection()))
                            .ifPresent(existing -> {
                                if (!existing.getId().equals(studentId)) {
                                    throw new IllegalArgumentException("Roll number " + targetRoll + " already exists in " + classRoom.getName() + " - " + normalizeSection(classRoom.getSection()));
                                }
                            });

                    if (body.containsKey("name")) student.setName(str(body, "name", student.getName()));
                    student.setRollNumber(targetRoll);
                    student.setClassName(classRoom.getName());
                    student.setSection(normalizeSection(classRoom.getSection()));
                    if (body.containsKey("parentName") || body.containsKey("parent")) {
                        student.setParentName(str(body, "parentName", str(body, "parent", student.getParentName())));
                    }
                    if (body.containsKey("parentMobile") || body.containsKey("mobile")) {
                        String parentMobile = str(body, "parentMobile", str(body, "mobile", student.getParentMobile()));
                        student.setParentMobile(parentMobile);
                        student.setParentId(resolveParentUserId(parentMobile));
                    }
                    if (body.containsKey("motherName")) student.setMotherName(str(body, "motherName", student.getMotherName()));
                    if (body.containsKey("motherMobile")) student.setMotherMobile(str(body, "motherMobile", student.getMotherMobile()));
                    if (body.containsKey("guardianName")) student.setGuardianName(str(body, "guardianName", student.getGuardianName()));
                    if (body.containsKey("guardianMobile")) student.setGuardianMobile(str(body, "guardianMobile", student.getGuardianMobile()));
                    if (body.containsKey("bloodGroup")) student.setBloodGroup(str(body, "bloodGroup", student.getBloodGroup()));
                    if (body.containsKey("address")) student.setAddress(str(body, "address", student.getAddress()));
                    if (body.containsKey("alternateAddress")) student.setAlternateAddress(str(body, "alternateAddress", student.getAlternateAddress()));
                    if (body.containsKey("dateOfBirth") || body.containsKey("dob")) {
                        student.setDateOfBirth(parseDate(str(body, "dateOfBirth", str(body, "dob", null))));
                    }
                    if (body.containsKey("status")) student.setIsActive(!"Inactive".equalsIgnoreCase(str(body, "status", "Active")));
                    return ApiResponse.success("Student updated", studentRepository.save(student));
                })
                .orElse(ApiResponse.error("Student not found"));
    }

    private Long resolveParentUserId(String mobile) {
        if (mobile == null || mobile.isBlank()) return null;
        return userRepository.findByMobile(mobile.trim())
                .filter(user -> user.getRole() == User.Role.PARENT)
                .map(User::getId)
                .orElse(null);
    }

    @Transactional
    public ApiResponse<String> deleteStudentForClass(Long teacherId, Long classId, Long studentId) {
        ApiResponse<ClassRoom> access = validateClassTeacherAccess(teacherId, classId, true);
        if (!access.isSuccess()) return ApiResponse.error(access.getMessage());

        ClassRoom classRoom = access.getData();
        return studentRepository.findById(studentId)
                .map(student -> {
                    if (!belongsToClass(student, classRoom)) {
                        return ApiResponse.<String>error("Student does not belong to this class");
                    }
                    studentRepository.deleteById(student.getId());
                    return ApiResponse.success("Student deleted", "Deleted");
                })
                .orElse(ApiResponse.error("Student not found"));
    }

    // ── Attendance ─────────────────────────────────────────────────────────────

    public ApiResponse<String> markAttendance(Long teacherId, List<Map<String, Object>> attendanceList, Long markedBy) {
        if (attendanceList == null || attendanceList.isEmpty()) {
            return ApiResponse.error("Attendance list cannot be empty");
        }

        Long classId = attendanceList.stream()
                .map(item -> item.get("classId"))
                .filter(Objects::nonNull)
                .map(v -> Long.valueOf(v.toString()))
                .findFirst()
                .orElse(null);
        if (classId == null) return ApiResponse.error("Class is required");

        ApiResponse<ClassRoom> access = validateClassTeacherAccess(teacherId, classId, true);
        if (!access.isSuccess()) return ApiResponse.error(access.getMessage());

        ClassRoom classRoom = access.getData();
        for (Map<String, Object> record : attendanceList) {
            if (record.get("studentId") == null) continue;
            Long studentId = Long.valueOf(record.get("studentId").toString());
            LocalDate date = LocalDate.parse(record.get("date").toString());

            String statusStr = record.get("status").toString().toUpperCase();
            Attendance.Status status;
            try {
                status = Attendance.Status.valueOf(statusStr);
            } catch (IllegalArgumentException e) {
                status = Attendance.Status.PRESENT;
            }

            Student student = studentRepository.findById(studentId).orElse(null);
            if (student == null || !belongsToClass(student, classRoom)) {
                return ApiResponse.error("One or more students do not belong to the selected class");
            }

            String className = classRoom.getName() + " - " + normalizeSection(classRoom.getSection());

            Attendance existing = attendanceRepository
                    .findByStudentIdAndClassIdAndDate(studentId, classId, date)
                    .orElse(null);

            if (existing != null) {
                existing.setStatus(status);
                attendanceRepository.save(existing);
            } else {
                Attendance attendance = Attendance.builder()
                        .studentId(studentId)
                        .classId(classId)
                        .className(className)
                        .date(date)
                        .status(status)
                        .markedBy(markedBy)
                        .build();
                attendanceRepository.save(attendance);
            }
        }
        return ApiResponse.success("Attendance marked successfully", "Saved");
    }

    public ApiResponse<List<Attendance>> getAttendanceByClassAndDate(Long classId, LocalDate date) {
        return ApiResponse.success(attendanceRepository.findByClassIdAndDate(classId, date));
    }

    public ApiResponse<List<Attendance>> getAttendanceByClassAndDate(Long teacherId, Long classId, LocalDate date) {
        ApiResponse<ClassRoom> access = validateClassTeacherAccess(teacherId, classId, true);
        if (!access.isSuccess()) return ApiResponse.error(access.getMessage());
        return getAttendanceByClassAndDate(classId, date);
    }

    /** Returns { present, absent, leave, others, total } counts for a class on a date */
    public ApiResponse<Map<String, Object>> getAttendanceSummary(Long classId, LocalDate date) {
        List<Object[]> rows = attendanceRepository.countByStatusForClassAndDate(classId, date);
        return ApiResponse.success(buildSummary(rows));
    }

    public ApiResponse<Map<String, Object>> getAttendanceSummary(Long teacherId, Long classId, LocalDate date) {
        ApiResponse<ClassRoom> access = validateClassTeacherAccess(teacherId, classId, false);
        if (!access.isSuccess()) return ApiResponse.error(access.getMessage());
        return getAttendanceSummary(classId, date);
    }

    /** Returns { present, absent, leave, others, total } counts for a class over a date range */
    public ApiResponse<Map<String, Object>> getAttendanceSummaryRange(Long classId, LocalDate start, LocalDate end) {
        List<Object[]> rows = attendanceRepository.countByStatusForClassAndDateRange(classId, start, end);
        return ApiResponse.success(buildSummary(rows));
    }

    public ApiResponse<Map<String, Object>> getAttendanceSummaryRange(Long teacherId, Long classId, LocalDate start, LocalDate end) {
        ApiResponse<ClassRoom> access = validateClassTeacherAccess(teacherId, classId, false);
        if (!access.isSuccess()) return ApiResponse.error(access.getMessage());
        return getAttendanceSummaryRange(classId, start, end);
    }

    /** Returns list of dates when attendance was marked for a class */
    public ApiResponse<List<LocalDate>> getAttendanceDates(Long classId) {
        return ApiResponse.success(attendanceRepository.findDistinctDatesByClassId(classId));
    }

    public ApiResponse<List<LocalDate>> getAttendanceDates(Long teacherId, Long classId) {
        ApiResponse<ClassRoom> access = validateClassTeacherAccess(teacherId, classId, false);
        if (!access.isSuccess()) return ApiResponse.error(access.getMessage());
        return getAttendanceDates(classId);
    }

    public ApiResponse<List<Map<String, Object>>> getAttendanceHistory(Long teacherId, Long classId) {
        ApiResponse<ClassRoom> access = validateClassTeacherAccess(teacherId, classId, false);
        if (!access.isSuccess()) return ApiResponse.error(access.getMessage());

        Map<LocalDate, Map<String, Object>> byDate = new LinkedHashMap<>();
        for (Object[] row : attendanceRepository.countByDateAndStatusForClass(classId)) {
            LocalDate date = (LocalDate) row[0];
            String status = row[1].toString();
            long count = ((Number) row[2]).longValue();

            Map<String, Object> summary = byDate.computeIfAbsent(date, key -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("date", key);
                item.put("present", 0L);
                item.put("absent", 0L);
                item.put("leave", 0L);
                item.put("others", 0L);
                item.put("total", 0L);
                return item;
            });

            switch (status) {
                case "PRESENT" -> summary.put("present", count);
                case "ABSENT" -> summary.put("absent", count);
                case "LEAVE" -> summary.put("leave", count);
                case "OTHERS" -> summary.put("others", count);
                default -> { }
            }
        }

        byDate.values().forEach(item -> {
            long present = ((Number) item.get("present")).longValue();
            long absent = ((Number) item.get("absent")).longValue();
            long leave = ((Number) item.get("leave")).longValue();
            long others = ((Number) item.get("others")).longValue();
            item.put("total", present + absent + leave + others);
        });

        return ApiResponse.success(new ArrayList<>(byDate.values()));
    }

    private Map<String, Object> buildSummary(List<Object[]> rows) {
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
        summary.put("present", present);
        summary.put("absent",  absent);
        summary.put("leave",   leave);
        summary.put("others",  others);
        summary.put("total",   present + absent + leave + others);
        return summary;
    }

    private ApiResponse<ClassRoom> validateClassTeacherAccess(Long teacherId, Long classId, boolean requireClassTeacher) {
        if (teacherId == null) return ApiResponse.error("Teacher not found");
        Teacher teacher = teacherRepository.findById(teacherId).orElse(null);
        if (teacher == null) return ApiResponse.error("Teacher not found");
        ClassRoom classRoom = classRoomRepository.findById(classId).orElse(null);
        if (classRoom == null) return ApiResponse.error("Class not found");

        // A teacher has class access if EITHER:
        //   (a) teacher.primaryClassId == classId  (set during teacher creation)
        //   (b) classroom.teacherId == teacher.id  (set during class management or via syncPrimaryClassAssignment)
        boolean isPrimaryClass       = teacher.getPrimaryClassId() != null && teacher.getPrimaryClassId().equals(classId);
        boolean isAssignedViaClass   = teacherId.equals(classRoom.getTeacherId());
        boolean hasClassAccess       = isPrimaryClass || isAssignedViaClass;

        if (!hasClassAccess) {
            return ApiResponse.error("You are not the class teacher for this class");
        }

        if (requireClassTeacher) {
            boolean isClassTeacherType = "CLASS_TEACHER".equalsIgnoreCase(teacher.getTeacherType())
                    || "BOTH".equalsIgnoreCase(teacher.getTeacherType());
            // If the classroom explicitly names this teacher, treat them as class teacher
            // regardless of the teacherType field (handles cases where type was not set correctly)
            if (!isClassTeacherType && !isAssignedViaClass) {
                return ApiResponse.error("Only class teachers can manage attendance");
            }
        }

        return ApiResponse.success(classRoom);
    }

    private boolean belongsToClass(Student student, ClassRoom classRoom) {
        if (student.getClassName() == null) return false;

        String clsName    = classRoom.getName();
        String clsSection = normalizeSection(classRoom.getSection()); // "B" or "A" (never null)

        // Match combined format: student.className = "LKG-B", classroom.name = "LKG", section = "B"
        String combined = clsName + "-" + clsSection;
        if (student.getClassName().equalsIgnoreCase(combined)) return true;

        // Match separate format: student.className = "LKG", student.section = "B"
        if (!student.getClassName().equalsIgnoreCase(clsName)) return false;
        return normalizeSection(student.getSection()).equalsIgnoreCase(clsSection);
    }

    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }

    private String normalizeSection(String section) {
        return (section != null && !section.isBlank()) ? section.trim().toUpperCase() : "A";
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        String[] formats = {"yyyy-MM-dd", "dd MMM yyyy", "dd/MM/yyyy", "MM/dd/yyyy"};
        for (String fmt : formats) {
            try {
                return LocalDate.parse(dateStr, java.time.format.DateTimeFormatter.ofPattern(fmt));
            } catch (java.time.format.DateTimeParseException ignored) {
            }
        }
        return null;
    }

    // ── Assignments ────────────────────────────────────────────────────────────

    public ApiResponse<List<Assignment>> getTeacherAssignments(Long teacherId) {
        return ApiResponse.success(assignmentRepository.findByTeacherId(teacherId));
    }

    public ApiResponse<Assignment> createAssignment(Assignment assignment) {
        Assignment saved = assignmentRepository.save(assignment);
        return ApiResponse.success("Assignment created", saved);
    }

    public ApiResponse<Assignment> updateAssignment(Long id, Assignment updated) {
        return assignmentRepository.findById(id)
                .map(a -> {
                    a.setTitle(updated.getTitle());
                    a.setDescription(updated.getDescription());
                    a.setDueDate(updated.getDueDate());
                    a.setStatus(updated.getStatus());
                    return ApiResponse.success(assignmentRepository.save(a));
                })
                .orElse(ApiResponse.error("Assignment not found"));
    }

    public ApiResponse<String> deleteAssignment(Long id) {
        if (!assignmentRepository.existsById(id)) {
            return ApiResponse.error("Assignment not found");
        }
        assignmentRepository.deleteById(id);
        return ApiResponse.success("Assignment deleted", "Deleted");
    }

    // ── Marks ──────────────────────────────────────────────────────────────────

    public ApiResponse<List<Marks>> getMarksByStudent(Long studentId) {
        return ApiResponse.success(marksRepository.findByStudentId(studentId));
    }

    public ApiResponse<Marks> addMarks(Marks marks) {
        Marks saved = marksRepository.save(marks);
        return ApiResponse.success("Marks saved", saved);
    }

    public ApiResponse<Marks> updateMarks(Long id, Marks updated) {
        return marksRepository.findById(id)
                .map(m -> {
                    m.setMarks(updated.getMarks());
                    m.setMaxMarks(updated.getMaxMarks());
                    m.setGrade(updated.getGrade());
                    return ApiResponse.success(marksRepository.save(m));
                })
                .orElse(ApiResponse.error("Marks record not found"));
    }

    public ApiResponse<String> deleteMarks(Long id) {
        if (!marksRepository.existsById(id)) return ApiResponse.error("Marks record not found");
        marksRepository.deleteById(id);
        return ApiResponse.success("Marks deleted", "Deleted");
    }
}
