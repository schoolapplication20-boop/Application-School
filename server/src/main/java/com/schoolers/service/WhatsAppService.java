package com.schoolers.service;

import com.schoolers.dto.DemoBookingRequest;
import com.schoolers.dto.JobApplicationRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.logging.Logger;

/**
 * Sends WhatsApp notifications via CallMeBot free API.
 *
 * One-time setup required (owner must do this once):
 *  1. Save +34 644 29 89 15 as a WhatsApp contact.
 *  2. Send "I allow callmebot to send me messages" to that number on WhatsApp.
 *  3. You'll receive your personal API key back.
 *  4. Set WHATSAPP_API_KEY=<key> on Render environment variables.
 *
 * All sends are fire-and-forget — a failure never breaks the main request.
 */
@Service
public class WhatsAppService {

    private static final Logger log = Logger.getLogger(WhatsAppService.class.getName());
    private static final String CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php";

    @Value("${whatsapp.phone:+12604670199}")
    private String phone;

    @Value("${whatsapp.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendDemoBookingAlert(DemoBookingRequest req) {
        if (!isConfigured()) return;
        String text = String.format(
            "📅 *New Demo Booking*%n" +
            "School: %s%n" +
            "Contact: %s%n" +
            "Email: %s%n" +
            "Phone: %s%n" +
            "Students: %s%n" +
            "Type: %s",
            req.getSchoolName(), req.getContactPerson(),
            req.getEmail(), req.getPhone(),
            req.getStudentCount(), req.getSchoolType()
        );
        send(text);
    }

    public void sendJobApplicationAlert(JobApplicationRequest req) {
        if (!isConfigured()) return;
        String text = String.format(
            "💼 *New Job Application*%n" +
            "Name: %s%n" +
            "Position: %s%n" +
            "Email: %s%n" +
            "Phone: %s%n" +
            "Experience: %s",
            req.getApplicantName(), req.getPosition(),
            req.getEmail(), req.getPhone(),
            req.getExperience()
        );
        send(text);
    }

    private void send(String text) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(CALLMEBOT_URL)
                .queryParam("phone", phone)
                .queryParam("text", text)
                .queryParam("apikey", apiKey)
                .build()
                .toUriString();
            restTemplate.getForObject(url, String.class);
            log.info("[WhatsAppService] Message sent to " + phone);
        } catch (Exception e) {
            log.warning("[WhatsAppService] Failed to send WhatsApp message: " + e.getMessage());
        }
    }

    private boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
