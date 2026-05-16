package com.schoolers.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("JwtUtil Unit Tests")
class JwtUtilTest {

    private JwtUtil jwtUtil;
    private static final String TEST_SECRET = "ThisIsATestSecretKeyThatIsAtLeast32BytesLong!";
    private static final long EXPIRATION_MS = 3_600_000L; // 1 hour

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", EXPIRATION_MS);
    }

    private UserDetails makeUser(String username) {
        return User.withUsername(username)
                   .password("password")
                   .authorities(Collections.emptyList())
                   .build();
    }

    // ── Token Generation ────────────────────────────────────────────────────

    @Test
    @DisplayName("generateToken returns a non-null, non-blank token")
    void generateToken_returnsNonBlankToken() {
        UserDetails user = makeUser("admin@test.com");
        String token = jwtUtil.generateToken(user);
        assertNotNull(token);
        assertFalse(token.isBlank());
    }

    @Test
    @DisplayName("generateToken with extra claims embeds claims in token")
    void generateToken_withExtraClaims_embedsClaims() {
        UserDetails user = makeUser("admin@test.com");
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", "ADMIN");
        claims.put("schoolId", 5L);

        String token = jwtUtil.generateToken(user, claims);

        assertEquals("ADMIN", jwtUtil.extractRole(token));
        assertEquals(5L, jwtUtil.extractSchoolId(token));
    }

    @Test
    @DisplayName("Different users produce different tokens")
    void generateToken_differentUsers_differentTokens() {
        String token1 = jwtUtil.generateToken(makeUser("user1@test.com"));
        String token2 = jwtUtil.generateToken(makeUser("user2@test.com"));
        assertNotEquals(token1, token2);
    }

    // ── Username Extraction ─────────────────────────────────────────────────

    @Test
    @DisplayName("extractUsername returns the subject embedded in the token")
    void extractUsername_returnsCorrectSubject() {
        UserDetails user = makeUser("teacher@school.com");
        String token = jwtUtil.generateToken(user);
        assertEquals("teacher@school.com", jwtUtil.extractUsername(token));
    }

    // ── Expiration ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("extractExpiration returns a future date for a fresh token")
    void extractExpiration_futureDate() {
        String token = jwtUtil.generateToken(makeUser("a@b.com"));
        Date expiry  = jwtUtil.extractExpiration(token);
        assertNotNull(expiry);
        assertTrue(expiry.after(new Date()));
    }

    @Test
    @DisplayName("Expired token fails isValidToken check")
    void expiredToken_failsValidation() throws InterruptedException {
        // Create util with 1ms expiry
        JwtUtil shortLivedUtil = new JwtUtil();
        ReflectionTestUtils.setField(shortLivedUtil, "secret", TEST_SECRET);
        ReflectionTestUtils.setField(shortLivedUtil, "expirationMs", 1L);

        String token = shortLivedUtil.generateToken(makeUser("a@b.com"));
        Thread.sleep(10); // wait for token to expire

        assertFalse(shortLivedUtil.isValidToken(token));
    }

    // ── Token Validation ────────────────────────────────────────────────────

    @Test
    @DisplayName("validateToken returns true for matching user and valid token")
    void validateToken_validToken_returnsTrue() {
        UserDetails user = makeUser("student@school.com");
        String token = jwtUtil.generateToken(user);
        assertTrue(jwtUtil.validateToken(token, user));
    }

    @Test
    @DisplayName("validateToken returns false for mismatched user")
    void validateToken_wrongUser_returnsFalse() {
        UserDetails alice = makeUser("alice@school.com");
        UserDetails bob   = makeUser("bob@school.com");
        String token = jwtUtil.generateToken(alice);
        assertFalse(jwtUtil.validateToken(token, bob));
    }

    @Test
    @DisplayName("isValidToken returns false for garbage string")
    void isValidToken_garbageToken_returnsFalse() {
        assertFalse(jwtUtil.isValidToken("not.a.valid.jwt"));
    }

    @Test
    @DisplayName("isValidToken returns false for empty string")
    void isValidToken_emptyToken_returnsFalse() {
        assertFalse(jwtUtil.isValidToken(""));
    }

    @Test
    @DisplayName("isValidToken returns false for null-like blank token")
    void isValidToken_blankToken_returnsFalse() {
        assertFalse(jwtUtil.isValidToken("   "));
    }

    // ── Custom Claims ───────────────────────────────────────────────────────

    @Test
    @DisplayName("extractRole returns null when no role claim present")
    void extractRole_noRoleClaim_returnsNull() {
        String token = jwtUtil.generateToken(makeUser("a@b.com"));
        assertNull(jwtUtil.extractRole(token));
    }

    @Test
    @DisplayName("extractSchoolId returns null when no schoolId claim present")
    void extractSchoolId_noSchoolIdClaim_returnsNull() {
        String token = jwtUtil.generateToken(makeUser("a@b.com"));
        assertNull(jwtUtil.extractSchoolId(token));
    }

    @Test
    @DisplayName("extractSchoolId returns correct value when claim is set")
    void extractSchoolId_withClaim_returnsCorrectValue() {
        Map<String, Object> claims = new HashMap<>();
        claims.put("schoolId", 42L);
        String token = jwtUtil.generateToken(makeUser("a@b.com"), claims);
        assertEquals(42L, jwtUtil.extractSchoolId(token));
    }

    // ── Secret Validation ───────────────────────────────────────────────────

    @Test
    @DisplayName("BUG CHECK: Short secret key throws IllegalStateException")
    void shortSecret_throwsIllegalStateException() {
        JwtUtil weakUtil = new JwtUtil();
        ReflectionTestUtils.setField(weakUtil, "secret", "tooshort");
        ReflectionTestUtils.setField(weakUtil, "expirationMs", EXPIRATION_MS);

        // Should throw because secret is < 32 bytes
        assertThrows(IllegalStateException.class,
            () -> weakUtil.generateToken(makeUser("a@b.com")));
    }
}
