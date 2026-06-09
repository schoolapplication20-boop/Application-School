package com.schoolers.repository;

import com.schoolers.model.OnlineExamQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface OnlineExamQuestionRepository extends JpaRepository<OnlineExamQuestion, Long> {

    List<OnlineExamQuestion> findByExamIdOrderByOrderIndexAsc(Long examId);

    int countByExamId(Long examId);

    @Query("SELECT COALESCE(SUM(q.marks), 0) FROM OnlineExamQuestion q WHERE q.examId = :examId")
    Integer sumMarksByExamId(@Param("examId") Long examId);

    @Modifying
    @Transactional
    void deleteByExamId(Long examId);

    boolean existsByIdAndExamId(Long id, Long examId);
}
