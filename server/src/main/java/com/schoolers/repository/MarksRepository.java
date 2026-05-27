package com.schoolers.repository;

import com.schoolers.model.Marks;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface MarksRepository extends JpaRepository<Marks, Long> {
    List<Marks> findByStudentId(Long studentId);
    List<Marks> findByStudentIdAndSubject(Long studentId, String subject);
    List<Marks> findByStudentIdAndExamType(Long studentId, String examType);
    List<Marks> findByTeacherId(Long teacherId);

    // School-scoped queries
    List<Marks> findByStudentIdAndSchoolId(Long studentId, Long schoolId);
    List<Marks> findByStudentIdAndSchoolIdAndExamType(Long studentId, Long schoolId, String examType);
    List<Marks> findByTeacherIdAndSchoolId(Long teacherId, Long schoolId);
    List<Marks> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);

    // Distinct exam types for a student (for report card filter dropdown)
    @Query("SELECT DISTINCT m.examType FROM Marks m WHERE m.studentId = :studentId AND m.schoolId = :schoolId AND m.examType IS NOT NULL ORDER BY m.examType")
    List<String> findDistinctExamTypesByStudentIdAndSchoolId(@Param("studentId") Long studentId, @Param("schoolId") Long schoolId);

    @Query("SELECT DISTINCT m.examType FROM Marks m WHERE m.studentId = :studentId AND m.examType IS NOT NULL ORDER BY m.examType")
    List<String> findDistinctExamTypesByStudentId(@Param("studentId") Long studentId);

    @Query("SELECT AVG((CAST(m.marks AS double) / m.maxMarks) * 100) FROM Marks m WHERE m.studentId = :sid AND m.maxMarks > 0")
    Double findAveragePercentageByStudentId(@Param("sid") Long studentId);

    long countByStudentId(Long studentId);

    @Modifying @Transactional
    void deleteByStudentId(Long studentId);

    @Modifying @Transactional
    void deleteByTeacherId(Long teacherId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
