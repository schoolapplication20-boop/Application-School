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
@Table(name = "transport_drivers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransportDriver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 30)
    private String license;

    @Column(length = 15)
    private String mobile;

    @Column(length = 20)
    private String bus;

    @Column(length = 20)
    private String experience;

    @Column(length = 20)
    @Builder.Default
    private String status = "Active";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
