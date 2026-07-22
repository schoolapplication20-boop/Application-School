package com.schoolers.repository.whatsapp;

import com.schoolers.model.whatsapp.WhatsAppConfiguration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WhatsAppConfigurationRepository extends JpaRepository<WhatsAppConfiguration, Long> {
    Optional<WhatsAppConfiguration> findBySchoolId(Long schoolId);
}
