package com.schoolers.service.whatsapp;

import com.schoolers.model.whatsapp.WhatsAppCampaign;
import com.schoolers.model.whatsapp.WhatsAppDeliveryStatus;
import com.schoolers.model.whatsapp.WhatsAppLog;
import com.schoolers.model.whatsapp.WhatsAppLogStatus;
import com.schoolers.repository.whatsapp.WhatsAppCampaignRepository;
import com.schoolers.repository.whatsapp.WhatsAppDeliveryStatusRepository;
import com.schoolers.repository.whatsapp.WhatsAppLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Applies Meta WhatsApp delivery-status webhook callbacks to {@link WhatsAppLog} and
 * {@link WhatsAppCampaign}. Mirrors {@code SmsDeliveryStatusService}, extended for the
 * WhatsApp-only {@code READ} (blue-tick) status, which has no SMS analog.
 */
@Service
public class WhatsAppDeliveryStatusService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppDeliveryStatusService.class);

    private final WhatsAppLogRepository logRepository;
    private final WhatsAppDeliveryStatusRepository deliveryStatusRepository;
    private final WhatsAppCampaignRepository campaignRepository;

    public WhatsAppDeliveryStatusService(WhatsAppLogRepository logRepository,
                                          WhatsAppDeliveryStatusRepository deliveryStatusRepository,
                                          WhatsAppCampaignRepository campaignRepository) {
        this.logRepository = logRepository;
        this.deliveryStatusRepository = deliveryStatusRepository;
        this.campaignRepository = campaignRepository;
    }

    /**
     * Records a webhook callback for the {@code whatsapp_logs} row matching {@code providerMessageId}
     * (Meta's {@code wamid}). Pass {@code null} for unmapped/intermediate statuses to skip
     * processing entirely.
     */
    @Transactional
    public void recordDeliveryStatus(String providerMessageId, WhatsAppLogStatus newStatus, String errorCode, String errorMessage, String rawPayload) {
        if (newStatus == null) {
            log.debug("[WhatsAppDeliveryStatusService] Ignoring unmapped/intermediate status for providerMessageId={}", providerMessageId);
            return;
        }

        WhatsAppLog whatsAppLog = logRepository.findByProviderMessageId(providerMessageId).orElse(null);
        if (whatsAppLog == null) {
            log.warn("[WhatsAppDeliveryStatusService] No whatsapp_log found for providerMessageId={}", providerMessageId);
            return;
        }

        deliveryStatusRepository.save(WhatsAppDeliveryStatus.builder()
                .whatsAppLogId(whatsAppLog.getId())
                .status(newStatus)
                .errorCode(truncate(errorCode, 30))
                .errorMessage(truncate(errorMessage, 500))
                .rawPayload(rawPayload)
                .build());

        // READ can arrive after DELIVERED; every other terminal transition only applies once, from SENT.
        if (newStatus == WhatsAppLogStatus.READ) {
            if (whatsAppLog.getReadAt() == null) {
                whatsAppLog.setReadAt(LocalDateTime.now());
                logRepository.save(whatsAppLog);
            }
            return;
        }

        if (whatsAppLog.getStatus() != WhatsAppLogStatus.SENT || newStatus == WhatsAppLogStatus.SENT) {
            return;
        }

        whatsAppLog.setStatus(newStatus);
        if (newStatus == WhatsAppLogStatus.DELIVERED) whatsAppLog.setDeliveredAt(LocalDateTime.now());
        if (errorCode != null) whatsAppLog.setErrorCode(truncate(errorCode, 30));
        if (errorMessage != null) whatsAppLog.setErrorMessage(truncate(errorMessage, 500));
        logRepository.save(whatsAppLog);

        if (whatsAppLog.getCampaignId() != null) {
            campaignRepository.findById(whatsAppLog.getCampaignId()).ifPresent(campaign -> {
                if (newStatus == WhatsAppLogStatus.DELIVERED) {
                    campaign.setDeliveredCount(campaign.getDeliveredCount() + 1);
                } else {
                    campaign.setSentCount(Math.max(0, campaign.getSentCount() - 1));
                    campaign.setFailedCount(campaign.getFailedCount() + 1);
                }
                campaignRepository.save(campaign);
            });
        }

        log.info("[WhatsAppDeliveryStatusService] whatsapp_log {} -> {} (providerMessageId={})", whatsAppLog.getId(), newStatus, providerMessageId);
    }

    private String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() <= maxLen ? s : s.substring(0, maxLen);
    }
}
