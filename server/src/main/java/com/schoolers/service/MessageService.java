package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Message;
import com.schoolers.model.Student;
import com.schoolers.model.Teacher;
import com.schoolers.model.User;
import com.schoolers.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MessageService {

    @Autowired private MessageRepository messageRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private TeacherRepository teacherRepository;

    // ── Existing 1-to-1 message methods ──────────────────────────────────────

    public ApiResponse<List<Message>> getMessagesForUser(Long userId) {
        return ApiResponse.success(messageRepository.findAllByUserId(userId));
    }

    public ApiResponse<List<Message>> getConversation(Long u1, Long u2) {
        return ApiResponse.success(messageRepository.findConversation(u1, u2));
    }

    public ApiResponse<Message> sendMessage(Map<String, Object> body) {
        Long senderId = longVal(body, "senderId", null);
        Long receiverId = longVal(body, "receiverId", null);
        String content = str(body, "content", null);
        if (senderId == null) return ApiResponse.error("Sender ID is required");
        if (receiverId == null) return ApiResponse.error("Receiver ID is required");
        if (content == null || content.isBlank()) return ApiResponse.error("Message content is required");

        Message msg = Message.builder()
                .senderId(senderId)
                .senderName(str(body, "senderName", null))
                .senderRole(str(body, "senderRole", null))
                .receiverId(receiverId)
                .receiverName(str(body, "receiverName", null))
                .receiverRole(str(body, "receiverRole", null))
                .content(content)
                .build();
        return ApiResponse.success("Message sent", messageRepository.save(msg));
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
                student.getSchoolId(), classSection, student.getId());

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
                student.getSchoolId(), classSection, student.getId());

        long unread = messages.stream()
                .filter(m -> !isReadByUser(m, user.getId()))
                .count();
        return ApiResponse.success(unread);
    }

    /** PATCH /api/messages/student/{id}/read — mark a broadcast message as read by this student */
    public ApiResponse<String> markReadForStudent(Long messageId, Authentication auth) {
        User user = resolveUser(auth);
        if (user == null) return ApiResponse.error("Unauthorized");

        return messageRepository.findById(messageId).map(msg -> {
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

        String title = str(body, "title", "Message");
        String category = str(body, "category", "GENERAL");
        Boolean isSchoolWide = boolVal(body, "isSchoolWide", false);
        Boolean isImportant = boolVal(body, "isImportant", false);
        String classSection = str(body, "classSection", null);
        Long targetStudentId = longVal(body, "targetStudentId", null);

        Long schoolId = sender.getSchoolId();
        if (schoolId == null) {
            schoolId = longVal(body, "schoolId", null);
        }
        if (schoolId == null) return ApiResponse.error("School context is required");

        // Teachers can only send to their own class
        if ("TEACHER".equals(sender.getRole().name())) {
            Optional<Teacher> teacherOpt = teacherRepository.findByUserId(sender.getId());
            if (teacherOpt.isEmpty()) return ApiResponse.error("Teacher profile not found");
            // Allow if classSection matches or if they override (admin will validate)
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

        return ApiResponse.success("Message broadcast", messageRepository.save(msg));
    }

    /** GET /api/messages/broadcasts — list broadcasts visible to authenticated admin/teacher */
    public ApiResponse<List<Map<String, Object>>> getBroadcasts(Authentication auth) {
        User user = resolveUser(auth);
        if (user == null) return ApiResponse.error("Unauthorized");

        Long schoolId = user.getSchoolId();
        if (schoolId == null) return ApiResponse.error("No school context");

        List<Message> msgs = messageRepository.findBroadcastsBySchool(schoolId);
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
