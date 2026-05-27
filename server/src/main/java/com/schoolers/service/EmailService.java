package com.schoolers.service;

import com.schoolers.dto.ContactMessageRequest;
import com.schoolers.dto.DemoBookingRequest;
import com.schoolers.dto.JobApplicationRequest;
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

    @Value("${app.notify.email:navaneeswar1861@gmail.com}")
    private String notifyEmail;

    @Value("${resend.from.email:onboarding@resend.dev}")
    private String fromEmail;

    private final RestTemplate restTemplate = new RestTemplate();

    // ── OTP email (critical — re-throws on failure so caller can handle) ──────

    public void sendOtpEmail(String toEmail, String otp) {
        requireApiKey();
        send(toEmail, "My-Skoolz Password Reset OTP", buildOtpHtml(otp));
        log.info("[EmailService] OTP email sent to: " + toEmail);
    }

    // ── Demo booking (fire-and-forget — email failure must not break the API) ─

    public void sendDemoBookingNotification(DemoBookingRequest req) {
        try {
            requireApiKey();
            send(notifyEmail,
                "[My-Skoolz] New Demo Booking — " + req.getSchoolName(),
                buildDemoNotificationHtml(req));
            log.info("[EmailService] Demo booking notification sent for: " + req.getSchoolName());

            send(req.getEmail(),
                "Your My-Skoolz Demo is Confirmed!",
                buildDemoConfirmationHtml(req));
            log.info("[EmailService] Demo confirmation sent to: " + req.getEmail());
        } catch (Exception e) {
            log.warning("[EmailService] Demo booking email failed for " + req.getSchoolName() + ": " + e.getMessage());
        }
    }

    // ── Contact form (fire-and-forget) ───────────────────────────────────────

    public void sendContactMessageNotification(ContactMessageRequest req) {
        try {
            requireApiKey();
            send(notifyEmail,
                "[My-Skoolz] Contact Form — " + req.getSubject(),
                buildContactNotificationHtml(req));
            log.info("[EmailService] Contact message notification sent from: " + req.getEmail());

            send(req.getEmail(),
                "We received your message — My-Skoolz",
                buildContactConfirmationHtml(req));
            log.info("[EmailService] Contact confirmation sent to: " + req.getEmail());
        } catch (Exception e) {
            log.warning("[EmailService] Contact message email failed for " + req.getEmail() + ": " + e.getMessage());
        }
    }

    // ── Job application (fire-and-forget) ────────────────────────────────────

    public void sendJobApplicationNotification(JobApplicationRequest req) {
        try {
            requireApiKey();
            send(notifyEmail,
                "[My-Skoolz] New Job Application — " + req.getPosition() + " | " + req.getApplicantName(),
                buildJobNotificationHtml(req));
            log.info("[EmailService] Job application notification sent for: " + req.getApplicantName());

            send(req.getEmail(),
                "Application Received — " + req.getPosition() + " at My-Skoolz",
                buildJobConfirmationHtml(req));
            log.info("[EmailService] Job confirmation sent to: " + req.getEmail());
        } catch (Exception e) {
            log.warning("[EmailService] Job application email failed for " + req.getApplicantName() + ": " + e.getMessage());
        }
    }

    // ── Parent leave acknowledgement (fire-and-forget) ───────────────────────

    public void sendParentLeaveAcknowledgement(String parentEmail, String studentName,
            String fromDate, String toDate, String token, String schoolName, String appBaseUrl) {
        try {
            requireApiKey();
            String ackLink = appBaseUrl + "/leave/parent-ack?token=" + token;
            send(parentEmail,
                studentName + "'s Leave Request — " + schoolName,
                buildParentLeaveAckHtml(studentName, fromDate, toDate, ackLink, schoolName));
            log.info("[EmailService] Parent leave ack email sent for student: " + studentName);
        } catch (Exception e) {
            log.warning("[EmailService] Parent leave ack email failed: " + e.getMessage());
        }
    }

    // ── Low attendance alert (fire-and-forget) ────────────────────────────────

    public void sendAttendanceAlert(String parentEmail, String studentName,
            String className, double pct, String schoolName) {
        try {
            requireApiKey();
            send(parentEmail,
                "Low Attendance Alert — " + studentName + " | " + schoolName,
                buildAttendanceAlertHtml(studentName, className, pct, schoolName));
            log.info("[EmailService] Attendance alert sent for student: " + studentName);
        } catch (Exception e) {
            log.warning("[EmailService] Attendance alert email failed: " + e.getMessage());
        }
    }

    // ── Meeting confirmation (fire-and-forget) ────────────────────────────────

    public void sendMeetingConfirmation(String parentEmail, String studentName,
            String teacherName, String date, String time, String topic, String schoolName) {
        try {
            requireApiKey();
            send(parentEmail,
                "Meeting Confirmed — " + schoolName,
                buildMeetingConfirmHtml(studentName, teacherName, date, time, topic, schoolName));
            log.info("[EmailService] Meeting confirmation sent to: " + parentEmail);
        } catch (Exception e) {
            log.warning("[EmailService] Meeting confirmation email failed: " + e.getMessage());
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void requireApiKey() {
        if (resendApiKey == null || resendApiKey.isBlank())
            throw new RuntimeException("RESEND_API_KEY is not configured on this server.");
    }

    private void send(String to, String subject, String html) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + resendApiKey);
        headers.set("Content-Type", "application/json");

        Map<String, Object> body = new HashMap<>();
        body.put("from", fromEmail);
        body.put("to", new String[]{to});
        body.put("subject", subject);
        body.put("html", html);

        restTemplate.postForObject("https://api.resend.com/emails",
            new HttpEntity<>(body, headers), String.class);
    }

    private String buildOtpHtml(String otp) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'>" +
            "<h2 style='color:#2563EB'>My-Skoolz — Password Reset</h2>" +
            "<p>Your OTP for password reset is:</p>" +
            "<div style='font-size:36px;font-weight:bold;color:#2563EB;letter-spacing:8px;" +
            "text-align:center;padding:20px;background:#EFF6FF;border-radius:8px;margin:20px 0'>" +
            otp + "</div>" +
            "<p>This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>" +
            "<p>If you did not request a password reset, please ignore this email.</p>" +
            "<br><p>Regards,<br><strong>My-Skoolz Team</strong></p></div>";
    }

    private String buildDemoNotificationHtml(DemoBookingRequest req) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'>" +
            "<h2 style='color:#2563EB'>New Demo Booking</h2>" +
            "<table style='width:100%;border-collapse:collapse'>" +
            row("School Name", req.getSchoolName()) +
            row("School Type", req.getSchoolType()) +
            row("Students", req.getStudentCount()) +
            row("Contact Person", req.getContactPerson()) +
            row("Email", req.getEmail()) +
            row("Phone", req.getPhone()) +
            row("Message", req.getMessage() != null && !req.getMessage().isBlank() ? req.getMessage() : "(none)") +
            "</table>" +
            "<p style='margin-top:20px'>Please follow up within <strong>24 hours</strong>.</p>" +
            "<p>— My-Skoolz System</p></div>";
    }

    private String buildDemoConfirmationHtml(DemoBookingRequest req) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'>" +
            "<h2 style='color:#2563EB'>Your Demo is Confirmed!</h2>" +
            "<p>Hi " + req.getContactPerson() + ",</p>" +
            "<p>Thank you for booking a demo with My-Skoolz! We have received your request for " +
            "<strong>" + req.getSchoolName() + "</strong> and our team will reach out to you at " +
            req.getEmail() + " within 24 hours to schedule your personalized demo.</p>" +
            "<p><strong>What to expect:</strong></p><ul>" +
            "<li>A tailored walkthrough of features relevant to your school</li>" +
            "<li>Live Q&A with our product team</li>" +
            "<li>Onboarding timeline and pricing discussion</li></ul>" +
            "<p>Warm regards,<br><strong>The My-Skoolz Team</strong><br>" +
            "<a href='mailto:" + notifyEmail + "'>" + notifyEmail + "</a></p></div>";
    }

    private String buildJobNotificationHtml(JobApplicationRequest req) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'>" +
            "<h2 style='color:#2563EB'>New Job Application</h2>" +
            "<table style='width:100%;border-collapse:collapse'>" +
            row("Name", req.getApplicantName()) +
            row("Email", req.getEmail()) +
            row("Phone", req.getPhone()) +
            row("Position", req.getPosition()) +
            row("Experience", req.getExperience()) +
            row("Cover Letter", req.getCoverLetter() != null && !req.getCoverLetter().isBlank() ? req.getCoverLetter() : "(none)") +
            "</table>" +
            "<p>— My-Skoolz System</p></div>";
    }

    private String buildJobConfirmationHtml(JobApplicationRequest req) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'>" +
            "<h2 style='color:#2563EB'>Application Received!</h2>" +
            "<p>Hi " + req.getApplicantName() + ",</p>" +
            "<p>Thank you for applying to the <strong>" + req.getPosition() + "</strong> position at My-Skoolz!</p>" +
            "<p>We have received your application and our team will review it carefully. " +
            "If your profile matches our requirements, we will reach out to you at " +
            req.getEmail() + " within 5–7 business days.</p>" +
            "<p>Warm regards,<br><strong>The My-Skoolz Team</strong><br>" +
            "<a href='mailto:" + notifyEmail + "'>" + notifyEmail + "</a></p></div>";
    }

    private String buildContactNotificationHtml(ContactMessageRequest req) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'>" +
            "<h2 style='color:#2563EB'>New Contact Message</h2>" +
            "<table style='width:100%;border-collapse:collapse'>" +
            row("Name", req.getName()) +
            row("Email", req.getEmail()) +
            row("Subject", req.getSubject()) +
            row("Message", req.getMessage()) +
            "</table>" +
            "<p>— My-Skoolz System</p></div>";
    }

    private String buildContactConfirmationHtml(ContactMessageRequest req) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'>" +
            "<h2 style='color:#2563EB'>We got your message!</h2>" +
            "<p>Hi " + req.getName() + ",</p>" +
            "<p>Thank you for reaching out to My-Skoolz. We have received your message regarding " +
            "<strong>" + req.getSubject() + "</strong> and will get back to you within 24 hours.</p>" +
            "<p>Warm regards,<br><strong>The My-Skoolz Team</strong><br>" +
            "<a href='mailto:" + notifyEmail + "'>" + notifyEmail + "</a></p></div>";
    }

    private String row(String label, String value) {
        return "<tr><td style='padding:8px;border:1px solid #e2e8f0;font-weight:bold;width:35%'>" +
            label + "</td><td style='padding:8px;border:1px solid #e2e8f0'>" +
            (value != null ? value : "") + "</td></tr>";
    }

    private String buildParentLeaveAckHtml(String studentName, String fromDate, String toDate, String ackLink, String schoolName) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'>" +
            "<h2 style='color:#2563EB'>" + schoolName + " — Leave Request</h2>" +
            "<p>Dear Parent/Guardian,</p>" +
            "<p>Your ward <strong>" + studentName + "</strong> has submitted a leave request:</p>" +
            "<table style='width:100%;border-collapse:collapse;margin:16px 0'>" +
            row("From Date", fromDate) + row("To Date", toDate) +
            "</table>" +
            "<p>Please click the button below to acknowledge this request:</p>" +
            "<div style='text-align:center;margin:28px 0'>" +
            "<a href='" + ackLink + "' style='background:#2563EB;color:#fff;padding:14px 32px;" +
            "border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px'>Acknowledge Leave</a></div>" +
            "<p style='color:#64748b;font-size:13px'>If you did not expect this email, please contact the school directly.</p>" +
            "<p>Regards,<br><strong>" + schoolName + "</strong></p></div>";
    }

    private String buildAttendanceAlertHtml(String studentName, String className, double pct, String schoolName) {
        String pctStr = String.format("%.1f%%", pct);
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'>" +
            "<h2 style='color:#dc2626'>Low Attendance Alert — " + schoolName + "</h2>" +
            "<p>Dear Parent/Guardian,</p>" +
            "<p>This is an automated alert to inform you that your ward <strong>" + studentName +
            "</strong> (Class: " + className + ") has a low attendance of " +
            "<strong style='color:#dc2626'>" + pctStr + "</strong> this month.</p>" +
            "<p>Please ensure regular attendance to avoid academic impact. " +
            "Contact the school if you need further assistance.</p>" +
            "<p>Regards,<br><strong>" + schoolName + "</strong></p></div>";
    }

    private String buildMeetingConfirmHtml(String studentName, String teacherName,
            String date, String time, String topic, String schoolName) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'>" +
            "<h2 style='color:#2563EB'>Meeting Confirmed — " + schoolName + "</h2>" +
            "<p>Dear Parent/Guardian,</p>" +
            "<p>Your parent-teacher meeting has been confirmed. Details below:</p>" +
            "<table style='width:100%;border-collapse:collapse;margin:16px 0'>" +
            row("Student", studentName) + row("Teacher", teacherName) +
            row("Date", date) + row("Time", time) +
            row("Topic", topic != null && !topic.isBlank() ? topic : "General Discussion") +
            "</table>" +
            "<p>Please arrive 5 minutes early. Contact the school if you need to reschedule.</p>" +
            "<p>Regards,<br><strong>" + schoolName + "</strong></p></div>";
    }
}
