package com.schoolers.dto;

import java.time.LocalDateTime;

public record ChatSessionDto(
    Long id,
    String title,
    String lang,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
