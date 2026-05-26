package com.schoolers.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC Configuration
 * Registers custom interceptors and configures request/response handling
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired private RateLimitingInterceptor rateLimitingInterceptor;
    @Autowired private SubscriptionInterceptor subscriptionInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitingInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/health", "/error", "/uploads/**");

        // Subscription expiry check — runs on all authenticated school endpoints
        registry.addInterceptor(subscriptionInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns(
                        "/api/auth/**",
                        "/api/applications",
                        "/api/marketing/**",
                        "/api/chatbot/**",
                        "/api/whatsapp/webhook",
                        "/api/health"
                );
    }
}
