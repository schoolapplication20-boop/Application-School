package com.schoolers.controller;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.DemoBookingRequest;
import com.schoolers.dto.JobApplicationRequest;
import com.schoolers.model.DemoBooking;
import com.schoolers.repository.DemoBookingRepository;
import com.schoolers.service.EmailService;
import com.schoolers.service.WhatsAppService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/marketing")
public class MarketingController {

    private static final Logger log = Logger.getLogger(MarketingController.class.getName());

    @Autowired private EmailService          emailService;
    @Autowired private WhatsAppService       whatsAppService;
    @Autowired private DemoBookingRepository demoBookingRepository;

    @PostMapping("/book-demo")
    public ResponseEntity<ApiResponse<Void>> bookDemo(@Valid @RequestBody DemoBookingRequest request) {
        // Always persist first — notifications are best-effort
        DemoBooking booking = DemoBooking.builder()
            .schoolName(request.getSchoolName())
            .contactPerson(request.getContactPerson())
            .email(request.getEmail())
            .phone(request.getPhone())
            .schoolType(request.getSchoolType())
            .studentCount(request.getStudentCount())
            .message(request.getMessage())
            .status("NEW")
            .build();
        demoBookingRepository.save(booking);
        log.info("[MarketingController] Demo booking saved (id=" + booking.getId() + ") for: " + request.getSchoolName());

        // Fire-and-forget notifications
        emailService.sendDemoBookingNotification(request);
        whatsAppService.sendDemoBookingAlert(request);

        return ResponseEntity.ok(ApiResponse.success(
            "Demo booking submitted! We'll contact you within 24 hours.", null));
    }

    /** APPLICATION_OWNER only — list all demo booking leads */
    @GetMapping("/demo-bookings")
    @PreAuthorize("hasRole('APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<List<DemoBooking>>> getDemoBookings() {
        List<DemoBooking> bookings = demoBookingRepository.findAllByOrderByCreatedAtDesc();
        return ResponseEntity.ok(ApiResponse.success("OK", bookings));
    }

    /** APPLICATION_OWNER only — mark a booking as contacted */
    @PatchMapping("/demo-bookings/{id}/status")
    @PreAuthorize("hasRole('APPLICATION_OWNER')")
    public ResponseEntity<ApiResponse<Void>> updateBookingStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        demoBookingRepository.findById(id).ifPresent(b -> {
            b.setStatus(status.toUpperCase());
            demoBookingRepository.save(b);
        });
        return ResponseEntity.ok(ApiResponse.success("Status updated", null));
    }

    @PostMapping("/apply-job")
    public ResponseEntity<ApiResponse<Void>> applyJob(@Valid @RequestBody JobApplicationRequest request) {
        emailService.sendJobApplicationNotification(request);
        whatsAppService.sendJobApplicationAlert(request);
        return ResponseEntity.ok(ApiResponse.success("Application submitted! We'll review and get back to you.", null));
    }
}
