package com.schoolers.repository.sms;

import com.schoolers.model.sms.QueueStatus;
import com.schoolers.model.sms.SmsQueueItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SmsQueueRepository extends JpaRepository<SmsQueueItem, Long> {

    /**
     * Claims up to {@code batchSize} due rows for processing using SELECT ... FOR UPDATE SKIP LOCKED,
     * so multiple instances/threads never claim the same row. Must run inside a transaction —
     * the row locks are held until the caller's transaction commits.
     */
    @Query(value = "SELECT id FROM sms_queue WHERE status = 'PENDING' " +
            "AND (scheduled_for IS NULL OR scheduled_for <= :now) " +
            "AND (next_attempt_at IS NULL OR next_attempt_at <= :now) " +
            "ORDER BY created_at ASC LIMIT :batchSize FOR UPDATE SKIP LOCKED", nativeQuery = true)
    List<Long> claimDueIds(@Param("now") LocalDateTime now, @Param("batchSize") int batchSize);

    @Modifying
    @Query("UPDATE SmsQueueItem q SET q.status = com.schoolers.model.sms.QueueStatus.PROCESSING, q.updatedAt = CURRENT_TIMESTAMP WHERE q.id IN :ids")
    int markProcessing(@Param("ids") List<Long> ids);

    long countByCampaignIdAndStatus(Long campaignId, QueueStatus status);

    List<SmsQueueItem> findByCampaignId(Long campaignId);

    @Modifying
    @Query("UPDATE SmsQueueItem q SET q.status = com.schoolers.model.sms.QueueStatus.CANCELLED, q.updatedAt = CURRENT_TIMESTAMP " +
            "WHERE q.campaignId = :campaignId AND q.status = com.schoolers.model.sms.QueueStatus.PENDING")
    int cancelPendingByCampaign(@Param("campaignId") Long campaignId);

    @Query("SELECT CASE WHEN COUNT(q) = 0 THEN true ELSE false END FROM SmsQueueItem q " +
            "WHERE q.campaignId = :campaignId AND q.status IN (com.schoolers.model.sms.QueueStatus.PENDING, com.schoolers.model.sms.QueueStatus.PROCESSING)")
    boolean isCampaignFullyProcessed(@Param("campaignId") Long campaignId);

    long countByStatus(QueueStatus status);

    long countBySchoolIdAndStatus(Long schoolId, QueueStatus status);
}
