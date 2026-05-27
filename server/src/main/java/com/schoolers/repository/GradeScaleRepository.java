package com.schoolers.repository;

import com.schoolers.model.GradeScale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface GradeScaleRepository extends JpaRepository<GradeScale, Long> {

    List<GradeScale> findBySchoolIdOrderByMinPercentageDesc(Long schoolId);

    boolean existsBySchoolId(Long schoolId);

    @Modifying
    @Transactional
    @Query("DELETE FROM GradeScale g WHERE g.schoolId = :schoolId")
    void deleteBySchoolId(@Param("schoolId") Long schoolId);
}
