package com.schoolers.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "school_privacy_config")
@Data
public class SchoolPrivacyConfig {

    @Id
    @Column(name = "school_id")
    private Long schoolId;

    /**
     * When true, teachers can only see student name / class / roll number.
     * Phone numbers, parent email, and fee details are visible only to
     * ADMIN and SUPER_ADMIN.
     */
    @Column(name = "hide_student_contact_info", nullable = false)
    private Boolean hideStudentContactInfo = false;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist @PreUpdate
    public void touch() { updatedAt = LocalDateTime.now(); }
}
