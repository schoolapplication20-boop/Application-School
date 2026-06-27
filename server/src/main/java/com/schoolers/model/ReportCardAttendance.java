package com.schoolers.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "report_card_attendance")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportCardAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    @Column(name = "class_name", nullable = false, length = 100)
    private String className;

    @Column(name = "section", length = 20)
    private String section;

    @Column(name = "exam_type", nullable = false, length = 50)
    private String examType;

    @Column(name = "academic_year", length = 20)
    private String academicYear;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "total_working_days", nullable = false)
    private Integer totalWorkingDays;

    @Column(name = "present_days", nullable = false)
    private Integer presentDays;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist public void prePersist() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }
    @PreUpdate  public void preUpdate()  { updatedAt = LocalDateTime.now(); }
}
