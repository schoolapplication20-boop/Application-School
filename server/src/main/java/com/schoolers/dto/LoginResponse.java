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

    private String token;
    private UserDto user;

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
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SchoolDto {
        private Long   id;
        private String name;
        private String code;
        private String logoUrl;
        private String primaryColor;
        private String secondaryColor;
        private String features;
        private String subscriptionPlan;
        private String academicYear;
    }
}
