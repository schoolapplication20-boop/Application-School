package com.schoolers.config;

import com.schoolers.security.JwtFilter;
import com.schoolers.security.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private JwtFilter jwtFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Enable CORS — delegates to CorsFilter bean (allows port 5173, 3000, 3001)
            .cors(Customizer.withDefaults())

            // Disable CSRF (using JWT)
            .csrf(csrf -> csrf.disable())

            // Session management - stateless (JWT)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // ── Authorization rules ───────────────────────────────────────────
            // Role hierarchy (top → bottom):
            //   APPLICATION_OWNER  – platform-level, schoolId = NULL, manages all schools
            //   SUPER_ADMIN        – school-level owner, schoolId = NOT NULL, one per school
            //   ADMIN              – school module admin, created by SUPER_ADMIN
            //   TEACHER / PARENT / STUDENT – end users
            //
            // Fine-grained endpoint access is enforced via @PreAuthorize in controllers.
            // These rules are the coarse-grained security gate.
            .authorizeHttpRequests(auth -> auth
                // ── Public ────────────────────────────────────────────────────
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/applications").permitAll()   // public admission form
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/error").permitAll()
                .requestMatchers("/uploads/**").permitAll()          // logo / document assets

                // ── School management ─────────────────────────────────────────
                // Fine-grained access (create=SUPER_ADMIN, update=SUPER_ADMIN|APPLICATION_OWNER)
                // is enforced by @PreAuthorize in SchoolController.
                .requestMatchers("/api/schools/**").authenticated()

                // ── Platform-level routes ─────────────────────────────────────
                // createSuperAdmin and getSuperAdmins are further gated inside the controller.
                .requestMatchers("/api/superadmin/**").hasAnyRole("SUPER_ADMIN", "APPLICATION_OWNER")

                // ── School-level admin routes ─────────────────────────────────
                // SUPER_ADMIN and APPLICATION_OWNER can also call these for oversight.
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "SUPER_ADMIN", "APPLICATION_OWNER")

                // ── Teacher-facing routes ─────────────────────────────────────
                .requestMatchers("/api/teacher/**").hasAnyRole("TEACHER", "ADMIN", "SUPER_ADMIN", "APPLICATION_OWNER")

                // ── Parent-facing routes ──────────────────────────────────────
                .requestMatchers("/api/parent/**").hasAnyRole("PARENT", "ADMIN", "SUPER_ADMIN", "APPLICATION_OWNER")

                // ── User profile ──────────────────────────────────────────────
                .requestMatchers("/api/user/**").authenticated()

                .anyRequest().authenticated()
            )

            // Authentication provider
            .authenticationProvider(authenticationProvider())

            // Add JWT filter before UsernamePasswordAuthenticationFilter
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
