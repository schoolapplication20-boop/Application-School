package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_fee_assignments",
       uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "academic_year"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentFeeAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "student_name", length = 100)
    private String studentName;

    @Column(name = "roll_number", length = 20)
    private String rollNumber;

    @Column(name = "class_name", length = 30)
    private String className;

    @Column(name = "academic_year", length = 10)
    private String academicYear;

    /** The negotiated/final fee assigned to this specific student */
    @Column(name = "total_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalFee;

    /** Cumulative amount paid across all transactions */
    @Column(name = "paid_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "due_date")
    private LocalDate dueDate;

    /** Optional term-wise installment amounts (for guidance only) */
    @Column(name = "term1_fee", precision = 10, scale = 2)
    private BigDecimal term1Fee;

    @Column(name = "term2_fee", precision = 10, scale = 2)
    private BigDecimal term2Fee;

    @Column(name = "term3_fee", precision = 10, scale = 2)
    private BigDecimal term3Fee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Computed field: totalFee - paidAmount */
    @Transient
    public BigDecimal getDueAmount() {
        BigDecimal paid = paidAmount != null ? paidAmount : BigDecimal.ZERO;
        return totalFee != null ? totalFee.subtract(paid).max(BigDecimal.ZERO) : BigDecimal.ZERO;
    }

    public enum Status {
        PAID, PENDING, OVERDUE, PARTIAL
    }
}
