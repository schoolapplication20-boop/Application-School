package com.schoolers.service;

import com.schoolers.dto.ChatMessageDto;
import com.schoolers.dto.ChatSessionDto;
import com.schoolers.model.ChatMessage;
import com.schoolers.model.ChatSession;
import com.schoolers.model.User;
import com.schoolers.repository.ChatMessageRepository;
import com.schoolers.repository.ChatSessionRepository;
import com.schoolers.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AiChatService {

    @Autowired private ChatSessionRepository sessionRepo;
    @Autowired private ChatMessageRepository messageRepo;
    @Autowired private UserRepository        userRepo;
    @Autowired private AiService             aiService;

    public List<ChatSessionDto> getSessions(Long userId) {
        return sessionRepo.findByUserIdOrderByUpdatedAtDesc(userId)
            .stream().map(this::toSessionDto).toList();
    }

    public ChatSessionDto createSession(Long userId, String lang) {
        ChatSession s = ChatSession.builder()
            .userId(userId)
            .lang(lang != null ? lang : "en")
            .build();
        return toSessionDto(sessionRepo.save(s));
    }

    @Transactional
    public void deleteSession(Long sessionId, Long userId) {
        ChatSession s = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));
        if (!s.getUserId().equals(userId))
            throw new RuntimeException("Unauthorized");
        messageRepo.deleteBySessionId(sessionId);
        sessionRepo.delete(s);
    }

    public List<ChatMessageDto> getMessages(Long sessionId, Long userId) {
        ChatSession s = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));
        if (!s.getUserId().equals(userId))
            throw new RuntimeException("Unauthorized");
        return messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId)
            .stream().map(this::toMsgDto).toList();
    }

    @Transactional
    public ChatMessageDto sendMessage(Long sessionId, Long userId, String message, String lang) {
        ChatSession session = sessionRepo.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));
        if (!session.getUserId().equals(userId))
            throw new RuntimeException("Unauthorized");

        // Load history BEFORE saving the new message (AiService adds the current message itself)
        List<ChatMessage> prior = messageRepo.findBySessionIdOrderByCreatedAtAsc(sessionId);
        List<Map<String, String>> geminiHistory = prior.stream()
            .map(m -> Map.of(
                "role", m.getRole() == ChatMessage.Role.USER ? "user" : "model",
                "text", m.getContent()
            ))
            .collect(Collectors.toList());

        // Limit context to last 20 messages to stay within token budget
        if (geminiHistory.size() > 20)
            geminiHistory = geminiHistory.subList(geminiHistory.size() - 20, geminiHistory.size());

        // Save user message
        messageRepo.save(ChatMessage.builder()
            .sessionId(sessionId)
            .role(ChatMessage.Role.USER)
            .content(message)
            .build());

        // Resolve user context for the system prompt
        User user = userRepo.findById(userId).orElse(null);
        Long schoolId  = user != null ? user.getSchoolId() : null;
        String role    = user != null ? user.getRole().name() : "STUDENT";

        // Call Gemini
        String aiReply = aiService.chat(message, geminiHistory, schoolId, role);

        // Save AI reply
        ChatMessage saved = messageRepo.save(ChatMessage.builder()
            .sessionId(sessionId)
            .role(ChatMessage.Role.ASSISTANT)
            .content(aiReply)
            .build());

        // Auto-title session from first user message
        if ("New Chat".equals(session.getTitle())) {
            String title = message.length() > 50 ? message.substring(0, 47) + "…" : message;
            session.setTitle(title);
        }
        session.setUpdatedAt(LocalDateTime.now());
        if (lang != null && !lang.isBlank()) session.setLang(lang);
        sessionRepo.save(session);

        return toMsgDto(saved);
    }

    private ChatSessionDto toSessionDto(ChatSession s) {
        return new ChatSessionDto(s.getId(), s.getTitle(), s.getLang(), s.getCreatedAt(), s.getUpdatedAt());
    }

    private ChatMessageDto toMsgDto(ChatMessage m) {
        return new ChatMessageDto(m.getId(),
            m.getRole() == ChatMessage.Role.USER ? "user" : "assistant",
            m.getContent(), m.getCreatedAt());
    }
}
