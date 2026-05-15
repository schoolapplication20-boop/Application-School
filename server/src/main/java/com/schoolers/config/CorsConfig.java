package com.schoolers.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration corsConfiguration = new CorsConfiguration();

        // Allow React dev server and production origins.
        // Do NOT use wildcard subdomains (*.vercel.app, *.onrender.com) — they allow any
        // tenant on those platforms to make credentialed requests to this backend.
        corsConfiguration.setAllowedOriginPatterns(List.of(
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "https://application-school.vercel.app",
            "https://my-skoolz.com",
            "https://www.my-skoolz.com"
            // Add your specific Render backend preview URL here if needed:
            // "https://my-skoolz-backend.onrender.com"
        ));

        // Allow all HTTP methods
        corsConfiguration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

        // Allow all headers
        corsConfiguration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With",
            "Access-Control-Request-Method",
            "Access-Control-Request-Headers"
        ));

        // Expose Authorization header to client
        corsConfiguration.setExposedHeaders(List.of("Authorization"));

        // Allow credentials (cookies, auth headers)
        corsConfiguration.setAllowCredentials(true);

        // Cache preflight for 1 hour
        corsConfiguration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfiguration);

        return new CorsFilter(source);
    }
}
