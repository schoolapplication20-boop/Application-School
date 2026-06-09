package com.schoolers.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "online_exam_answers",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_answer_attempt_question",
        columnNames = {"attempt_id", "question_id"}
    ),
    indexes = {
        @Index(name = "idx_oean_attempt_id",  columnList = "attempt_id"),
        @Index(name = "idx_oean_question_id", columnList = "question_id")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnlineExamAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "attempt_id", nullable = false)
    private Long attemptId;

    @NotNull
    @Column(name = "question_id", nullable = false)
    private Long questionId;

    @Column(name = "exam_id")
    private Long examId;

    @Column(name = "student_answer", columnDefinition = "TEXT")
    private String studentAnswer;

    /** Null for WRITTEN until teacher grades; auto-set for MCQ on submit */
    @Column(name = "marks_awarded")
    private Integer marksAwarded;

    /** Null until MCQ is evaluated on submit; null for WRITTEN */
    @Column(name = "is_correct")
    private Boolean isCorrect;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
