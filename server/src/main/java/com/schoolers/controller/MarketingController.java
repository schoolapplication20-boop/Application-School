package com.schoolers.controller;

import com.schoolers.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/marketing")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "https://my-skoolz.com", "https://www.my-skoolz.com"})
public class MarketingController {

    private final EmailService emailService;

    @PostMapping("/book-demo")
    public ResponseEntity<?> bookDemo(@RequestBody Map<String, String> demoDetails) {
        try {
            log.info("Demo booking request received for school: {}", demoDetails.get("schoolName"));

            // Validate required fields
            if (!isValidDemoDetails(demoDetails)) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Missing required fields"
                ));
            }

            // Send email notification
            emailService.sendDemoBookingEmail(demoDetails.get("email"), demoDetails);

            log.info("Demo booking email sent successfully for: {}", demoDetails.get("schoolName"));

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Demo booking submitted successfully. We'll contact you soon!"
            ));

        } catch (Exception e) {
            log.error("Error processing demo booking request", e);
            return ResponseEntity.status(500).body(Map.of(
                "success", false,
                "message", "An error occurred while processing your request. Please try again later."
            ));
        }
    }

    private boolean isValidDemoDetails(Map<String, String> details) {
        return details.containsKey("schoolName") && !details.get("schoolName").isBlank() &&
               details.containsKey("contactPerson") && !details.get("contactPerson").isBlank() &&
               details.containsKey("email") && !details.get("email").isBlank() &&
               details.containsKey("phone") && !details.get("phone").isBlank() &&
               details.containsKey("schoolType") && !details.get("schoolType").isBlank() &&
               details.containsKey("studentCount") && !details.get("studentCount").isBlank();
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
