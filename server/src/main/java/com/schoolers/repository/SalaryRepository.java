package com.schoolers.repository;

import com.schoolers.model.Salary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface SalaryRepository extends JpaRepository<Salary, Long> {

    // ── School-scoped queries (multi-tenant) ──────────────────────────────────

    List<Salary> findBySchoolId(Long schoolId);

    List<Salary> findBySchoolIdAndMonthAndYear(Long schoolId, String month, String year);

    List<Salary> findBySchoolIdAndStatus(Long schoolId, Salary.Status status);

    Optional<Salary> findBySchoolIdAndStaffIdAndMonthAndYear(Long schoolId, Long staffId, String month, String year);

    @Query("SELECT COALESCE(SUM(s.paidAmount),0) FROM Salary s WHERE s.schoolId = :schoolId AND s.status = 'PAID'")
    BigDecimal sumPaidSalariesBySchool(@Param("schoolId") Long schoolId);

    // ── Lookup helpers ────────────────────────────────────────────────────────

    List<Salary> findByStaffId(Long staffId);
    List<Salary> findByMonthAndYear(String month, String year);
    List<Salary> findByStatus(Salary.Status status);
    Optional<Salary> findByStaffIdAndMonthAndYear(Long staffId, String month, String year);

    @Modifying @Transactional
    void deleteByStaffId(Long staffId);
}
