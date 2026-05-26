package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Stores SHA-256 hashes of revoked JWTs so the server can reject them before expiry.
 * Rows are cleaned up by MaintenanceService once the token's natural expiry passes.
 */
@Entity
@Table(name = "revoked_tokens",
        indexes = @Index(name = "idx_revoked_tokens_hash", columnList = "token_hash"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevokedToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_hash", nullable = false, length = 64, unique = true)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
