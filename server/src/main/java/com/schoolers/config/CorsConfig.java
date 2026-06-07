package com.schoolers.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    private static final Logger log = LoggerFactory.getLogger(CorsConfig.class);

    /**
     * Production origins come from the CORS_ALLOWED_ORIGINS env var (comma-separated).
     * In development (when the env var is absent), localhost ports are added automatically.
     * Never use wildcards with credentialed requests.
     */
    @Value("${cors.allowed.origins:}")
    private String allowedOriginsEnv;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = new ArrayList<>();

        // Always allow the known production domains
        origins.add("https://application-school.vercel.app");
        origins.add("https://my-skoolz.vercel.app");
        origins.add("https://my-skoolz.com");
        origins.add("https://www.my-skoolz.com");

        // Add any extra origins from CORS_ALLOWED_ORIGINS env var
        if (StringUtils.hasText(allowedOriginsEnv)) {
            for (String o : allowedOriginsEnv.split(",")) {
                String trimmed = o.trim();
                if (!trimmed.isEmpty()) origins.add(trimmed);
            }
        }

        // In local development (no env var set) also allow localhost
        if (!StringUtils.hasText(allowedOriginsEnv)) {
            origins.add("http://localhost:3000");
            origins.add("http://localhost:3001");
            origins.add("http://localhost:5173");
            origins.add("http://127.0.0.1:3000");
            origins.add("http://127.0.0.1:5173");
        }

        // Guard: allowCredentials=true is incompatible with wildcard origin '*'.
        // Fail fast if a misconfigured env var introduces a wildcard.
        if (origins.contains("*")) {
            throw new IllegalStateException(
                "CORS misconfiguration: allowCredentials=true cannot be combined with wildcard origin '*'. " +
                "Remove '*' from CORS_ALLOWED_ORIGINS and specify explicit origins instead.");
        }

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList(
                "Authorization", "Content-Type", "Accept", "Origin",
                "X-Requested-With", "Access-Control-Request-Method",
                "Access-Control-Request-Headers", "Idempotency-Key"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
