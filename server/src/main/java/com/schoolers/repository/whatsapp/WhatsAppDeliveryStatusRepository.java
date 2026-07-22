package com.schoolers.repository.whatsapp;

import com.schoolers.model.whatsapp.WhatsAppDeliveryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WhatsAppDeliveryStatusRepository extends JpaRepository<WhatsAppDeliveryStatus, Long> {

    List<WhatsAppDeliveryStatus> findByWhatsAppLogIdOrderByReceivedAtDesc(Long whatsAppLogId);
}
