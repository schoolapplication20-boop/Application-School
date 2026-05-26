package com.schoolers.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.logging.Logger;

/**
 * Sends WhatsApp messages via Meta Cloud API and processes incoming messages.
 * Set WHATSAPP_CLOUD_TOKEN and WHATSAPP_PHONE_NUMBER_ID in environment variables.
 */
@Service
public class WhatsAppCloudService {

    private static final Logger log = Logger.getLogger(WhatsAppCloudService.class.getName());

    @Value("${whatsapp.cloud.token:}")
    private String accessToken;

    @Value("${whatsapp.cloud.phone.number.id:}")
    private String phoneNumberId;

    @Value("${whatsapp.cloud.verify.token:myskoolz2026}")
    private String verifyToken;

    /** Meta App Secret — used to verify X-Hub-Signature-256 on incoming webhooks. */
    @Value("${whatsapp.cloud.app.secret:}")
    private String appSecret;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    public boolean isConfigured() {
        return accessToken != null && !accessToken.isBlank()
            && phoneNumberId != null && !phoneNumberId.isBlank();
    }

    public String getVerifyToken() {
        return verifyToken;
    }

    public String getAppSecret() {
        return appSecret;
    }

    // ── Process incoming webhook payload ─────────────────────────────────────

    public void processIncoming(String payload) {
        try {
            JsonNode root    = mapper.readTree(payload);
            JsonNode entries = root.path("entry");
            for (JsonNode entry : entries) {
                for (JsonNode change : entry.path("changes")) {
                    JsonNode value    = change.path("value");
                    JsonNode messages = value.path("messages");
                    for (JsonNode msg : messages) {
                        String from = msg.path("from").asText();
                        String type = msg.path("type").asText("text");
                        String text = "";
                        if ("text".equals(type)) {
                            text = msg.path("text").path("body").asText("").trim();
                        }
                        handleMessage(from, text);
                    }
                }
            }
        } catch (Exception e) {
            log.warning("[WhatsAppCloud] Failed to parse payload: " + e.getMessage());
        }
    }

    // ── Message routing ───────────────────────────────────────────────────────

    private void handleMessage(String from, String text) {
        if (!isConfigured()) {
            log.warning("[WhatsAppCloud] Not configured — skipping reply to " + from);
            return;
        }

        String lower = text.toLowerCase();

        if (lower.isEmpty() || isGreeting(lower)) {
            sendGreeting(from);
        } else if (lower.contains("price") || lower.contains("cost") || lower.contains("fee") || lower.contains("plan")) {
            sendPricing(from);
        } else if (lower.contains("demo") || lower.contains("book") || lower.contains("trial")) {
            sendDemoInfo(from);
        } else if (lower.contains("feature") || lower.contains("what") || lower.contains("module")) {
            sendFeatures(from);
        } else if (lower.contains("contact") || lower.contains("call") || lower.contains("talk") || lower.contains("human")) {
            sendContactInfo(from);
        } else if (lower.contains("attendance")) {
            sendFaq(from, "📋 *Attendance Management*\n\nMy-Skoolz tracks daily class attendance digitally. Teachers mark attendance from their dashboard. Parents get notified instantly if their child is absent. Reports are auto-generated.");
        } else if (lower.contains("transport") || lower.contains("bus")) {
            sendFaq(from, "🚌 *Transport Management*\n\nManage routes, stops, vehicles, and drivers. Assign students to routes automatically. Full transport reports available for admins.");
        } else if (lower.contains("exam") || lower.contains("mark") || lower.contains("result") || lower.contains("grade")) {
            sendFaq(from, "📝 *Exam & Marks*\n\nTeachers enter marks digitally. Students can view their marks, grades, and performance by subject from their portal. Report cards available in Certificates section.");
        } else {
            sendDefault(from);
        }
    }

    private boolean isGreeting(String text) {
        return text.matches(".*(hi|hello|hey|namaste|helo|good morning|good afternoon|good evening|start|help).*");
    }

    // ── Reply templates ───────────────────────────────────────────────────────

