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
@Table(
    name = "teachers",
    uniqueConstraints = @jakarta.persistence.UniqueConstraint(
        name = "unique_school_emp",
        columnNames = {"school_id", "employee_id"}
    )
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Teacher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    private User user;

    @Column(name = "name", length = 100)
    private String name;

    @Column(name = "employee_id", length = 20)
    private String employeeId;

    @Column(columnDefinition = "TEXT")
    private String subject;

    @Column(length = 50)
    private String department;

    @Column(columnDefinition = "TEXT")
    private String classes;

    @Column(length = 100)
    private String qualification;

    @Column(length = 30)
    private String experience;

    @Column(name = "joining_date")
    private LocalDate joiningDate;

    /** CLASS_TEACHER or SUBJECT_TEACHER */
    @Column(name = "teacher_type", length = 20)
    private String teacherType;

    /** ID of the classroom this teacher is the primary class teacher for */
    @Column(name = "primary_class_id")
    private Long primaryClassId;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    /** Multi-tenancy: which school this teacher belongs to. */
    @Column(name = "school_id")
    private Long schoolId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
