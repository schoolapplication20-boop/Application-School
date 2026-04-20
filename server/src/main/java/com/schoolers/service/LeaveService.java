package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.*;
import com.schoolers.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@Service
public class LeaveService {

    @Autowired private LeaveRequestRepository    leaveRepository;
    @Autowired private AppNotificationService    notificationService;
    @Autowired private UserRepository            userRepository;
    @Autowired private StudentRepository         studentRepository;
    @Autowired private TeacherRepository         teacherRepository;
    @Autowired private ClassRoomRepository       classRoomRepository;

    // ── Admin helpers ───────────────────────────────────────────────────────

    public ApiResponse<List<LeaveRequest>> getStudentLeaves(Long schoolId) {
        if (schoolId != null) {
            return ApiResponse.success(leaveRepository
                    .findByRequesterTypeAndSchoolIdOrderByCreatedAtDesc(
                            LeaveRequest.RequesterType.STUDENT, schoolId));
        }
        return ApiResponse.success(leaveRepository.findByRequesterType(LeaveRequest.RequesterType.STUDENT));
    }

    public ApiResponse<List<LeaveRequest>> getTeacherLeaves(Long schoolId) {
        if (schoolId != null) {
            return ApiResponse.success(leaveRepository
                    .findByRequesterTypeAndSchoolIdOrderByCreatedAtDesc(
                            LeaveRequest.RequesterType.TEACHER, schoolId));
        }
        return ApiResponse.success(leaveRepository.findByRequesterType(LeaveRequest.RequesterType.TEACHER));
    }

    public ApiResponse<List<LeaveRequest>> getLeavesByRequester(Long requesterId, String type) {
        LeaveRequest.RequesterType rt = "TEACHER".equalsIgnoreCase(type)
                ? LeaveRequest.RequesterType.TEACHER
                : LeaveRequest.RequesterType.STUDENT;

        // For teachers, requesterId from the frontend is the User entity ID.
        // But leave_requests.requester_id stores the Teacher entity ID.
        // Resolve the Teacher entity ID so the query finds the right records.
        if (rt == LeaveRequest.RequesterType.TEACHER) {
            Long teacherEntityId = teacherRepository.findByUserId(requesterId)
                    .map(Teacher::getId)
                    .orElse(requesterId); // fallback: try as-is in case IDs match
            return ApiResponse.success(
                    leaveRepository.findByRequesterIdAndRequesterType(teacherEntityId, rt));
        }

        return ApiResponse.success(leaveRepository.findByRequesterIdAndRequesterType(requesterId, rt));
    }

    // ── Student: submit leave ───────────────────────────────────────────────

    @Transactional
    public ApiResponse<LeaveRequest> submitStudentLeave(Map<String, Object> body, Authentication auth) {
        // 1. Resolve student from JWT
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ApiResponse.error("User not found");

        var studentOpt = studentRepository.findByStudentUserId(userOpt.get().getId());
        if (studentOpt.isEmpty()) return ApiResponse.error("Student profile not found");
        Student student = studentOpt.get();

        // 2. Validate required fields
        String fromDateStr = str(body, "fromDate", null);
        String toDateStr   = str(body, "toDate",   null);
        String reason      = str(body, "reason",   null);

        if (fromDateStr == null || fromDateStr.isBlank())
            return ApiResponse.error("From date is required");
        if (toDateStr == null || toDateStr.isBlank())
            return ApiResponse.error("To date is required");
        if (reason == null || reason.isBlank())
            return ApiResponse.error("Reason is required");

        LocalDate fromDate, toDate;
        try {
            fromDate = LocalDate.parse(fromDateStr);
            toDate   = LocalDate.parse(toDateStr);
        } catch (DateTimeParseException e) {
            return ApiResponse.error("Invalid date format. Use YYYY-MM-DD");
        }

        if (toDate.isBefore(fromDate))
            return ApiResponse.error("To Date cannot be before From Date");

        // 3. Build classSection string (e.g. "10-A" or "LKG")
        String classSection = student.getClassName() != null ? student.getClassName() : "";
        if (student.getSection() != null && !student.getSection().isBlank()) {
            classSection += "-" + student.getSection();
        }

        // 4. Persist
        LeaveRequest leave = LeaveRequest.builder()
                .requesterType(LeaveRequest.RequesterType.STUDENT)
                .requesterId(student.getId())
                .requesterName(student.getName())
                .classSection(classSection.isBlank() ? null : classSection)
                .leaveType(str(body, "leaveType", "Other"))
                .fromDate(fromDate)
                .toDate(toDate)
                .reason(reason.trim())
                .status(LeaveRequest.Status.PENDING)
                .schoolId(student.getSchoolId())
                .build();

        LeaveRequest saved = leaveRepository.save(leave);

        // 5. Notify the class teacher (if assigned)
        notifyClassTeacher(student, saved);

        return ApiResponse.success("Leave request submitted", saved);
    }

