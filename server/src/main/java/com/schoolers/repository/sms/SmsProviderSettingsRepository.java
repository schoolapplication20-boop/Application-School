package com.schoolers.repository.sms;

import com.schoolers.model.sms.SmsProviderSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SmsProviderSettingsRepository extends JpaRepository<SmsProviderSettings, Long> {
    Optional<SmsProviderSettings> findBySchoolId(Long schoolId);
}
