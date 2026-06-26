package com.schoolers.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/** Credential row returned in bulk import response when createAccounts=true. */
@Data
@AllArgsConstructor
public class StudentCredentialDto {
    private String studentName;
    private String admissionNumber;
    private String username;
    private String loginEmail;
    private String tempPassword;
}
