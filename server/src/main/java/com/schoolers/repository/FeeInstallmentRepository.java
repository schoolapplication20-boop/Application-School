package com.schoolers.repository;

import com.schoolers.model.FeeInstallment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface FeeInstallmentRepository extends JpaRepository<FeeInstallment, Long> {

    List<FeeInstallment> findByAssignmentIdOrderByDueDateAsc(Long assignmentId);

    List<FeeInstallment> findByAssignmentIdOrderByCreatedAtAsc(Long assignmentId);

    long countByAssignmentId(Long assignmentId);

    /** First PENDING or PARTIAL installment after the given one, ordered by due date then creation. */
    @Query("SELECT fi FROM FeeInstallment fi WHERE fi.assignmentId = :assignmentId " +
           "AND fi.id <> :excludeId " +
           "AND fi.status IN (com.schoolers.model.FeeInstallment.Status.PENDING, com.schoolers.model.FeeInstallment.Status.PARTIAL) " +
           "ORDER BY fi.dueDate ASC NULLS LAST, fi.createdAt ASC")
    java.util.Optional<FeeInstallment> findNextPending(@Param("assignmentId") Long assignmentId, @Param("excludeId") Long excludeId);

    @Transactional
    void deleteByAssignmentId(Long assignmentId);

    @Modifying
    @Transactional
    @Query("DELETE FROM FeeInstallment fi WHERE fi.assignmentId IN (SELECT sfa.id FROM StudentFeeAssignment sfa WHERE sfa.schoolId = :schoolId)")
    void deleteBySchoolId(@Param("schoolId") Long schoolId);
}
