package com.schoolers.repository.sms;

import com.schoolers.model.sms.NotificationPreference;
import com.schoolers.model.sms.SmsCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, Long> {

    List<NotificationPreference> findBySchoolId(Long schoolId);

    Optional<NotificationPreference> findBySchoolIdAndCategory(Long schoolId, SmsCategory category);
}
