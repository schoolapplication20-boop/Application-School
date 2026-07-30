package com.schoolers.repository;

import com.schoolers.model.HallTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface HallTicketRepository extends JpaRepository<HallTicket, Long> {
    Optional<HallTicket> findByTicketNumber(String ticketNumber);
    List<HallTicket> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<HallTicket> findByClassNameAndExamNameOrderByStudentNameAsc(String className, String examName);
    List<HallTicket> findByExamTypeOrderByCreatedAtDesc(String examType);
    List<HallTicket> findAllByOrderByCreatedAtDesc();
    boolean existsByTicketNumber(String ticketNumber);

    // School-scoped queries
    List<HallTicket> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);
    List<HallTicket> findByExamTypeAndSchoolIdOrderByCreatedAtDesc(String examType, Long schoolId);
    List<HallTicket> findByStudentIdAndSchoolIdOrderByCreatedAtDesc(Long studentId, Long schoolId);

    /** Batch duplicate-check: existing tickets for the given exam across a set of students (school-scoped). */
    List<HallTicket> findByStudentIdInAndExamNameAndSchoolId(List<Long> studentIds, String examName, Long schoolId);

    /** Batch duplicate-check: existing tickets for the given exam across a set of students (legacy, no schoolId). */
    List<HallTicket> findByStudentIdInAndExamName(List<Long> studentIds, String examName);

    /**
     * Batch upsert-check: existing tickets for the same exam type + academic year across a set of
     * students (school-scoped). Re-generating for the same key updates these rather than duplicating.
     */
    List<HallTicket> findByStudentIdInAndExamTypeAndAcademicYearAndSchoolId(List<Long> studentIds, String examType, String academicYear, Long schoolId);

    /** Same, legacy (no schoolId). */
    List<HallTicket> findByStudentIdInAndExamTypeAndAcademicYear(List<Long> studentIds, String examType, String academicYear);

    /** Single-student upsert-check, school-scoped. */
    Optional<HallTicket> findByStudentIdAndExamTypeAndAcademicYearAndSchoolId(Long studentId, String examType, String academicYear, Long schoolId);

    /** Single-student upsert-check, legacy (no schoolId). */
    Optional<HallTicket> findByStudentIdAndExamTypeAndAcademicYear(Long studentId, String examType, String academicYear);

    @Modifying @Transactional
    void deleteByStudentId(Long studentId);

    @Modifying @Transactional
    void deleteByStudentIdIn(List<Long> studentIds);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
