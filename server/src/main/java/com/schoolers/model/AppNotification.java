package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Which user receives this notification (matched against auth user.id) */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(length = 50)
    private String icon;

    @Column(length = 20)
    private String color;

    @Column(name = "is_read")
    @Builder.Default
    private boolean read = false;

    /** e.g. "teacher_leave" or "leave_decision" — used by frontend to render detail view */
    @Column(name = "link_type", length = 30)
    private String linkType;

    /** ID of the related entity (e.g. leave request ID) */
    @Column(name = "link_id")
    private Long linkId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
