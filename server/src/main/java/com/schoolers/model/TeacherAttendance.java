package com.schoolers.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "teacher_attendance",
        uniqueConstraints = @UniqueConstraint(columnNames = {"teacher_id", "date", "school_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(name = "teacher_name")
    private String teacherName;

    @Column(name = "school_id")
    private Long schoolId;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Status status;

    @Column(length = 255)
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum Status {
        PRESENT, ABSENT, LEAVE
    }
}
