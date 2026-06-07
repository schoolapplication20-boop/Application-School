package com.schoolers.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "parent_teacher_appointments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParentTeacherAppointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(name = "teacher_name", length = 100)
    private String teacherName;

    @NotNull
    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "student_name", length = 100)
    private String studentName;

    @Column(name = "parent_name", length = 100)
    private String parentName;

    @Column(name = "school_id")
    private Long schoolId;

    /** Who initiated — "STUDENT" (on behalf of parent) or "TEACHER". */
    @NotNull
    @Column(name = "requested_by", nullable = false, length = 10)
    private String requestedBy;

    @Column(columnDefinition = "TEXT")
    private String topic;

    @Column(name = "proposed_date")
    private LocalDate proposedDate;

    @Column(name = "proposed_time", length = 10)
    private String proposedTime;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    /** Teacher's note when accepting or rejecting a request. */
    @Column(name = "teacher_note", columnDefinition = "TEXT")
    private String teacherNote;

    /** Student/parent's note submitted with the request. */
    @Column(name = "student_note", columnDefinition = "TEXT")
    private String studentNote;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Status {
        PENDING, ACCEPTED, REJECTED, CANCELLED
    }
}
