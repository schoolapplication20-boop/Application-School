package com.schoolers.repository;

import com.schoolers.model.PlatformPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface PlatformPaymentRepository extends JpaRepository<PlatformPayment, Long> {

    List<PlatformPayment> findBySchoolIdOrderByPaidDateDesc(Long schoolId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PlatformPayment p WHERE p.schoolId = :schoolId")
    BigDecimal sumAmountBySchoolId(@Param("schoolId") Long schoolId);
}
