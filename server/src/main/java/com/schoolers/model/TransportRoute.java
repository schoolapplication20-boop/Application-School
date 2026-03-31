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
@Table(name = "transport_routes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransportRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(length = 100)
    private String area;

    @Column
    @Builder.Default
    private Integer stops = 0;

    @Column(length = 20)
    private String distance;

    @Column(name = "pickup_time", length = 20)
    private String pickupTime;

    @Column(name = "drop_time", length = 20)
    private String dropTime;

    @Column
    @Builder.Default
    private Integer buses = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
