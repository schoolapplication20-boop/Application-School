package com.schoolers.repository;

import com.schoolers.model.OnlineExamAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface OnlineExamAnswerRepository extends JpaRepository<OnlineExamAnswer, Long> {

    List<OnlineExamAnswer> findByAttemptId(Long attemptId);

    Optional<OnlineExamAnswer> findByAttemptIdAndQuestionId(Long attemptId, Long questionId);

    @Query("SELECT COALESCE(SUM(a.marksAwarded), 0) FROM OnlineExamAnswer a WHERE a.attemptId = :attemptId")
    Integer sumMarksAwardedByAttemptId(@Param("attemptId") Long attemptId);

    @Modifying
    @Transactional
    void deleteByAttemptId(Long attemptId);

    @Modifying
    @Transactional
    @Query("DELETE FROM OnlineExamAnswer a WHERE a.examId = :examId")
    void deleteByExamId(@Param("examId") Long examId);
}
