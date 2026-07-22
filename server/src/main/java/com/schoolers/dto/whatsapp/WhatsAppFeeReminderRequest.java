package com.schoolers.dto.whatsapp;

import com.schoolers.model.whatsapp.WhatsAppTargetType;
import lombok.Data;

import java.util.List;
import java.util.Map;

/** Request body for {@code POST /api/whatsapp/fee-reminder}. */
@Data
public class WhatsAppFeeReminderRequest {

    /** Display name for the campaign. Auto-generated from {@code targetType} if blank. */
    private String name;

    /** Restricted to STUDENTS or FEE_DUE for this trigger. */
    private WhatsAppTargetType targetType;

    /** Required for {@code STUDENTS}. */
    private List<Long> studentIds;

    /** Must reference an APPROVED, FEE_REMINDER-category template. */
    private Long templateId;

    /** Values substituted into the template's positional {{1}}, {{2}}, ... placeholders, keyed by the template's variableLabels. */
    private Map<String, Object> variables;

    /** Client-generated key; resubmitting the same key returns the existing campaign instead of creating a duplicate. */
    private String idempotencyKey;
}
