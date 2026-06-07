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
@Table(name = "exam_schedules")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(nullable = false, length = 100)
    private String examName;

    @NotNull
    @Column(nullable = false, length = 20)
    private String examType; // MIDTERM, FINAL, UNIT_TEST, QUARTERLY, HALFYEARLY, ANNUAL

    @NotNull
    @Column(nullable = false, length = 10)
    private String className;

    @Column(length = 5)
    private String section;

    @NotNull
    @Column(nullable = false, length = 100)
    private String subject;

    @NotNull
    @Column(nullable = false)
    private LocalDate examDate;

    @NotNull
    @Column(nullable = false, length = 10)
    private String startTime;

    @NotNull
    @Column(nullable = false, length = 10)
    private String endTime;

    @NotNull
    @Column(nullable = false, length = 50)
    private String hallNumber;

    @NotNull
    @Column(nullable = false)
    private Integer maxMarks;

    @NotNull
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "SCHEDULED"; // SCHEDULED, ONGOING, COMPLETED, CANCELLED

    @Column(length = 500)
    private String instructions;

    @Column(name = "school_id")
    private Long schoolId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
