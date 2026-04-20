package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Message;
import com.schoolers.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"})
public class MessageController {

    @Autowired private MessageService messageService;
    @Autowired private com.schoolers.repository.UserRepository userRepository;

    private boolean isOwnerOrAdmin(Long userId, Authentication auth) {
        if (auth == null) return false;
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return false;
        var u = userOpt.get();
        return u.getId().equals(userId)
                || u.getRole().name().equals("SUPER_ADMIN")
                || u.getRole().name().equals("ADMIN");
    }

    // ── Existing 1-to-1 endpoints ─────────────────────────────────────────────

    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','TEACHER','PARENT','STUDENT')")
    public ResponseEntity<ApiResponse<List<Message>>> getMessages(@PathVariable Long userId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!isOwnerOrAdmin(userId, auth))
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        return ResponseEntity.ok(messageService.getMessagesForUser(userId));
    }

    @GetMapping("/conversation")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','TEACHER','PARENT')")
    public ResponseEntity<ApiResponse<List<Message>>> getConversation(
            @RequestParam Long u1, @RequestParam Long u2) {
        return ResponseEntity.ok(messageService.getConversation(u1, u2));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','TEACHER','PARENT')")
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, Object> body) {
        var response = messageService.sendMessage(body);
        return response.isSuccess()
                ? ResponseEntity.status(201).body(response)
                : ResponseEntity.badRequest().body(response);
    }

    @PatchMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','TEACHER','PARENT')")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        var response = messageService.markAsRead(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @GetMapping("/unread/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','TEACHER','PARENT','STUDENT')")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount(@PathVariable Long userId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!isOwnerOrAdmin(userId, auth))
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        return ResponseEntity.ok(messageService.getUnreadCount(userId));
    }

    // ── Broadcast / student-inbox endpoints ───────────────────────────────────

    @GetMapping("/student/inbox")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getStudentInbox(Authentication auth) {
        var response = messageService.getStudentInbox(auth);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/student/unread-count")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getStudentUnreadCount(Authentication auth) {
        return ResponseEntity.ok(messageService.getStudentUnreadCount(auth));
    }

    @PatchMapping("/student/{id}/read")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> markReadForStudent(@PathVariable Long id, Authentication auth) {
        var response = messageService.markReadForStudent(id, auth);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PostMapping("/broadcast")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','TEACHER')")
    public ResponseEntity<?> sendBroadcast(@RequestBody Map<String, Object> body, Authentication auth) {
        var response = messageService.sendBroadcast(body, auth);
        return response.isSuccess()
                ? ResponseEntity.status(201).body(response)
                : ResponseEntity.badRequest().body(response);
    }

    @GetMapping("/broadcasts")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','TEACHER')")
    public ResponseEntity<?> getBroadcasts(Authentication auth) {
        var response = messageService.getBroadcasts(auth);
        return ResponseEntity.ok(response);
    }
}
