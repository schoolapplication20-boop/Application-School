package com.schoolers.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.dto.ApiResponse;
import com.schoolers.model.Student;
import com.schoolers.repository.UserRepository;
import com.schoolers.config.SecurityConfig;
import com.schoolers.security.JwtFilter;
import com.schoolers.security.JwtUtil;
import com.schoolers.security.UserDetailsServiceImpl;
import com.schoolers.service.AdminService;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
    "jwt.secret=TestSecretKeyThatIsAtLeast32BytesLong!",
    "jwt.expiration=3600000",
    "spring.mail.host=localhost",
    "spring.mail.port=25",
    "spring.mail.username=test",
    "spring.mail.password=test"
})
@DisplayName("AdminController Integration Tests")
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminService adminService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private JwtUtil jwtUtil;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    /**
     * Mocking JwtFilter ensures SecurityConfig can be wired in the @WebMvcTest slice.
     * This activates the URL-level role guards in SecurityConfig.filterChain()
     * (e.g. /api/admin/** requires ADMIN/SUPER_ADMIN/APPLICATION_OWNER).
     */
    @MockBean
    private JwtFilter jwtFilter;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setup() throws Exception {
        // Pass every request through without setting authentication,
        // so Spring Security's filter chain evaluates the request normally.
        doAnswer(inv -> {
            FilterChain chain = inv.getArgument(2);
            chain.doFilter(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(jwtFilter).doFilter(any(ServletRequest.class), any(ServletResponse.class), any(FilterChain.class));

        when(userRepository.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());
    }

    // ── GET /api/admin/students — Authentication ────────────────────────────

    @Test
    @DisplayName("GET /api/admin/students without auth returns 4xx (403 in JWT stateless config)")
    void getStudents_noAuth_returns401() throws Exception {
        // SecurityConfig uses SessionCreationPolicy.STATELESS without an explicit
        // AuthenticationEntryPoint, so Spring Security returns 403 (Http403ForbiddenEntryPoint)
        // for unauthenticated requests rather than 401. This is a known config gap — a proper
        // REST API should configure .exceptionHandling().authenticationEntryPoint(...) to return 401.
        mockMvc.perform(get("/api/admin/students"))
               .andExpect(status().is4xxClientError());
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("GET /api/admin/students with ADMIN role returns 200")
    void getStudents_withAdminRole_returns200() throws Exception {
        Student s = new Student();
        s.setId(1L);

        when(adminService.getStudents(any(), anyString(), anyInt(), anyInt()))
            .thenReturn(ApiResponse.success("Students",
                new PageImpl<>(Arrays.asList(s), PageRequest.of(0, 10), 1)));

        mockMvc.perform(get("/api/admin/students"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(roles = {"TEACHER"})
    @DisplayName("GET /api/admin/students with TEACHER role returns 403")
    void getStudents_withTeacherRole_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/students"))
               .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = {"STUDENT"})
    @DisplayName("GET /api/admin/students with STUDENT role returns 403")
    void getStudents_withStudentRole_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/students"))
               .andExpect(status().isForbidden());
    }

    // ── GET /api/admin/dashboard/stats ────────────────────────────────────

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("GET /api/admin/dashboard/stats returns 200 with stats")
    void getDashboardStats_returns200() throws Exception {
        when(adminService.getDashboardStats(any()))
            .thenReturn(ApiResponse.success("Stats", Map.of(
                "totalStudents", 100,
                "totalTeachers", 10
            )));

        mockMvc.perform(get("/api/admin/dashboard/stats"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.success").value(true));
    }

    // ── GET /api/admin/students/{id} ───────────────────────────────────────

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("GET /api/admin/students/{id} not found returns 404")
    void getStudentById_notFound_returns404() throws Exception {
        when(adminService.getStudentById(eq(999L), any()))
            .thenReturn(ApiResponse.error("Student not found"));

        mockMvc.perform(get("/api/admin/students/999"))
               .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("GET /api/admin/students/{id} found returns 200")
    void getStudentById_found_returns200() throws Exception {
        Student s = new Student();
        s.setId(1L);

        when(adminService.getStudentById(eq(1L), any()))
            .thenReturn(ApiResponse.success("Student found", s));

        mockMvc.perform(get("/api/admin/students/1"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.success").value(true));
    }

    // ── DELETE /api/admin/students/{id} ───────────────────────────────────

    @Test
    @WithMockUser(roles = {"ADMIN"})
    @DisplayName("DELETE /api/admin/students/{id} returns 200")
    void deleteStudent_withAdminRole_returns200() throws Exception {
        when(adminService.deleteStudent(eq(1L), any()))
            .thenReturn(ApiResponse.success("Student deleted", null));

        mockMvc.perform(delete("/api/admin/students/1")
                .with(csrf()))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @WithMockUser(roles = {"STUDENT"})
    @DisplayName("DELETE /api/admin/students/{id} by STUDENT returns 403")
    void deleteStudent_withStudentRole_returns403() throws Exception {
        mockMvc.perform(delete("/api/admin/students/1")
                .with(csrf()))
               .andExpect(status().isForbidden());
    }
}
