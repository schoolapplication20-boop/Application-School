package com.schoolers.repository;

import com.schoolers.model.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByTeacherId(Long teacherId);
    List<Assignment> findByClassId(Long classId);
    List<Assignment> findByClassIdAndStatus(Long classId, Assignment.Status status);
    List<Assignment> findByTeacherIdAndStatus(Long teacherId, Assignment.Status status);

    @Modifying @Transactional
    void deleteByTeacherId(Long teacherId);
}
