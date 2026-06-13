package com.schoolers.dto.sms;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

/** Request body for {@code POST /api/sms/send} — a single SMS to a student or a raw phone number. */
@Data
public class SmsSendRequest {

    /** Resolve the recipient phone from this student's parent/mother/guardian mobile. Takes precedence over {@code phone}. */
    private Long studentId;

    /** Raw recipient phone number, used when {@code studentId} is not provided. */
    private String phone;

    /** Render the message from this template. Takes precedence over {@code message}. */
    private Long templateId;

    /** Raw message body, used when {@code templateId} is not provided. */
    private String message;

    /** Values substituted into {@code {{placeholder}}} tokens in the template/message. */
    private Map<String, Object> variables;

    /** When null, the message is queued for immediate sending. */
    private LocalDateTime scheduledFor;
}
