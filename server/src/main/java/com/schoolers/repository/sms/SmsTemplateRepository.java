package com.schoolers.repository.sms;

import com.schoolers.model.sms.SmsCategory;
import com.schoolers.model.sms.SmsTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SmsTemplateRepository extends JpaRepository<SmsTemplate, Long> {

    List<SmsTemplate> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);

    List<SmsTemplate> findBySchoolIdAndIsActiveTrueOrderByNameAsc(Long schoolId);

    List<SmsTemplate> findBySchoolIdAndCategoryAndIsActiveTrue(Long schoolId, SmsCategory category);

    Optional<SmsTemplate> findByIdAndSchoolId(Long id, Long schoolId);

    boolean existsBySchoolIdAndNameIgnoreCase(Long schoolId, String name);
}
