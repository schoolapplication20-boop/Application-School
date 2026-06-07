package com.schoolers.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Stores client-supplied idempotency keys for fee collection endpoints.
 * A matching (key, schoolId) pair means the request was already processed — return 200 without re-processing.
 */
@Entity
@Table(name = "idempotency_keys",
        uniqueConstraints = @UniqueConstraint(name = "uk_idempotency_key_school",
                columnNames = {"idem_key", "school_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IdempotencyKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "idem_key", nullable = false, length = 64)
    private String key;

    @NotNull
    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    @Column(name = "endpoint", length = 120)
    private String endpoint;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
