package com.schoolers.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContactMessageRequest {

    @NotBlank(message = "Full name is required.")
    @Size(max = 100)
    private String name;

    @NotBlank(message = "Email is required.")
    @Email(message = "A valid email address is required.")
    @Size(max = 150)
    private String email;

    @NotBlank(message = "Subject is required.")
    @Size(max = 200)
    private String subject;

    @NotBlank(message = "Message is required.")
    @Size(max = 2000)
    private String message;
}
