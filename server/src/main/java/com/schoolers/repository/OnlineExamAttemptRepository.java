package com.schoolers.repository;

import com.schoolers.model.OnlineExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface OnlineExamAttemptRepository extends JpaRepository<OnlineExamAttempt, Long> {

    Optional<OnlineExamAttempt> findByExamIdAndStudentId(Long examId, Long studentId);

    List<OnlineExamAttempt> findByExamIdOrderBySubmittedAtDesc(Long examId);

    boolean existsByExamIdAndStudentId(Long examId, Long studentId);

    @Query("SELECT COUNT(a) FROM OnlineExamAttempt a WHERE a.examId = :examId " +
           "AND a.status <> 'IN_PROGRESS'")
    long countSubmittedByExamId(@Param("examId") Long examId);

    @Modifying
    @Transactional
    void deleteByExamId(Long examId);
}
