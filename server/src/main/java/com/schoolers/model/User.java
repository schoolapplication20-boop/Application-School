package com.schoolers.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users",
        uniqueConstraints = {
            @UniqueConstraint(name = "uk_users_email",    columnNames = "email"),
            @UniqueConstraint(name = "uk_users_mobile",   columnNames = "mobile"),
            @UniqueConstraint(name = "uk_users_username", columnNames = "username")
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(min = 2, max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    @NotNull
    @Email
    @Column(nullable = false, length = 150)
    private String email;

    /**
     * Login username — populated only for STUDENT accounts.
     * Format: firstname + lastname + last4OfAdmissionNumber (e.g. rahulsharma0045).
     * Unique across all users.
     */
    @Column(name = "username", length = 60)
    private String username;

    /**
     * Foreign key to students.id — set only when role = STUDENT.
     * Allows direct lookup of which student this login belongs to.
     */
    @Column(name = "student_id")
    private Long studentId;

    @Column(length = 15)
    private String mobile;

    @Column(columnDefinition = "TEXT")
    private String address;

    @JsonIgnore
    @NotBlank
    @Column(nullable = false)
    private String password;

    /** Plain-text generated password — stored only until user changes it on first login */
    @JsonIgnore
    @Column(name = "temp_password", length = 30)
    private String tempPassword;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "first_login")
    @Builder.Default
    private Boolean firstLogin = false;

    /** JSON string storing the admin's module permissions, e.g. {"students":true,"teachers":false,...} */
    @Column(name = "permissions", columnDefinition = "TEXT")
    private String permissions;

    /**
     * Multi-tenancy: which school this user belongs to.
     *
     * Role         | schoolId
     * -------------|------------------------------------------
     * APPLICATION_OWNER | NULL  — platform-level, no school affiliation
     * SUPER_ADMIN  | NOT NULL — each SUPER_ADMIN owns exactly one school
     * ADMIN        | NOT NULL — belongs to the SUPER_ADMIN's school
     * TEACHER      | NOT NULL — belongs to their school
     * PARENT       | NOT NULL — belongs to their child's school
     * STUDENT      | NOT NULL — belongs to their school
     *
     * Constraint: at most ONE SUPER_ADMIN per school_id (enforced in service layer).
     */
    @Column(name = "school_id")
    private Long schoolId;

    @JsonIgnore
    @Column(name = "reset_otp", length = 64)
    private String resetOtp;

    @JsonIgnore
    @Column(name = "otp_expiry")
    private LocalDateTime otpExpiry;

    /** Consecutive failed password attempts since last successful login. */
    @JsonIgnore
    @Column(name = "failed_login_attempts")
    @Builder.Default
    private Integer failedLoginAttempts = 0;

    /** Account is locked until this timestamp (UTC). Null means not locked. */
    @JsonIgnore
    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    /** Expo push notification token for the mobile app. Null if not registered or unsubscribed. */
    @JsonIgnore
    @Column(name = "push_token", length = 255)
    private String pushToken;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Role {
        /** Platform-level owner — full access, no schoolId. Legacy alias for SUPER_ADMIN. */
        APPLICATION_OWNER,
        SUPER_ADMIN, ADMIN, TEACHER, STUDENT
    }
}
