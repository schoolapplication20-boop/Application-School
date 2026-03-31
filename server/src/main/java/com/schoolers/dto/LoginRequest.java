package com.schoolers.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    private String email;
    private String mobile;

    @NotBlank(message = "Password is required")
    private String password;

    private String loginType; // "email" or "mobile"
}
