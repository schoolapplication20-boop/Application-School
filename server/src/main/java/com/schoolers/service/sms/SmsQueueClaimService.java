package com.schoolers.service.sms;

import com.schoolers.repository.sms.SmsQueueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Claims due {@code sms_queue} rows for processing. Kept as its own bean (separate from
 * {@link SmsQueueProcessor} and {@link SmsQueueWorker}) so the {@code @Transactional} claim —
 * which holds {@code SELECT ... FOR UPDATE SKIP LOCKED} row locks until commit — runs through
 * a real Spring proxy rather than a self-invoked method call.
 */
@Service
public class SmsQueueClaimService {

    private final SmsQueueRepository queueRepository;

    public SmsQueueClaimService(SmsQueueRepository queueRepository) {
        this.queueRepository = queueRepository;
    }

    /**
     * Claims up to {@code batchSize} due rows and marks them {@code PROCESSING} in the same
     * transaction, so no two concurrent pollers can claim the same row.
     */
    @Transactional
    public List<Long> claimBatch(int batchSize) {
        List<Long> ids = queueRepository.claimDueIds(LocalDateTime.now(), batchSize);
        if (!ids.isEmpty()) {
            queueRepository.markProcessing(ids);
        }
        return ids;
    }
}
