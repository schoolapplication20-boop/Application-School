package com.schoolers.repository;

import com.schoolers.model.ParentTeacherAppointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParentTeacherAppointmentRepository extends JpaRepository<ParentTeacherAppointment, Long> {

    List<ParentTeacherAppointment> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    List<ParentTeacherAppointment> findByTeacherIdOrderByCreatedAtDesc(Long teacherId);

    void deleteBySchoolId(Long schoolId);
}
