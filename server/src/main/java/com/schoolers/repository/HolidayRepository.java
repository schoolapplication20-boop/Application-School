package com.schoolers.repository;

import com.schoolers.model.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long> {

    // School-scoped: all holidays for a school
    List<Holiday> findBySchoolIdOrderByDateAsc(Long schoolId);

    // School-scoped: non-recurring holidays in a given month/year
    @Query("SELECT h FROM Holiday h WHERE h.schoolId = :schoolId AND h.recurring = false AND YEAR(h.date) = :year AND MONTH(h.date) = :month")
    List<Holiday> findNonRecurringByMonthYearAndSchool(@Param("schoolId") Long schoolId, @Param("year") int year, @Param("month") int month);

    // School-scoped: recurring holidays whose month matches
    @Query("SELECT h FROM Holiday h WHERE h.schoolId = :schoolId AND h.recurring = true AND MONTH(h.date) = :month")
    List<Holiday> findRecurringByMonthAndSchool(@Param("schoolId") Long schoolId, @Param("month") int month);

    // Legacy (no schoolId) — kept for backward compat
    @Query("SELECT h FROM Holiday h WHERE h.recurring = false AND YEAR(h.date) = :year AND MONTH(h.date) = :month")
    List<Holiday> findNonRecurringByMonthYear(@Param("year") int year, @Param("month") int month);

    @Query("SELECT h FROM Holiday h WHERE h.recurring = true AND MONTH(h.date) = :month")
    List<Holiday> findRecurringByMonth(@Param("month") int month);
}
