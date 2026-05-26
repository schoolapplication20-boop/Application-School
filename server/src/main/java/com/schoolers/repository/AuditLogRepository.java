package com.schoolers.repository;

import com.schoolers.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findBySchoolIdOrderByCreatedAtDesc(Long schoolId, Pageable pageable);
    Page<AuditLog> findBySchoolIdAndEntityTypeOrderByCreatedAtDesc(Long schoolId, String entityType, Pageable pageable);
    Page<AuditLog> findByActorIdOrderByCreatedAtDesc(Long actorId, Pageable pageable);
}
