package com.schoolers.repository;

import com.schoolers.model.MarksAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface MarksAuditLogRepository extends JpaRepository<MarksAuditLog, Long> {

    @Modifying
    @Transactional
    void deleteByStudentId(Long studentId);
}
