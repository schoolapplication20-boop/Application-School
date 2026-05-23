package com.schoolers.controller;

import com.schoolers.service.WhatsAppCloudService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.logging.Logger;

/**
 * Handles Meta WhatsApp Cloud API webhook.
 *
 * GET  /api/whatsapp/webhook  — webhook verification (Meta calls this once during setup)
 * POST /api/whatsapp/webhook  — incoming messages from customers
 */
@RestController
@RequestMapping("/api/whatsapp")
public class WhatsAppWebhookController {

    private static final Logger log = Logger.getLogger(WhatsAppWebhookController.class.getName());

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
        log.warning("[WhatsApp Webhook] Verification failed — token mismatch");
        return ResponseEntity.status(403).body("Forbidden");
    }

    // ── Incoming messages from customers ─────────────────────────────────────
    @PostMapping("/webhook")
    public ResponseEntity<String> receive(@RequestBody String payload) {
        log.info("[WhatsApp Webhook] Received: " + payload);
        whatsAppCloudService.processIncoming(payload);
        return ResponseEntity.ok("EVENT_RECEIVED");
    }
}
