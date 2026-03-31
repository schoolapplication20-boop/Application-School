package com.schoolers.dto;

import lombok.Data;

@Data
public class CreateTeacherRequest {
    private String name;
    private String email;
    private String mobile;
    private String empId;
    private String subject;
    private String department;
    private String qualification;
    private String experience;
    private String joiningDate;
    private String classes;
    private String status;
    private String password; // admin-set initial password; falls back to auto-generated if absent
    /** CLASS_TEACHER or SUBJECT_TEACHER */
    private String teacherType;
    /** ID of the classroom this teacher is primary class teacher for */
    private Long primaryClassId;
}