    // ── Student: own leave history ──────────────────────────────────────────

    public ApiResponse<List<LeaveRequest>> getMyStudentLeaves(Authentication auth) {
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ApiResponse.error("User not found");

        var studentOpt = studentRepository.findByStudentUserId(userOpt.get().getId());
        if (studentOpt.isEmpty()) return ApiResponse.error("Student profile not found");

        List<LeaveRequest> leaves = leaveRepository
                .findByRequesterIdAndRequesterTypeOrderByCreatedAtDesc(
                        studentOpt.get().getId(), LeaveRequest.RequesterType.STUDENT);
        return ApiResponse.success(leaves);
    }

    // ── Teacher: class student leaves ───────────────────────────────────────

    public ApiResponse<List<LeaveRequest>> getClassStudentLeaves(Authentication auth) {
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ApiResponse.error("User not found");

        var teacherOpt = teacherRepository.findByUserId(userOpt.get().getId());
        if (teacherOpt.isEmpty()) return ApiResponse.error("Teacher profile not found");

        Teacher teacher = teacherOpt.get();

        // Resolve the classroom where this teacher is the class teacher.
        // Prefer the classroom's own teacherId field (authoritative); fall back to primaryClassId.
        ClassRoom classroom = resolveClassTeacherRoom(teacher);
        if (classroom == null) {
            return ApiResponse.success(List.of());
        }

        String classSection = classroom.getName()
                + (classroom.getSection() != null && !classroom.getSection().isBlank()
                        ? "-" + classroom.getSection() : "");

        List<LeaveRequest> leaves = leaveRepository
                .findByClassSectionAndRequesterTypeOrderByCreatedAtDesc(
                        classSection, LeaveRequest.RequesterType.STUDENT);
        return ApiResponse.success(leaves);
    }

    // ── Teacher: approve / reject ───────────────────────────────────────────

