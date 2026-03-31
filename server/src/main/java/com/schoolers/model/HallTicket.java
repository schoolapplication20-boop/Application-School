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
@Table(name = "hall_tickets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HallTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_number", nullable = false, unique = true, length = 30)
    private String ticketNumber;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "student_name", nullable = false, length = 100)
    private String studentName;

    @Column(name = "roll_number", nullable = false, length = 20)
    private String rollNumber;

    @Column(name = "class_name", nullable = false, length = 10)
    private String className;

    @Column(length = 5)
    private String section;

    @Column(name = "exam_name", nullable = false, length = 100)
    private String examName;

    @Column(name = "exam_type", nullable = false, length = 20)
    private String examType;

    // JSON array of exam subjects with dates, times, hall number, max marks
    @Column(name = "exam_subjects", columnDefinition = "TEXT")
    private String examSubjects;

    @Column(name = "academic_year", nullable = false, length = 10)
    private String academicYear;

    @Column(name = "photo_url", columnDefinition = "TEXT")
    private String photoUrl;

    @Column(name = "date_of_birth", length = 15)
    private String dateOfBirth;

    @Column(length = 10)
    private String gender;

    @Column(name = "registration_number", length = 30)
    private String registrationNumber;

    @Column(name = "exam_center", length = 150)
    private String examCenter;

    @Column(name = "exam_center_address", columnDefinition = "TEXT")
    private String examCenterAddress;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "generated_by", length = 100)
    private String generatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
