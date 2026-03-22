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
@Table(name = "exam_schedules")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String examName;

    @Column(nullable = false, length = 20)
    private String examType; // MIDTERM, FINAL, UNIT_TEST, QUARTERLY, HALFYEARLY, ANNUAL

    @Column(nullable = false, length = 10)
    private String className;

    @Column(length = 5)
    private String section;

    @Column(nullable = false, length = 100)
    private String subject;

    @Column(nullable = false)
    private LocalDate examDate;

    @Column(nullable = false, length = 10)
    private String startTime;

    @Column(nullable = false, length = 10)
    private String endTime;

    @Column(nullable = false, length = 50)
    private String hallNumber;

    @Column(nullable = false)
    private Integer maxMarks;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "SCHEDULED"; // SCHEDULED, ONGOING, COMPLETED, CANCELLED

    @Column(length = 500)
    private String instructions;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
