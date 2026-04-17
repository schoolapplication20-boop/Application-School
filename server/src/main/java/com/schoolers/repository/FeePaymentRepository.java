package com.schoolers.repository;

import com.schoolers.model.FeePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface FeePaymentRepository extends JpaRepository<FeePayment, Long> {
    List<FeePayment> findByStudentIdOrderByPaymentDateDescCreatedAtDesc(Long studentId);
    List<FeePayment> findByAssignmentIdOrderByPaymentDateDescCreatedAtDesc(Long assignmentId);
    boolean existsByReceiptNumber(String receiptNumber);

    /** School-scoped: all payments for one school, newest first */
    List<FeePayment> findBySchoolIdOrderByPaymentDateDescCreatedAtDesc(Long schoolId);

    @Modifying @Transactional
    void deleteByStudentId(Long studentId);
}
