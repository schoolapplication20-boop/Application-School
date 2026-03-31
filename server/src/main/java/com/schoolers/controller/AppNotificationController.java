package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.AppNotification;
import com.schoolers.service.AppNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class AppNotificationController {

    @Autowired
    private AppNotificationService notificationService;

    @Autowired
    private com.schoolers.repository.UserRepository userRepository;

    private boolean isOwnerOrAdmin(Long userId, Authentication auth) {
        if (auth == null) return false;
        var userOpt = userRepository.findByEmailIgnoreCase(auth.getName());
        if (userOpt.isEmpty()) return false;
        var u = userOpt.get();
        return u.getId().equals(userId) || u.getRole().name().equals("SUPER_ADMIN") || u.getRole().name().equals("ADMIN");
    }

    /** Fetch all notifications for a user (newest first). */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT')")
    public ResponseEntity<ApiResponse<List<AppNotification>>> getForUser(@RequestParam Long userId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!isOwnerOrAdmin(userId, auth)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        }
        return ResponseEntity.ok(notificationService.getForUser(userId));
    }

    /** Unread count badge. */
    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT')")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@RequestParam Long userId) {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(userId)));
    }

    /** Mark a single notification as read. */
    @PatchMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT')")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        var result = notificationService.markRead(id);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    /** Mark all notifications for a user as read. */
    @PatchMapping("/read-all")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT')")
    public ResponseEntity<ApiResponse<String>> markAllRead(@RequestParam Long userId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!isOwnerOrAdmin(userId, auth)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        }
        return ResponseEntity.ok(notificationService.markAllRead(userId));
    }

    /** Delete a single notification. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        var result = notificationService.delete(id);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.notFound().build();
    }
}
