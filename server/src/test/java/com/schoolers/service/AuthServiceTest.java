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
}
