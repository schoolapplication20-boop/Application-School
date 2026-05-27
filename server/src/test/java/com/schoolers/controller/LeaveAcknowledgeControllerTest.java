package com.schoolers.controller;

import com.schoolers.config.RateLimitingInterceptor;
import com.schoolers.config.SecurityConfig;
import com.schoolers.model.LeaveRequest;
import com.schoolers.repository.LeaveRequestRepository;
import com.schoolers.repository.SchoolRepository;
import com.schoolers.security.JwtFilter;
import com.schoolers.security.JwtUtil;
import com.schoolers.security.UserDetailsServiceImpl;
import com.schoolers.service.TokenBlacklistService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LeaveAcknowledgeController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
    "jwt.secret=TestSecretKeyThatIsAtLeast32BytesLong!",
    "jwt.expiration=3600000",
    "spring.mail.host=localhost",
    "spring.mail.port=25",
    "spring.mail.username=test",
    "spring.mail.password=test"
})
@DisplayName("LeaveAcknowledgeController — GET /api/leave/parent-ack")
class LeaveAcknowledgeControllerTest {

    static class PassThroughJwtFilter extends JwtFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
                throws ServletException, IOException {
            chain.doFilter(req, res);
        }
    }

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        JwtFilter jwtFilter() {
            return new PassThroughJwtFilter();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockBean private LeaveRequestRepository leaveRepository;
    @MockBean private JwtUtil                jwtUtil;
    @MockBean private UserDetailsServiceImpl  userDetailsService;
    @MockBean private TokenBlacklistService   tokenBlacklistService;
    @MockBean private SchoolRepository        schoolRepository;
    @MockBean private RateLimitingInterceptor rateLimitingInterceptor;

    @BeforeEach
    void setUp() throws Exception {
        when(rateLimitingInterceptor.preHandle(any(), any(), any())).thenReturn(true);
    }

    // ── success ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("valid token returns 200 with student info")
    void ack_validToken_returns200() throws Exception {
        LeaveRequest leave = LeaveRequest.builder()
                .requesterName("John Doe")
                .fromDate(LocalDate.of(2026, 6, 1))
                .toDate(LocalDate.of(2026, 6, 3))
                .parentToken("abc123token")
                .parentAcknowledged(false)
                .requesterType(LeaveRequest.RequesterType.STUDENT)
                .requesterId(10L)
                .build();

        when(leaveRepository.findByParentToken("abc123token")).thenReturn(Optional.of(leave));
        when(leaveRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        mockMvc.perform(get("/api/leave/parent-ack").param("token", "abc123token"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.studentName").value("John Doe"))
               .andExpect(jsonPath("$.fromDate").value("2026-06-01"))
               .andExpect(jsonPath("$.toDate").value("2026-06-03"));
    }

    @Test
    @DisplayName("already acknowledged token returns 200 with already message")
    void ack_alreadyAcknowledged_returns200WithAlreadyMessage() throws Exception {
        LeaveRequest leave = LeaveRequest.builder()
                .requesterName("Jane Doe")
                .fromDate(LocalDate.of(2026, 6, 1))
                .toDate(LocalDate.of(2026, 6, 3))
                .parentToken("used-token")
                .parentAcknowledged(true)
                .requesterType(LeaveRequest.RequesterType.STUDENT)
                .requesterId(11L)
                .build();

        when(leaveRepository.findByParentToken("used-token")).thenReturn(Optional.of(leave));

        mockMvc.perform(get("/api/leave/parent-ack").param("token", "used-token"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.message").value("Already acknowledged."))
               .andExpect(jsonPath("$.studentName").value("Jane Doe"));
    }

    // ── failure ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("invalid token returns 404")
    void ack_invalidToken_returns404() throws Exception {
        when(leaveRepository.findByParentToken("bad-token")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/leave/parent-ack").param("token", "bad-token"))
               .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("missing token parameter returns 400")
    void ack_missingToken_returns400() throws Exception {
        mockMvc.perform(get("/api/leave/parent-ack"))
               .andExpect(status().isBadRequest());
    }
}
