package com.schoolers.dto;

import java.time.LocalDateTime;

public record ChatMessageDto(
    Long id,
    String role,
    String content,
    LocalDateTime createdAt
) {}
