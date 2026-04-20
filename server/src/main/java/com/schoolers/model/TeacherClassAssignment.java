package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "teacher_class_assignments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherClassAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(name = "teacher_name", length = 100)
    private String teacherName;

    /** e.g. "Nursery A" or "Class 10 - A" — matches the format used in Homework/Diary */
    @Column(name = "class_section", nullable = false, length = 50)
    private String classSection;

    @Column(name = "subject", nullable = false, length = 100)
    private String subject;

    @Column(name = "school_id")
    private Long schoolId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
