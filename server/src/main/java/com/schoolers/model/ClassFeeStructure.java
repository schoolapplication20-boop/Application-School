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
@Table(name = "class_fee_structure",
       uniqueConstraints = @UniqueConstraint(name = "uq_class_fee_name_year_school", columnNames = {"class_name", "academic_year", "school_id"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassFeeStructure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "class_name", nullable = false, length = 30)
    private String className;

    @Column(name = "academic_year", length = 10)
    private String academicYear;

    @Column(name = "school_id")
    private Long schoolId;

    @Column(name = "tuition_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal tuitionFee = BigDecimal.ZERO;

    @Column(name = "transport_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal transportFee = BigDecimal.ZERO;

    @Column(name = "lab_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal labFee = BigDecimal.ZERO;

    @Column(name = "exam_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal examFee = BigDecimal.ZERO;

    @Column(name = "sports_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal sportsFee = BigDecimal.ZERO;

    @Column(name = "other_fee", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal otherFee = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public BigDecimal getTotalFee() {
        BigDecimal total = BigDecimal.ZERO;
        if (tuitionFee  != null) total = total.add(tuitionFee);
        if (transportFee!= null) total = total.add(transportFee);
        if (labFee      != null) total = total.add(labFee);
        if (examFee     != null) total = total.add(examFee);
        if (sportsFee   != null) total = total.add(sportsFee);
        if (otherFee    != null) total = total.add(otherFee);
        return total;
    }
}
