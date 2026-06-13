package com.schoolers.model.sms;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Immutable record of an SMS that was actually handed to the provider (or definitively failed to be). */
@Entity
@Table(name = "sms_logs", indexes = {
        @Index(name = "idx_sms_logs_school_created", columnList = "school_id, created_at"),
        @Index(name = "idx_sms_logs_provider_msg", columnList = "provider_message_id"),
        @Index(name = "idx_sms_logs_campaign", columnList = "school_id, campaign_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmsLog {

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

    @Column(name = "message_content", nullable = false, columnDefinition = "TEXT")
    private String messageContent;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_message_id", length = 100)
    private String providerMessageId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SmsLogStatus status;

    @Column(nullable = false)
    @Builder.Default
    private Integer segments = 1;

    @Column(name = "error_code", length = 30)
    private String errorCode;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
