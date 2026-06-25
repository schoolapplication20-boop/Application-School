package com.schoolers.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "school_auth_config")
@Data
public class SchoolAuthConfig {

    @Id
    @Column(name = "school_id")
    private Long schoolId;

    @Column(name = "student_login_method", length = 30, nullable = false)
    private String studentLoginMethod = "EMAIL_OR_ADMISSION";

    @Column(name = "email_mandatory_students", nullable = false)
    private Boolean emailMandatoryStudents = true;

    @Column(name = "email_verification", nullable = false)
    private Boolean emailVerification = true;

    @Column(name = "forgot_password_method", length = 20, nullable = false)
    private String forgotPasswordMethod = "EMAIL_OTP";

    @Column(name = "allow_self_signup", nullable = false)
    private Boolean allowSelfSignup = true;

    @Column(name = "session_timeout_minutes", nullable = false)
    private Integer sessionTimeoutMinutes = 60;

    @Column(name = "max_failed_attempts", nullable = false)
    private Integer maxFailedAttempts = 5;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
