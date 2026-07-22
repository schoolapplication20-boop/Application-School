package com.schoolers.service.whatsapp;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolers.model.sms.CampaignStatus;
import com.schoolers.model.sms.QueueStatus;
import com.schoolers.model.whatsapp.WhatsAppCampaign;
import com.schoolers.model.whatsapp.WhatsAppLog;
import com.schoolers.model.whatsapp.WhatsAppLogStatus;
import com.schoolers.model.whatsapp.WhatsAppQueueItem;
import com.schoolers.model.whatsapp.WhatsAppTemplate;
import com.schoolers.repository.whatsapp.WhatsAppCampaignRepository;
import com.schoolers.repository.whatsapp.WhatsAppLogRepository;
import com.schoolers.repository.whatsapp.WhatsAppQueueRepository;
import com.schoolers.repository.whatsapp.WhatsAppTemplateRepository;
import com.schoolers.sms.PhoneUtil;
import com.schoolers.whatsapp.WhatsAppSendResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Sends a single {@code whatsapp_queue} row via {@link WhatsAppConfigurationService}, writes the
 * resulting {@link WhatsAppLog}, and updates the owning {@link WhatsAppCampaign}'s counters.
 * Mirrors {@code SmsQueueWorker}. Runs {@code @Async} on a worker thread so the {@code @Scheduled}
 * poller can claim the next batch immediately.
 */
