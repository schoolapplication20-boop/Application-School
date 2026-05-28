package com.schoolers.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "assignment_submissions",
    uniqueConstraints = @UniqueConstraint(columnNames = {"assignment_id", "student_id"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignmentSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "assignment_id", nullable = false)
    private Long assignmentId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "student_name", length = 100)
    private String studentName;

    @Column(name = "class_section", length = 20)
    private String classSection;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 20)
    private String grade;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "school_id")
    private Long schoolId;

    @CreationTimestamp
    @Column(name = "submitted_at", updatable = false)
    private LocalDateTime submittedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
