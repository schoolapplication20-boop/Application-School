package com.schoolers.repository.whatsapp;

import com.schoolers.model.sms.CampaignStatus;
import com.schoolers.model.whatsapp.WhatsAppCampaign;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WhatsAppCampaignRepository extends JpaRepository<WhatsAppCampaign, Long> {

    Page<WhatsAppCampaign> findBySchoolIdOrderByCreatedAtDesc(Long schoolId, Pageable pageable);

    Optional<WhatsAppCampaign> findByIdAndSchoolId(Long id, Long schoolId);

    Optional<WhatsAppCampaign> findBySchoolIdAndIdempotencyKey(Long schoolId, String idempotencyKey);

    List<WhatsAppCampaign> findBySchoolIdAndStatusInOrderByCreatedAtDesc(Long schoolId, List<CampaignStatus> statuses);

    @Query("SELECT COUNT(c) FROM WhatsAppCampaign c WHERE c.schoolId = :schoolId AND c.createdAt >= :since")
    long countBySchoolIdSince(@Param("schoolId") Long schoolId, @Param("since") LocalDateTime since);
}
