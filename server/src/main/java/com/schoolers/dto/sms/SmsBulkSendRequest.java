package com.schoolers.dto.sms;

import com.schoolers.model.sms.TargetType;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Request body for {@code POST /api/sms/bulk} — a campaign sent to a resolved set of recipients, optionally scheduled. */
@Data
public class SmsBulkSendRequest {

    /** Display name for the campaign. Auto-generated from {@code targetType} if blank. */
    private String name;

    private TargetType targetType;

    /** Required for {@code CLASS} and {@code SECTION}. */
    private String className;

    /** Required for {@code SECTION}. */
    private String section;

    /** Required for {@code STUDENTS}. */
    private List<Long> studentIds;

    /** Required for {@code CUSTOM}. */
    @Size(max = 500, message = "Cannot send to more than 500 phone numbers at once")
    private List<String> customPhones;

    /** Attendance date for {@code ABSENTEES}; defaults to today if null. */
    private LocalDate date;

    /** Render the message from this template. Takes precedence over {@code message}. */
    private Long templateId;

    /** Raw message body, used when {@code templateId} is not provided. */
    private String message;

    /** Values substituted into {@code {{placeholder}}} tokens (in addition to per-recipient {@code name}). */
    private Map<String, Object> variables;

    /** When null, the campaign is queued for immediate sending. */
    private LocalDateTime scheduledFor;

    /** Client-generated key; resubmitting the same key returns the existing campaign instead of creating a duplicate. */
    private String idempotencyKey;
}
