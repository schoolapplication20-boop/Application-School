package com.schoolers.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "messages",
    indexes = {
        @Index(name = "idx_msg_receiver", columnList = "receiver_id"),
        @Index(name = "idx_msg_school_wide", columnList = "school_id, is_school_wide")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "sender_name", length = 100)
    private String senderName;

    @Column(name = "sender_role", length = 20)
    private String senderRole;

    @NotNull
    @Column(name = "receiver_id", nullable = false)
    private Long receiverId;

    @Column(name = "receiver_name", length = 100)
    private String receiverName;

    @Column(name = "receiver_role", length = 20)
    private String receiverRole;

    @NotNull
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_read")
    @Builder.Default
    private Boolean isRead = false;

    // ── Broadcast / school-communication fields ───────────────────────────────

    @Column(length = 200)
    private String title;

    @Column(length = 30)
    @Builder.Default
    private String category = "GENERAL";

    @Column(name = "school_id")
    private Long schoolId;

    /** null = school-wide; "10-A" = specific class+section */
    @Column(name = "class_section", length = 20)
    private String classSection;

    /** null = all students in scope; non-null = one specific student user ID */
    @Column(name = "target_student_id")
    private Long targetStudentId;

    @Column(name = "is_school_wide")
    @Builder.Default
    private Boolean isSchoolWide = false;

    @Column(name = "is_important")
    @Builder.Default
    private Boolean isImportant = false;

    /** Comma-separated user IDs of students who have read this broadcast message */
    @Column(name = "read_by_user_ids", columnDefinition = "TEXT")
    @Builder.Default
    private String readByUserIds = "";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
