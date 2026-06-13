package com.schoolers.service.sms;

import com.schoolers.model.sms.CampaignStatus;
import com.schoolers.model.sms.QueueStatus;
import com.schoolers.model.sms.SmsCampaign;
import com.schoolers.model.sms.SmsLog;
import com.schoolers.model.sms.SmsLogStatus;
import com.schoolers.model.sms.SmsQueueItem;
import com.schoolers.repository.sms.SmsCampaignRepository;
import com.schoolers.repository.sms.SmsLogRepository;
import com.schoolers.repository.sms.SmsQueueRepository;
import com.schoolers.sms.PhoneUtil;
import com.schoolers.sms.SmsProvider;
import com.schoolers.sms.SmsSendResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Sends a single {@code sms_queue} row via {@link SmsProvider}, writes the resulting
 * {@link SmsLog}, and updates the owning {@link SmsCampaign}'s counters. Runs {@code @Async}
 * on a worker thread so the {@code @Scheduled} poller can claim the next batch immediately.
 */
@Service
public class SmsQueueWorker {

    private static final Logger log = LoggerFactory.getLogger(SmsQueueWorker.class);

    private final SmsQueueRepository queueRepository;
    private final SmsLogRepository logRepository;
    private final SmsCampaignRepository campaignRepository;
    private final SmsProvider smsProvider;

    public SmsQueueWorker(SmsQueueRepository queueRepository,
                           SmsLogRepository logRepository,
                           SmsCampaignRepository campaignRepository,
                           SmsProvider smsProvider) {
        this.queueRepository = queueRepository;
        this.logRepository = logRepository;
        this.campaignRepository = campaignRepository;
        this.smsProvider = smsProvider;
    }

    @Async
    @Transactional
    public void processOne(Long queueId) {
        SmsQueueItem item = queueRepository.findById(queueId).orElse(null);
        if (item == null) {
            log.warn("[SmsQueueWorker] Queue item {} not found, skipping", queueId);
            return;
        }
        if (item.getStatus() != QueueStatus.PROCESSING) {
            log.warn("[SmsQueueWorker] Queue item {} is not PROCESSING (status={}), skipping", queueId, item.getStatus());
            return;
        }

        SmsSendResult result = smsProvider.send(item.getRecipientPhone(), item.getMessageContent());

        if (result.accepted()) {
            handleSuccess(item, result);
        } else {
            handleFailure(item, result);
        }
    }

    private void handleSuccess(SmsQueueItem item, SmsSendResult result) {
        LocalDateTime now = LocalDateTime.now();

        item.setStatus(QueueStatus.SENT);
        item.setProviderMessageId(result.providerMessageId());
        item.setLastError(null);
        queueRepository.save(item);

        logRepository.save(SmsLog.builder()
                .schoolId(item.getSchoolId())
                .campaignId(item.getCampaignId())
                .queueId(item.getId())
                .studentId(item.getStudentId())
                .recipientPhone(item.getRecipientPhone())
                .recipientName(item.getRecipientName())
                .messageContent(item.getMessageContent())
                .provider(smsProvider.getProviderName())
                .providerMessageId(result.providerMessageId())
                .status(SmsLogStatus.SENT)
                .segments(Math.max(1, result.segments()))
                .sentAt(now)
                .build());

        updateCampaignOnOutcome(item.getCampaignId(), true);
        log.info("[SmsQueueWorker] Sent queue item {} to {} (campaignId={}, providerMessageId={})",
                item.getId(), PhoneUtil.mask(item.getRecipientPhone()), item.getCampaignId(), result.providerMessageId());
    }

    private void handleFailure(SmsQueueItem item, SmsSendResult result) {
        int attempts = item.getAttemptCount() + 1;
        item.setAttemptCount(attempts);
        item.setLastError(truncate(combine(result.errorCode(), result.errorMessage()), 500));

        if (attempts < item.getMaxAttempts()) {
            item.setStatus(QueueStatus.PENDING);
            item.setNextAttemptAt(LocalDateTime.now().plusMinutes((long) Math.pow(2, attempts)));
            queueRepository.save(item);
            log.warn("[SmsQueueWorker] Send failed for queue item {} (attempt {}/{}), retrying at {}: {}",
                    item.getId(), attempts, item.getMaxAttempts(), item.getNextAttemptAt(), item.getLastError());
            return;
        }

        item.setStatus(QueueStatus.FAILED);
        queueRepository.save(item);

        logRepository.save(SmsLog.builder()
                .schoolId(item.getSchoolId())
                .campaignId(item.getCampaignId())
                .queueId(item.getId())
                .studentId(item.getStudentId())
                .recipientPhone(item.getRecipientPhone())
                .recipientName(item.getRecipientName())
                .messageContent(item.getMessageContent())
                .provider(smsProvider.getProviderName())
                .status(SmsLogStatus.FAILED)
                .segments(1)
                .errorCode(truncate(result.errorCode(), 30))
                .errorMessage(truncate(result.errorMessage(), 500))
                .build());

        updateCampaignOnOutcome(item.getCampaignId(), false);
        log.error("[SmsQueueWorker] Permanently failed queue item {} after {} attempts: {}", item.getId(), attempts, item.getLastError());
    }

    private void updateCampaignOnOutcome(Long campaignId, boolean success) {
        if (campaignId == null) return;
        SmsCampaign campaign = campaignRepository.findById(campaignId).orElse(null);
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
