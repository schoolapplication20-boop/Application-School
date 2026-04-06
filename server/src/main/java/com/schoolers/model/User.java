package com.schoolers.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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

    @JsonIgnore
    @NotBlank
    @Column(nullable = false)
    private String password;

    /** Plain-text generated password — stored only until user changes it on first login */
    @JsonIgnore
    @Column(name = "temp_password", length = 30)
    private String tempPassword;

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

    @Column(name = "reset_otp", length = 10)
    private String resetOtp;

    @Column(name = "otp_expiry")
    private LocalDateTime otpExpiry;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Role {
        SUPER_ADMIN, ADMIN, TEACHER, PARENT, STUDENT
    }
}
