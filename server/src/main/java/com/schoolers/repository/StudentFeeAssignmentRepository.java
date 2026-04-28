package com.schoolers.repository;

import com.schoolers.model.StudentFeeAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentFeeAssignmentRepository extends JpaRepository<StudentFeeAssignment, Long> {
    Optional<StudentFeeAssignment> findByStudentIdAndAcademicYear(Long studentId, String academicYear);
    Optional<StudentFeeAssignment> findFirstByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<StudentFeeAssignment> findByStudentId(Long studentId);
    List<StudentFeeAssignment> findAllByOrderByCreatedAtDesc();
    void deleteByStudentId(Long studentId);

    // School-scoped queries
    List<StudentFeeAssignment> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);
    Optional<StudentFeeAssignment> findByStudentIdAndAcademicYearAndSchoolId(Long studentId, String academicYear, Long schoolId);

    @Query("SELECT COALESCE(SUM(s.paidAmount), 0) FROM StudentFeeAssignment s WHERE s.schoolId = :schoolId")
    BigDecimal sumTotalPaidBySchool(@Param("schoolId") Long schoolId);

    @Query("SELECT COALESCE(SUM(s.totalFee - s.paidAmount), 0) FROM StudentFeeAssignment s WHERE s.status <> 'PAID' AND s.schoolId = :schoolId")
    BigDecimal sumTotalDueBySchool(@Param("schoolId") Long schoolId);

    // Legacy (keep for backward compat)
    @Query("SELECT COALESCE(SUM(s.paidAmount), 0) FROM StudentFeeAssignment s")
    BigDecimal sumTotalPaid();

    @Query("SELECT COALESCE(SUM(s.totalFee - s.paidAmount), 0) FROM StudentFeeAssignment s WHERE s.status <> 'PAID'")
    BigDecimal sumTotalDue();
}
