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
public class DemoBookingRequest {
    @NotBlank(message = "School name is required.")
    @Size(max = 200)
    private String schoolName;

    @NotBlank(message = "Contact person name is required.")
    @Size(max = 100)
    private String contactPerson;

    @NotBlank(message = "Email is required.")
    @Email(message = "A valid email address is required.")
    @Size(max = 150)
    private String email;

    @NotBlank(message = "Phone number is required.")
    @Size(max = 20)
    private String phone;

    @Size(max = 100)
    private String schoolType;

    @Size(max = 20)
    private String studentCount;

    @Size(max = 1000)
    private String message;
}
