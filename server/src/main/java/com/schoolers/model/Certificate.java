package com.schoolers.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "certificates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Certificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "certificate_id", nullable = false, unique = true, length = 30)
    private String certificateId;

    @NotNull
    @Column(name = "certificate_type", nullable = false, length = 30)
    private String certificateType; // BONAFIDE, TRANSFER, COURSE_COMPLETION, MARKS_MEMO

    @NotNull
    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @NotNull
    @Column(name = "student_name", nullable = false, length = 100)
    private String studentName;

    @NotNull
    @Column(name = "roll_number", nullable = false, length = 20)
    private String rollNumber;

    @NotNull
    @Column(name = "class_name", nullable = false, length = 10)
    private String className;

    @Column(length = 5)
    private String section;

    @NotNull
    @Column(name = "issue_date", nullable = false)
    private LocalDate issueDate;

    @Column(name = "academic_year", length = 10)
    private String academicYear;

    // Extra fields for specific certificate types (JSON)
    @Column(name = "extra_data", columnDefinition = "TEXT")
    private String extraData;

    @Column(name = "school_logo_url", columnDefinition = "TEXT")
    private String schoolLogoUrl;

    @Column(name = "principal_signature_url", columnDefinition = "TEXT")
    private String principalSignatureUrl;

    @Column(name = "purpose", length = 500)
    private String purpose;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "school_id")
    private Long schoolId;

    @Column(name = "generated_by", length = 100)
    private String generatedBy;

    @Column(name = "verified_by", length = 100)
    private String verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
