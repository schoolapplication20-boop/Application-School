package com.schoolers.repository;

import com.schoolers.model.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    List<PushSubscription> findByUserId(Long userId);
    void deleteByUserIdAndEndpoint(Long userId, String endpoint);
}
