package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "students", uniqueConstraints = {
    @UniqueConstraint(name = "uq_roll_class_section", columnNames = {"roll_number", "class_name", "section"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "roll_number", nullable = false, length = 20)
    private String rollNumber;

    @Column(name = "admission_number", length = 30)
    private String admissionNumber;

    @Column(name = "class_name", nullable = false, length = 10)
    private String className;

    @Column(length = 5)
    private String section;

    @Column(name = "student_user_id")
    private Long studentUserId;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "parent_name", length = 100)
    private String parentName;

    @Column(name = "parent_mobile", length = 15)
    private String parentMobile;

    @Column(name = "mother_name", length = 100)
    private String motherName;

    @Column(name = "mother_mobile", length = 15)
    private String motherMobile;

    @Column(name = "guardian_name", length = 100)
    private String guardianName;

    @Column(name = "guardian_mobile", length = 15)
    private String guardianMobile;

    @Column(name = "photo_url", columnDefinition = "TEXT")
    private String photoUrl;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "alternate_address", columnDefinition = "TEXT")
    private String alternateAddress;

    @Column(name = "id_proof", columnDefinition = "TEXT")
    private String idProof;

    @Column(name = "id_proof_name", length = 255)
    private String idProofName;

    @Column(name = "tc_document", columnDefinition = "TEXT")
    private String tcDocument;

    @Column(name = "tc_document_name", length = 255)
    private String tcDocumentName;

    @Column(name = "bonafide_document", columnDefinition = "TEXT")
    private String bonafideDocument;

    @Column(name = "bonafide_document_name", length = 255)
    private String bonafideDocumentName;

    @Column(name = "blood_group", length = 10)
    private String bloodGroup;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
