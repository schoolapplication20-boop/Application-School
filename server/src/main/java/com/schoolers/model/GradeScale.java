package com.schoolers.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "grade_scales")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeScale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "school_id", nullable = false)
    private Long schoolId;

    @Column(nullable = false, length = 10)
    private String grade;

    /** Minimum percentage (inclusive) required to earn this grade. */
    @Column(name = "min_percentage", nullable = false)
    private Double minPercentage;

    /** Lower display order = higher/better grade (shown first). */
    @Column(name = "display_order")
    private Integer displayOrder;
}
