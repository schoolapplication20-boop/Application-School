package com.schoolers.repository;

import com.schoolers.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    List<Attendance> findByStudentIdAndDateBetween(Long studentId, LocalDate startDate, LocalDate endDate);
    List<Attendance> findByClassIdAndDate(Long classId, LocalDate date);
    Optional<Attendance> findByStudentIdAndClassIdAndDate(Long studentId, Long classId, LocalDate date);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.studentId = :studentId AND a.status = 'PRESENT' AND a.date BETWEEN :start AND :end")
    long countPresentByStudentIdAndDateBetween(@Param("studentId") Long studentId, @Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT a FROM Attendance a WHERE a.studentId = :studentId ORDER BY a.date DESC")
    List<Attendance> findByStudentIdOrderByDateDesc(@Param("studentId") Long studentId);
}
