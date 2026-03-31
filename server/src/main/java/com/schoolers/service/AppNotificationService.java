package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.AppNotification;
import com.schoolers.repository.AppNotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AppNotificationService {

    @Autowired
    private AppNotificationRepository notificationRepository;

    /**
     * Creates a persistent notification for the given user.
     * Called by LeaveService when a leave is submitted or its status changes.
     */
    public void create(Long userId, String message, String icon, String color,
                       String linkType, Long linkId) {
        if (userId == null) return;
        notificationRepository.save(AppNotification.builder()
                .userId(userId)
                .message(message)
                .icon(icon)
                .color(color)
                .linkType(linkType)
                .linkId(linkId)
                .build());
    }

    public ApiResponse<List<AppNotification>> getForUser(Long userId) {
        return ApiResponse.success(notificationRepository.findByUserIdOrderByCreatedAtDesc(userId));
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public ApiResponse<AppNotification> markRead(Long id) {
        return notificationRepository.findById(id)
                .map(n -> {
                    n.setIsRead(true);
                    return ApiResponse.success(notificationRepository.save(n));
                })
                .orElse(ApiResponse.error("Notification not found"));
    }

    public ApiResponse<String> markAllRead(Long userId) {
        List<AppNotification> notifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        notifs.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(notifs);
        return ApiResponse.success("All marked as read", "OK");
    }

    public ApiResponse<String> delete(Long id) {
        if (!notificationRepository.existsById(id)) return ApiResponse.error("Notification not found");
        notificationRepository.deleteById(id);
        return ApiResponse.success("Deleted", "Deleted");
    }
}
