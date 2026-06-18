package com.schoolers.service.sms;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.dto.sms.SmsProviderSettingsRequest;
import com.schoolers.dto.sms.SmsProviderSettingsResponse;
import com.schoolers.dto.ApiResponse;
import com.schoolers.model.sms.SmsProviderSettings;
import com.schoolers.repository.sms.SmsProviderSettingsRepository;
import com.schoolers.sms.PhoneUtil;
import com.schoolers.sms.SmsSegmentUtil;
import com.schoolers.sms.SmsSendResult;
import com.schoolers.utils.AesEncryptionUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SmsProviderSettingsService {

    private static final Logger log = LoggerFactory.getLogger(SmsProviderSettingsService.class);
    private static final String MSG91_API_URL = "https://api.msg91.com/api/v2/sendsms";

    private final SmsProviderSettingsRepository repository;
    private final AesEncryptionUtil encryption;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    public SmsProviderSettingsService(SmsProviderSettingsRepository repository, AesEncryptionUtil encryption) {
        this.repository = repository;
        this.encryption = encryption;
    }

    public boolean isConfigured(Long schoolId) {
        return repository.findBySchoolId(schoolId)
                .map(s -> Boolean.TRUE.equals(s.getIsActive())
                        && notBlank(s.getAuthKeyEncrypted())
                        && notBlank(s.getSenderId()))
                .orElse(false);
    }

    public String getProviderName(Long schoolId) {
        return repository.findBySchoolId(schoolId)
                .map(SmsProviderSettings::getProvider)
                .orElse("msg91");
    }

    public ApiResponse<SmsProviderSettingsResponse> getSettings(Long schoolId) {
        Optional<SmsProviderSettings> opt = repository.findBySchoolId(schoolId);
        if (opt.isEmpty()) {
            return ApiResponse.success(SmsProviderSettingsResponse.builder()
                    .provider("msg91").route("4").countryCode("91").configured(false).build());
        }
        return ApiResponse.success(toResponse(opt.get()));
    }

    public ApiResponse<SmsProviderSettingsResponse> saveSettings(Long schoolId, SmsProviderSettingsRequest req) {
        String sid = req.getSenderId() != null ? req.getSenderId().trim() : null;
        if (sid != null && !sid.isEmpty() && (sid.length() < 3 || sid.length() > 11)) {
            return ApiResponse.error("Sender ID must be 3–11 alphanumeric characters (DLT-registered)");
        }

        SmsProviderSettings settings = repository.findBySchoolId(schoolId)
                .orElseGet(() -> SmsProviderSettings.builder().schoolId(schoolId).build());

        if (notBlank(req.getAuthKey()) && !req.getAuthKey().startsWith("••")) {
            settings.setAuthKeyEncrypted(encryption.encrypt(req.getAuthKey().trim()));
        }
        if (sid != null)                       settings.setSenderId(sid.toUpperCase());
        if (req.getDltTeId() != null)          settings.setDltTeId(req.getDltTeId().trim());
        if (notBlank(req.getRoute()))          settings.setRoute(req.getRoute().trim());
        if (notBlank(req.getCountryCode()))    settings.setCountryCode(req.getCountryCode().trim());

        settings.setIsActive(notBlank(settings.getAuthKeyEncrypted()) && notBlank(settings.getSenderId()));
        repository.save(settings);

        log.info("[SmsProviderSettingsService] Saved SMS settings for school {} (active={})", schoolId, settings.getIsActive());
        return ApiResponse.success(toResponse(settings));
    }

    public SmsSendResult sendSms(Long schoolId, String toPhoneE164, String message) {
        SmsProviderSettings s = repository.findBySchoolId(schoolId).orElse(null);
        if (s == null || !Boolean.TRUE.equals(s.getIsActive())
                || !notBlank(s.getAuthKeyEncrypted()) || !notBlank(s.getSenderId())) {
            return SmsSendResult.failure("NOT_CONFIGURED", "SMS provider not configured for this school — go to SMS → Settings to add credentials");
        }

        String authKey;
        try {
            authKey = encryption.decrypt(s.getAuthKeyEncrypted());
        } catch (Exception e) {
            log.error("[SmsProviderSettingsService] Failed to decrypt auth key for school {}", schoolId, e);
            return SmsSendResult.failure("DECRYPT_ERROR", "Failed to read SMS credentials");
        }

        try {
            String to = toPhoneE164.startsWith("+") ? toPhoneE164.substring(1) : toPhoneE164;

            Map<String, Object> smsEntry = new HashMap<>();
            smsEntry.put("message", message);
            smsEntry.put("to", List.of(to));

            Map<String, Object> body = new HashMap<>();
            body.put("sender", s.getSenderId());
            body.put("route", s.getRoute() != null ? s.getRoute() : "4");
            body.put("country", s.getCountryCode() != null ? s.getCountryCode() : "91");
            body.put("sms", List.of(smsEntry));
            if (notBlank(s.getDltTeId())) body.put("DLT_TE_ID", s.getDltTeId());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("authkey", authKey);
            headers.set("Accept", "application/json");

            ResponseEntity<String> resp = restTemplate.postForEntity(MSG91_API_URL, new HttpEntity<>(body, headers), String.class);
            JsonNode json = mapper.readTree(resp.getBody());
            String type = json.path("type").asText("");
            String responseMessage = json.path("message").asText(null);

            if (!"success".equalsIgnoreCase(type)) {
                log.warn("[SmsProviderSettingsService] Send failed for school {} to {}: {}", schoolId, PhoneUtil.mask(toPhoneE164), responseMessage);
                return SmsSendResult.failure("MSG91_ERROR", responseMessage != null ? responseMessage : resp.getBody());
            }

            int segments = SmsSegmentUtil.countSegments(message);
            log.info("[SmsProviderSettingsService] Sent for school {} to {} (requestId={} segments={})",
                    schoolId, PhoneUtil.mask(toPhoneE164), responseMessage, segments);
            return SmsSendResult.success(responseMessage, segments);

        } catch (HttpStatusCodeException e) {
            String err = parseError(e.getResponseBodyAsString());
            log.warn("[SmsProviderSettingsService] MSG91 HTTP {} for school {}: {}", e.getStatusCode(), schoolId, err);
            return SmsSendResult.failure("HTTP_" + e.getStatusCode().value(), err);
        } catch (Exception e) {
            log.warn("[SmsProviderSettingsService] Send error for school {}: {}", schoolId, e.getMessage());
            return SmsSendResult.failure("SEND_ERROR", e.getMessage());
        }
    }

    private SmsProviderSettingsResponse toResponse(SmsProviderSettings s) {
        String maskedKey = null;
        if (notBlank(s.getAuthKeyEncrypted())) {
            try {
                String plain = encryption.decrypt(s.getAuthKeyEncrypted());
                maskedKey = plain.length() > 4 ? "••••••••" + plain.substring(plain.length() - 4) : "••••";
            } catch (Exception e) {
                maskedKey = "••••••••";
            }
        }
        return SmsProviderSettingsResponse.builder()
                .provider(s.getProvider())
                .authKeyMasked(maskedKey)
                .senderId(s.getSenderId())
                .dltTeId(s.getDltTeId())
                .route(s.getRoute())
                .countryCode(s.getCountryCode())
                .configured(Boolean.TRUE.equals(s.getIsActive()))
                .build();
    }

    private String parseError(String body) {
        try { return mapper.readTree(body).path("message").asText(body); }
        catch (Exception e) { return body; }
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
