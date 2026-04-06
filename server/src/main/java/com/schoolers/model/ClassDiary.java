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
@Table(name = "class_diary")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassDiary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "class_name", nullable = false, length = 20)
    private String className;

    @Column(length = 10)
    private String section;

    @Column(length = 100)
    private String subject;

    @Column(name = "teacher_id", nullable = false)
    private Long teacherId;

    @Column(name = "teacher_name", length = 100)
    private String teacherName;

    @Column(name = "diary_date", nullable = false)
    private LocalDate diaryDate;

    @Column(name = "image_url", columnDefinition = "TEXT", nullable = false)
    private String imageUrl;

    @Column(name = "image_name", length = 255)
    private String imageName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", length = 20)
    @Builder.Default
    private ReviewStatus reviewStatus = ReviewStatus.PENDING;

    @Column(name = "admin_comment", columnDefinition = "TEXT")
    private String adminComment;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum ReviewStatus {
        PENDING, APPROVED, REJECTED
    }
}
