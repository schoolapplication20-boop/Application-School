package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Message;
import com.schoolers.repository.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class MessageService {

    @Autowired
    private MessageRepository messageRepository;

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
