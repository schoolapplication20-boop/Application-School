package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.AppNotification;
import com.schoolers.repository.AppNotificationRepository;
import com.schoolers.service.AppNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class AppNotificationController {

    @Autowired
    private AppNotificationService notificationService;

    @Autowired
    private AppNotificationRepository notificationRepository;

    @Autowired
    private com.schoolers.repository.UserRepository userRepository;

    private com.schoolers.model.User resolveCallerUser(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
    }

    private boolean isAdminRole(com.schoolers.model.User u) {
        return u.getRole().name().equals("SUPER_ADMIN") || u.getRole().name().equals("ADMIN");
    }

    /** Fetch all notifications for a user (newest first). */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<AppNotification>>> getForUser(Authentication auth) {
        com.schoolers.model.User caller = resolveCallerUser(auth);
        if (caller == null) return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized."));
        // userId is always derived from the JWT — callers cannot impersonate others
        return ResponseEntity.ok(notificationService.getForUser(caller.getId()));
    }

    /** Unread count badge. */
    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<?> getUnreadCount(Authentication auth) {
        com.schoolers.model.User caller = resolveCallerUser(auth);
        if (caller == null) return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized."));
        // userId is always derived from the JWT — callers cannot impersonate others
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(caller.getId())));
    }

    /** Mark a single notification as read. */
    @PatchMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<?> markRead(@PathVariable Long id, Authentication auth) {
        com.schoolers.model.User caller = resolveCallerUser(auth);
        if (caller == null) return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized."));
        AppNotification notification = notificationRepository.findById(id).orElse(null);
        if (notification == null) return ResponseEntity.notFound().build();
        // Only the owning user or an admin can mark a notification as read
        if (!caller.getId().equals(notification.getUserId()) && !isAdminRole(caller)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        }
        var result = notificationService.markRead(id);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    /** Mark all notifications for a user as read. */
    @PatchMapping("/read-all")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<String>> markAllRead(Authentication auth) {
        com.schoolers.model.User caller = resolveCallerUser(auth);
        if (caller == null) return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized."));
        // userId is always derived from the JWT — callers cannot impersonate others
        return ResponseEntity.ok(notificationService.markAllRead(caller.getId()));
    }

    /** Delete a single notification. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        com.schoolers.model.User caller = resolveCallerUser(auth);
        if (caller == null) return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized."));
        AppNotification notification = notificationRepository.findById(id).orElse(null);
        if (notification == null) return ResponseEntity.notFound().build();
        // Only the owning user or an admin can delete a notification
        if (!caller.getId().equals(notification.getUserId()) && !isAdminRole(caller)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        }
        var result = notificationService.delete(id);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.notFound().build();
    }
}
