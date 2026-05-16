package com.schoolers.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UnifiedChatResponse {
    private String reply;
    /** "faq" | "gemini" | "fallback" */
    private String source;
}
