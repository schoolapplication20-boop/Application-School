package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Immutable audit trail. Every significant write action (create/update/delete)
 * should produce one record. Never delete rows from this table.
 */
@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_school_created", columnList = "school_id, created_at DESC"),
        @Index(name = "idx_audit_actor", columnList = "actor_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** User who performed the action (null for system/anonymous actions). */
    @Column(name = "actor_id")
    private Long actorId;

    @Column(name = "actor_name", length = 100)
    private String actorName;

    @Column(name = "actor_role", length = 30)
    private String actorRole;

    /** School context — null only for APPLICATION_OWNER actions. */
    @Column(name = "school_id")
    private Long schoolId;

    /** Verb: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, etc. */
    @Column(nullable = false, length = 30)
    private String action;

    /** Entity type being acted on, e.g. "Student", "FeePayment", "Teacher". */
    @Column(name = "entity_type", length = 60)
    private String entityType;

    /** Primary key of the affected entity. */
    @Column(name = "entity_id")
    private Long entityId;

    /** Human-readable summary of what changed. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** JSON snapshot of old value (for UPDATE/DELETE). Stored as TEXT. */
    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    /** JSON snapshot of new value (for CREATE/UPDATE). Stored as TEXT. */
    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    /** Client IP address extracted from the HTTP request. */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
