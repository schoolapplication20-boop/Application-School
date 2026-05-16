package com.schoolers.repository;

import com.schoolers.model.SystemNotice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface SystemNoticeRepository extends JpaRepository<SystemNotice, Long> {

    Optional<SystemNotice> findFirstByIsActiveTrueOrderByCreatedAtDesc();

    @Modifying
    @Transactional
    @Query("UPDATE SystemNotice n SET n.isActive = false")
    void deactivateAll();
}
