package com.schoolers.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "marks",
    indexes = {
        @Index(name = "idx_marks_student_school", columnList = "student_id, school_id"),
        @Index(name = "idx_marks_school_examtype", columnList = "school_id, exam_type")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Marks {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "student_name", length = 100)
    private String studentName;

    @NotNull
    @Column(nullable = false, length = 50)
    private String subject;

    @Column(name = "exam_type", length = 50)
    private String examType;

    @NotNull
    @Column(nullable = false)
    private Integer marks;

    @NotNull
    @Column(name = "max_marks", nullable = false)
    private Integer maxMarks;

    @Column(length = 5)
    private String grade;

    @Column(name = "teacher_id")
    private Long teacherId;

    @Column(name = "exam_date")
    private LocalDate examDate;

    /** Multi-tenancy: which school this marks record belongs to. */
    @Column(name = "school_id")
    private Long schoolId;

    // ── Internal + External mark structure ────────────────────────────────────────
    /** NORMAL (default) or INTERNAL_EXTERNAL. */
    @Builder.Default
    @Column(name = "marks_type", length = 20, nullable = false)
    private String marksType = "NORMAL";

    /** Maximum marks for the internal component (null when marksType = NORMAL). */
    @Column(name = "internal_max_marks")
    private Integer internalMaxMarks;

    /** Marks obtained in the internal component (null when marksType = NORMAL). */
    @Column(name = "internal_marks_obtained")
    private Integer internalMarksObtained;

    /** Maximum marks for the external component (null when marksType = NORMAL). */
    @Column(name = "external_max_marks")
    private Integer externalMaxMarks;

    /** Marks obtained in the external component (null when marksType = NORMAL). */
    @Column(name = "external_marks_obtained")
    private Integer externalMarksObtained;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
