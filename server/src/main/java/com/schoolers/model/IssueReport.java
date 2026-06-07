package com.schoolers.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
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

    @NotNull
    @Column(nullable = false, length = 200)
    private String title;

    @NotNull
    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @NotNull
    @Column(nullable = false, length = 50)
    @Builder.Default
    private String category = "BUG"; // BUG | UI_ISSUE | FEATURE_REQUEST | PERFORMANCE | OTHER

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @NotNull
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

    @NotNull
    @Column
    private Long schoolId;

    @Column(length = 200)
    private String schoolName;

    @Column(columnDefinition = "TEXT")
    private String ownerNote; // Owner's internal note/response

    @CreationTimestamp
    @NotNull
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column
    private LocalDateTime updatedAt;

    public enum Priority { LOW, MEDIUM, HIGH, CRITICAL }
    public enum Status { OPEN, IN_PROGRESS, RESOLVED, CLOSED }
}
