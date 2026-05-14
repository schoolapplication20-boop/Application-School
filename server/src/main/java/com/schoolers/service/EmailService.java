package com.schoolers.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

@Service
public class EmailService {

    private static final Logger log = Logger.getLogger(EmailService.class.getName());

    @Value("${resend.api.key:}")
    private String resendApiKey;

    @Value("${resend.from.email:onboarding@resend.dev}")
    private String fromEmail;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendOtpEmail(String toEmail, String otp) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            throw new RuntimeException("RESEND_API_KEY is not configured.");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + resendApiKey);
        headers.set("Content-Type", "application/json");

        Map<String, Object> body = new HashMap<>();
        body.put("from", fromEmail);
        body.put("to", new String[]{toEmail});
        body.put("subject", "My-Skoolz Password Reset OTP");
        body.put("html", buildEmailHtml(otp));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        String response = restTemplate.postForObject("https://api.resend.com/emails", request, String.class);
        log.info("[EmailService] OTP email sent to: " + toEmail + " | response: " + response);
    }

    private String buildEmailHtml(String otp) {
        return "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>" +
               "<h2 style='color: #F97316;'>My-Skoolz Password Reset</h2>" +
               "<p>Dear User,</p>" +
               "<p>Your OTP for password reset is:</p>" +
               "<div style='font-size: 36px; font-weight: bold; color: #F97316; letter-spacing: 8px; " +
               "text-align: center; padding: 20px; background: #FFF7ED; border-radius: 8px; margin: 20px 0;'>" +
               otp + "</div>" +
               "<p>This OTP is valid for <strong>5 minutes</strong>.</p>" +
               "<p>If you did not request a password reset, please ignore this email.</p>" +
               "<br><p>Regards,<br><strong>My-Skoolz Team</strong></p>" +
               "</div>";
    }
}
