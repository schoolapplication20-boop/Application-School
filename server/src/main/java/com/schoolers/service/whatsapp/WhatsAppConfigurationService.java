package com.schoolers.service.whatsapp;

import com.schoolers.dto.ApiResponse;
import com.schoolers.dto.whatsapp.WhatsAppConfigurationRequest;
import com.schoolers.dto.whatsapp.WhatsAppConfigurationResponse;
import com.schoolers.model.whatsapp.WhatsAppConfiguration;
import com.schoolers.repository.whatsapp.WhatsAppConfigurationRepository;
import com.schoolers.utils.AesEncryptionUtil;
import com.schoolers.whatsapp.WhatsAppCloudApiClient;
import com.schoolers.whatsapp.WhatsAppSendResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Manages each school's own Meta WhatsApp Cloud API credentials (each school registers its own
 * phone number — see the module's Phase 1 setup decision) and is the single place that decrypts
 * the access token to actually send.
 */
@Service
public class WhatsAppConfigurationService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppConfigurationService.class);

    private final WhatsAppConfigurationRepository repository;
    private final AesEncryptionUtil encryption;
    private final WhatsAppCloudApiClient apiClient;

    public WhatsAppConfigurationService(WhatsAppConfigurationRepository repository,
                                         AesEncryptionUtil encryption,
                                         WhatsAppCloudApiClient apiClient) {
        this.repository = repository;
        this.encryption = encryption;
        this.apiClient = apiClient;
    }

    public boolean isConfigured(Long schoolId) {
        return repository.findBySchoolId(schoolId)
                .map(c -> Boolean.TRUE.equals(c.getIsActive())
                        && notBlank(c.getPhoneNumberId())
                        && notBlank(c.getAccessTokenEncrypted()))
                .orElse(false);
    }

    public ApiResponse<WhatsAppConfigurationResponse> getSettings(Long schoolId) {
        Optional<WhatsAppConfiguration> opt = repository.findBySchoolId(schoolId);
        if (opt.isEmpty()) {
            return ApiResponse.success(WhatsAppConfigurationResponse.builder().configured(false).build());
        }
        return ApiResponse.success(toResponse(opt.get()));
    }

    public ApiResponse<WhatsAppConfigurationResponse> saveSettings(Long schoolId, WhatsAppConfigurationRequest req) {
        WhatsAppConfiguration config = repository.findBySchoolId(schoolId)
                .orElseGet(() -> WhatsAppConfiguration.builder().schoolId(schoolId).build());

        if (notBlank(req.getPhoneNumberId())) config.setPhoneNumberId(req.getPhoneNumberId().trim());
        if (notBlank(req.getAccessToken()) && !req.getAccessToken().startsWith("••")) {
            config.setAccessTokenEncrypted(encryption.encrypt(req.getAccessToken().trim()));
        }
        if (req.getDisplayPhoneNumber() != null) config.setDisplayPhoneNumber(req.getDisplayPhoneNumber().trim());

        config.setIsActive(notBlank(config.getPhoneNumberId()) && notBlank(config.getAccessTokenEncrypted()));
        repository.save(config);

        log.info("[WhatsAppConfigurationService] Saved WhatsApp settings for school {} (active={})", schoolId, config.getIsActive());
        return ApiResponse.success(toResponse(config));
    }

    /**
     * Sends an approved template message on behalf of {@code schoolId}, using that school's own
     * WhatsApp credentials. Never throws — failures are reported via {@link WhatsAppSendResult#failure}.
     */
    public WhatsAppSendResult sendWhatsApp(Long schoolId, String toE164, String templateName, String languageCode,
                                            List<String> bodyParams, String buttonUrlParam) {
        WhatsAppConfiguration config = repository.findBySchoolId(schoolId).orElse(null);
        if (config == null || !Boolean.TRUE.equals(config.getIsActive())
                || !notBlank(config.getPhoneNumberId()) || !notBlank(config.getAccessTokenEncrypted())) {
            return WhatsAppSendResult.failure("NOT_CONFIGURED",
                    "WhatsApp is not configured for this school — go to WhatsApp → Settings to add credentials");
        }

        String accessToken;
        try {
            accessToken = encryption.decrypt(config.getAccessTokenEncrypted());
        } catch (Exception e) {
            log.error("[WhatsAppConfigurationService] Failed to decrypt access token for school {}", schoolId, e);
            return WhatsAppSendResult.failure("DECRYPT_ERROR", "Failed to read WhatsApp credentials");
        }

        return apiClient.sendTemplate(config.getPhoneNumberId(), accessToken, toE164, templateName, languageCode, bodyParams, buttonUrlParam);
    }

    private WhatsAppConfigurationResponse toResponse(WhatsAppConfiguration c) {
        String masked = null;
        if (notBlank(c.getAccessTokenEncrypted())) {
            try {
                String plain = encryption.decrypt(c.getAccessTokenEncrypted());
                masked = plain.length() > 4 ? "••••••••" + plain.substring(plain.length() - 4) : "••••";
            } catch (Exception e) {
                masked = "••••••••";
            }
        }
        return WhatsAppConfigurationResponse.builder()
                .phoneNumberId(c.getPhoneNumberId())
                .accessTokenMasked(masked)
                .displayPhoneNumber(c.getDisplayPhoneNumber())
                .configured(Boolean.TRUE.equals(c.getIsActive()))
                .build();
    }

    private boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
