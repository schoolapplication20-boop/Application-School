package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.LoginRequest;
import com.schoolers.dto.LoginResponse;
import com.schoolers.model.User;
import com.schoolers.model.User.Role;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.repository.TeacherRepository;
import com.schoolers.repository.UserRepository;
import com.schoolers.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Unit Tests")
class AuthServiceTest {

    @InjectMocks
    private AuthService authService;

    @Mock private UserRepository    userRepository;
    @Mock private SchoolRepository  schoolRepository;
    @Mock private TeacherRepository teacherRepository;
    @Mock private JwtUtil           jwtUtil;
    @Mock private PasswordEncoder   passwordEncoder;
    @Mock private EmailService      emailService;

    private User validAdminUser;

    @BeforeEach
    void setUp() {
        validAdminUser = new User();
        validAdminUser.setId(1L);
        validAdminUser.setEmail("admin@school.com");
        validAdminUser.setPassword("hashed-password");
        validAdminUser.setRole(Role.ADMIN);
        validAdminUser.setIsActive(true);
        validAdminUser.setSchoolId(10L);
        validAdminUser.setFirstLogin(false);
    }

    // ── Successful login ────────────────────────────────────────────────────

    @Test
    @DisplayName("login with valid credentials returns success response with token")
    void login_validCredentials_returnsToken() {
        LoginRequest req = new LoginRequest();
        req.setEmail("admin@school.com");
        req.setPassword("correctPassword");
        req.setSelectedRole("ADMIN");

        when(userRepository.findByEmailIgnoreCase("admin@school.com"))
            .thenReturn(Optional.of(validAdminUser));
        when(passwordEncoder.matches("correctPassword", "hashed-password"))
            .thenReturn(true);
        when(jwtUtil.generateToken(any(), anyMap()))
            .thenReturn("jwt-token-here");

        ApiResponse<LoginResponse> response = authService.login(req);

        assertTrue(response.isSuccess());
        assertNotNull(response.getData());
        assertEquals("jwt-token-here", response.getData().getToken());
    }

    // ── Email not found ──────────────────────────────────────────────────────

    @Test
    @DisplayName("login with unknown email returns error message")
    void login_unknownEmail_returnsError() {
        LoginRequest req = new LoginRequest();
        req.setEmail("nobody@school.com");
        req.setPassword("pass");
        req.setSelectedRole("ADMIN");

        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());

        ApiResponse<LoginResponse> response = authService.login(req);

