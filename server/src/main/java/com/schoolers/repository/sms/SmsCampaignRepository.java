package com.schoolers.repository.sms;

import com.schoolers.model.sms.CampaignStatus;
import com.schoolers.model.sms.SmsCampaign;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SmsCampaignRepository extends JpaRepository<SmsCampaign, Long> {

    Page<SmsCampaign> findBySchoolIdOrderByCreatedAtDesc(Long schoolId, Pageable pageable);

    Optional<SmsCampaign> findByIdAndSchoolId(Long id, Long schoolId);

    Optional<SmsCampaign> findBySchoolIdAndIdempotencyKey(Long schoolId, String idempotencyKey);

    List<SmsCampaign> findBySchoolIdAndStatusInOrderByCreatedAtDesc(Long schoolId, List<CampaignStatus> statuses);

    @Query("SELECT c FROM SmsCampaign c WHERE c.schoolId = :schoolId ORDER BY c.createdAt DESC")
    List<SmsCampaign> findRecentBySchoolId(@Param("schoolId") Long schoolId, Pageable pageable);

    @Query("SELECT COUNT(c) FROM SmsCampaign c WHERE c.schoolId = :schoolId AND c.createdAt >= :since")
    long countBySchoolIdSince(@Param("schoolId") Long schoolId, @Param("since") LocalDateTime since);
}
