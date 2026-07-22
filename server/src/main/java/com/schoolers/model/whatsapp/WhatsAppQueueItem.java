package com.schoolers.model.whatsapp;

import com.schoolers.model.sms.QueueStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * A single WhatsApp template message waiting to be (re)sent. Rows are claimed in batches by
 * {@code WhatsAppQueueProcessor} using {@code SELECT ... FOR UPDATE SKIP LOCKED}, mirroring the
 * SMS queue. Reuses {@link QueueStatus} from the SMS module.
 */
@Entity
@Table(name = "whatsapp_queue", indexes = {
        @Index(name = "idx_whatsapp_queue_poll", columnList = "status, next_attempt_at"),
        @Index(name = "idx_whatsapp_queue_campaign", columnList = "school_id, campaign_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppQueueItem {

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

    @Column(name = "template_id", nullable = false)
    private Long templateId;

    /** Resolved per-recipient values, JSON array in {{1}}, {{2}}, ... order. */
    @Column(name = "variables_json", nullable = false, columnDefinition = "TEXT")
    private String variablesJson;

    /** For RECEIPT_LINK templates: the dynamic suffix for Meta's URL button component. */
    @Column(name = "button_url_param", length = 200)
    private String buttonUrlParam;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private QueueStatus status = QueueStatus.PENDING;

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
