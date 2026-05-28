package com.schoolers.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

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
    @Column(name = "min_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal minPercentage;

    /** Lower display order = higher/better grade (shown first). */
    @Column(name = "display_order")
    private Integer displayOrder;
}
