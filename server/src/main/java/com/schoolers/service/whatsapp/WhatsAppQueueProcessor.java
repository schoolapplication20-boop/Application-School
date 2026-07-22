package com.schoolers.service.whatsapp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Drives the {@code whatsapp_queue}: a {@code @Scheduled} poller claims due rows in batches and
 * hands each off to {@link WhatsAppQueueWorker#processOne}. {@link #triggerImmediateProcessing()}
 * runs the same batch logic on-demand right after a send is enqueued, so the scheduled poll
 * interval is just the retry/safety-net cadence. Mirrors {@code SmsQueueProcessor}.
 */
@Service
public class WhatsAppQueueProcessor {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppQueueProcessor.class);

    private final WhatsAppQueueClaimService claimService;
    private final WhatsAppQueueWorker worker;

    @Value("${whatsapp.queue.batch.size:20}")
    private int batchSize;

    public WhatsAppQueueProcessor(WhatsAppQueueClaimService claimService, WhatsAppQueueWorker worker) {
        this.claimService = claimService;
        this.worker = worker;
    }

    @Scheduled(fixedDelayString = "${whatsapp.queue.poll.interval.ms:15000}")
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

        log.info("[WhatsAppQueueProcessor] Claimed {} queue item(s) for processing", claimed.size());
        for (Long id : claimed) {
            worker.processOne(id);
        }
    }
}
