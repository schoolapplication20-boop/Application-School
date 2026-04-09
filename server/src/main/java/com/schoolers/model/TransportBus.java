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
@Table(name = "transport_buses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransportBus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bus_no", nullable = false, unique = true, length = 20)
    private String busNo;

    @Column(length = 100)
    private String model;

    @Column(length = 10)
    private String year;

    @Column(nullable = false)
    @Builder.Default
    private Integer capacity = 40;

    @Column(name = "current_students")
    @Builder.Default
    private Integer currentStudents = 0;

    @Column(length = 100)
    private String driver;

    @Column(length = 100)
    private String conductor;

    @Column(length = 50)
    private String route;

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
