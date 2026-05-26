package com.schoolers.service;

import com.schoolers.model.RevokedToken;
import com.schoolers.repository.RevokedTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TokenBlacklistService Unit Tests")
class TokenBlacklistServiceTest {

    @InjectMocks
    private TokenBlacklistService tokenBlacklistService;

    @Mock
    private RevokedTokenRepository revokedTokenRepository;

    @BeforeEach
    void setUp() {
        when(revokedTokenRepository.findByExpiresAtAfter(any(LocalDateTime.class)))
            .thenReturn(Collections.emptyList());
        tokenBlacklistService.loadFromDb();
    }

    @Test
    @DisplayName("isRevoked returns false for a fresh token that was never revoked")
    void isRevoked_nonRevokedToken_returnsFalse() {
        assertFalse(tokenBlacklistService.isRevoked("fresh-jwt-token"));
    }

    @Test
    @DisplayName("revoke adds token to in-memory set so isRevoked returns true immediately")
    void revoke_addsTokenToInMemorySet() {
        String token = "test-jwt-token";
        LocalDateTime expiry = LocalDateTime.now().plusHours(2);

        when(revokedTokenRepository.existsByTokenHash(anyString())).thenReturn(false);
        when(revokedTokenRepository.save(any(RevokedToken.class))).thenReturn(null);

        tokenBlacklistService.revoke(token, expiry);

        assertTrue(tokenBlacklistService.isRevoked(token));
        verify(revokedTokenRepository).save(any(RevokedToken.class));
    }

    @Test
    @DisplayName("revoke skips DB save when token hash already exists — avoids duplicate constraint violation")
    void revoke_alreadyInDb_skipsSave() {
        String token = "duplicate-token";
        LocalDateTime expiry = LocalDateTime.now().plusHours(1);

        when(revokedTokenRepository.existsByTokenHash(anyString())).thenReturn(true);

        tokenBlacklistService.revoke(token, expiry);

        assertTrue(tokenBlacklistService.isRevoked(token));
        verify(revokedTokenRepository, never()).save(any(RevokedToken.class));
    }

    @Test
    @DisplayName("purgeExpired removes entries from in-memory set that are no longer in DB")
    void purgeExpired_clearsExpiredTokensFromMemory() {
        String token = "expiring-token";
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(5);

        when(revokedTokenRepository.existsByTokenHash(anyString())).thenReturn(false);
        when(revokedTokenRepository.save(any(RevokedToken.class))).thenReturn(null);
        tokenBlacklistService.revoke(token, expiry);
        assertTrue(tokenBlacklistService.isRevoked(token));

        // Simulate purge: DB deletes 1 row, no active tokens remain
        when(revokedTokenRepository.deleteExpired(any(LocalDateTime.class))).thenReturn(1);
        when(revokedTokenRepository.findByExpiresAtAfter(any(LocalDateTime.class)))
            .thenReturn(Collections.emptyList());

        int removed = tokenBlacklistService.purgeExpired();

        assertEquals(1, removed);
        assertFalse(tokenBlacklistService.isRevoked(token));
    }

    @Test
    @DisplayName("loadFromDb pre-populates in-memory set from non-expired DB records on startup")
    void loadFromDb_populatesFromDb() {
        String token = "pre-existing-token";
        RevokedToken rt = RevokedToken.builder()
            .tokenHash(sha256(token))
            .expiresAt(LocalDateTime.now().plusHours(1))
            .build();

        when(revokedTokenRepository.findByExpiresAtAfter(any(LocalDateTime.class)))
            .thenReturn(List.of(rt));

        tokenBlacklistService.loadFromDb();

        assertTrue(tokenBlacklistService.isRevoked(token));
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(64);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
