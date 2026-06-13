package com.schoolers.model.sms;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * A single SMS waiting to be (re)sent. Rows are claimed in batches by the
 * {@code SmsQueueProcessor} scheduled poller using {@code SELECT ... FOR UPDATE SKIP LOCKED}.
 */
@Entity
@Table(name = "sms_queue", indexes = {
        @Index(name = "idx_sms_queue_poll", columnList = "status, scheduled_for, next_attempt_at"),
        @Index(name = "idx_sms_queue_campaign", columnList = "school_id, campaign_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmsQueueItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    @Column(name = "campaign_id")
    private Long campaignId;

    @Column(name = "student_id")
    private Long studentId;

    @Column(name = "recipient_phone", nullable = false, length = 20)
    private String recipientPhone;

    @Column(name = "recipient_name", length = 100)
    private String recipientName;

    @Column(name = "message_content", nullable = false, columnDefinition = "TEXT")
    private String messageContent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private QueueStatus status = QueueStatus.PENDING;

    @Column(name = "scheduled_for")
    private LocalDateTime scheduledFor;

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private Integer attemptCount = 0;

    @Column(name = "max_attempts", nullable = false)
    @Builder.Default
    private Integer maxAttempts = 3;

    @Column(name = "next_attempt_at")
    private LocalDateTime nextAttemptAt;

    @Column(name = "last_error", length = 500)
    private String lastError;

    @Column(name = "provider_message_id", length = 100)
    private String providerMessageId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
