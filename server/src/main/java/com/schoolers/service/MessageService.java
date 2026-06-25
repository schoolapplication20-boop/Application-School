package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Message;
import com.schoolers.model.MessageRead;
import com.schoolers.model.Student;
import com.schoolers.model.Teacher;
import com.schoolers.model.User;
import com.schoolers.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MessageService {

    /** Cap on message lists returned by these endpoints, to avoid unbounded growth over time. */
    private static final int MAX_MESSAGE_RESULTS = 200;
    private static final Pageable MESSAGE_RESULTS_PAGE = PageRequest.of(0, MAX_MESSAGE_RESULTS);

    /** Push notification body is truncated to this length so it stays readable in a mobile notification banner. */
    private static final int PUSH_BODY_MAX_LENGTH = 120;

    @Autowired private MessageRepository messageRepository;
    @Autowired private MessageReadRepository messageReadRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private TeacherRepository teacherRepository;
    @Autowired private ExpoPushService expoPushService;

    // ── Existing 1-to-1 message methods ──────────────────────────────────────

    public ApiResponse<List<Message>> getMessagesForUser(Long userId, Long schoolId) {
        if (schoolId != null) {
            return ApiResponse.success(messageRepository.findAllByUserIdAndSchoolId(userId, schoolId, MESSAGE_RESULTS_PAGE));
        }
        return ApiResponse.success(messageRepository.findAllByUserId(userId, MESSAGE_RESULTS_PAGE));
    }

    public ApiResponse<List<Message>> getConversation(Long u1, Long u2, Long schoolId) {
        // Fetch the most recent messages (newest first) and reverse to chronological order
        List<Message> recent = (schoolId != null)
                ? messageRepository.findConversationDescBySchoolId(u1, u2, schoolId, MESSAGE_RESULTS_PAGE)
                : messageRepository.findConversationDesc(u1, u2, MESSAGE_RESULTS_PAGE);
        Collections.reverse(recent);
        return ApiResponse.success(recent);
    }

    public ApiResponse<Message> sendMessage(Map<String, Object> body, Authentication auth) {
        User sender = resolveUser(auth);
        if (sender == null) return ApiResponse.error("Unauthorized");

        Long receiverId = longVal(body, "receiverId", null);
        String content = str(body, "content", null);
        if (receiverId == null) return ApiResponse.error("Receiver ID is required");
        if (content == null || content.isBlank()) return ApiResponse.error("Message content is required");
        if (content.length() > 5000) return ApiResponse.error("Message content cannot exceed 5000 characters");

        User receiver = userRepository.findById(receiverId).orElse(null);
        if (receiver == null) return ApiResponse.error("Recipient not found");

        // Cross-tenant messaging is only allowed for the platform-level APPLICATION_OWNER (no schoolId)
        boolean senderIsPlatformOwner = sender.getRole() == User.Role.APPLICATION_OWNER;
        boolean receiverIsPlatformOwner = receiver.getRole() == User.Role.APPLICATION_OWNER;
        if (!senderIsPlatformOwner && !receiverIsPlatformOwner
                && (sender.getSchoolId() == null || !sender.getSchoolId().equals(receiver.getSchoolId()))) {
            return ApiResponse.error("Recipient not found");
        }

        Message msg = Message.builder()
                .senderId(sender.getId())
                .senderName(sender.getName())
                .senderRole(sender.getRole().name())
                .receiverId(receiver.getId())
                .receiverName(receiver.getName())
                .receiverRole(receiver.getRole().name())
                .content(content)
                .build();
        Message saved = messageRepository.save(msg);
        return ApiResponse.success("Message sent", saved);
    }

    public Optional<Message> findById(Long id) {
        return messageRepository.findById(id);
    }

    public ApiResponse<String> markAsRead(Long id) {
        return messageRepository.findById(id)
                .map(msg -> {
                    msg.setIsRead(true);
                    messageRepository.save(msg);
                    return ApiResponse.success("Message marked as read", "Updated");
                })
                .orElse(ApiResponse.error("Message not found"));
    }

    public ApiResponse<Long> getUnreadCount(Long userId) {
        return ApiResponse.success(messageRepository.countByReceiverIdAndIsReadFalse(userId));
    }

    // ── Broadcast / student-inbox methods ────────────────────────────────────

    /** GET /api/messages/student/inbox — returns messages visible to the authenticated student */
    public ApiResponse<List<Map<String, Object>>> getStudentInbox(Authentication auth) {
        User user = resolveUser(auth);
        if (user == null) return ApiResponse.error("Unauthorized");

        Optional<Student> studentOpt = studentRepository.findByStudentUserId(user.getId());
        if (studentOpt.isEmpty()) return ApiResponse.error("Student profile not found");
        Student student = studentOpt.get();

        if (student.getSchoolId() == null) return ApiResponse.error("Student has no school assigned");

        String classSection = buildClassSection(student.getClassName(), student.getSection());
        List<Message> messages = messageRepository.findForStudent(
                student.getSchoolId(), classSection, student.getId(), MESSAGE_RESULTS_PAGE);

        List<Map<String, Object>> result = messages.stream()
                .map(m -> toStudentDto(m, user.getId()))
                .collect(Collectors.toList());

        return ApiResponse.success(result);
    }

    /** GET /api/messages/student/unread-count */
    public ApiResponse<Long> getStudentUnreadCount(Authentication auth) {
        User user = resolveUser(auth);
        if (user == null) return ApiResponse.error("Unauthorized");

        Optional<Student> studentOpt = studentRepository.findByStudentUserId(user.getId());
        if (studentOpt.isEmpty()) return ApiResponse.success(0L);
        Student student = studentOpt.get();
        if (student.getSchoolId() == null) return ApiResponse.success(0L);

        String classSection = buildClassSection(student.getClassName(), student.getSection());
        List<Message> messages = messageRepository.findForStudent(
                student.getSchoolId(), classSection, student.getId(), MESSAGE_RESULTS_PAGE);

        long unread = messages.stream()
                .filter(m -> !isReadByUser(m, user.getId()))
                .count();
        return ApiResponse.success(unread);
    }

    /** PATCH /api/messages/student/{id}/read — mark a broadcast message as read by this student */
    public ApiResponse<String> markReadForStudent(Long messageId, Authentication auth) {
        User user = resolveUser(auth);
        if (user == null) return ApiResponse.error("Unauthorized");

        Optional<Student> studentOpt = studentRepository.findByStudentUserId(user.getId());
        if (studentOpt.isEmpty()) return ApiResponse.error("Student profile not found");
        Student student = studentOpt.get();

        return messageRepository.findById(messageId).map(msg -> {
            // Verify the message belongs to the student's school before mutating
            if (msg.getSchoolId() != null && !msg.getSchoolId().equals(student.getSchoolId())) {
                return ApiResponse.<String>error("Message not found");
            }
            // Write to message_reads table (new path)
            if (!messageReadRepository.existsByMessageIdAndUserId(msg.getId(), user.getId())) {
                MessageRead mr = new MessageRead();
                mr.setMessageId(msg.getId());
                mr.setUserId(user.getId());
                messageReadRepository.save(mr);
            }
            // Keep the legacy comma-string updated so existing clients continue to work
            if (!isReadByUser(msg, user.getId())) {
                String existing = msg.getReadByUserIds();
                String updated = (existing == null || existing.isBlank())
                        ? String.valueOf(user.getId())
                        : existing + "," + user.getId();
                msg.setReadByUserIds(updated);
                messageRepository.save(msg);
            }
            return ApiResponse.success("Marked as read", "Updated");
        }).orElse(ApiResponse.error("Message not found"));
    }

    /** POST /api/messages/broadcast — send a broadcast message to a class or whole school */
    public ApiResponse<Message> sendBroadcast(Map<String, Object> body, Authentication auth) {
        User sender = resolveUser(auth);
        if (sender == null) return ApiResponse.error("Unauthorized");

        String content = str(body, "content", null);
        if (content == null || content.isBlank()) return ApiResponse.error("Content is required");
        if (content.length() > 5000) return ApiResponse.error("Message content cannot exceed 5000 characters");

        String title = str(body, "title", "Message");
        String category = str(body, "category", "GENERAL");
        Boolean isSchoolWide = boolVal(body, "isSchoolWide", false);
        Boolean isImportant = boolVal(body, "isImportant", false);
        String classSection = str(body, "classSection", null);
        Long targetStudentId = longVal(body, "targetStudentId", null);

        Long schoolId = sender.getSchoolId();
        if (schoolId == null) {
            // APPLICATION_OWNER has no school affiliation — they must explicitly supply a target schoolId.
            // We accept the value from the request body but REQUIRE it to be non-null; the caller bears
            // responsibility for ensuring the target school is valid (the student/school checks below
            // enforce data integrity).  We do NOT silently fall back — an absent schoolId is rejected.
            Long requestedSchoolId = longVal(body, "schoolId", null);
            if (requestedSchoolId == null) {
                throw new AccessDeniedException(
                        "App owner must select a target school explicitly");
            }
            schoolId = requestedSchoolId;
        }
        if (schoolId == null) return ApiResponse.error("School context is required");

        // Verify target student belongs to the same school
        if (targetStudentId != null) {
            Student targetStudent = studentRepository.findById(targetStudentId).orElse(null);
            if (targetStudent == null || !schoolId.equals(targetStudent.getSchoolId()))
                return ApiResponse.error("Student not found");
        }

        // Teachers can only broadcast to a class section they are assigned to
        if ("TEACHER".equals(sender.getRole().name())) {
            Optional<Teacher> teacherOpt = teacherRepository.findByUserId(sender.getId());
            if (teacherOpt.isEmpty()) return ApiResponse.error("Teacher profile not found");
            Teacher teacher = teacherOpt.get();
            // School-wide broadcasts are admin-only
            if (Boolean.TRUE.equals(isSchoolWide)) {
                return ApiResponse.error("Teachers are not permitted to send school-wide broadcasts");
            }
            // Class-section broadcasts must target a section the teacher is assigned to
            if (classSection != null && !classSection.isBlank()) {
                String teacherClasses = teacher.getClasses();
                boolean assigned = teacherClasses != null && teacherClasses.contains(classSection);
                if (!assigned) {
                    return ApiResponse.error("You are not assigned to class section: " + classSection);
                }
            }
        }

        Message msg = Message.builder()
                .senderId(sender.getId())
                .senderName(sender.getName())
                .senderRole(sender.getRole().name())
                .receiverId(0L)   // broadcast — no single receiver
                .content(content)
                .title(title)
                .category(category)
                .schoolId(schoolId)
                .isSchoolWide(isSchoolWide)
                .isImportant(isImportant)
                .classSection(isSchoolWide ? null : classSection)
                .targetStudentId(targetStudentId)
                .readByUserIds("")
                .build();

        Message saved = messageRepository.save(msg);
        sendPushForBroadcast(saved);
        return ApiResponse.success("Message broadcast", saved);
    }

    /** Sends a push notification to the students targeted by a broadcast message, if they have a registered device. */
    private void sendPushForBroadcast(Message msg) {
        List<String> tokens = new ArrayList<>();

        if (msg.getTargetStudentId() != null) {
            userRepository.findByStudentId(msg.getTargetStudentId())
                    .map(User::getPushToken)
                    .filter(t -> t != null && !t.isBlank())
                    .ifPresent(tokens::add);
        } else if (Boolean.TRUE.equals(msg.getIsSchoolWide())) {
            for (User u : userRepository.findByRoleAndSchoolId(User.Role.STUDENT, msg.getSchoolId())) {
                if (u.getPushToken() != null && !u.getPushToken().isBlank()) tokens.add(u.getPushToken());
            }
            // School-wide announcements are addressed to staff too — notify them, excluding the sender.
            for (User.Role staffRole : List.of(User.Role.TEACHER, User.Role.ADMIN, User.Role.SUPER_ADMIN)) {
                for (User u : userRepository.findByRoleAndSchoolId(staffRole, msg.getSchoolId())) {
                    if (u.getId().equals(msg.getSenderId())) continue;
                    if (u.getPushToken() != null && !u.getPushToken().isBlank()) tokens.add(u.getPushToken());
                }
            }
        } else if (msg.getClassSection() != null) {
            List<Long> studentIds = studentRepository.findBySchoolId(msg.getSchoolId()).stream()
                    .filter(s -> msg.getClassSection().equals(buildClassSection(s.getClassName(), s.getSection())))
                    .map(Student::getId)
                    .collect(Collectors.toList());
            for (User u : userRepository.findByStudentIdIn(studentIds)) {
                if (u.getPushToken() != null && !u.getPushToken().isBlank()) tokens.add(u.getPushToken());
            }
        }

        if (tokens.isEmpty()) return;

        String title = msg.getTitle() != null ? msg.getTitle() : "Message";
        String body = msg.getContent().length() > PUSH_BODY_MAX_LENGTH
                ? msg.getContent().substring(0, PUSH_BODY_MAX_LENGTH) + "…"
                : msg.getContent();
        Map<String, Object> data = Map.of("type", "message", "messageId", msg.getId());
        expoPushService.sendToMany(tokens, title, body, data);
    }

    /** GET /api/messages/broadcasts — list broadcasts visible to authenticated admin/teacher */
    public ApiResponse<List<Map<String, Object>>> getBroadcasts(Authentication auth) {
        User user = resolveUser(auth);
        if (user == null) return ApiResponse.error("Unauthorized");

        Long schoolId = user.getSchoolId();
        if (schoolId == null) return ApiResponse.error("No school context");

        List<Message> msgs = messageRepository.findBroadcastsBySchool(schoolId, MESSAGE_RESULTS_PAGE);
        List<Map<String, Object>> result = msgs.stream().map(m -> {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id", m.getId());
            dto.put("title", m.getTitle());
            dto.put("content", m.getContent());
            dto.put("category", m.getCategory());
            dto.put("senderName", m.getSenderName());
            dto.put("senderRole", m.getSenderRole());
            dto.put("isSchoolWide", m.getIsSchoolWide());
            dto.put("classSection", m.getClassSection());
            dto.put("isImportant", m.getIsImportant());
            dto.put("createdAt", m.getCreatedAt());
            return dto;
        }).collect(Collectors.toList());

        return ApiResponse.success(result);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<String, Object> toStudentDto(Message m, Long userId) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", m.getId());
        dto.put("title", m.getTitle() != null ? m.getTitle() : "Message");
        dto.put("content", m.getContent());
        dto.put("category", m.getCategory());
        dto.put("senderName", m.getSenderName());
        dto.put("senderRole", m.getSenderRole());
        dto.put("isSchoolWide", m.getIsSchoolWide());
        dto.put("classSection", m.getClassSection());
        dto.put("isImportant", m.getIsImportant());
        dto.put("isRead", isReadByUser(m, userId));
        dto.put("createdAt", m.getCreatedAt());
        return dto;
    }

    private boolean isReadByUser(Message m, Long userId) {
        // Check the authoritative message_reads table first
        if (messageReadRepository.existsByMessageIdAndUserId(m.getId(), userId)) return true;
        // Fall back to the legacy comma-string for rows that pre-date the new table
        String ids = m.getReadByUserIds();
        if (ids == null || ids.isBlank()) return false;
        for (String id : ids.split(",")) {
            if (id.trim().equals(String.valueOf(userId))) return true;
        }
        return false;
    }

    private String buildClassSection(String className, String section) {
        if (className == null) return null;
        return (section != null && !section.isBlank()) ? className + "-" + section : className;
    }

    private User resolveUser(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
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

    private Boolean boolVal(Map<String, Object> map, String key, Boolean fallback) {
        Object v = map.get(key);
        if (v == null) return fallback;
        if (v instanceof Boolean) return (Boolean) v;
        return Boolean.parseBoolean(v.toString());
    }
}
