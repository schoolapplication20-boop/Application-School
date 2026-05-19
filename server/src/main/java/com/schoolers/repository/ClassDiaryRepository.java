package com.schoolers.repository;

import com.schoolers.model.ClassDiary;
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
public interface ClassDiaryRepository extends JpaRepository<ClassDiary, Long> {

    List<ClassDiary> findAllByOrderByCreatedAtDesc();

    List<ClassDiary> findByClassNameOrderByDiaryDateDesc(String className);

    List<ClassDiary> findByClassNameAndSectionOrderByDiaryDateDesc(String className, String section);

    List<ClassDiary> findByTeacherIdOrderByDiaryDateDesc(Long teacherId);

    Optional<ClassDiary> findByClassNameAndDiaryDateAndTeacherId(String className, LocalDate diaryDate, Long teacherId);

    boolean existsByClassNameAndSubjectAndDiaryDateAndTeacherId(String className, String subject, LocalDate diaryDate, Long teacherId);

    @Modifying @Transactional
    void deleteByTeacherId(Long teacherId);

    @Modifying @Transactional
    void deleteByClassNameAndSection(String className, String section);

    @Query("SELECT d FROM ClassDiary d WHERE " +
           "(:className IS NULL OR d.className = :className) AND " +
           "(:teacherId IS NULL OR d.teacherId = :teacherId) AND " +
           "(:date IS NULL OR d.diaryDate = :date) " +
           "ORDER BY d.createdAt DESC")
    List<ClassDiary> findWithFilters(
            @Param("className") String className,
            @Param("teacherId") Long teacherId,
            @Param("date") LocalDate date);

    // ── School-scoped queries (multi-tenant) ──────────────────────────────────

    List<ClassDiary> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);

    List<ClassDiary> findBySchoolIdAndClassNameOrderByDiaryDateDesc(Long schoolId, String className);

    List<ClassDiary> findBySchoolIdAndClassNameAndSectionOrderByDiaryDateDesc(Long schoolId, String className, String section);

    List<ClassDiary> findBySchoolIdAndTeacherIdOrderByDiaryDateDesc(Long schoolId, Long teacherId);

    boolean existsBySchoolIdAndClassNameAndSubjectAndDiaryDateAndTeacherId(
            Long schoolId, String className, String subject, LocalDate diaryDate, Long teacherId);

    @Query("SELECT d FROM ClassDiary d WHERE d.schoolId = :schoolId AND " +
           "(:className IS NULL OR d.className = :className) AND " +
           "(:teacherId IS NULL OR d.teacherId = :teacherId) AND " +
           "(:date IS NULL OR d.diaryDate = :date) " +
           "ORDER BY d.createdAt DESC")
    List<ClassDiary> findWithFiltersAndSchool(
            @Param("schoolId") Long schoolId,
            @Param("className") String className,
            @Param("teacherId") Long teacherId,
            @Param("date") LocalDate date);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
