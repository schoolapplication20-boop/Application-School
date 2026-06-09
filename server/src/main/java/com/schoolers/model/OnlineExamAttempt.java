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
@Table(name = "online_exam_attempts",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_attempt_exam_student",
        columnNames = {"exam_id", "student_id"}
    ),
    indexes = {
        @Index(name = "idx_oea_exam_id",    columnList = "exam_id"),
        @Index(name = "idx_oea_student_id", columnList = "student_id")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnlineExamAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "exam_id", nullable = false)
    private Long examId;

    @NotNull
    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "student_name", length = 100)
    private String studentName;

    @Column(name = "class_name", length = 50)
    private String className;

    @Column(length = 20)
    private String section;

    @Column(name = "school_id")
    private Long schoolId;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Builder.Default
    private AttemptStatus status = AttemptStatus.IN_PROGRESS;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "total_score")
    private Integer totalScore;

    @Column(name = "is_graded")
    @Builder.Default
    private Boolean isGraded = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum AttemptStatus {
        IN_PROGRESS, SUBMITTED, GRADED
    }
}
