package com.schoolers.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "school_diary_config")
@Data
public class SchoolDiaryConfig {

    @Id
    @Column(name = "school_id")
    private Long schoolId;

    // COORDINATOR, CLASS_TEACHER, SUBJECT_TEACHER, HYBRID
    @Column(name = "diary_mode", length = 20, nullable = false)
    private String diaryMode = "SUBJECT_TEACHER";

    @Column(name = "coordinator_user_id")
    private Long coordinatorUserId;

    @Column(name = "requires_approval", nullable = false)
    private Boolean requiresApproval = false;

    @Column(name = "notify_students_push", nullable = false)
    private Boolean notifyStudentsPush = true;

    @Column(name = "notify_parents_whatsapp", nullable = false)
    private Boolean notifyParentsWhatsapp = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist public void prePersist() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }
    @PreUpdate  public void preUpdate()  { updatedAt = LocalDateTime.now(); }
}
