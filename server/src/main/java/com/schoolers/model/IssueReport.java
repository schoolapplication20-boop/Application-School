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
@Table(name = "issue_reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IssueReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String category = "BUG"; // BUG | UI_ISSUE | FEATURE_REQUEST | PERFORMANCE | OTHER

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.OPEN;

    @Column(length = 100)
    private String reporterName;

    @Column(length = 150)
    private String reporterEmail;

    @Column(length = 30)
    private String reporterRole;

    @Column
    private Long schoolId;

    @Column(length = 200)
    private String schoolName;

    @Column(columnDefinition = "TEXT")
    private String ownerNote; // Owner's internal note/response

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column
    private LocalDateTime updatedAt;

    public enum Priority { LOW, MEDIUM, HIGH, CRITICAL }
    public enum Status { OPEN, IN_PROGRESS, RESOLVED, CLOSED }
}
