package com.schoolers.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Credential row returned in bulk import response when createAccounts=true. */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class StudentCredentialDto {
    private String studentName;
    private String admissionNumber;
    private String className;
    private String section;
    private String fatherName;
    private String fatherPhone;
    private String username;
    private String loginEmail;
    private String tempPassword;
}
