package com.schoolers.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Stores every fee-modification request submitted by an ADMIN.
 * Super Admins approve or reject; on approval the pending payload is applied.
 * Records are never deleted — this table is the complete audit trail.
 *
 * requestType values:
 *   FEE_STRUCTURE_SAVE      – create / update ClassFeeStructure
 *   FEE_STRUCTURE_DELETE    – delete ClassFeeStructure
 *   STUDENT_FEE_UPDATE      – update existing StudentFeeAssignment (incl. condonation via form)
 *   CONDONATION_UPDATE      – condonation-only patch on existing assignment
 *   ASSIGNMENT_DELETE       – delete StudentFeeAssignment
 *
 * status values: PENDING | APPROVED | REJECTED
 */
@Entity
@Table(
    name = "fee_edit_requests",
    indexes = {
        @Index(name = "idx_fer_school_status", columnList = "school_id, status"),
        @Index(name = "idx_fer_requested_by",  columnList = "requested_by_user_id"),
        @Index(name = "idx_fer_requested_at",  columnList = "requested_at")
    }
)
public class FeeEditRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", unique = true, nullable = false, length = 36)
    private String requestId;

    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    @Column(name = "requested_by_user_id", nullable = false)
    private Long requestedByUserId;

    @Column(name = "requested_by_name", length = 150)
    private String requestedByName;

    @Column(name = "request_type", nullable = false, length = 60)
    private String requestType;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "student_name", length = 150)
    private String studentName;

    @Column(name = "class_name", length = 60)
    private String className;

    /** JSON snapshot of the current / existing values (for display) */
    @Column(name = "existing_values", columnDefinition = "TEXT")
    private String existingValues;

    /** JSON description of what the admin wants to change (for display) */
    @Column(name = "new_values", columnDefinition = "TEXT")
    private String newValues;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "approved_by_user_id")
    private Long approvedByUserId;

    @Column(name = "approved_by_name", length = 150)
    private String approvedByName;

    @Column(name = "approval_notes", columnDefinition = "TEXT")
    private String approvalNotes;

    /** Exact API request body JSON that will be replayed on approval */
    @Column(name = "pending_payload", columnDefinition = "TEXT")
    private String pendingPayload;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "actioned_at")
    private LocalDateTime actionedAt;

    // ── Getters & Setters ────────────────────────────────────────────────────

    public Long getId() { return id; }

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }

    public Long getSchoolId() { return schoolId; }
    public void setSchoolId(Long schoolId) { this.schoolId = schoolId; }

    public Long getRequestedByUserId() { return requestedByUserId; }
    public void setRequestedByUserId(Long requestedByUserId) { this.requestedByUserId = requestedByUserId; }

    public String getRequestedByName() { return requestedByName; }
    public void setRequestedByName(String requestedByName) { this.requestedByName = requestedByName; }

    public String getRequestType() { return requestType; }
    public void setRequestType(String requestType) { this.requestType = requestType; }

    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }

    public String getExistingValues() { return existingValues; }
    public void setExistingValues(String existingValues) { this.existingValues = existingValues; }

    public String getNewValues() { return newValues; }
    public void setNewValues(String newValues) { this.newValues = newValues; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getApprovedByUserId() { return approvedByUserId; }
    public void setApprovedByUserId(Long approvedByUserId) { this.approvedByUserId = approvedByUserId; }

    public String getApprovedByName() { return approvedByName; }
    public void setApprovedByName(String approvedByName) { this.approvedByName = approvedByName; }

    public String getApprovalNotes() { return approvalNotes; }
    public void setApprovalNotes(String approvalNotes) { this.approvalNotes = approvalNotes; }

    public String getPendingPayload() { return pendingPayload; }
    public void setPendingPayload(String pendingPayload) { this.pendingPayload = pendingPayload; }

    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }

    public LocalDateTime getActionedAt() { return actionedAt; }
    public void setActionedAt(LocalDateTime actionedAt) { this.actionedAt = actionedAt; }
}
