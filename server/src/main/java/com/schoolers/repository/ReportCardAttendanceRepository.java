package com.schoolers.repository;

import com.schoolers.model.ReportCardAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReportCardAttendanceRepository extends JpaRepository<ReportCardAttendance, Long> {

    List<ReportCardAttendance> findBySchoolIdAndClassNameAndSectionAndExamTypeAndAcademicYear(
            Long schoolId, String className, String section, String examType, String academicYear);

    Optional<ReportCardAttendance> findBySchoolIdAndClassNameAndSectionAndExamTypeAndStudentIdAndAcademicYear(
            Long schoolId, String className, String section, String examType, Long studentId, String academicYear);

    Optional<ReportCardAttendance> findByStudentIdAndExamType(Long studentId, String examType);

    // School-scoped variant — always prefer this to prevent cross-school data leakage.
    List<ReportCardAttendance> findByStudentIdAndSchoolId(Long studentId, Long schoolId);

    // Unscoped fallback — used only when the scoped query returns 0 rows, which indicates
    // a school_id mismatch between the save path and the read path (display id vs PK).
    List<ReportCardAttendance> findByStudentId(Long studentId);

    /** Upsert a single row — insert or update on the unique constraint. */
    @Modifying @Transactional
    @Query(value = """
        INSERT INTO report_card_attendance
            (school_id, class_name, section, exam_type, academic_year,
             student_id, total_working_days, present_days, created_at, updated_at)
        VALUES
            (:schoolId, :className, :section, :examType, :academicYear,
             :studentId, :totalWorkingDays, :presentDays, NOW(), NOW())
        ON CONFLICT (school_id, class_name, section, exam_type, student_id, academic_year) DO UPDATE SET
            total_working_days = EXCLUDED.total_working_days,
            present_days       = EXCLUDED.present_days,
            updated_at         = NOW()
        """, nativeQuery = true)
    void upsert(@Param("schoolId")          Long   schoolId,
                @Param("className")         String className,
                @Param("section")           String section,
                @Param("examType")          String examType,
                @Param("academicYear")      String academicYear,
                @Param("studentId")         Long   studentId,
                @Param("totalWorkingDays")  int    totalWorkingDays,
                @Param("presentDays")       int    presentDays);

    /**
     * Batch upsert — one SQL statement for all students in a class.
     * Replaces the per-student loop that caused N round-trips.
     * Called from TeacherController.saveReportAttendance().
     */
    @Modifying @Transactional
    @Query(value = """
        INSERT INTO report_card_attendance
            (school_id, class_name, section, exam_type, academic_year,
             student_id, total_working_days, present_days, created_at, updated_at)
        SELECT
            :schoolId, :className, :section, :examType, :academicYear,
            s.student_id, :totalWorkingDays, s.present_days, NOW(), NOW()
        FROM jsonb_to_recordset(:studentJson::jsonb) AS s(student_id BIGINT, present_days INT)
        ON CONFLICT (school_id, class_name, section, exam_type, student_id, academic_year) DO UPDATE SET
            total_working_days = EXCLUDED.total_working_days,
            present_days       = EXCLUDED.present_days,
            updated_at         = NOW()
        """, nativeQuery = true)
    void batchUpsert(@Param("schoolId")         Long   schoolId,
                     @Param("className")        String className,
                     @Param("section")          String section,
                     @Param("examType")         String examType,
                     @Param("academicYear")     String academicYear,
                     @Param("totalWorkingDays") int    totalWorkingDays,
                     @Param("studentJson")      String studentJson);
}