    @Transactional
    public ApiResponse<LeaveRequest> teacherAction(Long id, Map<String, Object> body, Authentication auth) {
        // 1. Resolve teacher
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ApiResponse.error("User not found");

        var teacherOpt = teacherRepository.findByUserId(userOpt.get().getId());
        if (teacherOpt.isEmpty()) return ApiResponse.error("Teacher profile not found");
        Teacher teacher = teacherOpt.get();

        // 2. Find leave request
        LeaveRequest leave = leaveRepository.findById(id).orElse(null);
        if (leave == null) return ApiResponse.error("Leave request not found");
        if (leave.getRequesterType() != LeaveRequest.RequesterType.STUDENT)
            return ApiResponse.error("Only student leave requests can be acted on here");

        // 3. Verify teacher is the class teacher for the leave's classSection
        ClassRoom assignedRoom = resolveClassTeacherRoom(teacher);
        if (assignedRoom == null) {
            return ApiResponse.error("You are not assigned as a class teacher for any class");
        }
        String expectedSection = assignedRoom.getName()
                + (assignedRoom.getSection() != null && !assignedRoom.getSection().isBlank()
                        ? "-" + assignedRoom.getSection() : "");
        if (leave.getClassSection() == null
                || !leave.getClassSection().equalsIgnoreCase(expectedSection)) {
            return ApiResponse.error("You are not the class teacher for this student's class");
        }

        // 4. Prevent re-processing already decided requests
        if (leave.getStatus() != LeaveRequest.Status.PENDING) {
            return ApiResponse.error("This leave request has already been "
                    + leave.getStatus().name().toLowerCase()
                    + " and cannot be changed");
        }

        // 5. Parse and validate the new status
        String statusStr = str(body, "status", null);
        if (statusStr == null || statusStr.isBlank())
            return ApiResponse.error("Status is required (APPROVED or REJECTED)");

        LeaveRequest.Status newStatus;
        try {
            newStatus = LeaveRequest.Status.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ApiResponse.error("Invalid status. Use APPROVED or REJECTED");
        }
        if (newStatus == LeaveRequest.Status.PENDING)
            return ApiResponse.error("Cannot set status back to Pending");

        // 6. Update record
        String teacherName = teacher.getName() != null
                ? teacher.getName()
                : userOpt.get().getName();
        String remark = str(body, "teacherRemark", null);

        leave.setStatus(newStatus);
        leave.setTeacherRemark(remark != null && !remark.isBlank() ? remark.trim() : null);
        leave.setReviewedBy(teacherName);
        leave.setReviewedAt(LocalDateTime.now());
        LeaveRequest saved = leaveRepository.save(leave);

        // 7. Notify the student
        var studentOpt = studentRepository.findById(saved.getRequesterId());
        if (studentOpt.isPresent()) {
            Long studentUserId = studentOpt.get().getStudentUserId();
            if (studentUserId != null) {
                boolean approved = newStatus == LeaveRequest.Status.APPROVED;
                String msg = "Your leave request ("
                        + saved.getFromDate() + " → " + saved.getToDate()
                        + ") has been " + (approved ? "approved" : "rejected")
                        + " by " + teacherName + "."
                        + (remark != null && !remark.isBlank() ? " Remark: " + remark : "");
                notificationService.create(
                        studentUserId, msg,
                        approved ? "check_circle" : "cancel",
                        approved ? "#76C442"      : "#e53e3e",
                        "leave_decision", saved.getId());
            }
        }

        return ApiResponse.success(
                "Leave request " + newStatus.name().toLowerCase() + " successfully", saved);
    }

    // ── Legacy: generic create (teacher / parent self-leave) ───────────────

