package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "marks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Marks {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "student_name", length = 100)
    private String studentName;

    @Column(nullable = false, length = 50)
    private String subject;

    @Column(name = "exam_type", length = 50)
    private String examType;

    @Column(nullable = false)
    private Integer marks;

    @Column(name = "max_marks", nullable = false)
    private Integer maxMarks;

    @Column(length = 5)
    private String grade;

    @Column(name = "teacher_id")
    private Long teacherId;

    @Column(name = "exam_date")
    private LocalDate examDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
