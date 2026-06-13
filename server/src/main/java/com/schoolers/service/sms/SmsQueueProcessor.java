package com.schoolers.service.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Drives the {@code sms_queue}: a {@code @Scheduled} poller claims due rows in batches and hands
 * each off to {@link SmsQueueWorker#processOne}. {@link #triggerImmediateProcessing()} runs the
 * same batch logic on-demand right after an immediate (non-scheduled) send is enqueued, so the
 * scheduled poll interval is just the retry/safety-net cadence rather than the only way work gets done.
 */
@Service
public class SmsQueueProcessor {

    private static final Logger log = LoggerFactory.getLogger(SmsQueueProcessor.class);

    private final SmsQueueClaimService claimService;
    private final SmsQueueWorker worker;

    @Value("${sms.queue.batch.size:20}")
    private int batchSize;

    public SmsQueueProcessor(SmsQueueClaimService claimService, SmsQueueWorker worker) {
        this.claimService = claimService;
        this.worker = worker;
    }

    @Scheduled(fixedDelayString = "${sms.queue.poll.interval.ms:15000}")
    public void poll() {
        processBatch();
    }

    @Async
    public void triggerImmediateProcessing() {
        processBatch();
    }

    private void processBatch() {
        List<Long> claimed = claimService.claimBatch(batchSize);
        if (claimed.isEmpty()) return;

        log.info("[SmsQueueProcessor] Claimed {} queue item(s) for processing", claimed.size());
        for (Long id : claimed) {
            worker.processOne(id);
        }
    }
}
