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
public class MessageController {

    @Autowired private MessageService messageService;

    @SuppressWarnings("unchecked")
    private boolean isOwnerOrAdmin(Long userId, Authentication auth) {
        if (auth == null) return false;
        // Prefer JWT claims (no DB hit) over a full user lookup
        if (auth.getDetails() instanceof java.util.Map) {
            java.util.Map<?, ?> claims = (java.util.Map<?, ?>) auth.getDetails();
            Object claimUserId = claims.get("userId");
            if (claimUserId != null) {
                try {
                    Long callerId = claimUserId instanceof Long ? (Long) claimUserId
                            : Long.parseLong(claimUserId.toString());
                    if (callerId.equals(userId)) return true;
                } catch (NumberFormatException ignored) {}
            }
            Object role = claims.get("role");
            if (role != null && (role.toString().equals("SUPER_ADMIN") || role.toString().equals("ADMIN")))
                return true;
        }
        return false;
    }

    // ── Existing 1-to-1 endpoints ─────────────────────────────────────────────

    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','TEACHER','STUDENT')")
    public ResponseEntity<ApiResponse<List<Message>>> getMessages(@PathVariable Long userId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!isOwnerOrAdmin(userId, auth))
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        return ResponseEntity.ok(messageService.getMessagesForUser(userId));
    }

    @GetMapping("/conversation")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','TEACHER','STUDENT')")
    public ResponseEntity<ApiResponse<List<Message>>> getConversation(
            @RequestParam Long u1, @RequestParam Long u2, Authentication auth) {
        if (!isOwnerOrAdmin(u1, auth) && !isOwnerOrAdmin(u2, auth))
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied"));
        return ResponseEntity.ok(messageService.getConversation(u1, u2));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','TEACHER','STUDENT')")
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, Object> body) {
        var response = messageService.sendMessage(body);
        return response.isSuccess()
                ? ResponseEntity.status(201).body(response)
                : ResponseEntity.badRequest().body(response);
    }

    @PatchMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','TEACHER','STUDENT')")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        var response = messageService.markAsRead(id);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.notFound().build();
    }

    @GetMapping("/unread/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','TEACHER','STUDENT')")
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
