package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "admission_applications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdmissionApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_name", nullable = false, length = 100)
    private String studentName;

    @Column(length = 15)
    private String dob;

    @Column(length = 10)
    private String gender;

    @Column(name = "class_applied", length = 20)
    private String classApplied;

    @Column(name = "father_name", length = 100)
    private String fatherName;

    @Column(name = "father_phone", length = 15)
    private String fatherPhone;

    @Column(name = "mother_name", length = 100)
    private String motherName;

    @Column(name = "mother_phone", length = 15)
    private String motherPhone;

    @Column(name = "guardian_name", length = 100)
    private String guardianName;

    @Column(name = "guardian_phone", length = 15)
    private String guardianPhone;

    @Column(length = 150)
    private String email;

    @Column(name = "prev_school", length = 150)
    private String prevSchool;

    @Column(name = "permanent_address", columnDefinition = "TEXT")
    private String permanentAddress;

    @Column(name = "alternate_address", columnDefinition = "TEXT")
    private String alternateAddress;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    @Builder.Default
    private Status status = Status.PENDING;

    // @Column(name = "admin_notes", columnDefinition = "TEXT")
    // private String adminNotes;

    @Column(name = "id_proof", columnDefinition = "TEXT")
    private String idProof;

    @Column(name = "id_proof_name", length = 255)
    private String idProofName;

    @Column(name = "tc_doc", columnDefinition = "TEXT")
    private String tcDoc;

    @Column(name = "tc_doc_name", length = 255)
    private String tcDocName;

    @Column(name = "bonafide_doc", columnDefinition = "TEXT")
    private String bonafideDoc;

    @Column(name = "bonafide_doc_name", length = 255)
    private String bonafideDocName;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Status {
        PENDING, APPROVED, REJECTED
    }
}
