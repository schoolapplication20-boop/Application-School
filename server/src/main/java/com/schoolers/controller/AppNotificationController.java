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

    /** Resolve the caller's User entity from the JWT principal. Returns null if not found. */
    private com.schoolers.model.User resolveCallerUser(Authentication auth) {
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
    }

    /** Returns true if the caller is APPLICATION_OWNER or SUPER_ADMIN. */
    private boolean isPlatformOrSuperAdmin(com.schoolers.model.User caller) {
        if (caller == null) return false;
        String role = caller.getRole().name();
        return "APPLICATION_OWNER".equals(role) || "SUPER_ADMIN".equals(role);
    }

    /** For privileged callers, verify the target userId belongs to the same school the caller manages. */
    private boolean isSameSchool(com.schoolers.model.User caller, Long targetUserId) {
        return userRepository.findById(targetUserId)
                .map(target -> target.getSchoolId() != null && target.getSchoolId().equals(caller.getSchoolId()))
                .orElse(false);
    }

    /** Fetch all notifications for a user (newest first). */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<List<AppNotification>>> getForUser(
            @RequestParam(required = false) Long userId,
            Authentication auth) {
        com.schoolers.model.User caller = resolveCallerUser(auth);
        if (caller == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        }
        // Privileged callers may supply an explicit userId (must be in their school)
        if (userId != null && isPlatformOrSuperAdmin(caller)) {
            if (!isSameSchool(caller, userId)) {
                return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
            }
            return ResponseEntity.ok(notificationService.getForUser(userId));
        }
        // All other callers use their own userId derived from the JWT
        return ResponseEntity.ok(notificationService.getForUser(caller.getId()));
    }

    /** Unread count badge. */
    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<?> getUnreadCount(
            @RequestParam(required = false) Long userId,
            Authentication auth) {
        com.schoolers.model.User caller = resolveCallerUser(auth);
        if (caller == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        }
        if (userId != null && isPlatformOrSuperAdmin(caller)) {
            if (!isSameSchool(caller, userId)) {
                return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
            }
            return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(userId)));
        }
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(caller.getId())));
    }

    /** Mark a single notification as read. */
    @PatchMapping("/{id}/read")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<?> markRead(@PathVariable Long id, Authentication auth) {
        AppNotification notification = notificationRepository.findById(id).orElse(null);
        if (notification == null) return ResponseEntity.notFound().build();
        com.schoolers.model.User caller = resolveCallerUser(auth);
        if (caller == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        }
        // Allow: owner of the notification, or privileged caller in the same school
        boolean allowed = caller.getId().equals(notification.getUserId())
                || (isPlatformOrSuperAdmin(caller) && isSameSchool(caller, notification.getUserId()));
        if (!allowed) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        }
        var result = notificationService.markRead(id);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.badRequest().body(result);
    }

    /** Mark all notifications for a user as read. */
    @PatchMapping("/read-all")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<ApiResponse<String>> markAllRead(
            @RequestParam(required = false) Long userId,
            Authentication auth) {
        com.schoolers.model.User caller = resolveCallerUser(auth);
        if (caller == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        }
        if (userId != null && isPlatformOrSuperAdmin(caller)) {
            if (!isSameSchool(caller, userId)) {
                return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
            }
            return ResponseEntity.ok(notificationService.markAllRead(userId));
        }
        return ResponseEntity.ok(notificationService.markAllRead(caller.getId()));
    }

    /** Delete a single notification. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'TEACHER')")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        AppNotification notification = notificationRepository.findById(id).orElse(null);
        if (notification == null) return ResponseEntity.notFound().build();
        com.schoolers.model.User caller = resolveCallerUser(auth);
        if (caller == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        }
        boolean allowed = caller.getId().equals(notification.getUserId())
                || (isPlatformOrSuperAdmin(caller) && isSameSchool(caller, notification.getUserId()));
        if (!allowed) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied."));
        }
        var result = notificationService.delete(id);
        return result.isSuccess() ? ResponseEntity.ok(result) : ResponseEntity.notFound().build();
    }
}
