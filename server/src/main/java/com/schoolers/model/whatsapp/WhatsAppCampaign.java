package com.schoolers.model.whatsapp;

import com.schoolers.model.sms.CampaignStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * A single WhatsApp send operation (one recipient or many). Reuses {@link CampaignStatus} from the
 * SMS module — both are channel-agnostic lifecycle states with no SMS-specific vocabulary.
 */
@Entity
@Table(name = "whatsapp_campaigns", uniqueConstraints = @UniqueConstraint(name = "uq_whatsapp_campaigns_school_idempotency", columnNames = {"school_id", "idempotency_key"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "template_id", nullable = false)
    private Long templateId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 20)
    private WhatsAppTargetType targetType;

    /** Free-form description of the recipient selection, for display + audit. */
    @Column(name = "target_filter", columnDefinition = "TEXT")
    private String targetFilter;

    @Column(name = "total_recipients", nullable = false)
    @Builder.Default
    private Integer totalRecipients = 0;

    @Column(name = "sent_count", nullable = false)
    @Builder.Default
    private Integer sentCount = 0;

    @Column(name = "delivered_count", nullable = false)
    @Builder.Default
    private Integer deliveredCount = 0;

    @Column(name = "failed_count", nullable = false)
    @Builder.Default
    private Integer failedCount = 0;

    @Column(name = "pending_count", nullable = false)
    @Builder.Default
    private Integer pendingCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CampaignStatus status = CampaignStatus.DRAFT;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
