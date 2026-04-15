package com.schoolers.repository;

import com.schoolers.model.Fee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface FeeRepository extends JpaRepository<Fee, Long> {

    // ── School-scoped queries (multi-tenant) ──────────────────────────────────

    List<Fee> findBySchoolId(Long schoolId);

    List<Fee> findBySchoolIdAndStatus(Long schoolId, Fee.Status status);

    List<Fee> findBySchoolIdAndStudentId(Long schoolId, Long studentId);

    @Query("SELECT COALESCE(SUM(f.paidAmount),0) FROM Fee f WHERE f.schoolId = :schoolId AND f.status = 'PAID'")
    BigDecimal sumPaidFeesBySchool(@Param("schoolId") Long schoolId);

    @Query("SELECT COALESCE(SUM(f.amount),0) FROM Fee f WHERE f.schoolId = :schoolId AND f.status = 'PENDING'")
    BigDecimal sumPendingFeesBySchool(@Param("schoolId") Long schoolId);

    @Query("SELECT COALESCE(SUM(f.paidAmount),0) FROM Fee f WHERE f.schoolId = :schoolId AND f.status = 'PAID' AND EXTRACT(MONTH FROM f.createdAt) = :month AND EXTRACT(YEAR FROM f.createdAt) = :year")
    BigDecimal sumPaidFeesBySchoolAndMonth(@Param("schoolId") Long schoolId, @Param("month") int month, @Param("year") int year);

    // ── Lookup helpers ────────────────────────────────────────────────────────

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
