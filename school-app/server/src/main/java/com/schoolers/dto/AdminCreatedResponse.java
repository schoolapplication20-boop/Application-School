package com.schoolers.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminCreatedResponse {
    private Long id;
    private String name;
    private String email;
    private String mobile;
    private String generatedPassword;
}