    public ApiResponse<LeaveRequest> createLeave(Map<String, Object> body, Authentication auth) {
        String fromDateStr      = str(body, "fromDate", null);
        String toDateStr        = str(body, "toDate",   null);
        String requesterTypeStr = str(body, "requesterType", "TEACHER");

        if (fromDateStr == null || toDateStr == null)
            return ApiResponse.error("From date and To date are required");

        LocalDate fromDate, toDate;
        try {
            fromDate = LocalDate.parse(fromDateStr);
            toDate   = LocalDate.parse(toDateStr);
        } catch (DateTimeParseException e) {
            return ApiResponse.error("Invalid date format. Use YYYY-MM-DD");
        }

        // Resolve schoolId from JWT so the record is always school-scoped
        Long schoolId = null;
        Long resolvedRequesterId = longVal(body, "requesterId", null);
        if (auth != null) {
            var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
            if (userOpt.isPresent()) {
                schoolId = userOpt.get().getSchoolId();
                // For teacher leaves, override requesterId with the teacher's own id
                if ("TEACHER".equalsIgnoreCase(requesterTypeStr)) {
                    teacherRepository.findByUserId(userOpt.get().getId())
                            .ifPresent(t -> body.put("requesterId", t.getId()));
                    resolvedRequesterId = longVal(body, "requesterId", resolvedRequesterId);
                }
            }
        }

        String requesterName = str(body, "requesterName", "Unknown");
        String leaveType     = str(body, "leaveType", null);

        LeaveRequest leave = LeaveRequest.builder()
                .requesterType(LeaveRequest.RequesterType.valueOf(requesterTypeStr.toUpperCase()))
                .requesterId(resolvedRequesterId)
                .requesterName(requesterName)
                .classSection(str(body, "classSection", null))
                .leaveType(leaveType)
                .fromDate(fromDate)
                .toDate(toDate)
                .reason(str(body, "reason", null))
                .status(LeaveRequest.Status.PENDING)
                .schoolId(schoolId)
                .build();

        LeaveRequest saved = leaveRepository.save(leave);

        // Notify only the admins of the same school (or all admins for SUPER_ADMIN users)
        String msg = "New leave request from " + requesterName
                + (leaveType != null ? " (" + leaveType + ")" : "")
                + ": " + fromDateStr + " → " + toDateStr;
        final Long finalSchoolId = schoolId;
        Stream.concat(
                userRepository.findByRole(User.Role.ADMIN).stream(),
                userRepository.findByRole(User.Role.SUPER_ADMIN).stream()
        ).filter(admin -> finalSchoolId == null
                      || admin.getSchoolId() == null
                      || finalSchoolId.equals(admin.getSchoolId()))
        .forEach(admin ->
                notificationService.create(admin.getId(), msg,
                        "event_busy", "#805ad5", "teacher_leave", saved.getId())
        );

        return ApiResponse.success("Leave request submitted", saved);
    }

    // ── Admin: status update ────────────────────────────────────────────────

    public ApiResponse<LeaveRequest> updateStatus(Long id, Map<String, Object> body, Long schoolId) {
        return leaveRepository.findById(id)
                .map(leave -> {
                    // Student leaves are approved/rejected only by the class teacher
                    if (leave.getRequesterType() == LeaveRequest.RequesterType.STUDENT)
                        return ApiResponse.<LeaveRequest>error("Student leave requests can only be approved or rejected by the class teacher");
                    if (schoolId != null && leave.getSchoolId() != null
                            && !schoolId.equals(leave.getSchoolId()))
                        return ApiResponse.<LeaveRequest>error("Access denied: leave request belongs to another school");
                    String statusStr    = str(body, "status",       null);
                    String adminComment = str(body, "adminComment", leave.getAdminComment());
                    String reviewedBy   = str(body, "reviewedBy",   leave.getReviewedBy());

                    LeaveRequest.Status newStatus = leave.getStatus();
                    if (statusStr != null) {
                        try { newStatus = LeaveRequest.Status.valueOf(statusStr.toUpperCase()); }
                        catch (IllegalArgumentException ignored) {}
                    }

                    leave.setStatus(newStatus);
                    leave.setAdminComment(adminComment);
                    leave.setReviewedBy(reviewedBy);
                    leave.setReviewedAt(LocalDateTime.now());
                    LeaveRequest saved = leaveRepository.save(leave);

                    // Notify teacher if it's a teacher leave
                    if (saved.getRequesterId() != null
                            && saved.getRequesterType() == LeaveRequest.RequesterType.TEACHER) {
                        boolean approved = newStatus == LeaveRequest.Status.APPROVED;
                        String msg = "Your leave request ("
                                + saved.getFromDate() + " → " + saved.getToDate()
                                + ") has been " + (approved ? "approved" : "rejected") + " by Admin."
                                + (adminComment != null && !adminComment.isBlank()
                                        ? " Remark: " + adminComment : "");
                        // saved.getRequesterId() is the Teacher entity ID.
                        // Notifications are fetched by User entity ID, so resolve it.
                        Long notifyUserId = teacherRepository.findById(saved.getRequesterId())
                                .map(t -> t.getUser() != null ? t.getUser().getId() : null)
                                .orElse(null);
                        if (notifyUserId == null) notifyUserId = saved.getRequesterId(); // fallback
                        notificationService.create(
                                notifyUserId, msg,
                                approved ? "check_circle" : "cancel",
                                approved ? "#76C442"      : "#e53e3e",
                                "leave_decision", saved.getId());
                    }
                    return ApiResponse.success("Leave status updated", saved);
                })
                .orElse(ApiResponse.error("Leave request not found"));
    }

