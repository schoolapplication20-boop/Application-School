package com.schoolers.controller;

import com.schoolers.service.sms.SmsDeliveryStatusService;
import com.schoolers.sms.TwilioSmsProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Receives Twilio's delivery-status callbacks. Public endpoint (permitted in {@code SecurityConfig}
 * like {@code /api/whatsapp/webhook}) — authenticated instead via Twilio's {@code X-Twilio-Signature}
 * HMAC, verified against the exact {@code twilio.webhook.base.url} we registered as the StatusCallback.
 */
@RestController
@RequestMapping("/api/sms/webhook")
@ConditionalOnProperty(name = "sms.provider", havingValue = "twilio")
public class SmsWebhookController {

    private static final Logger log = LoggerFactory.getLogger(SmsWebhookController.class);

    private final TwilioSmsProvider twilioSmsProvider;
    private final SmsDeliveryStatusService deliveryStatusService;

    public SmsWebhookController(TwilioSmsProvider twilioSmsProvider, SmsDeliveryStatusService deliveryStatusService) {
        this.twilioSmsProvider = twilioSmsProvider;
        this.deliveryStatusService = deliveryStatusService;
    }

    @PostMapping(value = "/twilio/status", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<String> twilioStatusCallback(
            @RequestParam Map<String, String> params,
            @RequestHeader(value = "X-Twilio-Signature", required = false) String signature) {

        String callbackUrl = twilioSmsProvider.getStatusCallbackUrl();
        if (callbackUrl == null || !twilioSmsProvider.verifyWebhookSignature(callbackUrl, params, signature)) {
            log.warn("[SmsWebhook] Rejected Twilio status callback — missing/invalid X-Twilio-Signature or webhook not configured");
            return ResponseEntity.status(403).body("Forbidden");
        }

        String messageSid = params.get("MessageSid");
        String messageStatus = params.get("MessageStatus");
        if (messageSid == null || messageStatus == null) {
            return ResponseEntity.badRequest().body("Missing MessageSid/MessageStatus");
        }

        deliveryStatusService.recordDeliveryStatus(messageSid, twilioSmsProvider.mapDeliveryStatus(messageStatus),
                params.get("ErrorCode"), params.get("ErrorMessage"), params.toString());
        return ResponseEntity.ok("OK");
    }
}
