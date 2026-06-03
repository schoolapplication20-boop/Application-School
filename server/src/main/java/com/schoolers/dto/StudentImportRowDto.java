package com.schoolers.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentImportRowDto {
    private int rowNumber;
    private String admissionNumber;
    private String fullName;
    private String rollNumber;
    private String className;
    private String section;
    private String fatherName;
    private String fatherPhone;
    private String motherName;
    private String motherPhone;
    private String address;
    private String idProofFileName;
    private String studentEmail;  // optional — if provided, account is created and activation email is sent
}
