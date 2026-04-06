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

    @Query("SELECT AVG((CAST(m.marks AS double) / m.maxMarks) * 100) FROM Marks m WHERE m.studentId = :sid AND m.maxMarks > 0")
    Double findAveragePercentageByStudentId(@Param("sid") Long studentId);

    long countByStudentId(Long studentId);

    @Modifying @Transactional
    void deleteByStudentId(Long studentId);

    @Modifying @Transactional
    void deleteByTeacherId(Long teacherId);
}
