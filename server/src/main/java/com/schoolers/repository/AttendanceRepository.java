package com.schoolers.repository;

import com.schoolers.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    List<Attendance> findByStudentIdAndDateBetween(Long studentId, LocalDate start, LocalDate end);

    List<Attendance> findByClassIdAndDate(Long classId, LocalDate date);

    List<Attendance> findByClassIdAndDateBetween(Long classId, LocalDate start, LocalDate end);

    Optional<Attendance> findByStudentIdAndClassIdAndDate(Long studentId, Long classId, LocalDate date);

    List<Attendance> findByStudentIdOrderByDateDesc(Long studentId);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.studentId = :sid AND a.status = 'PRESENT' AND a.date BETWEEN :start AND :end")
    long countPresentByStudentIdAndDateBetween(@Param("sid") Long studentId, @Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT a.status, COUNT(a) FROM Attendance a WHERE a.classId = :cid AND a.date = :date GROUP BY a.status")
    List<Object[]> countByStatusForClassAndDate(@Param("cid") Long classId, @Param("date") LocalDate date);

    @Query("SELECT a.status, COUNT(a) FROM Attendance a WHERE a.classId = :cid AND a.date BETWEEN :start AND :end GROUP BY a.status")
    List<Object[]> countByStatusForClassAndDateRange(@Param("cid") Long classId, @Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT DISTINCT a.date FROM Attendance a WHERE a.classId = :cid ORDER BY a.date DESC")
    List<LocalDate> findDistinctDatesByClassId(@Param("cid") Long classId);

    @Query("SELECT a.date, a.status, COUNT(a) FROM Attendance a WHERE a.classId = :cid GROUP BY a.date, a.status ORDER BY a.date DESC")
    List<Object[]> countByDateAndStatusForClass(@Param("cid") Long classId);

    @Modifying
    @Transactional
    void deleteByStudentId(Long studentId);

    @Modifying
    @Transactional
    void deleteByClassId(Long classId);

    // ── School-scoped queries (multi-tenant) ──────────────────────────────────

    List<Attendance> findBySchoolIdAndClassIdAndDate(Long schoolId, Long classId, LocalDate date);

    List<Attendance> findBySchoolIdAndClassIdAndDateBetween(Long schoolId, Long classId, LocalDate start, LocalDate end);

    @Query("SELECT DISTINCT a.date FROM Attendance a WHERE a.schoolId = :schoolId AND a.classId = :cid ORDER BY a.date DESC")
    List<LocalDate> findDistinctDatesBySchoolIdAndClassId(@Param("schoolId") Long schoolId, @Param("cid") Long classId);

    @Query("SELECT a.status, COUNT(a) FROM Attendance a WHERE a.schoolId = :schoolId AND a.classId = :cid AND a.date = :date GROUP BY a.status")
    List<Object[]> countByStatusForSchoolAndClassAndDate(@Param("schoolId") Long schoolId, @Param("cid") Long classId, @Param("date") LocalDate date);
}
