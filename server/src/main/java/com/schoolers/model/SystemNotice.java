package com.schoolers.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "system_notices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    @Builder.Default
    private String severity = "WARNING"; // INFO | WARNING | CRITICAL

    @Column
    private LocalDateTime scheduledAt;

    @Column
    private Integer durationMinutes;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column
    private LocalDateTime updatedAt;

    @PreUpdate
    void onUpdate() { this.updatedAt = LocalDateTime.now(); }
}
