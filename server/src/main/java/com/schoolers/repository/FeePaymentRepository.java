package com.schoolers.repository;

import com.schoolers.model.FeePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface FeePaymentRepository extends JpaRepository<FeePayment, Long> {
    List<FeePayment> findByStudentIdOrderByPaymentDateDescCreatedAtDesc(Long studentId);
    List<FeePayment> findByAssignmentIdOrderByPaymentDateDescCreatedAtDesc(Long assignmentId);
    boolean existsByReceiptNumber(String receiptNumber);

    /** School-scoped: all payments for one school, newest first */
    List<FeePayment> findBySchoolIdOrderByPaymentDateDescCreatedAtDesc(Long schoolId);

    /** Total amount collected for a specific school */
    @Query("SELECT COALESCE(SUM(fp.amountPaid), 0) FROM FeePayment fp WHERE fp.schoolId = :schoolId")
    BigDecimal sumAmountPaidBySchool(@Param("schoolId") Long schoolId);

    /** Platform-wide total amount collected (all schools) */
    @Query("SELECT COALESCE(SUM(fp.amountPaid), 0) FROM FeePayment fp")
    BigDecimal sumAmountPaidAll();

    /** Monthly revenue for a school in a given month/year */
    @Query(value = "SELECT COALESCE(SUM(amount_paid), 0) FROM fee_payments WHERE school_id = :schoolId AND EXTRACT(MONTH FROM payment_date) = :month AND EXTRACT(YEAR FROM payment_date) = :year", nativeQuery = true)
    BigDecimal sumAmountPaidBySchoolAndMonth(@Param("schoolId") Long schoolId, @Param("month") int month, @Param("year") int year);

    @Modifying @Transactional
    void deleteByStudentId(Long studentId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
