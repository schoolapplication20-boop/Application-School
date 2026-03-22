package com.schoolers.repository;

import com.schoolers.model.Homework;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HomeworkRepository extends JpaRepository<Homework, Long> {
    List<Homework> findByTeacherId(Long teacherId);
    List<Homework> findByClassSection(String classSection);
    List<Homework> findByClassSectionAndSubject(String classSection, String subject);
}
