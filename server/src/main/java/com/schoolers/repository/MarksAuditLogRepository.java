package com.schoolers.repository;

import com.schoolers.model.MarksAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MarksAuditLogRepository extends JpaRepository<MarksAuditLog, Long> {}
