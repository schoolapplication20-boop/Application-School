package com.schoolers.model.whatsapp;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Maps to a Meta-approved WhatsApp message template (not free text — see {@link WhatsAppCategory}
 * and the module-level note on why business-initiated messages require approved templates).
 */
@Entity
@Table(name = "whatsapp_templates", uniqueConstraints = @UniqueConstraint(name = "uq_whatsapp_templates_school_name", columnNames = {"school_id", "name"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    /** Internal label shown in our UI. */
    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WhatsAppCategory category;

    /** Exact template name registered with Meta. */
    @Column(name = "meta_template_name", nullable = false, length = 100)
    private String metaTemplateName;

    @Column(name = "meta_language_code", nullable = false, length = 10)
    @Builder.Default
    private String metaLanguageCode = "en";

    /** JSON array of variable labels, ordered to match the template's {{1}}, {{2}}, ... placeholders. */
    @Column(name = "variable_labels", columnDefinition = "TEXT")
    private String variableLabels;

    /** True for templates using Meta's dynamic URL button component (receipt links). */
    @Column(name = "has_url_button", nullable = false)
    @Builder.Default
    private Boolean hasUrlButton = false;

    /** Human-readable copy of the approved wording, UI preview only — never sent to Meta. */
    @Column(name = "content_preview", columnDefinition = "TEXT")
    private String contentPreview;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 20)
    @Builder.Default
    private WhatsAppApprovalStatus approvalStatus = WhatsAppApprovalStatus.PENDING;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
