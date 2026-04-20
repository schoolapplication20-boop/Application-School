package com.schoolers.repository;

import com.schoolers.model.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface AppNotificationRepository extends JpaRepository<AppNotification, Long> {
    List<AppNotification> findByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndReadFalse(Long userId);

    @Modifying @Transactional
    void deleteByUserId(Long userId);
}
