package com.schoolers.controller;

import com.schoolers.dto.AiChatRequest;
import com.schoolers.dto.ApiResponse;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.logging.Logger;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private static final Logger log = Logger.getLogger(AiController.class.getName());

    @Autowired private AiService      aiService;
    @Autowired private UserRepository userRepository;

    @PostMapping("/chat")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<String>> chat(@RequestBody AiChatRequest request) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = auth.getName();

            Long schoolId = userRepository.findByEmailIgnoreCase(email)
                .map(u -> u.getSchoolId())
                .orElse(null);

            String role = userRepository.findByEmailIgnoreCase(email)
                .map(u -> u.getRole().name())
                .orElse("ADMIN");

            if (request.getMessage() == null || request.getMessage().isBlank())
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Message cannot be empty."));

            String reply = aiService.chat(request.getMessage(), request.getHistory(), schoolId, role);
            return ResponseEntity.ok(ApiResponse.success("OK", reply));

        } catch (Exception e) {
            log.severe("[AiController] chat error: " + e.getMessage());
            return ResponseEntity.status(500)
                .body(ApiResponse.error("AI request failed: " + e.getMessage()));
        }
    }
}
