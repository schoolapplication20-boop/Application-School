package com.schoolers.repository;

import com.schoolers.model.ExamSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, Long> {
    List<ExamSchedule> findByClassNameAndSectionOrderByExamDateAsc(String className, String section);
    List<ExamSchedule> findByClassNameOrderByExamDateAsc(String className);
    List<ExamSchedule> findByExamTypeOrderByExamDateAsc(String examType);
    List<ExamSchedule> findByStatusOrderByExamDateAsc(String status);
    List<ExamSchedule> findAllByOrderByExamDateAsc();
}