    private void sendGreeting(String to) {
        send(to,
            "👋 Welcome to *My-Skoolz!*\n\n" +
            "We're a modern School Management Platform built for Indian schools.\n\n" +
            "How can I help you today? Reply with a number:\n\n" +
            "1️⃣ Book a Demo\n" +
            "2️⃣ Pricing & Plans\n" +
            "3️⃣ Features & Modules\n" +
            "4️⃣ Talk to our team\n\n" +
            "Or just type your question! 😊"
        );
    }

    private void sendPricing(String to) {
        send(to,
            "💰 *My-Skoolz Pricing*\n\n" +
            "We offer flexible plans for schools of all sizes:\n\n" +
            "🏫 *Starter* — Small schools (up to 200 students)\n" +
            "🏢 *Growth* — Medium schools (up to 500 students)\n" +
            "🌟 *Enterprise* — Large schools & school chains\n\n" +
            "All plans include:\n" +
            "✅ Fees & Attendance\n" +
            "✅ Student & Teacher Management\n" +
            "✅ Exam & Marks\n" +
            "✅ Transport\n" +
            "✅ Mobile App\n\n" +
            "📧 Contact us for exact pricing:\n" +
            "schoolapplication20@gmail.com"
        );
    }

    private void sendDemoInfo(String to) {
        send(to,
            "📅 *Book a Free Demo*\n\n" +
            "See My-Skoolz in action with a live walkthrough!\n\n" +
            "To book your demo, please share:\n" +
            "1. Your school name\n" +
            "2. Your name & designation\n" +
            "3. Number of students\n" +
            "4. Preferred date/time\n\n" +
            "Or email us directly:\n" +
            "📧 schoolapplication20@gmail.com\n\n" +
            "We'll get back to you within a few hours! 🚀"
        );
    }

    private void sendFeatures(String to) {
        send(to,
            "⚡ *My-Skoolz Key Features*\n\n" +
            "✅ Student & Staff Management\n" +
            "✅ Online Admissions & Enrollment\n" +
            "✅ Fee Collection & Tracking\n" +
            "✅ Attendance (with parent alerts)\n" +
            "✅ Exam Scheduling & Marks\n" +
            "✅ Transport & Routes\n" +
            "✅ Class Timetable\n" +
            "✅ Hall Tickets & Certificates\n" +
            "✅ Parent & Teacher Communication\n" +
            "✅ Mobile App (iOS & Android)\n" +
            "✅ Multi-school support\n\n" +
            "Want a live demo? Just reply *demo* 😊"
        );
    }

    private void sendContactInfo(String to) {
        send(to,
            "📞 *Contact My-Skoolz Team*\n\n" +
            "📧 Email: schoolapplication20@gmail.com\n" +
            "💬 WhatsApp: +91 83338 38252\n" +
            "🌐 Website: my-skoolz.com\n\n" +
            "⏰ We typically respond within a few hours.\n\n" +
            "You can also book a demo at:\n" +
            "my-skoolz.com/marketing/demo"
        );
    }

    private void sendFaq(String to, String answer) {
        send(to, answer + "\n\nAnything else I can help you with? 😊");
    }

    private void sendDefault(String to) {
        send(to,
            "🤔 Thanks for your message!\n\n" +
            "I'll connect you with our team shortly.\n\n" +
            "Meanwhile, you can:\n" +
            "• Reply *demo* to book a free demo\n" +
            "• Reply *price* for pricing info\n" +
            "• Reply *features* to see what we offer\n" +
            "• Reply *contact* to reach our team\n\n" +
            "📧 schoolapplication20@gmail.com"
        );
    }

    // ── Send via Meta Cloud API ───────────────────────────────────────────────

    public void send(String to, String message) {
        if (!isConfigured()) return;
        try {
            String url = "https://graph.facebook.com/v19.0/" + phoneNumberId + "/messages";

            Map<String, Object> body = Map.of(
                "messaging_product", "whatsapp",
                "to", to,
                "type", "text",
                "text", Map.of("body", message)
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("[WhatsAppCloud] Message sent to " + to);
            } else {
                log.warning("[WhatsAppCloud] Send failed: " + response.getBody());
            }
        } catch (Exception e) {
            log.warning("[WhatsAppCloud] Error sending to " + to + ": " + e.getMessage());
        }
    }
}
