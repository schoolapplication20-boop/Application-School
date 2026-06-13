package com.schoolers.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.service.sms.SmsDeliveryStatusService;
import com.schoolers.sms.Msg91SmsProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Receives MSG91 delivery-report (DLR) callbacks. Public endpoint (permitted in
 * {@code SecurityConfig} like {@code /api/sms/webhook/**}) — MSG91 doesn't sign DLR callbacks, so
 * this is authenticated instead via a shared-secret {@code token} query param. Configure this
 * URL (including the secret) as the account-level DLR callback URL in the MSG91 dashboard
 * (Settings &gt; API &gt; DLR URL): {@code https://<host>/api/sms/webhook/msg91/status?token=<secret>}.
 *
 * <p>MSG91's DLR payload field names vary by route/integration, so common variants for the
 * message identifier and status are checked.
 */
@RestController
@RequestMapping("/api/sms/webhook")
@ConditionalOnProperty(name = "sms.provider", havingValue = "msg91")
public class Msg91WebhookController {

    private static final Logger log = LoggerFactory.getLogger(Msg91WebhookController.class);

    private static final String[] ID_FIELDS = { "request_id", "requestId", "reqId", "msgId", "id" };
    private static final String[] STATUS_FIELDS = { "status", "deliveryStatus", "dlrStatus" };
    private static final String[] ERROR_CODE_FIELDS = { "error_code", "errorCode" };
    private static final String[] ERROR_MESSAGE_FIELDS = { "error", "errorDescription", "reason", "description" };

    private final Msg91SmsProvider msg91SmsProvider;
    private final SmsDeliveryStatusService deliveryStatusService;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${msg91.webhook.secret:}")
    private String webhookSecret;

    public Msg91WebhookController(Msg91SmsProvider msg91SmsProvider, SmsDeliveryStatusService deliveryStatusService) {
        this.msg91SmsProvider = msg91SmsProvider;
        this.deliveryStatusService = deliveryStatusService;
    }

    /** Most MSG91 DLR integrations POST a JSON body (single object or array of entries). */
    @PostMapping("/msg91/status")
    public ResponseEntity<String> statusCallbackPost(@RequestParam(required = false) String token,
                                                      @RequestBody(required = false) String rawBody) {
        if (!isAuthorized(token)) {
            log.warn("[Msg91Webhook] Rejected DLR callback — missing/invalid token");
            return ResponseEntity.status(403).body("Forbidden");
        }
        if (rawBody == null || rawBody.isBlank()) {
            return ResponseEntity.badRequest().body("Empty body");
        }
        try {
            JsonNode root = mapper.readTree(rawBody);
            if (root.isArray()) {
                root.forEach(this::processEntry);
            } else {
                processEntry(root);
            }
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.warn("[Msg91Webhook] Failed to parse DLR payload: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Invalid payload");
        }
    }

    /** Some MSG91 setups deliver DLRs as a GET request with query params instead of a JSON body. */
    @GetMapping("/msg91/status")
    public ResponseEntity<String> statusCallbackGet(@RequestParam Map<String, String> params) {
        if (!isAuthorized(params.get("token"))) {
            log.warn("[Msg91Webhook] Rejected DLR callback — missing/invalid token");
            return ResponseEntity.status(403).body("Forbidden");
        }
        processEntry(mapper.valueToTree(params));
        return ResponseEntity.ok("OK");
    }

    private void processEntry(JsonNode entry) {
        String requestId = firstNonNull(entry, ID_FIELDS);
        String status = firstNonNull(entry, STATUS_FIELDS);
        if (requestId == null || status == null) {
            log.warn("[Msg91Webhook] DLR callback missing request id or status: {}", entry);
            return;
        }
        deliveryStatusService.recordDeliveryStatus(requestId, msg91SmsProvider.mapDeliveryStatus(status),
                firstNonNull(entry, ERROR_CODE_FIELDS), firstNonNull(entry, ERROR_MESSAGE_FIELDS), entry.toString());
    }

    private boolean isAuthorized(String token) {
        return notBlank(webhookSecret) && webhookSecret.equals(token);
    }

    private String firstNonNull(JsonNode node, String... fields) {
        for (String field : fields) {
            JsonNode value = node.get(field);
            if (value != null && !value.isNull()) {
                String text = value.asText();
                if (!text.isBlank()) return text;
            }
        }
        return null;
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
