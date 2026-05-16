package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.service.ChatbotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    @Autowired
    private ChatbotService chatbotService;

    @GetMapping
    public ResponseEntity<ApiResponse<String>> chat(@RequestParam String message) {
        String answer = chatbotService.getAnswer(message);
        return ResponseEntity.ok(ApiResponse.success("OK", answer));
    }
}
