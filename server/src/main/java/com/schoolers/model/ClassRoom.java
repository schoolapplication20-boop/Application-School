package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "classrooms",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_classrooms_name_section_school",
        columnNames = {"class_name", "section", "school_id"}
    )
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "class_name", nullable = false, length = 20)
    private String name;

    @Column(length = 5)
    private String section;

    @Column(name = "teacher_id")
    private Long teacherId;

    @Column(name = "teacher_name", length = 100)
    private String teacherName;

    @Column
    private Integer capacity;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    /** Multi-tenancy: which school this classroom belongs to. */
    @Column(name = "school_id")
    private Long schoolId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