        assertFalse(response.isSuccess());
        assertNotNull(response.getMessage());
        assertTrue(response.getMessage().contains("No account found") ||
                   response.getMessage().toLowerCase().contains("email"));
    }

    // ── Wrong password ───────────────────────────────────────────────────────

    @Test
    @DisplayName("login with wrong password returns error message")
    void login_wrongPassword_returnsError() {
        LoginRequest req = new LoginRequest();
        req.setEmail("admin@school.com");
        req.setPassword("wrongPassword");
        req.setSelectedRole("ADMIN");

        when(userRepository.findByEmailIgnoreCase("admin@school.com"))
            .thenReturn(Optional.of(validAdminUser));
        when(passwordEncoder.matches("wrongPassword", "hashed-password"))
            .thenReturn(false);

        ApiResponse<LoginResponse> response = authService.login(req);

        assertFalse(response.isSuccess());
        assertNotNull(response.getMessage());
        assertTrue(response.getMessage().toLowerCase().contains("password") ||
                   response.getMessage().toLowerCase().contains("incorrect"));
    }

    // ── Deactivated account ──────────────────────────────────────────────────

    @Test
    @DisplayName("login with deactivated account returns error")
    void login_deactivatedAccount_returnsError() {
        validAdminUser.setIsActive(false);

        LoginRequest req = new LoginRequest();
        req.setEmail("admin@school.com");
        req.setPassword("correctPassword");
        req.setSelectedRole("ADMIN");

        when(userRepository.findByEmailIgnoreCase("admin@school.com"))
            .thenReturn(Optional.of(validAdminUser));

        ApiResponse<LoginResponse> response = authService.login(req);

        assertFalse(response.isSuccess());
        assertTrue(response.getMessage().toLowerCase().contains("deactivated") ||
                   response.getMessage().toLowerCase().contains("active"));
    }

    // ── Missing email ────────────────────────────────────────────────────────

    @Test
    @DisplayName("login with null email returns error")
    void login_nullEmail_returnsError() {
        LoginRequest req = new LoginRequest();
        req.setEmail(null);
        req.setPassword("pass");
        req.setSelectedRole("ADMIN");

        ApiResponse<LoginResponse> response = authService.login(req);

        assertFalse(response.isSuccess());
        assertNotNull(response.getMessage());
    }

    @Test
    @DisplayName("login with blank email returns error")
    void login_blankEmail_returnsError() {
        LoginRequest req = new LoginRequest();
        req.setEmail("   ");
        req.setPassword("pass");
        req.setSelectedRole("ADMIN");

        ApiResponse<LoginResponse> response = authService.login(req);

        assertFalse(response.isSuccess());
    }

    // ── Role mismatch ────────────────────────────────────────────────────────

    @Test
    @DisplayName("login with mismatched selectedRole returns access denied error")
    void login_roleMismatch_returnsError() {
        LoginRequest req = new LoginRequest();
        req.setEmail("admin@school.com");
        req.setPassword("correctPassword");
        req.setSelectedRole("TEACHER"); // user is actually ADMIN

        when(userRepository.findByEmailIgnoreCase("admin@school.com"))
            .thenReturn(Optional.of(validAdminUser));
        when(passwordEncoder.matches("correctPassword", "hashed-password"))
            .thenReturn(true);

        ApiResponse<LoginResponse> response = authService.login(req);

        assertFalse(response.isSuccess());
        assertTrue(response.getMessage().toLowerCase().contains("role") ||
                   response.getMessage().toLowerCase().contains("access") ||
                   response.getMessage().toLowerCase().contains("permission"));
    }

    // ── Mobile login ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("login with mobile type and unknown mobile returns error")
    void login_mobileType_unknownMobile_returnsError() {
        LoginRequest req = new LoginRequest();
        req.setLoginType("mobile");
        req.setMobile("9999999999");
        req.setPassword("pass");

        when(userRepository.findByMobile("9999999999")).thenReturn(Optional.empty());

        ApiResponse<LoginResponse> response = authService.login(req);

        assertFalse(response.isSuccess());
        assertTrue(response.getMessage().toLowerCase().contains("mobile") ||
                   response.getMessage().toLowerCase().contains("no account"));
    }

    @Test
    @DisplayName("login with mobile type and blank mobile returns error")
    void login_mobileType_blankMobile_returnsError() {
        LoginRequest req = new LoginRequest();
        req.setLoginType("mobile");
        req.setMobile("");
        req.setPassword("pass");

        ApiResponse<LoginResponse> response = authService.login(req);

        assertFalse(response.isSuccess());
        assertTrue(response.getMessage().toLowerCase().contains("mobile"));
    }

    // ── Account lockout ──────────────────────────────────────────────────────

    @Test
    @DisplayName("login with locked account returns lock error without checking password")
    void login_lockedAccount_returnsLockError() {
        validAdminUser.setLockedUntil(LocalDateTime.now());

        LoginRequest req = new LoginRequest();
        req.setEmail("admin@school.com");
        req.setPassword("anyPassword");
        req.setSelectedRole("ADMIN");

        when(userRepository.findByEmailIgnoreCase("admin@school.com"))
            .thenReturn(Optional.of(validAdminUser));

        ApiResponse<LoginResponse> response = authService.login(req);

        assertFalse(response.isSuccess());
        assertTrue(response.getMessage().toLowerCase().contains("locked"));
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    @DisplayName("5th consecutive failed login attempt permanently locks the account")
    void login_fifthFailedAttempt_locksAccount() {
        validAdminUser.setFailedLoginAttempts(4); // 4 prior failures

        LoginRequest req = new LoginRequest();
        req.setEmail("admin@school.com");
        req.setPassword("wrongPassword");
        req.setSelectedRole("ADMIN");

        when(userRepository.findByEmailIgnoreCase("admin@school.com"))
            .thenReturn(Optional.of(validAdminUser));
        when(passwordEncoder.matches("wrongPassword", "hashed-password"))
            .thenReturn(false);

        ApiResponse<LoginResponse> response = authService.login(req);

        assertFalse(response.isSuccess());
        assertTrue(response.getMessage().toLowerCase().contains("locked") ||
                   response.getMessage().contains("5 failed"));
        assertNotNull(validAdminUser.getLockedUntil());
    }

    @Test
    @DisplayName("failed login before lockout threshold shows remaining attempts")
    void login_failedAttemptBeforeThreshold_showsRemainingAttempts() {
        validAdminUser.setFailedLoginAttempts(2); // 2 prior failures

        LoginRequest req = new LoginRequest();
        req.setEmail("admin@school.com");
        req.setPassword("wrongPassword");
        req.setSelectedRole("ADMIN");

        when(userRepository.findByEmailIgnoreCase("admin@school.com"))
            .thenReturn(Optional.of(validAdminUser));
        when(passwordEncoder.matches("wrongPassword", "hashed-password"))
            .thenReturn(false);

        ApiResponse<LoginResponse> response = authService.login(req);

        assertFalse(response.isSuccess());
        // Should mention remaining attempts and NOT lock the account yet
        assertTrue(response.getMessage().contains("attempt") ||
                   response.getMessage().toLowerCase().contains("incorrect"));
        assertNull(validAdminUser.getLockedUntil());
    }

    @Test
    @DisplayName("resetPassword after OTP verification clears account lockout")
    void resetPassword_clearsAccountLock() {
        validAdminUser.setLockedUntil(LocalDateTime.now());
        validAdminUser.setFailedLoginAttempts(5);
        validAdminUser.setResetOtp("VERIFIED");
        validAdminUser.setMobile("9876543210");

        when(userRepository.findByMobile("9876543210"))
            .thenReturn(Optional.of(validAdminUser));
        when(passwordEncoder.encode("NewPass1!")).thenReturn("encoded-new");

        ApiResponse<String> response = authService.resetPassword("9876543210", "NewPass1!");

        assertTrue(response.isSuccess());
        assertNull(validAdminUser.getLockedUntil());
        assertEquals(0, validAdminUser.getFailedLoginAttempts());
    }

    // ── Password complexity ──────────────────────────────────────────────────

    @Test
    @DisplayName("resetPassword with weak password is rejected by complexity check")
    void resetPassword_weakPassword_returnsComplexityError() {
        validAdminUser.setResetOtp("VERIFIED");
        validAdminUser.setMobile("9876543210");

        when(userRepository.findByMobile("9876543210"))
            .thenReturn(Optional.of(validAdminUser));

        ApiResponse<String> response = authService.resetPassword("9876543210", "weak");

        assertFalse(response.isSuccess());
        assertTrue(response.getMessage().toLowerCase().contains("password"));
    }

    @Test
    @DisplayName("changePassword with weak new password is rejected by complexity check")
    void changePassword_weakNewPassword_returnsComplexityError() {
        when(userRepository.findByEmailIgnoreCase("admin@school.com"))
            .thenReturn(Optional.of(validAdminUser));
        when(passwordEncoder.matches("CurrentPass1!", "hashed-password"))
            .thenReturn(true);

        ApiResponse<String> response = authService.changePassword(
            "admin@school.com", "CurrentPass1!", "weak");

        assertFalse(response.isSuccess());
        assertTrue(response.getMessage().toLowerCase().contains("password"));
    }

    @Test
    @DisplayName("setFirstPassword with weak new password is rejected by complexity check")
    void setFirstPassword_weakNewPassword_returnsComplexityError() {
        validAdminUser.setFirstLogin(true);

        when(userRepository.findByEmailIgnoreCase("admin@school.com"))
            .thenReturn(Optional.of(validAdminUser));
        when(passwordEncoder.matches("TempPass1!", "hashed-password"))
            .thenReturn(true);

        ApiResponse<String> response = authService.setFirstPassword(
            "admin@school.com", "TempPass1!", "weak");

        assertFalse(response.isSuccess());
        assertTrue(response.getMessage().toLowerCase().contains("password"));
    }

    // ── Forgot password enumeration fix ──────────────────────────────────────

    @Test
    @DisplayName("forgotPassword with non-existing mobile returns same success — prevents account enumeration")
    void forgotPassword_nonExistingMobile_returnsSameSuccessMessage() {
        when(userRepository.findByMobile("0000000000")).thenReturn(Optional.empty());

        ApiResponse<String> response = authService.forgotPassword("0000000000");

        assertTrue(response.isSuccess());
        assertEquals("If this account exists, an OTP has been sent.", response.getMessage());
    }

    @Test
    @DisplayName("forgotPassword with non-existing email returns same success — prevents account enumeration")
    void forgotPassword_nonExistingEmail_returnsSameSuccessMessage() {
        when(userRepository.findByEmailIgnoreCase("ghost@school.com")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("ghost@school.com")).thenReturn(Optional.empty());

        ApiResponse<String> response = authService.forgotPassword("ghost@school.com");

        assertTrue(response.isSuccess());
        assertEquals("If this account exists, an OTP has been sent.", response.getMessage());
    }
}
