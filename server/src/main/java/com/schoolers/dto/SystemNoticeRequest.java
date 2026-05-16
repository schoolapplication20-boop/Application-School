package com.schoolers.dto;

import lombok.Data;

@Data
public class SystemNoticeRequest {
    private String message;
    private String severity;       // INFO | WARNING | CRITICAL
    private String scheduledAt;    // ISO-8601 datetime string, nullable
    private Integer durationMinutes;
}
