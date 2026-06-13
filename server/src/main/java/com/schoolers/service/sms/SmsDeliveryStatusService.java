package com.schoolers.service.sms;

import com.schoolers.model.sms.SmsCampaign;
import com.schoolers.model.sms.SmsDeliveryStatus;
import com.schoolers.model.sms.SmsLog;
import com.schoolers.model.sms.SmsLogStatus;
import com.schoolers.repository.sms.SmsCampaignRepository;
import com.schoolers.repository.sms.SmsDeliveryStatusRepository;
import com.schoolers.repository.sms.SmsLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/** Applies Twilio delivery-status webhook callbacks to {@link SmsLog} and {@link SmsCampaign}. */
@Service
public class SmsDeliveryStatusService {

    private static final Logger log = LoggerFactory.getLogger(SmsDeliveryStatusService.class);

    private final SmsLogRepository logRepository;
    private final SmsDeliveryStatusRepository deliveryStatusRepository;
    private final SmsCampaignRepository campaignRepository;

    public SmsDeliveryStatusService(SmsLogRepository logRepository,
                                     SmsDeliveryStatusRepository deliveryStatusRepository,
                                     SmsCampaignRepository campaignRepository) {
        this.logRepository = logRepository;
        this.deliveryStatusRepository = deliveryStatusRepository;
        this.campaignRepository = campaignRepository;
    }

    /**
     * Records a webhook callback for the {@code sms_logs} row matching {@code providerMessageId}.
     * {@code newStatus} must already be mapped from the provider's raw status string by the caller
     * (each provider's webhook controller knows its own status vocabulary); pass {@code null} for
     * intermediate statuses (e.g. Twilio's "queued"/"sending"/"accepted") to skip processing
     * entirely. The {@code sms_logs}/{@code sms_campaigns} terminal-status transition only happens
     * once, from {@code SENT} — repeated webhook deliveries for the same message are recorded as
     * audit rows but don't double-count campaign totals.
     */
    @Transactional
    public void recordDeliveryStatus(String providerMessageId, SmsLogStatus newStatus, String errorCode, String errorMessage, String rawPayload) {
        if (newStatus == null) {
            log.debug("[SmsDeliveryStatusService] Ignoring unmapped/intermediate status for providerMessageId={}", providerMessageId);
            return;
        }

        SmsLog smsLog = logRepository.findByProviderMessageId(providerMessageId).orElse(null);
        if (smsLog == null) {
            log.warn("[SmsDeliveryStatusService] No sms_log found for providerMessageId={}", providerMessageId);
            return;
        }

        deliveryStatusRepository.save(SmsDeliveryStatus.builder()
                .smsLogId(smsLog.getId())
                .status(newStatus)
                .errorCode(truncate(errorCode, 30))
                .errorMessage(truncate(errorMessage, 500))
                .rawPayload(rawPayload)
                .build());

        if (smsLog.getStatus() != SmsLogStatus.SENT || newStatus == SmsLogStatus.SENT) {
            return;
        }

        smsLog.setStatus(newStatus);
        if (newStatus == SmsLogStatus.DELIVERED) smsLog.setDeliveredAt(LocalDateTime.now());
        if (errorCode != null) smsLog.setErrorCode(truncate(errorCode, 30));
        if (errorMessage != null) smsLog.setErrorMessage(truncate(errorMessage, 500));
        logRepository.save(smsLog);

        if (smsLog.getCampaignId() != null) {
            campaignRepository.findById(smsLog.getCampaignId()).ifPresent(campaign -> {
                if (newStatus == SmsLogStatus.DELIVERED) {
                    campaign.setDeliveredCount(campaign.getDeliveredCount() + 1);
                } else {
                    campaign.setSentCount(Math.max(0, campaign.getSentCount() - 1));
                    campaign.setFailedCount(campaign.getFailedCount() + 1);
                }
                campaignRepository.save(campaign);
            });
        }

        log.info("[SmsDeliveryStatusService] sms_log {} -> {} (providerMessageId={})", smsLog.getId(), newStatus, providerMessageId);
    }

    private String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() <= maxLen ? s : s.substring(0, maxLen);
    }
}
