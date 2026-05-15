package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.DemoBookingRequest;
import com.schoolers.dto.JobApplicationRequest;
import com.schoolers.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.logging.Logger;

@RestController
@RequestMapping("/api/marketing")
public class MarketingController {

    private static final Logger log = Logger.getLogger(MarketingController.class.getName());

    @Autowired
    private EmailService emailService;

    @PostMapping("/book-demo")
    public ResponseEntity<ApiResponse<Void>> bookDemo(@Valid @RequestBody DemoBookingRequest request) {
        try {
            emailService.sendDemoBookingNotification(request);
            return ResponseEntity.ok(ApiResponse.success("Demo booking submitted! We'll contact you within 24 hours.", null));
        } catch (Exception e) {
            log.severe("[MarketingController] bookDemo failed: " + e.getMessage());
            return ResponseEntity.status(500)
                .body(ApiResponse.error("Failed to submit demo booking. Please try again or email us directly."));
        }
    }

    @PostMapping("/apply-job")
    public ResponseEntity<ApiResponse<Void>> applyJob(@Valid @RequestBody JobApplicationRequest request) {
        try {
            emailService.sendJobApplicationNotification(request);
            return ResponseEntity.ok(ApiResponse.success("Application submitted! We'll review and get back to you.", null));
        } catch (Exception e) {
            log.severe("[MarketingController] applyJob failed: " + e.getMessage());
            return ResponseEntity.status(500)
                .body(ApiResponse.error("Failed to submit application. Please try again or email us directly."));
        }
    }
}