@Service
public class WhatsAppQueueWorker {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppQueueWorker.class);

    private final WhatsAppQueueRepository queueRepository;
    private final WhatsAppLogRepository logRepository;
    private final WhatsAppCampaignRepository campaignRepository;
    private final WhatsAppTemplateRepository templateRepository;
    private final WhatsAppConfigurationService configurationService;
    private final ObjectMapper mapper = new ObjectMapper();

    public WhatsAppQueueWorker(WhatsAppQueueRepository queueRepository,
                                WhatsAppLogRepository logRepository,
                                WhatsAppCampaignRepository campaignRepository,
                                WhatsAppTemplateRepository templateRepository,
                                WhatsAppConfigurationService configurationService) {
        this.queueRepository = queueRepository;
        this.logRepository = logRepository;
        this.campaignRepository = campaignRepository;
        this.templateRepository = templateRepository;
        this.configurationService = configurationService;
    }

    @Async
    @Transactional
    public void processOne(Long queueId) {
        WhatsAppQueueItem item = queueRepository.findById(queueId).orElse(null);
        if (item == null) {
            log.warn("[WhatsAppQueueWorker] Queue item {} not found, skipping", queueId);
            return;
        }
        if (item.getStatus() != QueueStatus.PROCESSING) {
            log.warn("[WhatsAppQueueWorker] Queue item {} is not PROCESSING (status={}), skipping", queueId, item.getStatus());
            return;
        }

        WhatsAppTemplate template = templateRepository.findById(item.getTemplateId()).orElse(null);
        if (template == null) {
            handleFailure(item, null, WhatsAppSendResult.failure("TEMPLATE_MISSING", "Template no longer exists"));
            return;
        }

        List<String> bodyParams = parseVariables(item.getVariablesJson());
        WhatsAppSendResult result = configurationService.sendWhatsApp(
                item.getSchoolId(), item.getRecipientPhone(),
                template.getMetaTemplateName(), template.getMetaLanguageCode(),
                bodyParams, item.getButtonUrlParam());

        if (result.accepted()) {
            handleSuccess(item, template, bodyParams, result);
        } else {
            handleFailure(item, template, result);
        }
    }

    private void handleSuccess(WhatsAppQueueItem item, WhatsAppTemplate template, List<String> bodyParams, WhatsAppSendResult result) {
        LocalDateTime now = LocalDateTime.now();

        item.setStatus(QueueStatus.SENT);
        item.setProviderMessageId(result.providerMessageId());
        item.setLastError(null);
        queueRepository.save(item);

        logRepository.save(WhatsAppLog.builder()
                .schoolId(item.getSchoolId())
                .campaignId(item.getCampaignId())
                .queueId(item.getId())
                .studentId(item.getStudentId())
                .recipientPhone(item.getRecipientPhone())
                .recipientName(item.getRecipientName())
                .category(template.getCategory())
                .renderedPreview(renderPreview(template.getContentPreview(), bodyParams))
                .providerMessageId(result.providerMessageId())
                .status(WhatsAppLogStatus.SENT)
                .sentAt(now)
                .build());

        updateCampaignOnOutcome(item.getCampaignId(), true);
        log.info("[WhatsAppQueueWorker] Sent queue item {} to {} (campaignId={}, providerMessageId={})",
                item.getId(), PhoneUtil.mask(item.getRecipientPhone()), item.getCampaignId(), result.providerMessageId());
    }

    private void handleFailure(WhatsAppQueueItem item, WhatsAppTemplate template, WhatsAppSendResult result) {
        int attempts = item.getAttemptCount() + 1;
        item.setAttemptCount(attempts);
        item.setLastError(truncate(combine(result.errorCode(), result.errorMessage()), 500));

        if (attempts < item.getMaxAttempts()) {
            item.setStatus(QueueStatus.PENDING);
            item.setNextAttemptAt(LocalDateTime.now().plusMinutes((long) Math.pow(2, attempts)));
            queueRepository.save(item);
            log.warn("[WhatsAppQueueWorker] Send failed for queue item {} (attempt {}/{}), retrying at {}: {}",
                    item.getId(), attempts, item.getMaxAttempts(), item.getNextAttemptAt(), item.getLastError());
            return;
        }

        item.setStatus(QueueStatus.FAILED);
        queueRepository.save(item);

        logRepository.save(WhatsAppLog.builder()
                .schoolId(item.getSchoolId())
                .campaignId(item.getCampaignId())
                .queueId(item.getId())
                .studentId(item.getStudentId())
                .recipientPhone(item.getRecipientPhone())
                .recipientName(item.getRecipientName())
                .category(template != null ? template.getCategory() : null)
                .status(WhatsAppLogStatus.FAILED)
                .errorCode(truncate(result.errorCode(), 30))
                .errorMessage(truncate(result.errorMessage(), 500))
                .build());

        updateCampaignOnOutcome(item.getCampaignId(), false);
        log.error("[WhatsAppQueueWorker] Permanently failed queue item {} after {} attempts: {}", item.getId(), attempts, item.getLastError());
    }

    private void updateCampaignOnOutcome(Long campaignId, boolean success) {
        if (campaignId == null) return;
        WhatsAppCampaign campaign = campaignRepository.findById(campaignId).orElse(null);
        if (campaign == null) return;

        if (campaign.getStatus() == CampaignStatus.SCHEDULED) {
            campaign.setStatus(CampaignStatus.PROCESSING);
        }
        if (success) {
            campaign.setSentCount(campaign.getSentCount() + 1);
        } else {
            campaign.setFailedCount(campaign.getFailedCount() + 1);
        }
        campaign.setPendingCount(Math.max(0, campaign.getPendingCount() - 1));

        if (campaign.getPendingCount() == 0 && campaign.getStatus() != CampaignStatus.CANCELLED
                && queueRepository.isCampaignFullyProcessed(campaignId)) {
            campaign.setStatus(CampaignStatus.COMPLETED);
            campaign.setCompletedAt(LocalDateTime.now());
        }
        campaignRepository.save(campaign);
    }

    private List<String> parseVariables(String variablesJson) {
        if (variablesJson == null || variablesJson.isBlank()) return Collections.emptyList();
        try {
            return mapper.readValue(variablesJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("[WhatsAppQueueWorker] Failed to parse variablesJson: {}", variablesJson);
            return Collections.emptyList();
        }
    }

    /** Best-effort {{1}}, {{2}}, ... substitution into the template's human-readable preview, for history display only. */
    private String renderPreview(String contentPreview, List<String> bodyParams) {
        if (contentPreview == null) return null;
        String result = contentPreview;
        for (int i = 0; i < bodyParams.size(); i++) {
            String value = bodyParams.get(i) == null ? "" : bodyParams.get(i);
            result = result.replace("{{" + (i + 1) + "}}", value);
        }
        return result;
    }

    private String combine(String errorCode, String errorMessage) {
        if (errorCode == null) return errorMessage;
        if (errorMessage == null) return errorCode;
        return errorCode + ": " + errorMessage;
    }

    private String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() <= maxLen ? s : s.substring(0, maxLen);
    }
}
