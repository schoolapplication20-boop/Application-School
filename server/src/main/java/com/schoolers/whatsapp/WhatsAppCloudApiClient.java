package com.schoolers.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Stateless Meta WhatsApp Cloud API client — credentials are passed per call rather than held as
 * instance state, so both the legacy platform-wide FAQ bot ({@code WhatsAppCloudService}) and the
 * new per-school send path ({@code WhatsAppConfigurationService}) share one HTTP-call implementation
 * without either depending on the other's credential source.
 */
@Component
public class WhatsAppCloudApiClient {

    private static final String API_VERSION = "v19.0";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Sends an approved WhatsApp message template. Meta requires business-initiated messages
     * (fee reminders, payment confirmations, receipt links — all sent outside any 24h
     * customer-service window) to use a pre-approved template rather than free text.
     *
     * @param bodyParams      ordered values substituted into the template's {{1}}, {{2}}, ... body placeholders
     * @param buttonUrlParam  dynamic suffix for a template's URL button component (receipt links); null if the
     *                        template has no button
     */
    public WhatsAppSendResult sendTemplate(String phoneNumberId, String accessToken, String toE164,
                                            String templateName, String languageCode,
                                            List<String> bodyParams, String buttonUrlParam) {
        if (phoneNumberId == null || phoneNumberId.isBlank() || accessToken == null || accessToken.isBlank()) {
            return WhatsAppSendResult.failure("NOT_CONFIGURED", "WhatsApp is not configured for this school");
        }

        try {
            String url = "https://graph.facebook.com/" + API_VERSION + "/" + phoneNumberId + "/messages";

            List<Map<String, Object>> components = new ArrayList<>();
            if (bodyParams != null && !bodyParams.isEmpty()) {
                List<Map<String, Object>> parameters = new ArrayList<>();
                for (String value : bodyParams) {
                    parameters.add(Map.of("type", "text", "text", value == null ? "" : value));
                }
                components.add(Map.of("type", "body", "parameters", parameters));
            }
            if (buttonUrlParam != null && !buttonUrlParam.isBlank()) {
                components.add(Map.of(
                        "type", "button",
                        "sub_type", "url",
                        "index", "0",
                        "parameters", List.of(Map.of("type", "text", "text", buttonUrlParam))
                ));
            }

            Map<String, Object> template = new java.util.HashMap<>();
            template.put("name", templateName);
            template.put("language", Map.of("code", languageCode == null ? "en" : languageCode));
            if (!components.isEmpty()) template.put("components", components);

            Map<String, Object> body = Map.of(
                    "messaging_product", "whatsapp",
                    "to", toE164,
                    "type", "template",
                    "template", template
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);

            ResponseEntity<String> response = restTemplate.postForEntity(url, new HttpEntity<>(body, headers), String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                String messageId = extractMessageId(response.getBody());
                return WhatsAppSendResult.success(messageId);
            }
            return parseError(response.getBody());
        } catch (HttpStatusCodeException e) {
            return parseError(e.getResponseBodyAsString());
        } catch (Exception e) {
            return WhatsAppSendResult.failure("SEND_EXCEPTION", e.getMessage());
        }
    }

    private String extractMessageId(String responseBody) {
        try {
            JsonNode root = mapper.readTree(responseBody);
            JsonNode messages = root.path("messages");
            if (messages.isArray() && messages.size() > 0) {
                return messages.get(0).path("id").asText(null);
            }
        } catch (Exception ignored) {}
        return null;
    }

    private WhatsAppSendResult parseError(String responseBody) {
        try {
            JsonNode error = mapper.readTree(responseBody).path("error");
            String code = error.path("code").asText("UNKNOWN");
            String message = error.path("message").asText(responseBody);
            return WhatsAppSendResult.failure(code, message);
        } catch (Exception e) {
            return WhatsAppSendResult.failure("UNKNOWN", responseBody);
        }
    }
}
