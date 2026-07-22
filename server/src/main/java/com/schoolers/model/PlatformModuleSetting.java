package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Platform-wide kill switch for an optional module (e.g. "whatsapp"). Opt-out semantics mirroring
 * {@link SchoolFeature}: a missing row means the module is enabled platform-wide.
 */
@Entity
@Table(name = "platform_module_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformModuleSetting {

    @Id
    @Column(name = "module_key", length = 30)
    private String moduleKey;

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
