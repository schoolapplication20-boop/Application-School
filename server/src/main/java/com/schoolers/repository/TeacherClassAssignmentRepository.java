package com.schoolers.repository;

import com.schoolers.model.TeacherClassAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface TeacherClassAssignmentRepository extends JpaRepository<TeacherClassAssignment, Long> {

    List<TeacherClassAssignment> findByTeacherId(Long teacherId);
    List<TeacherClassAssignment> findBySchoolId(Long schoolId);
    List<TeacherClassAssignment> findByTeacherIdAndSchoolId(Long teacherId, Long schoolId);
    List<TeacherClassAssignment> findByClassSectionAndSchoolId(String classSection, Long schoolId);

    @Modifying @Transactional
    void deleteByTeacherId(Long teacherId);

    @Modifying @Transactional
    void deleteByClassSection(String classSection);

    @Modifying @Transactional
    void deleteBySchoolId(Long schoolId);
}
