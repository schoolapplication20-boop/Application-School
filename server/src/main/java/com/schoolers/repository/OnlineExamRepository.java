package com.schoolers.repository;

import com.schoolers.model.OnlineExam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OnlineExamRepository extends JpaRepository<OnlineExam, Long> {

    List<OnlineExam> findByTeacherIdAndSchoolIdOrderByCreatedAtDesc(Long teacherId, Long schoolId);

    List<OnlineExam> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);

    @Query("SELECT e FROM OnlineExam e WHERE e.schoolId = :schoolId " +
           "AND e.status IN ('PUBLISHED', 'CLOSED') ORDER BY e.createdAt DESC")
    List<OnlineExam> findPublishedAndClosedBySchool(@Param("schoolId") Long schoolId);

    @Query("SELECT e FROM OnlineExam e WHERE e.schoolId = :schoolId AND e.status = 'PUBLISHED' " +
           "AND LOWER(e.className) = LOWER(:className) " +
           "AND LOWER(COALESCE(e.section,'')) = LOWER(COALESCE(:section,'')) " +
           "ORDER BY e.dueDateTime ASC")
    List<OnlineExam> findPublishedForClass(
            @Param("schoolId")   Long schoolId,
            @Param("className")  String className,
            @Param("section")    String section);

    boolean existsByIdAndTeacherId(Long id, Long teacherId);

    boolean existsByIdAndSchoolId(Long id, Long schoolId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteBySchoolId(Long schoolId);
}
