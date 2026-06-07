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
    // Caller must escape '%' and '_' in :search with '\' before calling
    //   e.g.  search = search.replace("\\","\\\\").replace("%","\\%").replace("_","\\_");
    // Note: AdminService.java also needs this escaping added at the call site.
    @Query(value =
        "SELECT * FROM expenses e WHERE " +
        "  (:status   IS NULL OR UPPER(CAST(e.status AS text)) = UPPER(:status))  AND " +
        "  (:dateFrom IS NULL OR e.date >= CAST(:dateFrom AS date))                AND " +
        "  (:dateTo   IS NULL OR e.date <= CAST(:dateTo   AS date))                AND " +
        "  (:search   IS NULL OR LOWER(COALESCE(e.title,'')) LIKE LOWER(CONCAT('%',:search,'%')) ESCAPE '\\') " +
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

    // ── School-scoped queries (multi-tenant) ──────────────────────────────────

    // Caller must escape '%' and '_' in :search with '\' before calling
    //   e.g.  search = search.replace("\\","\\\\").replace("%","\\%").replace("_","\\_");
    @Query(value =
        "SELECT * FROM expenses e WHERE e.school_id = :schoolId AND " +
        "  (:status   IS NULL OR UPPER(CAST(e.status AS text)) = UPPER(:status))  AND " +
        "  (:dateFrom IS NULL OR e.date >= CAST(:dateFrom AS date))                AND " +
        "  (:dateTo   IS NULL OR e.date <= CAST(:dateTo   AS date))                AND " +
        "  (:search   IS NULL OR LOWER(COALESCE(e.title,'')) LIKE LOWER(CONCAT('%',:search,'%')) ESCAPE '\\') " +
        "ORDER BY e.date DESC, e.created_at DESC",
        nativeQuery = true)
    List<Expense> findFilteredBySchool(
            @Param("schoolId") Long schoolId,
            @Param("status")   String status,
            @Param("dateFrom") String dateFrom,
            @Param("dateTo")   String dateTo,
            @Param("search")   String search);

    @Query(value = "SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE school_id = :schoolId", nativeQuery = true)
    BigDecimal sumAllExpensesBySchool(@Param("schoolId") Long schoolId);

    @Query(value =
        "SELECT COALESCE(SUM(amount), 0) FROM expenses " +
        "WHERE school_id = :schoolId AND EXTRACT(MONTH FROM date) = :month AND EXTRACT(YEAR FROM date) = :year",
        nativeQuery = true)
    BigDecimal sumBySchoolAndMonth(@Param("schoolId") Long schoolId, @Param("month") int month, @Param("year") int year);

    /** All 12 months' expenses for a school in a given year */
    @Query(value = "SELECT EXTRACT(MONTH FROM date) AS m, COALESCE(SUM(amount), 0) AS total " +
                   "FROM expenses WHERE school_id = :schoolId AND EXTRACT(YEAR FROM date) = :year " +
                   "GROUP BY EXTRACT(MONTH FROM date)", nativeQuery = true)
    List<Object[]> sumMonthlyBySchoolAndYear(@Param("schoolId") Long schoolId, @Param("year") int year);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
