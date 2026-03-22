package com.schoolers.repository;

import com.schoolers.model.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, Long> {
    List<Timetable> findByTeacherId(Long teacherId);
    List<Timetable> findByClassSection(String classSection);
    List<Timetable> findByTeacherIdAndDay(Long teacherId, String day);
    List<Timetable> findByIsActiveTrue();
}
