package com.schoolers.repository;

import com.schoolers.model.FeeInstallment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface FeeInstallmentRepository extends JpaRepository<FeeInstallment, Long> {

    List<FeeInstallment> findByAssignmentIdOrderByDueDateAsc(Long assignmentId);

    List<FeeInstallment> findByAssignmentIdOrderByCreatedAtAsc(Long assignmentId);

    long countByAssignmentId(Long assignmentId);

    @Transactional
    void deleteByAssignmentId(Long assignmentId);
}
