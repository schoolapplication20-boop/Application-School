package com.schoolers.repository;

import com.schoolers.model.Fee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface FeeRepository extends JpaRepository<Fee, Long> {
    List<Fee> findByStudentId(Long studentId);
    List<Fee> findByStudentIdAndStatus(Long studentId, Fee.Status status);
    List<Fee> findByStatus(Fee.Status status);
    boolean existsByReceiptNumber(String receiptNumber);
    List<Fee> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    @Query("SELECT COALESCE(SUM(f.amount),0) FROM Fee f WHERE f.status = 'PAID'")
    BigDecimal sumPaidFees();

    @Query("SELECT COALESCE(SUM(f.amount),0) FROM Fee f WHERE f.status = 'PENDING'")
    BigDecimal sumPendingFees();

    @Query("SELECT COALESCE(SUM(f.amount),0) FROM Fee f WHERE f.status = 'PAID' AND MONTH(f.createdAt) = :month AND YEAR(f.createdAt) = :year")
    BigDecimal sumPaidFeesByMonth(int month, int year);

    @Modifying @Transactional
    void deleteByStudentId(Long studentId);
}
