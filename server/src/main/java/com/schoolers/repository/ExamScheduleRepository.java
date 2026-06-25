package com.schoolers.repository;

import com.schoolers.model.ExamSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, Long> {
    List<ExamSchedule> findByClassNameAndSectionOrderByExamDateAsc(String className, String section);
    List<ExamSchedule> findByClassNameOrderByExamDateAsc(String className);
    List<ExamSchedule> findByExamTypeOrderByExamDateAsc(String examType);
    List<ExamSchedule> findByStatusOrderByExamDateAsc(String status);
    List<ExamSchedule> findAllByOrderByExamDateAsc();

    long countBySchoolId(Long schoolId);

    // School-scoped queries (strict match)
    List<ExamSchedule> findBySchoolIdOrderByExamDateAsc(Long schoolId);
    List<ExamSchedule> findByExamTypeAndSchoolIdOrderByExamDateAsc(String examType, Long schoolId);

    // School-scoped strict queries
    @Query("SELECT e FROM ExamSchedule e WHERE e.className = :className AND e.schoolId = :schoolId ORDER BY e.examDate ASC")
    List<ExamSchedule> findByClassNameAndSchoolIdOrNull(@Param("className") String className, @Param("schoolId") Long schoolId);

    @Query("SELECT e FROM ExamSchedule e WHERE e.schoolId = :schoolId ORDER BY e.examDate ASC")
    List<ExamSchedule> findBySchoolIdOrNull(@Param("schoolId") Long schoolId);

    @Query("SELECT e FROM ExamSchedule e WHERE e.examType = :examType AND e.schoolId = :schoolId ORDER BY e.examDate ASC")
    List<ExamSchedule> findByExamTypeAndSchoolIdOrNull(@Param("examType") String examType, @Param("schoolId") Long schoolId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
