package com.schoolers.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DemoBookingRequest {
    private String schoolName;
    private String contactPerson;
    private String email;
    private String phone;
    private String schoolType;
    private String studentCount;
    private String message;
}
