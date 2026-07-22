package com.schoolers.model.whatsapp;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Immutable record of a WhatsApp message that was actually handed to Meta (or definitively failed to be). */
@Entity
@Table(name = "whatsapp_logs", indexes = {
        @Index(name = "idx_whatsapp_logs_school_created", columnList = "school_id, created_at"),
        @Index(name = "idx_whatsapp_logs_provider_msg", columnList = "provider_message_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    @Column(name = "campaign_id")
    private Long campaignId;

    @Column(name = "queue_id")
    private Long queueId;

    @Column(name = "student_id")
    private Long studentId;

    @Column(name = "recipient_phone", nullable = false, length = 20)
    private String recipientPhone;

    @Column(name = "recipient_name", length = 100)
    private String recipientName;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private WhatsAppCategory category;

    /** Human-readable copy for history display. */
    @Column(name = "rendered_preview", columnDefinition = "TEXT")
    private String renderedPreview;

    @Column(name = "provider_message_id", length = 100)
    private String providerMessageId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WhatsAppLogStatus status;

    @Column(name = "error_code", length = 30)
    private String errorCode;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
