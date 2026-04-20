package com.schoolers.repository;

import com.schoolers.model.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, Long> {
    List<Timetable> findByTeacherId(Long teacherId);
    List<Timetable> findByClassSection(String classSection);
    List<Timetable> findByTeacherIdAndDay(Long teacherId, String day);
    List<Timetable> findByIsActiveTrue();

    // School-scoped queries
    List<Timetable> findBySchoolId(Long schoolId);
    List<Timetable> findBySchoolIdAndTeacherId(Long schoolId, Long teacherId);
    List<Timetable> findBySchoolIdAndClassSection(Long schoolId, String classSection);
    List<Timetable> findBySchoolIdAndTeacherIdAndDay(Long schoolId, Long teacherId, String day);

    @Modifying @Transactional
    void deleteByTeacherId(Long teacherId);

    @Modifying @Transactional
    void deleteByClassSection(String classSection);
}
