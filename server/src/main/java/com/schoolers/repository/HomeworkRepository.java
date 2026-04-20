package com.schoolers.repository;

import com.schoolers.model.Homework;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface HomeworkRepository extends JpaRepository<Homework, Long> {
    List<Homework> findByTeacherId(Long teacherId);
    List<Homework> findByClassSection(String classSection);
    List<Homework> findByClassSectionAndSubject(String classSection, String subject);

    // School-scoped queries
    List<Homework> findBySchoolId(Long schoolId);
    List<Homework> findBySchoolIdAndTeacherId(Long schoolId, Long teacherId);
    List<Homework> findBySchoolIdAndClassSection(Long schoolId, String classSection);

    @Modifying @Transactional
    void deleteByTeacherId(Long teacherId);

    @Modifying @Transactional
    void deleteByClassSection(String classSection);
}
