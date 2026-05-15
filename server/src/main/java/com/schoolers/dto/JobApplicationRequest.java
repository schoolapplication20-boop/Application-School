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
public class JobApplicationRequest {
    @NotBlank(message = "Applicant name is required.")
    @Size(max = 100)
    private String applicantName;

    @NotBlank(message = "Email is required.")
    @Email(message = "A valid email address is required.")
    @Size(max = 150)
    private String email;

    @Size(max = 20)
    private String phone;

    @NotBlank(message = "Position is required.")
    @Size(max = 100)
    private String position;

    @Size(max = 100)
    private String experience;

    @Size(max = 3000)
    private String coverLetter;
}
