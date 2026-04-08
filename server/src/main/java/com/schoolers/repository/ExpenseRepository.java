package com.schoolers.repository;

import com.schoolers.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    // ── Filtered list ─────────────────────────────────────────────────────────
    // Uses CAST(status AS text) instead of status::text because Spring Data JPA's
    // named-parameter parser treats '::' as a second ':' parameter prefix.
    @Query(value =
        "SELECT * FROM expenses e WHERE " +
        "  (:status   IS NULL OR UPPER(CAST(e.status AS text)) = UPPER(:status))  AND " +
        "  (:dateFrom IS NULL OR e.date >= CAST(:dateFrom AS date))                AND " +
        "  (:dateTo   IS NULL OR e.date <= CAST(:dateTo   AS date))                AND " +
        "  (:search   IS NULL OR LOWER(COALESCE(e.title,'')) LIKE LOWER(CONCAT('%',:search,'%'))) " +
        "ORDER BY e.date DESC, e.created_at DESC",
        nativeQuery = true)
    List<Expense> findFiltered(
            @Param("status")   String status,
            @Param("dateFrom") String dateFrom,
            @Param("dateTo")   String dateTo,
            @Param("search")   String search);

    // ── Monthly summary ───────────────────────────────────────────────────────
    @Query(value =
        "SELECT COALESCE(SUM(amount), 0) FROM expenses " +
        "WHERE EXTRACT(MONTH FROM date) = :month AND EXTRACT(YEAR FROM date) = :year",
        nativeQuery = true)
    BigDecimal sumByMonth(@Param("month") int month, @Param("year") int year);

    @Query(value =
        "SELECT COALESCE(SUM(amount), 0) FROM expenses " +
        "WHERE EXTRACT(MONTH FROM date) = :month AND EXTRACT(YEAR FROM date) = :year " +
        "  AND UPPER(CAST(status AS text)) = 'PAID'",
        nativeQuery = true)
    BigDecimal sumPaidByMonth(@Param("month") int month, @Param("year") int year);

    @Query(value =
        "SELECT COALESCE(SUM(amount), 0) FROM expenses " +
        "WHERE EXTRACT(MONTH FROM date) = :month AND EXTRACT(YEAR FROM date) = :year " +
        "  AND UPPER(CAST(status AS text)) = 'UNPAID'",
        nativeQuery = true)
    BigDecimal sumUnpaidByMonth(@Param("month") int month, @Param("year") int year);

    @Query(value = "SELECT COALESCE(SUM(amount), 0) FROM expenses", nativeQuery = true)
    BigDecimal sumAllExpenses();
}
