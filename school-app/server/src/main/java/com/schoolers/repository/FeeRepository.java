package com.schoolers.repository;

import com.schoolers.model.Fee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface FeeRepository extends JpaRepository<Fee, Long> {
    List<Fee> findByStudentId(Long studentId);
    List<Fee> findByStudentIdAndStatus(Long studentId, Fee.Status status);
    List<Fee> findByStatus(Fee.Status status);

    @Query("SELECT SUM(f.amount) FROM Fee f WHERE f.status = 'PAID'")
    BigDecimal sumPaidFees();

    @Query("SELECT SUM(f.amount) FROM Fee f WHERE f.status = 'PENDING' OR f.status = 'OVERDUE'")
    BigDecimal sumPendingFees();

    @Query("SELECT SUM(f.amount) FROM Fee f WHERE f.status = 'PAID' AND MONTH(f.paidDate) = :month AND YEAR(f.paidDate) = :year")
    BigDecimal sumPaidFeesByMonth(@Param("month") int month, @Param("year") int year);
}
