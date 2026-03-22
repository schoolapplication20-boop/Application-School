package com.schoolers.repository;

import com.schoolers.model.Marks;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MarksRepository extends JpaRepository<Marks, Long> {
    List<Marks> findByStudentId(Long studentId);
    List<Marks> findByStudentIdAndSubject(Long studentId, String subject);
    List<Marks> findByStudentIdAndExamType(Long studentId, String examType);
    List<Marks> findByTeacherId(Long teacherId);

    @Query("SELECT AVG(CAST(m.marks AS float) / m.maxMarks * 100) FROM Marks m WHERE m.studentId = :studentId")
    Double findAveragePercentageByStudentId(@Param("studentId") Long studentId);
}
