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
@Table(name = "parent_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    private User user;

    @Column(name = "name", length = 100)
    private String name;

    /** Father / Mother / Guardian */
    @Column(name = "relation", length = 30)
    private String relation;

    @Column(name = "occupation", length = 100)
    private String occupation;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "alternate_mobile", length = 15)
    private String alternateMobile;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
