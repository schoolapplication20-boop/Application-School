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
@Table(name = "transport_student_assignments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransportStudentAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "student_name", length = 100)
    private String studentName;

    @Column(name = "bus_id")
    private Long busId;

    @Column(name = "bus_no", length = 20)
    private String busNo;

    @Column(name = "route_id")
    private Long routeId;

    @Column(name = "route_name", length = 50)
    private String routeName;

    @Column(name = "stop_id")
    private Long stopId;

    @Column(name = "stop_name", length = 100)
    private String stopName;

    @Column(name = "fee_paid")
    @Builder.Default
    private Boolean feePaid = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
