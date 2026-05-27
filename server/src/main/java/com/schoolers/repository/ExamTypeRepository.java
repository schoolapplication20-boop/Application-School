package com.schoolers.repository;

import com.schoolers.model.ExamType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamTypeRepository extends JpaRepository<ExamType, Long> {

    List<ExamType> findBySchoolIdOrderByDisplayOrderAscNameAsc(Long schoolId);

    List<ExamType> findBySchoolIdAndIsActiveTrueOrderByDisplayOrderAscNameAsc(Long schoolId);

    boolean existsBySchoolIdAndNameIgnoreCase(Long schoolId, String name);

    void deleteBySchoolId(Long schoolId);
}
