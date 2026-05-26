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

    @Autowired
    private RateLimitingInterceptor rateLimitingInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Register rate limiting interceptor for all requests
        registry.addInterceptor(rateLimitingInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/health", "/error", "/uploads/**");
    }
}
