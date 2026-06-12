package com.schoolers.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Sends push notifications to mobile devices via the Expo Push API.
 * Tokens are registered by the mobile app after login (see AuthController#registerPushToken).
 */
@Service
public class ExpoPushService {

    private static final Logger log = Logger.getLogger(ExpoPushService.class.getName());
    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    /** Expo accepts at most 100 messages per request. */
    private static final int BATCH_SIZE = 100;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Sends the same notification to multiple Expo push tokens, batching requests as needed.
     * Invalid/null/blank tokens are skipped. Failures are logged and do not throw.
     */
    public void sendToMany(List<String> tokens, String title, String body, Map<String, Object> data) {
        if (tokens == null || tokens.isEmpty()) return;

        List<String> validTokens = new ArrayList<>();
        for (String token : tokens) {
            if (token != null && token.startsWith("ExponentPushToken")) {
                validTokens.add(token);
            }
        }
        if (validTokens.isEmpty()) return;

        for (int i = 0; i < validTokens.size(); i += BATCH_SIZE) {
            List<String> batch = validTokens.subList(i, Math.min(i + BATCH_SIZE, validTokens.size()));
            sendBatch(batch, title, body, data);
        }
    }

    private void sendBatch(List<String> tokens, String title, String body, Map<String, Object> data) {
        try {
            List<Map<String, Object>> messages = new ArrayList<>();
            for (String token : tokens) {
                messages.add(Map.of(
                        "to", token,
                        "title", title,
                        "body", body,
                        "sound", "default",
                        "data", data != null ? data : Map.of()
                ));
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            HttpEntity<List<Map<String, Object>>> request = new HttpEntity<>(messages, headers);
            restTemplate.postForEntity(EXPO_PUSH_URL, request, String.class);
        } catch (Exception e) {
            log.warning("[ExpoPush] Failed to send batch: " + e.getMessage());
        }
    }
}
