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

    @Value("${app.frontend.url:https://my-skoolz.com}")
    private String appBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    // ── OTP email (critical — re-throws on failure so caller can handle) ──────

    public void sendOtpEmail(String toEmail, String otp) {
        requireApiKey();
        send(toEmail, "My-Skoolz Password Reset OTP", buildOtpHtml(otp));
        log.info("[EmailService] OTP email sent to: " + toEmail);
    }

    // ── Owner login OTP (critical — re-throws on failure so login is blocked) ─

    public void sendOwnerLoginOtp(String ownerEmail, String otp) {
        requireApiKey();
        send(ownerEmail, "My-Skoolz — Owner Login OTP", buildOwnerLoginOtpHtml(ownerEmail, otp));
        log.info("[EmailService] Owner login OTP sent to owner: " + ownerEmail);
    }

    // ── Registration email verification (re-throws on failure) ──────────────

    public void sendRegistrationOtp(String toEmail, String name, String otp) {
        requireApiKey();
        send(toEmail, "Verify your My-Skoolz account", buildRegistrationOtpHtml(name, otp));
        log.info("[EmailService] Registration OTP email sent to: " + toEmail);
    }

    // ── Onboarding email verification (verify email before account creation) ─

    public void sendOnboardingOtpEmail(String toEmail, String otp) {
        requireApiKey();
        send(toEmail, "My-Skoolz — Verify your email address", buildOnboardingOtpHtml(toEmail, otp));
        log.info("[EmailService] Onboarding OTP sent to: " + toEmail);
    }

    private String buildOnboardingOtpHtml(String email, String otp) {
        return "<!DOCTYPE html><html><body style='margin:0;padding:0;background:#f7fafc;font-family:Poppins,sans-serif;'>"
            + "<div style='max-width:480px;margin:32px auto;background:#fff;border-radius:16px;padding:40px 36px;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>"
            + "<div style='text-align:center;margin-bottom:24px;'>"
            + "<h2 style='margin:8px 0 0;color:#0de1e8;font-size:22px;'>My-Skoolz</h2>"
            + "<p style='color:#718096;font-size:13px;margin:4px 0 0;'>Smart School Management</p>"
            + "</div>"
            + "<h3 style='color:#2d3748;margin-bottom:8px;'>Verify Your Email</h3>"
            + "<p style='color:#718096;font-size:14px;'>An account is being created for <strong>" + email + "</strong> on My-Skoolz.</p>"
            + "<p style='color:#718096;font-size:14px;'>Enter the verification code below to confirm your email address. It expires in <strong>10 minutes</strong>.</p>"
            + "<div style='background:#f0fafa;border:2px dashed #0de1e8;border-radius:12px;padding:20px;text-align:center;margin:24px 0;'>"
            + "<div style='font-size:36px;font-weight:800;letter-spacing:8px;color:#0de1e8;font-family:monospace;'>" + otp + "</div>"
            + "</div>"
            + "<p style='color:#a0aec0;font-size:12px;text-align:center;'>If you were not expecting this email, please ignore it. No account will be created without this code.</p>"
            + "</div></body></html>";
    }

    private String buildRegistrationOtpHtml(String name, String otp) {
        return "<!DOCTYPE html><html><body style='margin:0;padding:0;background:#f7fafc;font-family:Poppins,sans-serif;'>"
            + "<div style='max-width:480px;margin:32px auto;background:#fff;border-radius:16px;padding:40px 36px;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>"
            + "<div style='text-align:center;margin-bottom:24px;'>"
            + "<span style='font-size:36px;'>🏆</span>"
            + "<h2 style='margin:8px 0 0;color:#0de1e8;font-size:22px;'>My-Skoolz</h2>"
            + "</div>"
            + "<h3 style='color:#2d3748;margin-bottom:8px;'>Verify Your Email</h3>"
            + "<p style='color:#718096;font-size:14px;'>Hi <strong>" + name + "</strong>, welcome to My-Skoolz!</p>"
            + "<p style='color:#718096;font-size:14px;'>Use the code below to verify your email address. It expires in <strong>15 minutes</strong>.</p>"
            + "<div style='background:#f0fafa;border:2px dashed #0de1e8;border-radius:12px;padding:20px;text-align:center;margin:24px 0;'>"
            + "<div style='font-size:36px;font-weight:800;letter-spacing:8px;color:#0de1e8;font-family:monospace;'>" + otp + "</div>"
            + "</div>"
            + "<p style='color:#a0aec0;font-size:12px;text-align:center;'>If you did not register on My-Skoolz, please ignore this email.</p>"
            + "</div></body></html>";
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

    // ── Welcome / account-created email (fire-and-forget) ────────────────────

    public void sendWelcomeEmail(String toEmail, String name, String role, String tempPassword) {
        try {
            requireApiKey();
            send(toEmail,
                "Welcome to My-Skoolz — Your Account is Ready",
                buildWelcomeHtml(name, role, toEmail, tempPassword));
            log.info("[EmailService] Welcome email sent to: " + toEmail);
        } catch (Exception e) {
            log.warning("[EmailService] Welcome email failed for " + toEmail + ": " + e.getMessage());
        }
    }

    // ── Account locked notification (fire-and-forget) ────────────────────────

    public void sendAccountLockedEmail(String toEmail, String name) {
        try {
            requireApiKey();
            String resetUrl = appBaseUrl + "/forgot-password";
            send(toEmail,
                "My-Skoolz — Your account has been locked",
                buildAccountLockedHtml(name, resetUrl));
            log.info("[EmailService] Account locked notification sent to: " + toEmail);
        } catch (Exception e) {
            log.warning("[EmailService] Account locked email failed for " + toEmail + ": " + e.getMessage());
        }
    }

    private String buildAccountLockedHtml(String name, String resetUrl) {
        return "<!DOCTYPE html><html><body style='margin:0;padding:0;background:#f7fafc;font-family:Poppins,Arial,sans-serif;'>"
            + "<div style='max-width:520px;margin:32px auto;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);'>"
            // Red header
            + "<div style='background:linear-gradient(135deg,#dc2626,#991b1b);padding:32px 28px;text-align:center;'>"
            + "<div style='width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.15);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;'>"
            + "<span style='font-size:30px;'>&#128274;</span>"
            + "</div>"
            + "<h2 style='color:#fff;margin:0;font-size:22px;font-weight:800;'>Account Locked</h2>"
            + "<p style='color:#fecaca;margin:4px 0 0;font-size:13px;'>My-Skoolz Security Alert</p>"
            + "</div>"
            // Body
            + "<div style='background:#fff;padding:32px 28px;'>"
            + "<p style='color:#1a202c;font-size:15px;margin:0 0 12px;'>Hi <strong>" + (name != null ? name : "there") + "</strong>,</p>"
            + "<p style='color:#4a5568;font-size:14px;line-height:1.7;margin:0 0 16px;'>"
            + "Your <strong>My-Skoolz</strong> account has been <strong style='color:#dc2626;'>locked</strong> after "
            + "<strong>5 consecutive failed login attempts</strong>. "
            + "To protect your account, access has been suspended until you reset your password.</p>"
            // Steps box
            + "<div style='background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin:0 0 24px;'>"
            + "<div style='font-weight:700;font-size:13px;color:#991b1b;margin-bottom:10px;'>What to do next:</div>"
            + "<ol style='margin:0;padding-left:18px;color:#4a5568;font-size:13px;line-height:2;'>"
            + "<li>Click <strong>Reset My Password</strong> below</li>"
            + "<li>Enter your registered email or mobile</li>"
            + "<li>Enter the OTP you receive &amp; set a new password</li>"
            + "</ol>"
            + "</div>"
            // CTA button
            + "<div style='text-align:center;margin:0 0 28px;'>"
            + "<a href='" + resetUrl + "' style='display:inline-block;background:linear-gradient(135deg,#2563EB,#1d4ed8);color:#fff;"
            + "padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;"
            + "box-shadow:0 4px 14px rgba(37,99,235,0.35);'>Reset My Password</a>"
            + "</div>"
            // Security notice
            + "<div style='background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:12px;color:#92400e;'>"
            + "<strong>&#9888; Didn't try to log in?</strong> "
            + "Someone may be attempting to access your account. Contact your school administrator immediately."
            + "</div>"
            + "</div>"
            // Footer
            + "<div style='background:#f7fafc;padding:16px;text-align:center;'>"
            + "<p style='font-size:11px;color:#a0aec0;margin:0;'>Powered by My-Skoolz &mdash; Smart School Management</p>"
            + "</div>"
            + "</div>"
            + "</body></html>";
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

    // ── Owner action confirmation OTP (critical — re-throws on failure) ─────

    public void sendOwnerActionOtp(String ownerEmail, String otp) {
        requireApiKey();
        send(ownerEmail, "My-Skoolz — Action Confirmation OTP", buildOwnerActionOtpHtml(otp));
        log.info("[EmailService] Owner action OTP sent to: " + ownerEmail);
    }

    private String buildOwnerActionOtpHtml(String otp) {
        return "<!DOCTYPE html><html><body style='margin:0;padding:0;background:#f7fafc;font-family:Poppins,Arial,sans-serif;'>"
            + "<div style='max-width:480px;margin:32px auto;background:#fff;border-radius:16px;padding:40px 36px;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>"
            + "<div style='text-align:center;margin-bottom:24px;'>"
            + "<div style='width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,#dc2626,#991b1b);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;'>"
            + "<span style='color:#fff;font-size:26px;'>⚠️</span></div>"
            + "<h2 style='margin:0;color:#1a202c;font-size:20px;font-weight:800;'>Action Confirmation Required</h2>"
            + "<p style='color:#718096;font-size:13px;margin:6px 0 0;'>My-Skoolz Platform — Owner Portal</p>"
            + "</div>"
            + "<p style='color:#4a5568;font-size:14px;line-height:1.7;'>You requested a one-time verification code to confirm a <strong>destructive action</strong> (such as deleting a school or admin account) on the My-Skoolz platform.</p>"
            + "<p style='color:#4a5568;font-size:14px;'>Your confirmation code is:</p>"
            + "<div style='background:#fff5f5;border:2px dashed #fc8181;border-radius:12px;padding:20px;text-align:center;margin:20px 0;'>"
            + "<div style='font-size:38px;font-weight:800;letter-spacing:10px;color:#dc2626;font-family:monospace;'>" + otp + "</div>"
            + "<div style='font-size:12px;color:#e53e3e;margin-top:8px;font-weight:600;'>Valid for 10 minutes</div>"
            + "</div>"
            + "<div style='background:#fff5f5;border-radius:8px;padding:12px 16px;border-left:4px solid #dc2626;'>"
            + "<p style='margin:0;font-size:13px;color:#c53030;'><strong>⚠️ If you did not request this,</strong> your account may be at risk. Change your password immediately.</p>"
            + "</div>"
            + "</div></body></html>";
    }

    // ── Issue report notification (fire-and-forget) ──────────────────────────

    public void sendIssueReportNotification(com.schoolers.model.IssueReport issue) {
        final String ISSUES_EMAIL = "schoolapplication20@gmail.com";
        try {
            requireApiKey();
            send(ISSUES_EMAIL,
                "[My-Skoolz] New Issue Reported — " + issue.getCategory() + " [" + issue.getPriority() + "]",
                buildIssueReportHtml(issue));
            log.info("[EmailService] Issue report notification sent for issue #" + issue.getId());
        } catch (Exception e) {
            log.warning("[EmailService] Issue report email failed for issue #" + issue.getId() + ": " + e.getMessage());
        }
    }

    private String buildIssueReportHtml(com.schoolers.model.IssueReport issue) {
        String priorityColor = (issue.getPriority() == com.schoolers.model.IssueReport.Priority.HIGH
                || issue.getPriority() == com.schoolers.model.IssueReport.Priority.CRITICAL) ? "#dc2626" : "#d97706";
        return "<!DOCTYPE html><html><body style='margin:0;padding:0;background:#f7fafc;font-family:Poppins,Arial,sans-serif;'>"
            + "<div style='max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>"
            + "<div style='background:linear-gradient(135deg,#1e1b4b,#4c1d95);padding:28px 32px;'>"
            + "<h2 style='margin:0;color:#fff;font-size:20px;'>🐛 New Issue Reported</h2>"
            + "<p style='margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;'>My-Skoolz Platform — Issue Tracker</p>"
            + "</div>"
            + "<div style='padding:28px 32px;'>"
            + "<table style='width:100%;border-collapse:collapse;'>"
            + row("Issue #",       String.valueOf(issue.getId()))
            + row("Title",         issue.getTitle())
            + row("Category",      issue.getCategory().replace("_", " "))
            + row("Priority",      "<span style='color:" + priorityColor + ";font-weight:700;'>" + issue.getPriority() + "</span>")
            + row("Reporter",      nvl(issue.getReporterName()) + " (" + nvl(issue.getReporterEmail()) + ")")
            + row("Role",          nvl(issue.getReporterRole()))
            + row("School",        nvl(issue.getSchoolName()))
            + row("Reported At",   issue.getCreatedAt() != null ? issue.getCreatedAt().toString().replace("T", " ").substring(0, 19) : "—")
            + "</table>"
            + "<div style='margin-top:20px;background:#f8faff;border-left:4px solid #4f46e5;padding:16px 20px;border-radius:0 8px 8px 0;'>"
            + "<p style='margin:0 0 6px;font-size:12px;font-weight:700;color:#4f46e5;text-transform:uppercase;letter-spacing:.05em;'>Description</p>"
            + "<p style='margin:0;font-size:14px;color:#1e293b;line-height:1.7;white-space:pre-wrap;'>" + escHtml(issue.getDescription()) + "</p>"
            + "</div>"
            + "</div>"
            + "<div style='padding:16px 32px;background:#f8faff;border-top:1px solid #e2e8f0;text-align:center;'>"
            + "<p style='margin:0;font-size:11px;color:#94a3b8;'>My-Skoolz Platform • Issue Tracker</p>"
            + "</div></div></body></html>";
    }

    private String nvl(String s) { return s != null && !s.isBlank() ? s : "—"; }

    private String escHtml(String s) {
        if (s == null) return "";
        return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
                .replace("\"","&quot;").replace("'","&#39;");
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

    private String buildOwnerLoginOtpHtml(String ownerEmail, String otp) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'>"
            + "<h2 style='color:#dc2626'>My-Skoolz — Owner Login Verification</h2>"
            + "<p>A login attempt was made for the Application Owner account:</p>"
            + "<p><strong>Owner Email:</strong> " + ownerEmail + "</p>"
            + "<div style='font-size:36px;font-weight:bold;color:#dc2626;letter-spacing:8px;"
            + "text-align:center;padding:20px;background:#fef2f2;border-radius:8px;margin:20px 0'>"
            + otp + "</div>"
            + "<p>This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>"
            + "<p>If this was not you, please change the account password immediately.</p>"
            + "<br><p>Regards,<br><strong>My-Skoolz Security</strong></p></div>";
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

    private String buildWelcomeHtml(String name, String role, String email, String tempPassword) {
        String loginUrl = appBaseUrl + "/login";
        String roleDisplay = switch (role) {
            case "SUPER_ADMIN" -> "Super Admin";
            case "ADMIN"       -> "School Admin";
            case "TEACHER"     -> "Teacher";
            default            -> role;
        };
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a202c'>"
            + "<div style='text-align:center;margin-bottom:28px'>"
            + "<h1 style='color:#2563EB;margin:0;font-size:28px'>My-Skoolz</h1>"
            + "<p style='color:#718096;margin:4px 0 0;font-size:14px'>Smart School Management</p>"
            + "</div>"
            + "<h2 style='color:#1a202c;font-size:20px;margin-bottom:8px'>Welcome, " + name + "!</h2>"
            + "<p style='color:#4a5568;font-size:14px;margin-bottom:20px'>Your <strong>" + roleDisplay
            + "</strong> account on My-Skoolz has been created. Use the credentials below to log in.</p>"
            + "<div style='background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px;margin-bottom:24px'>"
            + "<table style='width:100%;border-collapse:collapse;font-size:14px'>"
            + row("Login URL",  "<a href='" + loginUrl + "' style='color:#2563EB'>" + loginUrl + "</a>")
            + row("Email / Username", email)
            + row("Temporary Password", "<code style='background:#e0e7ff;padding:2px 8px;border-radius:4px;font-size:15px;letter-spacing:1px'>"
                + tempPassword + "</code>")
            + "</table>"
            + "</div>"
            + "<div style='background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:24px;font-size:13px;color:#92400e'>"
            + "<strong>&#9888; Action Required:</strong> You will be prompted to change your password when you first log in. "
            + "Please do so immediately and do not share your credentials with anyone."
            + "</div>"
            + "<p style='font-size:13px;color:#718096'>If you did not expect this email, please contact your school administrator or "
            + "reach out to us at <a href='mailto:" + notifyEmail + "' style='color:#2563EB'>" + notifyEmail + "</a>.</p>"
            + "<hr style='border:none;border-top:1px solid #e2e8f0;margin:24px 0'>"
            + "<p style='font-size:12px;color:#a0aec0;text-align:center'>Powered by My-Skoolz &mdash; Smart School Management</p>"
            + "</div>";
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
