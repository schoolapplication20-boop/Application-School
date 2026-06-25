package com.schoolers.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "marks_audit_log")
@Data
public class MarksAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "marks_id")
    private Long marksId;

    @Column(name = "action", length = 10)
    private String action;

    @Column(name = "student_id")
    private Long studentId;

    @Column(name = "student_name")
    private String studentName;

    @Column(name = "subject")
    private String subject;

    @Column(name = "exam_type")
    private String examType;

    @Column(name = "old_marks")
    private BigDecimal oldMarks;

    @Column(name = "new_marks")
    private BigDecimal newMarks;

    @Column(name = "old_grade")
    private String oldGrade;

    @Column(name = "new_grade")
    private String newGrade;

    @Column(name = "changed_by")
    private Long changedBy;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    @Column(name = "school_id")
    private Long schoolId;

    @PrePersist
    public void prePersist() {
        changedAt = LocalDateTime.now();
    }
}
