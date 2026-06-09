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
@Table(name = "online_exams",
    indexes = {
        @Index(name = "idx_online_exams_school_teacher", columnList = "school_id, teacher_id"),
        @Index(name = "idx_online_exams_school_status",  columnList = "school_id, status")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnlineExam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 100)
    private String subject;

    @Column(name = "class_name", length = 50)
    private String className;

    @Column(length = 20)
    private String section;

    @Column(name = "school_id")
    private Long schoolId;

    @Column(name = "teacher_id")
    private Long teacherId;

    @Column(name = "teacher_name", length = 100)
    private String teacherName;

    @Column(name = "due_date_time")
    private LocalDateTime dueDateTime;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Column(name = "total_marks")
    @Builder.Default
    private Integer totalMarks = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Status {
        DRAFT, PUBLISHED, CLOSED
    }
}
