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
    @Query(value = "SELECT * FROM holidays WHERE school_id = :schoolId AND recurring = false AND EXTRACT(YEAR FROM date) = :year AND EXTRACT(MONTH FROM date) = :month", nativeQuery = true)
    List<Holiday> findNonRecurringByMonthYearAndSchool(@Param("schoolId") Long schoolId, @Param("year") int year, @Param("month") int month);

    // School-scoped: recurring holidays whose month matches
    @Query(value = "SELECT * FROM holidays WHERE school_id = :schoolId AND recurring = true AND EXTRACT(MONTH FROM date) = :month", nativeQuery = true)
    List<Holiday> findRecurringByMonthAndSchool(@Param("schoolId") Long schoolId, @Param("month") int month);

    // Legacy (no schoolId) — kept for backward compat
    @Query(value = "SELECT * FROM holidays WHERE recurring = false AND EXTRACT(YEAR FROM date) = :year AND EXTRACT(MONTH FROM date) = :month", nativeQuery = true)
    List<Holiday> findNonRecurringByMonthYear(@Param("year") int year, @Param("month") int month);

    @Query(value = "SELECT * FROM holidays WHERE recurring = true AND EXTRACT(MONTH FROM date) = :month", nativeQuery = true)
    List<Holiday> findRecurringByMonth(@Param("month") int month);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
