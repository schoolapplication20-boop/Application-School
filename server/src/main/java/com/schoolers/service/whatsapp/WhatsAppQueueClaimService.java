package com.schoolers.service.whatsapp;

import com.schoolers.repository.whatsapp.WhatsAppQueueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Claims due {@code whatsapp_queue} rows for processing. Kept as its own bean (separate from
 * {@link WhatsAppQueueProcessor} and {@link WhatsAppQueueWorker}) so the {@code @Transactional}
 * claim — which holds {@code SELECT ... FOR UPDATE SKIP LOCKED} row locks until commit — runs
 * through a real Spring proxy rather than a self-invoked method call. Mirrors {@code SmsQueueClaimService}.
 */
@Service
public class WhatsAppQueueClaimService {

    private final WhatsAppQueueRepository queueRepository;

    public WhatsAppQueueClaimService(WhatsAppQueueRepository queueRepository) {
        this.queueRepository = queueRepository;
    }

    @Transactional
    public List<Long> claimBatch(int batchSize) {
        List<Long> ids = queueRepository.claimDueIds(LocalDateTime.now(), batchSize);
        if (!ids.isEmpty()) {
            queueRepository.markProcessing(ids);
        }
        return ids;
    }
}
