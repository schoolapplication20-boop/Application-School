package com.schoolers.repository.whatsapp;

import com.schoolers.model.whatsapp.WhatsAppCategory;
import com.schoolers.model.whatsapp.WhatsAppTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WhatsAppTemplateRepository extends JpaRepository<WhatsAppTemplate, Long> {

    List<WhatsAppTemplate> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);

    List<WhatsAppTemplate> findBySchoolIdAndIsActiveTrueOrderByNameAsc(Long schoolId);

    List<WhatsAppTemplate> findBySchoolIdAndCategoryAndIsActiveTrue(Long schoolId, WhatsAppCategory category);

    Optional<WhatsAppTemplate> findByIdAndSchoolId(Long id, Long schoolId);

    boolean existsBySchoolIdAndNameIgnoreCase(Long schoolId, String name);
}
