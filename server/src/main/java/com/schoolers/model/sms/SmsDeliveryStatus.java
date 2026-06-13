package com.schoolers.model.sms;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Audit trail of every delivery-status webhook callback received for an {@link SmsLog}. */
@Entity
@Table(name = "sms_delivery_status", indexes = {
        @Index(name = "idx_sms_delivery_status_log", columnList = "sms_log_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmsDeliveryStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sms_log_id", nullable = false)
    private Long smsLogId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SmsLogStatus status;

    @Column(name = "error_code", length = 30)
    private String errorCode;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "raw_payload", columnDefinition = "TEXT")
    private String rawPayload;

    @CreationTimestamp
    @Column(name = "received_at", updatable = false)
    private LocalDateTime receivedAt;
}
