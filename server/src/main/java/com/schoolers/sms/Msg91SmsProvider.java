package com.schoolers.sms;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.model.sms.SmsLogStatus;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Sends SMS via MSG91's v2 Send SMS API (DLT-compliant — required for SMS to Indian numbers).
 * Configure MSG91_AUTH_KEY, MSG91_SENDER_ID (6-char DLT-registered alphanumeric sender ID) and
 * MSG91_DLT_TE_ID (DLT-approved template ID for the configured route). If unconfigured,
 * {@link #send} returns a failure result rather than throwing, so the rest of the SMS pipeline
 * (queue, logs, UI) remains testable.
 */
@Component
@ConditionalOnProperty(name = "sms.provider", havingValue = "msg91")
public class Msg91SmsProvider implements SmsProvider {

    private static final Logger log = Logger.getLogger(Msg91SmsProvider.class.getName());
    private static final String API_URL = "https://api.msg91.com/api/v2/sendsms";

    @Value("${msg91.auth.key:}")
    private String authKey;

    @Value("${msg91.sender.id:}")
    private String senderId;

    @Value("${msg91.route:4}")
    private String route;

    @Value("${msg91.dlt.te.id:}")
    private String dltTemplateId;

    @Value("${msg91.country.code:91}")
    private String countryCode;

    @Value("${msg91.webhook.base.url:}")
    private String webhookBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public String getProviderName() {
        return "msg91";
    }

    @Override
    public boolean isConfigured() {
        return notBlank(authKey) && notBlank(senderId) && notBlank(dltTemplateId);
    }

    @PostConstruct
    void logWebhookSetupHint() {
        if (isConfigured() && notBlank(webhookBaseUrl)) {
            log.info("[Msg91SmsProvider] To enable delivery tracking, set this as the DLR callback URL in the "
                    + "MSG91 dashboard (Settings > API > DLR URL): "
                    + webhookBaseUrl.replaceAll("/+$", "") + "/api/sms/webhook/msg91/status?token=<MSG91_WEBHOOK_SECRET>");
        }
    }

    @Override
    public SmsSendResult send(String toPhoneE164, String message) {
        if (!isConfigured()) {
            return SmsSendResult.failure("NOT_CONFIGURED", "MSG91 is not configured (MSG91_AUTH_KEY/MSG91_SENDER_ID/MSG91_DLT_TE_ID)");
        }
        try {
            String to = toPhoneE164.startsWith("+") ? toPhoneE164.substring(1) : toPhoneE164;

            Map<String, Object> smsEntry = new HashMap<>();
            smsEntry.put("message", message);
            smsEntry.put("to", List.of(to));

            Map<String, Object> body = new HashMap<>();
            body.put("sender", senderId);
            body.put("route", route);
            body.put("country", countryCode);
            body.put("sms", List.of(smsEntry));
            body.put("DLT_TE_ID", dltTemplateId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("authkey", authKey);
            headers.set("Accept", "application/json");

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(API_URL, request, String.class);

            JsonNode json = mapper.readTree(response.getBody());
            String type = json.path("type").asText("");
            String responseMessage = json.path("message").asText(null);

            if (!"success".equalsIgnoreCase(type)) {
                log.warning("[Msg91SmsProvider] Send failed to " + PhoneUtil.mask(toPhoneE164) + ": " + responseMessage);
                return SmsSendResult.failure("MSG91_ERROR", responseMessage != null ? responseMessage : response.getBody());
            }

            int segments = SmsSegmentUtil.countSegments(message);
            log.info("[Msg91SmsProvider] Sent to " + PhoneUtil.mask(toPhoneE164) + " requestId=" + responseMessage + " segments=" + segments);
            return SmsSendResult.success(responseMessage, segments);
        } catch (HttpStatusCodeException e) {
            String errorMessage = parseErrorMessage(e.getResponseBodyAsString());
            log.warning("[Msg91SmsProvider] Send failed to " + PhoneUtil.mask(toPhoneE164) + ": " + e.getStatusCode() + " " + errorMessage);
            return SmsSendResult.failure("HTTP_" + e.getStatusCode().value(), errorMessage);
        } catch (Exception e) {
            log.warning("[Msg91SmsProvider] Send error to " + PhoneUtil.mask(toPhoneE164) + ": " + e.getMessage());
            return SmsSendResult.failure("SEND_ERROR", e.getMessage());
        }
    }

    /**
     * Maps an MSG91 DLR status value to {@link SmsLogStatus}, or {@code null} if unrecognized
     * (left for the webhook controller to ignore). MSG91 DLR status vocabulary varies by route
     * and integration, so common variants are covered.
     */
    public SmsLogStatus mapDeliveryStatus(String providerStatus) {
        if (providerStatus == null) return null;
        switch (providerStatus.trim().toUpperCase()) {
            case "DELIVERED":
            case "DELIVRD":
                return SmsLogStatus.DELIVERED;
            case "FAILED":
            case "REJECTED":
            case "REJECTD":
            case "BLOCKED":
            case "BLACKLIST":
                return SmsLogStatus.FAILED;
            case "EXPIRED":
            case "UNDELIV":
            case "UNDELIVERED":
                return SmsLogStatus.UNDELIVERED;
            case "SENT":
            case "SUBMITTED":
            case "SUBMIT_ACCEPTED":
                return SmsLogStatus.SENT;
            default:
                return null;
        }
    }

    private String parseErrorMessage(String responseBody) {
        try {
            JsonNode node = mapper.readTree(responseBody);
            String msg = node.path("message").asText(null);
            return msg != null ? msg : responseBody;
        } catch (Exception e) {
            return responseBody;
        }
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
