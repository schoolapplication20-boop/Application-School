package com.schoolers.service;

import com.schoolers.model.RevokedToken;
import com.schoolers.repository.RevokedTokenRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Maintains an in-memory set of revoked JWT hashes for O(1) lookup on every request.
 * The set is backed by the revoked_tokens DB table and loaded at startup.
 * New revocations are written to DB and immediately added to the in-memory set.
 */
@Service
public class TokenBlacklistService {

    private static final Logger log = LoggerFactory.getLogger(TokenBlacklistService.class);

    @Autowired private RevokedTokenRepository revokedTokenRepository;

    private final Set<String> revokedHashes = ConcurrentHashMap.newKeySet();

    /** Load all non-expired revoked tokens from DB into the in-memory set on startup. */
    @PostConstruct
    public void loadFromDb() {
        try {
            revokedTokenRepository.findByExpiresAtAfter(LocalDateTime.now())
                    .forEach(r -> revokedHashes.add(r.getTokenHash()));
            log.info("[TokenBlacklist] Loaded {} revoked token(s) from DB.", revokedHashes.size());
        } catch (Exception e) {
            log.error("[TokenBlacklist] Failed to load revoked tokens: {}", e.getMessage());
        }
    }

    /** Revoke a token — adds to DB and in-memory cache immediately. */
    @Transactional
    public void revoke(String token, LocalDateTime expiresAt) {
        String hash = sha256(token);
        try {
            if (!revokedTokenRepository.existsByTokenHash(hash)) {
                revokedTokenRepository.save(RevokedToken.builder()
                        .tokenHash(hash).expiresAt(expiresAt).build());
            }
        } catch (DataIntegrityViolationException e) {
            // concurrent revoke — already saved, safe to ignore
        }
        revokedHashes.add(hash);
    }

    /** Returns true if the token has been explicitly revoked (O(1) — no DB hit). */
    public boolean isRevoked(String token) {
        return revokedHashes.contains(sha256(token));
    }

    /** Called by MaintenanceService to purge expired entries from both DB and in-memory set. */
    public int purgeExpired() {
        int removed = revokedTokenRepository.deleteExpired(LocalDateTime.now());
        // Also refresh in-memory set to remove hashes no longer in DB
        Set<String> active = ConcurrentHashMap.newKeySet();
        revokedTokenRepository.findByExpiresAtAfter(LocalDateTime.now())
                .forEach(r -> active.add(r.getTokenHash()));
        revokedHashes.retainAll(active);
        return removed;
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(64);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 unavailable", e);
        }
    }
}
