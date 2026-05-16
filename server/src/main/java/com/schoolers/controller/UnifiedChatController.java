package com.schoolers.controller;

import com.schoolers.dto.AiChatRequest;
import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.UnifiedChatResponse;
import com.schoolers.model.User;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.AiService;
import com.schoolers.service.ChatbotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.logging.Logger;

@RestController
@RequestMapping("/api/chat")
public class UnifiedChatController {

    private static final Logger log = Logger.getLogger(UnifiedChatController.class.getName());

    private static final String FALLBACK =
        "Sorry, I couldn't understand that. Please choose from the available options or type 'help' to see what I can assist with.";

    @Autowired private ChatbotService chatbotService;
    @Autowired private AiService      aiService;
    @Autowired private UserRepository userRepository;

    @PostMapping
    public ResponseEntity<ApiResponse<UnifiedChatResponse>> chat(
            @RequestBody AiChatRequest request,
            Authentication auth) {

        if (request.getMessage() == null || request.getMessage().isBlank()) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Message cannot be empty."));
        }

        // 1. Try FAQ match (works for all roles)
        String faqAnswer = chatbotService.getAnswerOrNull(request.getMessage());
        if (faqAnswer != null) {
            return ResponseEntity.ok(ApiResponse.success("OK",
                new UnifiedChatResponse(faqAnswer, "faq")));
        }

        // 2. Escalate to Gemini for admin users when FAQ has no match
        if (auth != null && auth.isAuthenticated() && canUseGemini(auth)) {
            try {
                User user = userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
                Long schoolId = user != null ? user.getSchoolId() : null;
                String role   = user != null ? user.getRole().name() : "ADMIN";

                String geminiReply = aiService.chat(
                    request.getMessage(), request.getHistory(), schoolId, role);
                return ResponseEntity.ok(ApiResponse.success("OK",
                    new UnifiedChatResponse(geminiReply, "gemini")));
            } catch (Exception e) {
                log.warning("[UnifiedChatController] Gemini escalation failed: " + e.getMessage());
            }
        }

        // 3. Generic fallback
        return ResponseEntity.ok(ApiResponse.success("OK",
            new UnifiedChatResponse(FALLBACK, "fallback")));
    }

    private boolean canUseGemini(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> {
            String authority = a.getAuthority();
            return "ROLE_ADMIN".equals(authority)
                || "ROLE_SUPER_ADMIN".equals(authority)
                || "ROLE_APPLICATION_OWNER".equals(authority)
                || "ROLE_TEACHER".equals(authority)
                || "ROLE_STUDENT".equals(authority);
        });
    }
}
