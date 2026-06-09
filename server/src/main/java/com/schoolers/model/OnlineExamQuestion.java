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
@Table(name = "online_exam_questions",
    indexes = {
        @Index(name = "idx_oeq_exam_id", columnList = "exam_id")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnlineExamQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "exam_id", nullable = false)
    private Long examId;

    @NotNull
    @Column(name = "question_text", columnDefinition = "TEXT", nullable = false)
    private String questionText;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", length = 10, nullable = false)
    private QuestionType questionType;

    @Column(name = "option_a", length = 500)
    private String optionA;

    @Column(name = "option_b", length = 500)
    private String optionB;

    @Column(name = "option_c", length = 500)
    private String optionC;

    @Column(name = "option_d", length = 500)
    private String optionD;

    /** A, B, C, or D — only meaningful for MCQ */
    @Column(name = "correct_answer", length = 1)
    private String correctAnswer;

    @Column
    @Builder.Default
    private Integer marks = 1;

    @Column(name = "order_index")
    @Builder.Default
    private Integer orderIndex = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum QuestionType {
        MCQ, WRITTEN
    }
}
