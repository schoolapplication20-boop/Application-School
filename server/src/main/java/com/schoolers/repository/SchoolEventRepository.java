package com.schoolers.repository;

import com.schoolers.model.SchoolEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SchoolEventRepository extends JpaRepository<SchoolEvent, Long> {

    List<SchoolEvent> findBySchoolIdOrderByStartDateAsc(Long schoolId);

    @Query("SELECT e FROM SchoolEvent e WHERE e.schoolId = :schoolId AND e.startDate BETWEEN :from AND :to ORDER BY e.startDate ASC")
    List<SchoolEvent> findBySchoolIdAndDateRange(@Param("schoolId") Long schoolId,
                                                  @Param("from") LocalDate from,
                                                  @Param("to") LocalDate to);

    void deleteBySchoolId(Long schoolId);
}
