package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.repository.UserRepository;
import com.schoolers.service.PushNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173",
        "http://127.0.0.1:5173", "https://application-school.vercel.app"})
public class PushController {

    @Autowired private PushNotificationService pushNotificationService;
    @Autowired private UserRepository userRepository;

    @Value("${vapid.public.key}")
    private String vapidPublicKey;

    @GetMapping("/vapid-public-key")
    public ResponseEntity<ApiResponse<String>> getPublicKey() {
        return ResponseEntity.ok(ApiResponse.success("VAPID public key", vapidPublicKey));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<ApiResponse<String>> subscribe(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));

        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(404).body(ApiResponse.error("User not found"));

        Long userId = userOpt.get().getId();
        String endpoint = (String) body.get("endpoint");
        @SuppressWarnings("unchecked")
        Map<String, String> keys = (Map<String, String>) body.get("keys");
        if (endpoint == null || keys == null)
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid subscription data"));

        pushNotificationService.saveSubscription(userId, endpoint, keys.get("p256dh"), keys.get("auth"));
        return ResponseEntity.ok(ApiResponse.success("Subscribed successfully", "ok"));
    }

    @DeleteMapping("/unsubscribe")
    public ResponseEntity<ApiResponse<String>> unsubscribe(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized"));
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return ResponseEntity.status(404).body(ApiResponse.error("User not found"));
        Long userId = userOpt.get().getId();
        String endpoint = (String) body.get("endpoint");
        if (endpoint != null) {
            pushNotificationService.saveSubscription(userId, endpoint, "", "");
        }
        return ResponseEntity.ok(ApiResponse.success("Unsubscribed", "ok"));
    }
}
