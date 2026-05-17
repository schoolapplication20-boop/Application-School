package com.schoolers.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FailedRowDto {
    private int rowNumber;
    private String fullName;
    private String admissionNumber;
    private String rollNumber;
    private String className;
    private String reason;
}
