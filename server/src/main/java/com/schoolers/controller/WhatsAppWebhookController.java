package com.schoolers.controller;

import com.schoolers.service.WhatsAppCloudService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Handles Meta WhatsApp Cloud API webhook.
 *
 * GET  /api/whatsapp/webhook  — webhook verification (Meta calls this once during setup)
 * POST /api/whatsapp/webhook  — incoming messages; validated via X-Hub-Signature-256
 */
@RestController
@RequestMapping("/api/whatsapp")
public class WhatsAppWebhookController {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppWebhookController.class);

    @Autowired
    private WhatsAppCloudService whatsAppCloudService;

    // ── Webhook verification (Meta calls GET to verify your endpoint) ─────────
    @GetMapping("/webhook")
    public ResponseEntity<String> verify(
            @RequestParam("hub.mode")        String mode,
            @RequestParam("hub.verify_token") String token,
            @RequestParam("hub.challenge")   String challenge) {

        if ("subscribe".equals(mode) && whatsAppCloudService.getVerifyToken().equals(token)) {
            log.info("[WhatsApp Webhook] Verified successfully");
            return ResponseEntity.ok(challenge);
        }
        log.warn("[WhatsApp Webhook] Verification failed — token mismatch");
        return ResponseEntity.status(403).body("Forbidden");
    }

    // ── Incoming messages from customers ─────────────────────────────────────
    @PostMapping("/webhook")
    public ResponseEntity<String> receive(
            @RequestBody String payload,
            HttpServletRequest request) {

        String sigHeader = request.getHeader("X-Hub-Signature-256");
        String appSecret = whatsAppCloudService.getAppSecret();

        if (appSecret != null && !appSecret.isBlank()) {
            if (sigHeader == null || !verifySignature(payload, sigHeader, appSecret)) {
                log.warn("[WhatsApp Webhook] Rejected — invalid X-Hub-Signature-256");
                return ResponseEntity.status(403).body("Forbidden");
            }
        }

        whatsAppCloudService.processIncoming(payload);
        return ResponseEntity.ok("EVENT_RECEIVED");
    }

    /** Validates HMAC-SHA256 signature from Meta using constant-time comparison. */
    private boolean verifySignature(String payload, String sigHeader, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expectedHex = "sha256=" + bytesToHex(expected);
            return MessageDigest.isEqual(
                    expectedHex.getBytes(StandardCharsets.UTF_8),
                    sigHeader.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("[WhatsApp Webhook] Signature verification error: {}", e.getMessage());
            return false;
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
