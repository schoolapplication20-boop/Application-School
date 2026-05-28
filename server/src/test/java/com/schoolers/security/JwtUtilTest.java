package com.schoolers.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for JwtUtil — no Spring context, no database.
 *
 * ReflectionTestUtils injects @Value fields so the component can be tested
 * as a plain Java object. Tests cover: generation, extraction of standard and
 * custom claims (schoolId, role), validation, tamper detection, and expiry.
 */
class JwtUtilTest {

    // Must be ≥ 32 bytes for HMAC-SHA-256.
    private static final String SECRET =
            "test-jwt-secret-key-that-is-long-enough-for-hmac256";
    private static final long   EXPIRY_MS = 3_600_000L; // 1 hour

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret",       SECRET);
        ReflectionTestUtils.setField(jwtUtil, "expirationMs", EXPIRY_MS);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private UserDetails ud(String email) {
        return new User(email, "pw",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

    private Map<String, Object> claims(String role, Long schoolId) {
        Map<String, Object> m = new HashMap<>();
        m.put("role", role);
        if (schoolId != null) m.put("schoolId", schoolId);
        return m;
    }

    // ── token generation & username extraction ────────────────────────────────

    @Test
    @DisplayName("generateToken: extracted username matches UserDetails")
    void generateToken_extractUsername_roundTrip() {
        String token = jwtUtil.generateToken(ud("teacher@school.com"));
        assertThat(jwtUtil.extractUsername(token)).isEqualTo("teacher@school.com");
    }

    @Test
    @DisplayName("generateToken with claims: schoolId survives encode/decode")
    void generateToken_withClaims_schoolIdRoundTrip() {
        String token = jwtUtil.generateToken(ud("admin@school.com"), claims("ADMIN", 42L));
        assertThat(jwtUtil.extractSchoolId(token)).isEqualTo(42L);
    }

    @Test
    @DisplayName("generateToken with claims: role survives encode/decode")
    void generateToken_withClaims_roleRoundTrip() {
        String token = jwtUtil.generateToken(ud("t@school.com"), claims("TEACHER", 7L));
        assertThat(jwtUtil.extractRole(token)).isEqualTo("TEACHER");
    }

    // ── extractSchoolId edge cases ────────────────────────────────────────────

    @Test
    @DisplayName("extractSchoolId returns null when claim is absent (APPLICATION_OWNER)")
    void extractSchoolId_returnsNull_whenClaimAbsent() {
        String token = jwtUtil.generateToken(ud("owner@platform.com")); // no schoolId claim
        assertThat(jwtUtil.extractSchoolId(token)).isNull();
    }

    @Test
    @DisplayName("extractSchoolId handles numeric types stored as Integer by JWT lib")
    void extractSchoolId_handlesIntegerValue() {
        Map<String, Object> m = new HashMap<>();
        m.put("schoolId", 99); // Integer, not Long
        String token = jwtUtil.generateToken(ud("admin@s.com"), m);
        assertThat(jwtUtil.extractSchoolId(token)).isEqualTo(99L);
    }

    // ── extractRole edge cases ────────────────────────────────────────────────

    @Test
    @DisplayName("extractRole returns null when claim is absent")
    void extractRole_returnsNull_whenClaimAbsent() {
        String token = jwtUtil.generateToken(ud("user@app.com"));
        assertThat(jwtUtil.extractRole(token)).isNull();
    }

    @Test
    @DisplayName("extractRole returns APPLICATION_OWNER correctly")
    void extractRole_applicationOwner() {
        Map<String, Object> m = new HashMap<>();
        m.put("role", "APPLICATION_OWNER");
        String token = jwtUtil.generateToken(ud("owner@platform.com"), m);
        assertThat(jwtUtil.extractRole(token)).isEqualTo("APPLICATION_OWNER");
    }

    // ── validateToken ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("validateToken returns true for a fresh token with matching user")
    void validateToken_returnsTrue_forValidTokenAndMatchingUser() {
        UserDetails user = ud("admin@school.com");
        String token = jwtUtil.generateToken(user, claims("ADMIN", 1L));
        assertThat(jwtUtil.validateToken(token, user)).isTrue();
    }

    @Test
    @DisplayName("validateToken returns false when username does not match")
    void validateToken_returnsFalse_usernameMismatch() {
        String token = jwtUtil.generateToken(ud("alice@school.com"));
        assertThat(jwtUtil.validateToken(token, ud("bob@school.com"))).isFalse();
    }

    // ── isValidToken ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("isValidToken returns true for a legitimate token")
    void isValidToken_returnsTrue_forFreshToken() {
        assertThat(jwtUtil.isValidToken(jwtUtil.generateToken(ud("x@y.com")))).isTrue();
    }

    @Test
    @DisplayName("isValidToken returns false when the signature is tampered")
    void isValidToken_returnsFalse_tamperedSignature() {
        String token   = jwtUtil.generateToken(ud("x@y.com"));
        String tampered = token.substring(0, token.lastIndexOf('.') + 1) + "tampered-sig";
        assertThat(jwtUtil.isValidToken(tampered)).isFalse();
    }

    @Test
    @DisplayName("isValidToken returns false for a blank string")
    void isValidToken_returnsFalse_blankToken() {
        assertThat(jwtUtil.isValidToken("")).isFalse();
    }

    @Test
    @DisplayName("isValidToken returns false for an expired token")
    void isValidToken_returnsFalse_expiredToken() throws InterruptedException {
        JwtUtil shortLived = new JwtUtil();
        ReflectionTestUtils.setField(shortLived, "secret",       SECRET);
        ReflectionTestUtils.setField(shortLived, "expirationMs", 1L); // 1 ms

        String token = shortLived.generateToken(ud("x@y.com"));
        Thread.sleep(20);

        assertThat(shortLived.isValidToken(token)).isFalse();
    }

    @Test
    @DisplayName("isValidToken returns false when signed with a different secret")
    void isValidToken_returnsFalse_wrongSecret() {
        JwtUtil other = new JwtUtil();
        ReflectionTestUtils.setField(other, "secret",
                "completely-different-secret-also-long-enough-32");
        ReflectionTestUtils.setField(other, "expirationMs", EXPIRY_MS);

        String tokenFromOther = other.generateToken(ud("x@y.com"));
        assertThat(jwtUtil.isValidToken(tokenFromOther)).isFalse();
    }

    // ── expiration extraction ─────────────────────────────────────────────────

    @Test
    @DisplayName("extractExpiration returns a date in the future for a fresh token")
    void extractExpiration_isInTheFuture() {
        String token = jwtUtil.generateToken(ud("x@y.com"));
        assertThat(jwtUtil.extractExpiration(token))
                .isAfter(new java.util.Date());
    }

    @Test
    @DisplayName("extractExpiration is approximately now + EXPIRY_MS")
    void extractExpiration_approximatelyNowPlusExpiry() {
        long before = System.currentTimeMillis();
        String token = jwtUtil.generateToken(ud("x@y.com"));
        long expMs = jwtUtil.extractExpiration(token).getTime();
        assertThat(expMs).isBetween(before + EXPIRY_MS - 1000, before + EXPIRY_MS + 1000);
    }
}
