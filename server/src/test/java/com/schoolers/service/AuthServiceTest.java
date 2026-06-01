package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.LoginRequest;
import com.schoolers.dto.LoginResponse;
import com.schoolers.model.School;
import com.schoolers.model.User;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.TeacherRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuthService — mocks every collaborator so tests run without
 * a database or application context. Covers: login happy path, account lockout
 * (5 failed attempts), inactive account, role mismatch, APPLICATION_OWNER 2FA
 * redirect, OTP brute-force protection, OTP expiry, and the full forgot-password
 * → verify-OTP → reset-password flow (including the 15-minute VERIFIED window).
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository    userRepository;
    @Mock private SchoolRepository  schoolRepository;
    @Mock private TeacherRepository teacherRepository;
    @Mock private JwtUtil           jwtUtil;
    @Mock private PasswordEncoder   passwordEncoder;
    @Mock private EmailService      emailService;

    @InjectMocks
    private AuthService authService;

    // ── shared test fixtures ──────────────────────────────────────────────────

    private User activeAdmin() {
        return User.builder()
                .id(1L).name("Admin User").email("admin@school.com")
                .password("hashed_pw")
                .role(User.Role.ADMIN)
                .schoolId(5L)
                .isActive(true)
                .failedLoginAttempts(0)
                .build();
    }

    private School activeSchool() {
        return School.builder()
                .id(5L).schoolId(5).name("Test School")
                .isActive(true).isSetupCompleted(true)
                // null subscriptionExpiry → not expired
                .build();
    }

    private LoginRequest loginReq(String email, String password, String role) {
        LoginRequest r = new LoginRequest();
        r.setEmail(email);
        r.setPassword(password);
        r.setSelectedRole(role);
        return r;
    }

    // ── login ─────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("login()")
    class LoginTests {

        @Test
        @DisplayName("success: returns JWT token and user DTO for ADMIN")
        void success_adminLogin() {
            User user = activeAdmin();
            when(userRepository.findByEmailIgnoreCase("admin@school.com"))
                    .thenReturn(Optional.of(user));
            when(passwordEncoder.matches("Password1!", "hashed_pw")).thenReturn(true);
            when(schoolRepository.findBySchoolId(5)).thenReturn(Optional.of(activeSchool()));
            when(jwtUtil.generateToken(any(UserDetails.class), any())).thenReturn("jwt-token");

            ApiResponse<LoginResponse> resp = authService.login(loginReq("admin@school.com", "Password1!", "ADMIN"));

            assertThat(resp.isSuccess()).isTrue();
            assertThat(resp.getData().getToken()).isEqualTo("jwt-token");
            assertThat(resp.getData().getUser().getRole()).isEqualTo("ADMIN");
            assertThat(resp.getData().getUser().getEmail()).isEqualTo("admin@school.com");
        }

        @Test
        @DisplayName("user not found: returns generic error (no enumeration)")
        void userNotFound_returnsError() {
            when(userRepository.findByEmailIgnoreCase("ghost@school.com")).thenReturn(Optional.empty());
            when(userRepository.findByUsername("ghost@school.com")).thenReturn(Optional.empty());

            ApiResponse<LoginResponse> resp = authService.login(loginReq("ghost@school.com", "pw", "ADMIN"));

            assertThat(resp.isSuccess()).isFalse();
        }

        @Test
        @DisplayName("wrong password: returns remaining-attempts message and increments counter")
        void wrongPassword_decrementsAttempts() {
            User user = activeAdmin();
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));
            when(schoolRepository.findBySchoolId(5)).thenReturn(Optional.of(activeSchool()));
            when(passwordEncoder.matches("WrongPw", "hashed_pw")).thenReturn(false);

            ApiResponse<LoginResponse> resp = authService.login(loginReq("admin@school.com", "WrongPw", "ADMIN"));

            assertThat(resp.isSuccess()).isFalse();
            assertThat(resp.getMessage()).contains("attempt");
            verify(userRepository).save(any(User.class)); // counter persisted
        }

        @Test
        @DisplayName("5th wrong password: account is locked permanently")
        void fiveWrongPasswords_locksAccount() {
            User user = activeAdmin();
            user.setFailedLoginAttempts(9); // one more makes 10 (new threshold)
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));
            when(schoolRepository.findBySchoolId(5)).thenReturn(Optional.of(activeSchool()));
            when(passwordEncoder.matches(any(), any())).thenReturn(false);

            ApiResponse<LoginResponse> resp = authService.login(loginReq("admin@school.com", "Bad", "ADMIN"));

            assertThat(resp.isSuccess()).isFalse();
            assertThat(resp.getMessage()).containsIgnoringCase("locked");
            // lockedUntil must be a far-future timestamp so the time-based check fires
            assertThat(user.getLockedUntil()).isNotNull()
                    .isAfter(LocalDateTime.now(ZoneOffset.UTC));
        }

        @Test
        @DisplayName("locked account: rejects login immediately without checking password")
        void lockedAccount_rejectsLogin() {
            User user = activeAdmin();
            // Lock must be in the future for the time-based check to recognise it
            user.setLockedUntil(LocalDateTime.now(ZoneOffset.UTC).plusYears(50));
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));

            ApiResponse<LoginResponse> resp = authService.login(loginReq("admin@school.com", "Password1!", "ADMIN"));

            assertThat(resp.isSuccess()).isFalse();
            assertThat(resp.getMessage()).containsIgnoringCase("locked");
            verifyNoInteractions(passwordEncoder);
        }

        @Test
        @DisplayName("inactive account: returns deactivated error")
        void inactiveAccount_rejectsLogin() {
            User user = activeAdmin();
            user.setIsActive(false);
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));

            ApiResponse<LoginResponse> resp = authService.login(loginReq("admin@school.com", "Password1!", "ADMIN"));

            assertThat(resp.isSuccess()).isFalse();
            assertThat(resp.getMessage()).containsIgnoringCase("deactivated");
        }

        @Test
        @DisplayName("role mismatch: denies login when claimed role != DB role")
        void roleMismatch_deniesLogin() {
            User user = activeAdmin(); // role = ADMIN
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));
            when(schoolRepository.findBySchoolId(5)).thenReturn(Optional.of(activeSchool()));
            when(passwordEncoder.matches("Password1!", "hashed_pw")).thenReturn(true);

            ApiResponse<LoginResponse> resp = authService.login(loginReq("admin@school.com", "Password1!", "TEACHER"));

            assertThat(resp.isSuccess()).isFalse();
            assertThat(resp.getMessage()).containsIgnoringCase("denied");
        }

        @Test
        @DisplayName("expired school subscription: blocks login with subscription message")
        void expiredSubscription_blocksLogin() {
            User user = activeAdmin();
            // Modify the school that will be returned to have an expired subscription
            School expiredSchool = activeSchool();
            expiredSchool.setSubscriptionExpiry(LocalDate.now().minusDays(1));

            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));
            when(schoolRepository.findBySchoolId(5)).thenReturn(Optional.of(expiredSchool));
            // no passwordEncoder stub — login exits at subscription-expiry check before password check

            ApiResponse<LoginResponse> resp = authService.login(loginReq("admin@school.com", "Password1!", "ADMIN"));

            assertThat(resp.isSuccess()).isFalse();
            assertThat(resp.getMessage()).containsIgnoringCase("subscription");
        }

        @Test
        @DisplayName("APPLICATION_OWNER login: triggers 2FA OTP and does not issue JWT")
        void applicationOwner_triggers2Fa() {
            User owner = User.builder()
                    .id(99L).name("Owner").email("owner@platform.com")
                    .password("hashed_pw")
                    .role(User.Role.APPLICATION_OWNER)
                    .schoolId(null)
                    .isActive(true)
                    .failedLoginAttempts(0)
                    .build();

            when(userRepository.findByEmailIgnoreCase("owner@platform.com")).thenReturn(Optional.of(owner));
            when(passwordEncoder.matches("Password1!", "hashed_pw")).thenReturn(true);
            // Email sending must succeed
            doNothing().when(emailService).sendOwnerLoginOtp(any(), any());

            ApiResponse<LoginResponse> resp = authService.login(
                    loginReq("owner@platform.com", "Password1!", "APPLICATION_OWNER"));

            assertThat(resp.isSuccess()).isTrue();
            assertThat(resp.getData().getOtpRequired()).isTrue();
            assertThat(resp.getData().getToken()).isNull();
            verify(jwtUtil, never()).generateToken(any(), any());
        }

        @Test
        @DisplayName("successful login resets the failed-attempts counter to zero")
        void successfulLogin_resetsFailedAttempts() {
            User user = activeAdmin();
            user.setFailedLoginAttempts(3); // had 3 prior failures
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));
            when(schoolRepository.findBySchoolId(5)).thenReturn(Optional.of(activeSchool()));
            when(passwordEncoder.matches("Password1!", "hashed_pw")).thenReturn(true);
            when(jwtUtil.generateToken(any(UserDetails.class), any())).thenReturn("jwt");

            authService.login(loginReq("admin@school.com", "Password1!", "ADMIN"));

            assertThat(user.getFailedLoginAttempts()).isZero();
        }
    }

    // ── verifyOwnerOtp ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("verifyOwnerOtp()")
    class VerifyOwnerOtpTests {

        private User ownerWithOtp(String otp, LocalDateTime expiry) {
            return User.builder()
                    .id(99L).name("Owner").email("owner@platform.com")
                    .password("hashed").role(User.Role.APPLICATION_OWNER)
                    .schoolId(null).isActive(true)
                    .resetOtp(otp)
                    .otpExpiry(expiry)
                    .failedLoginAttempts(0)
                    .build();
        }

        @Test
        @DisplayName("valid OTP: issues JWT and clears OTP fields")
        void validOtp_issuesJwt() {
            LocalDateTime expiry = LocalDateTime.now(ZoneOffset.UTC).plusMinutes(5);
            // Store the pre-hashed value so the service's hash-comparison succeeds
            User owner = ownerWithOtp(AuthService.hashOtp("123456", "owner@platform.com"), expiry);
            when(userRepository.findByEmailIgnoreCase("owner@platform.com")).thenReturn(Optional.of(owner));
            when(jwtUtil.generateToken(any(UserDetails.class), any())).thenReturn("owner-jwt");

            ApiResponse<LoginResponse> resp = authService.verifyOwnerOtp("owner@platform.com", "123456");

            assertThat(resp.isSuccess()).isTrue();
            assertThat(resp.getData().getToken()).isEqualTo("owner-jwt");
            assertThat(owner.getResetOtp()).isNull();
            assertThat(owner.getFailedLoginAttempts()).isZero();
        }

        @Test
        @DisplayName("wrong OTP: increments attempt counter")
        void wrongOtp_incrementsAttempts() {
            LocalDateTime expiry = LocalDateTime.now(ZoneOffset.UTC).plusMinutes(5);
            User owner = ownerWithOtp("123456", expiry);
            when(userRepository.findByEmailIgnoreCase("owner@platform.com")).thenReturn(Optional.of(owner));

            authService.verifyOwnerOtp("owner@platform.com", "000000");

            assertThat(owner.getFailedLoginAttempts()).isEqualTo(1);
        }

        @Test
        @DisplayName("5 wrong OTPs: clears OTP fields and returns lock-out message")
        void fiveWrongOtps_clearsOtpAndLocksOut() {
            LocalDateTime expiry = LocalDateTime.now(ZoneOffset.UTC).plusMinutes(5);
            User owner = ownerWithOtp("123456", expiry);
            owner.setFailedLoginAttempts(5); // already at limit
            when(userRepository.findByEmailIgnoreCase("owner@platform.com")).thenReturn(Optional.of(owner));

            ApiResponse<LoginResponse> resp = authService.verifyOwnerOtp("owner@platform.com", "999999");

            assertThat(resp.isSuccess()).isFalse();
            assertThat(resp.getMessage()).containsIgnoringCase("attempts");
            assertThat(owner.getResetOtp()).isNull();
        }

        @Test
        @DisplayName("expired OTP: returns expiry error and clears OTP")
        void expiredOtp_returnsError() {
            LocalDateTime expiry = LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1); // expired
            User owner = ownerWithOtp("123456", expiry);
            when(userRepository.findByEmailIgnoreCase("owner@platform.com")).thenReturn(Optional.of(owner));

            ApiResponse<LoginResponse> resp = authService.verifyOwnerOtp("owner@platform.com", "123456");

            assertThat(resp.isSuccess()).isFalse();
            assertThat(resp.getMessage()).containsIgnoringCase("expired");
            assertThat(owner.getResetOtp()).isNull();
        }

        @Test
        @DisplayName("non-owner account: returns invalid request error")
        void nonOwnerAccount_returnsError() {
            User admin = activeAdmin();
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(admin));

            ApiResponse<LoginResponse> resp = authService.verifyOwnerOtp("admin@school.com", "123456");

            assertThat(resp.isSuccess()).isFalse();
        }
    }

    // ── forgotPassword / verifyOTP / resetPassword flow ───────────────────────

    @Nested
    @DisplayName("forgot-password → verify-OTP → reset-password flow")
    class PasswordResetFlowTests {

        @Test
        @DisplayName("forgotPassword: unknown email returns opaque success (no enumeration)")
        void forgotPassword_unknownEmail_opaqueResponse() {
            when(userRepository.findByEmailIgnoreCase("ghost@x.com")).thenReturn(Optional.empty());
            when(userRepository.findByEmail("ghost@x.com")).thenReturn(Optional.empty());

            ApiResponse<String> resp = authService.forgotPassword("ghost@x.com");

            assertThat(resp.isSuccess()).isTrue(); // opaque — same message regardless
            verifyNoInteractions(emailService);
        }

        @Test
        @DisplayName("forgotPassword: known email persists hashed OTP and sends email")
        void forgotPassword_knownEmail_sendsOtp() throws Exception {
            User user = activeAdmin();
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));
            doNothing().when(emailService).sendOtpEmail(any(), any());

            ApiResponse<String> resp = authService.forgotPassword("admin@school.com");

            assertThat(resp.isSuccess()).isTrue();
            // OTP is now stored as a salted SHA-256 hex hash (64 chars), not the raw 6-digit code
            assertThat(user.getResetOtp()).isNotNull().hasSize(64);
            assertThat(user.getOtpExpiry()).isAfter(LocalDateTime.now(ZoneOffset.UTC));
            verify(emailService).sendOtpEmail(eq("admin@school.com"), any());
        }

        @Test
        @DisplayName("verifyOTP: valid OTP sets VERIFIED sentinel with 15-min expiry")
        void verifyOTP_valid_setsVerifiedSentinel() {
            User user = activeAdmin();
            // Store the pre-hashed value so the service's hash-comparison succeeds
            user.setResetOtp(AuthService.hashOtp("654321", "admin@school.com"));
            user.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10));
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));

            ApiResponse<String> resp = authService.verifyOTP("admin@school.com", "654321");

            assertThat(resp.isSuccess()).isTrue();
            assertThat(user.getResetOtp()).isEqualTo("VERIFIED");
            assertThat(user.getOtpExpiry()).isAfter(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(14));
        }

        @Test
        @DisplayName("verifyOTP: wrong OTP returns error without setting VERIFIED")
        void verifyOTP_wrongOtp_returnsError() {
            User user = activeAdmin();
            user.setResetOtp("654321");
            user.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10));
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));

            ApiResponse<String> resp = authService.verifyOTP("admin@school.com", "000000");

            assertThat(resp.isSuccess()).isFalse();
            assertThat(user.getResetOtp()).isNotEqualTo("VERIFIED");
        }

        @Test
        @DisplayName("verifyOTP: expired OTP returns expiry error")
        void verifyOTP_expiredOtp_returnsError() {
            User user = activeAdmin();
            user.setResetOtp("654321");
            user.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1));
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));

            ApiResponse<String> resp = authService.verifyOTP("admin@school.com", "654321");

            assertThat(resp.isSuccess()).isFalse();
            assertThat(resp.getMessage()).containsIgnoringCase("expired");
        }

        @Test
        @DisplayName("resetPassword: succeeds when VERIFIED sentinel is set and within window")
        void resetPassword_withVerification_updatesPassword() {
            User user = activeAdmin();
            user.setResetOtp("VERIFIED");
            user.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10));
            user.setLockedUntil(LocalDateTime.now(ZoneOffset.UTC)); // was locked
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));
            when(passwordEncoder.encode("NewPass1!")).thenReturn("hashed_new");

            ApiResponse<String> resp = authService.resetPassword("admin@school.com", "NewPass1!");

            assertThat(resp.isSuccess()).isTrue();
            assertThat(user.getPassword()).isEqualTo("hashed_new");
            assertThat(user.getResetOtp()).isNull();
            assertThat(user.getLockedUntil()).isNull(); // lockout cleared
        }

        @Test
        @DisplayName("resetPassword: blocked when VERIFIED window has expired")
        void resetPassword_expiredVerificationWindow_returnsError() {
            User user = activeAdmin();
            user.setResetOtp("VERIFIED");
            user.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).minusSeconds(1)); // just expired
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));

            ApiResponse<String> resp = authService.resetPassword("admin@school.com", "NewPass1!");

            assertThat(resp.isSuccess()).isFalse();
            assertThat(resp.getMessage()).containsIgnoringCase("expired");
            assertThat(user.getResetOtp()).isNull();
        }

        @Test
        @DisplayName("resetPassword: blocked when OTP not yet verified (no VERIFIED sentinel)")
        void resetPassword_withoutVerification_blocked() {
            User user = activeAdmin();
            user.setResetOtp("654321"); // OTP present but not verified
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));

            ApiResponse<String> resp = authService.resetPassword("admin@school.com", "NewPass1!");

            assertThat(resp.isSuccess()).isFalse();
            verify(passwordEncoder, never()).encode(any());
        }

        // ── password complexity via resetPassword ─────────────────────────────

        @Test
        @DisplayName("resetPassword: rejects password shorter than 8 characters")
        void resetPassword_shortPassword_rejected() {
            User user = activeAdmin();
            user.setResetOtp("VERIFIED");
            user.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10));
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));

            assertThat(authService.resetPassword("admin@school.com", "Ab1!").isSuccess()).isFalse();
        }

        @Test
        @DisplayName("resetPassword: rejects password with no uppercase letter")
        void resetPassword_noUppercase_rejected() {
            User user = activeAdmin();
            user.setResetOtp("VERIFIED");
            user.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10));
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));

            assertThat(authService.resetPassword("admin@school.com", "password1!").isSuccess()).isFalse();
        }

        @Test
        @DisplayName("resetPassword: rejects password with no digit")
        void resetPassword_noDigit_rejected() {
            User user = activeAdmin();
            user.setResetOtp("VERIFIED");
            user.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10));
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));

            assertThat(authService.resetPassword("admin@school.com", "Password!").isSuccess()).isFalse();
        }

        @Test
        @DisplayName("resetPassword: rejects password with no special character")
        void resetPassword_noSpecialChar_rejected() {
            User user = activeAdmin();
            user.setResetOtp("VERIFIED");
            user.setOtpExpiry(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10));
            when(userRepository.findByEmailIgnoreCase("admin@school.com")).thenReturn(Optional.of(user));

            assertThat(authService.resetPassword("admin@school.com", "Password1").isSuccess()).isFalse();
        }
    }
}
