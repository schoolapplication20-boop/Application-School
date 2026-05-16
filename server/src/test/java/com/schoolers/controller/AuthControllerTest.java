package com.schoolers.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.LoginRequest;
import com.schoolers.dto.LoginResponse;
import com.schoolers.config.SecurityConfig;
import com.schoolers.security.JwtFilter;
import com.schoolers.security.JwtUtil;
import com.schoolers.security.UserDetailsServiceImpl;
import com.schoolers.service.AuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
    "jwt.secret=TestSecretKeyThatIsAtLeast32BytesLong!",
    "jwt.expiration=3600000",
    "spring.mail.host=localhost",
    "spring.mail.port=25",
    "spring.mail.username=test",
    "spring.mail.password=test"
})
@DisplayName("AuthController Integration Tests")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    /**
     * Mocking JwtFilter lets SecurityConfig wire up properly in @WebMvcTest,
     * which applies the permitAll() rules from SecurityConfig.filterChain().
     * Without this mock, SecurityConfig cannot find JwtFilter in the slice context
     * and the full security config silently fails to load.
     */
    @MockBean
    private JwtFilter jwtFilter;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setup() throws Exception {
        // Pass every request through — no authentication is set, so permitAll()
        // routes work and protected routes require credentials.
        doAnswer(inv -> {
            FilterChain chain = inv.getArgument(2);
            chain.doFilter(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(jwtFilter).doFilter(any(ServletRequest.class), any(ServletResponse.class), any(FilterChain.class));
    }

    // ── POST /api/auth/login ────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/login with valid credentials returns 200 with token")
    void login_validCredentials_returns200() throws Exception {
        LoginResponse loginResp = new LoginResponse();
        loginResp.setToken("jwt-token");

        when(authService.login(any(LoginRequest.class)))
            .thenReturn(ApiResponse.success("Login successful", loginResp));

        LoginRequest req = new LoginRequest();
        req.setEmail("admin@school.com");
        req.setPassword("correctPass");
        req.setSelectedRole("ADMIN");

        mockMvc.perform(post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.success").value(true))
               .andExpect(jsonPath("$.data.token").value("jwt-token"));
    }

    @Test
    @DisplayName("POST /api/auth/login with invalid credentials returns 401")
    void login_invalidCredentials_returns401() throws Exception {
        when(authService.login(any(LoginRequest.class)))
            .thenReturn(ApiResponse.error("Incorrect password."));

        LoginRequest req = new LoginRequest();
        req.setEmail("admin@school.com");
        req.setPassword("wrongPass");
        req.setSelectedRole("ADMIN");

        mockMvc.perform(post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
               .andExpect(status().isUnauthorized())
               .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/auth/login with missing password returns 400")
    void login_missingPassword_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"a@b.com\",\"selectedRole\":\"ADMIN\"}"))
               .andExpect(status().is4xxClientError());
    }

    // ── POST /api/auth/forgot-password ─────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/forgot-password with valid identifier returns 200")
    void forgotPassword_validIdentifier_returns200() throws Exception {
        when(authService.forgotPassword("9876543210"))
            .thenReturn(ApiResponse.success("OTP sent", "OTP sent to registered mobile"));

        mockMvc.perform(post("/api/auth/forgot-password")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("identifier", "9876543210"))))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password with no identifier returns 400")
    void forgotPassword_noIdentifier_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
               .andExpect(status().isBadRequest())
               .andExpect(jsonPath("$.success").value(false));
    }

    // ── POST /api/auth/verify-otp ──────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/verify-otp with valid otp returns 200")
    void verifyOTP_validOtp_returns200() throws Exception {
        when(authService.verifyOTP("9876543210", "1234"))
            .thenReturn(ApiResponse.success("OTP verified", "Verified"));

        mockMvc.perform(post("/api/auth/verify-otp")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    Map.of("identifier", "9876543210", "otp", "1234"))))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/auth/verify-otp with missing otp returns 400")
    void verifyOTP_missingOtp_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/verify-otp")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    Map.of("identifier", "9876543210"))))
               .andExpect(status().isBadRequest());
    }

    // ── POST /api/auth/reset-password ──────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/reset-password with valid data returns 200")
    void resetPassword_validData_returns200() throws Exception {
        when(authService.resetPassword("9876543210", "NewPass123!"))
            .thenReturn(ApiResponse.success("Password reset", "Done"));

        mockMvc.perform(post("/api/auth/reset-password")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    Map.of("identifier", "9876543210", "newPassword", "NewPass123!"))))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("POST /api/auth/reset-password missing newPassword returns 400")
    void resetPassword_missingNewPassword_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/reset-password")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    Map.of("identifier", "9876543210"))))
               .andExpect(status().isBadRequest());
    }
}
