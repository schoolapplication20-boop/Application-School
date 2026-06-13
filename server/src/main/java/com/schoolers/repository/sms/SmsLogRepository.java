package com.schoolers.repository.sms;

import com.schoolers.model.sms.SmsLog;
import com.schoolers.model.sms.SmsLogStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface SmsLogRepository extends JpaRepository<SmsLog, Long> {

    Optional<SmsLog> findByProviderMessageId(String providerMessageId);

    /** Pass null for status/from/to and empty string for search to skip those filters. */
    @Query("SELECT l FROM SmsLog l WHERE l.schoolId = :schoolId " +
           "AND (:status IS NULL OR l.status = :status) " +
           "AND (:from IS NULL OR l.createdAt >= :from) " +
           "AND (:to IS NULL OR l.createdAt <= :to) " +
           "AND (:search = '' OR l.recipientPhone LIKE CONCAT('%',:search,'%') ESCAPE '\\' " +
           "     OR LOWER(l.recipientName) LIKE LOWER(CONCAT('%',:search,'%')) ESCAPE '\\') " +
           "ORDER BY l.createdAt DESC")
    Page<SmsLog> findByFilters(@Param("schoolId") Long schoolId,
                                @Param("status") SmsLogStatus status,
                                @Param("from") LocalDateTime from,
                                @Param("to") LocalDateTime to,
                                @Param("search") String search,
                                Pageable pageable);

    long countBySchoolIdAndCreatedAtBetween(Long schoolId, LocalDateTime from, LocalDateTime to);

    long countBySchoolIdAndStatusAndCreatedAtBetween(Long schoolId, SmsLogStatus status, LocalDateTime from, LocalDateTime to);

    long countBySchoolIdAndStatus(Long schoolId, SmsLogStatus status);
}
