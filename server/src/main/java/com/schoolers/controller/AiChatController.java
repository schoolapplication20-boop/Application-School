package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.ChatMessageDto;
import com.schoolers.dto.ChatSessionDto;
import com.schoolers.dto.SendMessageRequest;
import com.schoolers.model.User;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.AiChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ai/sessions")
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','APPLICATION_OWNER')")
public class AiChatController {

    @Autowired private AiChatService aiChatService;
    @Autowired private UserRepository userRepo;

    private Long userId(Authentication auth) {
        return userRepo.findByEmailIgnoreCase(auth.getName())
            .map(User::getId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ChatSessionDto>>> listSessions(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("OK", aiChatService.getSessions(userId(auth))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ChatSessionDto>> createSession(
            @RequestParam(defaultValue = "en") String lang,
            Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("OK", aiChatService.createSession(userId(auth), lang)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @PathVariable Long id, Authentication auth) {
        aiChatService.deleteSession(id, userId(auth));
        return ResponseEntity.ok(ApiResponse.success("OK", null));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageDto>>> getMessages(
            @PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("OK", aiChatService.getMessages(id, userId(auth))));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<ChatMessageDto>> sendMessage(
            @PathVariable Long id,
            @RequestBody SendMessageRequest req,
            Authentication auth) {
        if (req.getMessage() == null || req.getMessage().isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Message cannot be empty."));
        ChatMessageDto reply = aiChatService.sendMessage(id, userId(auth), req.getMessage(), req.getLang());
        return ResponseEntity.ok(ApiResponse.success("OK", reply));
    }
}
