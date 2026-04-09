package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_transport")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentTransport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Student reference
    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "student_name", length = 100)
    private String studentName;

    @Column(name = "student_class", length = 50)
    private String studentClass;

    // Transport requirement
    @Column(name = "transport_needed", nullable = false)
    @Builder.Default
    private Boolean transportNeeded = false;

    // Locations
    @Column(name = "pickup_location", length = 255)
    private String pickupLocation;

    @Column(name = "drop_location", length = 255)
    private String dropLocation;

    // Route reference
    @Column(name = "route_id")
    private Long routeId;

    @Column(name = "route_name", length = 100)
    private String routeName;

    // Stop reference
    @Column(name = "stop_id")
    private Long stopId;

    @Column(name = "stop_name", length = 100)
    private String stopName;

    // Timings
    @Column(name = "pickup_time", length = 20)
    private String pickupTime;

    @Column(name = "drop_time", length = 20)
    private String dropTime;

    // Fee
    @Column(name = "fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal fee = BigDecimal.ZERO;

    // Emergency contact
    @Column(name = "emergency_contact", length = 20)
    private String emergencyContact;

    // Special instructions
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // Record status
    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "Active";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