    public ApiResponse<String> delete(Long id, Long schoolId) {
        LeaveRequest leave = leaveRepository.findById(id).orElse(null);
        if (leave == null) return ApiResponse.error("Leave request not found");
        // SUPER_ADMIN must not delete student leaves (no cross-school access)
        if (schoolId == null && leave.getRequesterType() == LeaveRequest.RequesterType.STUDENT)
            return ApiResponse.error("Access denied: student leave requests belong to the school only");
        if (schoolId != null && leave.getSchoolId() != null && !schoolId.equals(leave.getSchoolId()))
            return ApiResponse.error("Access denied: leave request belongs to another school");
        leaveRepository.deleteById(id);
        return ApiResponse.success("Leave request deleted", "Deleted");
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    /**
     * Returns the classroom for which this teacher is the class teacher.
     * Uses classroom.teacherId as the authoritative source; falls back to
     * teacher.primaryClassId if the classroom lookup yields nothing.
     */
    private ClassRoom resolveClassTeacherRoom(Teacher teacher) {
        // Primary: find classrooms that have this teacher set as their class teacher
        List<ClassRoom> byTeacherId = teacher.getSchoolId() != null
                ? classRoomRepository.findBySchoolIdAndTeacherId(teacher.getSchoolId(), teacher.getId())
                : classRoomRepository.findByTeacherId(teacher.getId());

        if (!byTeacherId.isEmpty()) {
            return byTeacherId.get(0);
        }

        // Fallback: use primaryClassId stored on the teacher record
        if (teacher.getPrimaryClassId() != null) {
            return classRoomRepository.findById(teacher.getPrimaryClassId()).orElse(null);
        }

        return null;
    }

    /** Notify the class teacher of the student's school when a leave is submitted. */
    private void notifyClassTeacher(Student student, LeaveRequest leave) {
        try {
            // Find the classroom matching the student's class+section in their school
            List<ClassRoom> classrooms = student.getSchoolId() != null
                    ? classRoomRepository.findBySchoolId(student.getSchoolId())
                    : classRoomRepository.findAll();

            classrooms.stream()
                    .filter(cr -> cr.getName() != null
                            && cr.getName().equalsIgnoreCase(student.getClassName())
                            && (student.getSection() == null
                                || student.getSection().isBlank()
                                || student.getSection().equalsIgnoreCase(cr.getSection()))
                            && cr.getTeacherId() != null)
                    .findFirst()
                    .ifPresent(cr -> teacherRepository.findById(cr.getTeacherId()).ifPresent(teacher -> {
                        // Resolve the teacher's user ID directly via the OneToOne association
                        User teacherUser = teacher.getUser();
                        if (teacherUser == null && teacher.getId() != null) {
                            // Fallback: search by teacher entity id as user id
                            teacherUser = userRepository.findById(teacher.getId()).orElse(null);
                        }
                        if (teacherUser != null) {
                            String msg = "New leave request from "
                                    + leave.getRequesterName()
                                    + " (" + leave.getFromDate()
                                    + " → " + leave.getToDate() + ")."
                                    + " Reason: " + leave.getReason();
                            notificationService.create(
                                    teacherUser.getId(), msg,
                                    "event_busy", "#ed8936",
                                    "student_leave", leave.getId());
                        }
                    }));
        } catch (Exception ignored) {
            // Non-critical — don't fail the leave submission if notification fails
        }
    }

    private String str(Map<String, Object> map, String key, String fallback) {
        Object v = map.get(key);
        return v instanceof String ? (String) v : fallback;
    }

    private Long longVal(Map<String, Object> map, String key, Long fallback) {
        Object v = map.get(key);
        if (v == null) return fallback;
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return fallback; }
    }
}
