package com.schoolers.repository;

import com.schoolers.model.TeacherAttendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TeacherAttendanceRepository extends JpaRepository<TeacherAttendance, Long> {

    Optional<TeacherAttendance> findByTeacherIdAndDate(Long teacherId, LocalDate date);

    List<TeacherAttendance> findByTeacherIdOrderByDateDesc(Long teacherId);

    List<TeacherAttendance> findBySchoolIdAndDateOrderByTeacherNameAsc(Long schoolId, LocalDate date);

    List<TeacherAttendance> findBySchoolIdAndDateBetweenOrderByDateDesc(Long schoolId, LocalDate from, LocalDate to);

    List<TeacherAttendance> findByTeacherIdAndDateBetweenOrderByDateDesc(Long teacherId, LocalDate from, LocalDate to);
}
