package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "transport_stops")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransportStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "route_id")
    private Long routeId;

    @Column(name = "route_name", length = 50)
    private String routeName;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 20)
    private String timing;

    @Column(name = "stop_order")
    @Builder.Default
    private Integer stopOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
