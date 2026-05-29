package com.schoolers.config;

import com.schoolers.security.JwtFilter;
import com.schoolers.security.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.servlet.http.HttpServletResponse;
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
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

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
            // Enable CORS — delegates to CorsFilter bean
            .cors(Customizer.withDefaults())

            // Disable CSRF (using JWT — stateless)
            .csrf(csrf -> csrf.disable())

            // ── HTTP security headers ────────────────────────────────────────────
            .headers(headers -> headers
                .frameOptions(f -> f.deny())
                .xssProtection(x -> x.disable())                      // X-XSS-Protection deprecated; CSP handles XSS
                .contentTypeOptions(c -> {})                           // X-Content-Type-Options: nosniff
                .httpStrictTransportSecurity(hsts -> hsts
                    .maxAgeInSeconds(31536000)
                    .includeSubDomains(true)
                    .preload(true))
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(
                        "default-src 'self'; " +
                        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://storage.googleapis.com; " +
                        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; " +
                        "img-src 'self' data: https: blob:; " +
                        "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; " +
                        "connect-src 'self' https: wss:; " +
                        "frame-ancestors 'none'; " +
                        "base-uri 'self'; " +
                        "form-action 'self';"))
                .referrerPolicy(r -> r
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .permissionsPolicy(p -> p
                    .policy("camera=(), microphone=(), geolocation=(), payment=()"))
                // Prevent sensitive API responses from being cached by browsers or proxies
                .cacheControl(c -> {})
            )

            // Session management - stateless (JWT)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // ── Authorization rules ───────────────────────────────────────────
            // Role hierarchy (top → bottom):
            //   APPLICATION_OWNER  – platform-level, schoolId = NULL, manages all schools
            //   SUPER_ADMIN        – school-level owner, schoolId = NOT NULL, one per school
            //   ADMIN              – school module admin, created by SUPER_ADMIN
            //   TEACHER / STUDENT – end users
            //
            // Fine-grained endpoint access is enforced via @PreAuthorize in controllers.
            // These rules are the coarse-grained security gate.
            .authorizeHttpRequests(auth -> auth
                // ── Public ────────────────────────────────────────────────────
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/auth/logout").authenticated()  // logout requires a valid token
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/applications").permitAll()   // public admission form
                .requestMatchers("/api/marketing/**").permitAll()   // public marketing: demo booking, job applications
                .requestMatchers("/api/chatbot/**").permitAll()     // FAQ chatbot — no sensitive data
                .requestMatchers("/api/leave/parent-ack").permitAll() // one-click parent ack link from email
                .requestMatchers("/api/whatsapp/webhook").permitAll() // Meta webhook — must be public
                .requestMatchers("/api/system/**").authenticated()  // system notices — all users read; write gated by @PreAuthorize
                .requestMatchers("/error").permitAll()
                .requestMatchers("/uploads/logos/**").permitAll()    // school logos — public
                .requestMatchers("/uploads/**").authenticated()      // docs/receipts/slips require auth

                // ── Audit logs — SUPER_ADMIN and APPLICATION_OWNER only ───────
                .requestMatchers("/api/audit-logs/**").hasAnyRole("SUPER_ADMIN", "APPLICATION_OWNER")

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

                // ── User profile ──────────────────────────────────────────────
                .requestMatchers("/api/user/**").authenticated()

                .anyRequest().authenticated()
            )

            // Return 401 for unauthenticated requests, 403 for authenticated-but-unauthorized
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) ->
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Authentication required"))
                .accessDeniedHandler((request, response, accessDeniedException) ->
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access denied"))
            )

            // Authentication provider
            .authenticationProvider(authenticationProvider())

            // Add JWT filter before UsernamePasswordAuthenticationFilter
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
