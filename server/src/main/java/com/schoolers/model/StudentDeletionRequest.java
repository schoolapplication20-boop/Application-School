package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Student deletion approval workflow. ADMIN submits a request with a reason;
 * SUPER_ADMIN approves (soft-delete + disable login) or rejects it.
 * Records are never deleted — this table is the complete audit trail.
 *
 * status values: PENDING | APPROVED | REJECTED
 */
@Entity
@Table(
    name = "student_deletion_requests",
    indexes = {
        @Index(name = "idx_sdr_school_status", columnList = "school_id, status"),
        @Index(name = "idx_sdr_requested_by",  columnList = "requested_by_user_id"),
        @Index(name = "idx_sdr_requested_at",  columnList = "requested_at")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDeletionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", unique = true, nullable = false, length = 36)
    private String requestId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    @Column(name = "student_name", length = 150)
    private String studentName;

    @Column(name = "class_name", length = 60)
    private String className;

    @Column(name = "requested_by_user_id")
    private Long requestedByUserId;

    @Column(name = "requested_by_name", length = 150)
    private String requestedByName;

    @Column(name = "reason", columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "approved_by_user_id")
    private Long approvedByUserId;

    @Column(name = "approved_by_name", length = 150)
    private String approvedByName;

    /** Rejection reason or approval remarks, depending on status. */
    @Column(name = "decision_notes", columnDefinition = "TEXT")
    private String decisionNotes;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "actioned_at")
    private LocalDateTime actionedAt;
}
