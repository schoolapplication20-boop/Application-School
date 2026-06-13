package com.schoolers.sms;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.model.sms.SmsLogStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.TreeMap;
import java.util.logging.Logger;

/**
 * Sends SMS via the Twilio REST API and verifies Twilio's delivery-status webhook signature.
 * Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and either TWILIO_FROM_NUMBER or
 * TWILIO_MESSAGING_SERVICE_SID. If unconfigured, {@link #send} returns a failure result rather
 * than throwing, so the rest of the SMS pipeline (queue, logs, UI) remains testable.
 */
@Component
@ConditionalOnProperty(name = "sms.provider", havingValue = "twilio")
public class TwilioSmsProvider implements SmsProvider {

    private static final Logger log = Logger.getLogger(TwilioSmsProvider.class.getName());
    private static final String API_URL_TEMPLATE = "https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json";

    @Value("${twilio.account.sid:}")
    private String accountSid;

    @Value("${twilio.auth.token:}")
    private String authToken;

    @Value("${twilio.from.number:}")
    private String fromNumber;

    @Value("${twilio.messaging.service.sid:}")
    private String messagingServiceSid;

    @Value("${twilio.webhook.base.url:}")
    private String webhookBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public String getProviderName() {
        return "twilio";
    }

    @Override
    public boolean isConfigured() {
        return notBlank(accountSid) && notBlank(authToken) && (notBlank(fromNumber) || notBlank(messagingServiceSid));
    }

    /** The public webhook URL Twilio should call back with delivery status, or null if not configured. */
    public String getStatusCallbackUrl() {
        return notBlank(webhookBaseUrl) ? webhookBaseUrl.replaceAll("/+$", "") + "/api/sms/webhook/twilio/status" : null;
    }

    @Override
    public SmsSendResult send(String toPhoneE164, String message) {
        if (!isConfigured()) {
            return SmsSendResult.failure("NOT_CONFIGURED", "Twilio is not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER)");
        }
        try {
            String url = String.format(API_URL_TEMPLATE, accountSid);

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("To", toPhoneE164);
            form.add("Body", message);
            if (notBlank(messagingServiceSid)) {
                form.add("MessagingServiceSid", messagingServiceSid);
            } else {
                form.add("From", fromNumber);
            }
            String statusCallback = getStatusCallbackUrl();
            if (statusCallback != null) {
                form.add("StatusCallback", statusCallback);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setBasicAuth(accountSid, authToken);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(form, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            JsonNode body = mapper.readTree(response.getBody());
            JsonNode errorCode = body.path("error_code");
            if (!errorCode.isNull() && !errorCode.isMissingNode()) {
                return SmsSendResult.failure(errorCode.asText(), body.path("error_message").asText(null));
            }

            String sid = body.path("sid").asText(null);
            int segments = body.path("num_segments").asInt(1);
            log.info("[TwilioSmsProvider] Sent to " + PhoneUtil.mask(toPhoneE164) + " sid=" + sid + " status=" + body.path("status").asText());
            return SmsSendResult.success(sid, segments);
        } catch (HttpStatusCodeException e) {
            String errorMessage = parseErrorMessage(e.getResponseBodyAsString());
            log.warning("[TwilioSmsProvider] Send failed to " + PhoneUtil.mask(toPhoneE164) + ": " + e.getStatusCode() + " " + errorMessage);
            return SmsSendResult.failure("HTTP_" + e.getStatusCode().value(), errorMessage);
        } catch (Exception e) {
            log.warning("[TwilioSmsProvider] Send error to " + PhoneUtil.mask(toPhoneE164) + ": " + e.getMessage());
            return SmsSendResult.failure("SEND_ERROR", e.getMessage());
        }
    }

    /**
     * Verifies Twilio's {@code X-Twilio-Signature} header: base64(HMAC-SHA1(authToken, url + sortedParams)).
     * See https://www.twilio.com/docs/usage/webhooks/webhooks-security
     */
    public boolean verifyWebhookSignature(String fullUrl, Map<String, String> params, String signatureHeader) {
        if (!notBlank(authToken) || signatureHeader == null) return false;
        try {
            StringBuilder data = new StringBuilder(fullUrl);
            for (Map.Entry<String, String> entry : new TreeMap<>(params).entrySet()) {
                data.append(entry.getKey()).append(entry.getValue());
            }
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(authToken.getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
            byte[] computed = mac.doFinal(data.toString().getBytes(StandardCharsets.UTF_8));
            String expected = Base64.getEncoder().encodeToString(computed);
            return expected.equals(signatureHeader);
        } catch (Exception e) {
            log.warning("[TwilioSmsProvider] Signature verification error: " + e.getMessage());
            return false;
        }
    }

    /** Maps Twilio's {@code MessageStatus} webhook values to {@link SmsLogStatus}, or {@code null} for intermediate statuses to ignore (e.g. "queued", "sending", "accepted"). */
    public SmsLogStatus mapDeliveryStatus(String providerStatus) {
        if (providerStatus == null) return null;
        switch (providerStatus.toLowerCase()) {
            case "delivered": return SmsLogStatus.DELIVERED;
            case "failed": return SmsLogStatus.FAILED;
            case "undelivered": return SmsLogStatus.UNDELIVERED;
            case "sent": return SmsLogStatus.SENT;
            default: return null;
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
