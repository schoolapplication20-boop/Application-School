package com.schoolers.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "school_features")
@Data
public class SchoolFeature {

    @EmbeddedId
    private SchoolFeatureId id;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled = false;

    @Column(name = "enabled_by")
    private Long enabledBy;

    @Column(name = "enabled_at")
    private LocalDateTime enabledAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "notes")
    private String notes;
}
