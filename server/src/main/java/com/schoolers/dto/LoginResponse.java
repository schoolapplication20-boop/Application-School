package com.schoolers.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private String  token;
    private UserDto user;

    /** Set to true when APPLICATION_OWNER login requires OTP verification. */
    private Boolean otpRequired;
    /** The owner email to show in the OTP prompt. */
    private String  otpEmail;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserDto {
        private Long    id;
        private String  name;
        private String  email;
        private String  mobile;
        private String  role;
        private Boolean firstLogin;
        private String  permissions;
        private Long    schoolId;
        private SchoolDto school;
        private Boolean needsSchoolSetup;
        private String  teacherType;
        /** True when this user is the designated School-wide Diary Coordinator for their school. */
        private Boolean isCoordinator;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SchoolDto {
        private Long    id;
        private Integer schoolId;
        private String  name;
        private String  code;
        private String  logoUrl;
        private String  primaryColor;
        private String  secondaryColor;
        private String  features;
        private String  subscriptionPlan;
        private String  academicYear;
    }
}
