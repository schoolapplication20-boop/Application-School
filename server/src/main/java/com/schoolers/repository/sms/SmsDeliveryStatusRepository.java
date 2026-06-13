package com.schoolers.repository.sms;

import com.schoolers.model.sms.SmsDeliveryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SmsDeliveryStatusRepository extends JpaRepository<SmsDeliveryStatus, Long> {

    List<SmsDeliveryStatus> findBySmsLogIdOrderByReceivedAtDesc(Long smsLogId);
}
