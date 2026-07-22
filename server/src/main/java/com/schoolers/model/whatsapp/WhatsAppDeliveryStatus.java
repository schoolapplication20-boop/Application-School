package com.schoolers.model.whatsapp;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Raw record of a Meta delivery-status webhook callback, linked to the {@link WhatsAppLog} it updated. */
@Entity
@Table(name = "whatsapp_delivery_status", indexes = {
        @Index(name = "idx_whatsapp_delivery_status_log", columnList = "whatsapp_log_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppDeliveryStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "whatsapp_log_id", nullable = false)
    private Long whatsAppLogId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WhatsAppLogStatus status;

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
