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
@Table(name = "fee_installments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeInstallment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** References StudentFeeAssignment.id */
    @Column(name = "assignment_id", nullable = false)
    private Long assignmentId;

    /** e.g. "Term 1", "Term 2", "Term 3", or any custom label */
    @Column(name = "term_name", nullable = false, length = 50)
    private String termName;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private Status status = Status.PENDING;

    /** Actual amount received when this installment was (partially) paid */
    @Column(name = "paid_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    /** Populated when admin records a cash payment for this installment */
    @Column(name = "paid_date")
    private LocalDate paidDate;

    /**
     * Shortage rolled over from the previous term.
     * effectiveDue = amount + carryOver
     * If parent pays less than effectiveDue, the new shortage rolls to the next term.
     */
    @Column(name = "carry_over", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal carryOver = BigDecimal.ZERO;

    /** Multi-tenancy */
    @Column(name = "school_id")
    private Long schoolId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Total amount actually due for this term (base + any rollover from previous term). */
    @Transient
    public BigDecimal getEffectiveDue() {
        BigDecimal base  = amount    != null ? amount    : BigDecimal.ZERO;
        BigDecimal carry = carryOver != null ? carryOver : BigDecimal.ZERO;
        BigDecimal paid  = paidAmount != null ? paidAmount : BigDecimal.ZERO;
        return base.add(carry).subtract(paid).max(BigDecimal.ZERO);
    }

    public enum Status {
        PENDING, PARTIAL, PAID
    }
}
