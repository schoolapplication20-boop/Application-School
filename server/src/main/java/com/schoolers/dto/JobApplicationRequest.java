package com.schoolers.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobApplicationRequest {
    private String applicantName;
    private String email;
    private String phone;
    private String position;
    private String experience;
    private String coverLetter;
}
