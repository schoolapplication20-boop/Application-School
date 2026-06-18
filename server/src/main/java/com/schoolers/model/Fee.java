package com.schoolers.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
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
@Table(name = "fees")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Fee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "student_name", length = 100)
    private String studentName;

    @Column(name = "roll_number", length = 20)
    private String rollNumber;

    @Column(name = "class_name", length = 20)
    private String className;

    @NotNull
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "fee_type", length = 50)
    private String feeType;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    @Column(name = "transaction_id", length = 100)
    private String transactionId;

    @Column(name = "paid_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "receipt_number", length = 50, unique = true)
    private String receiptNumber;

    @Column(name = "received_by", length = 100)
    private String receivedBy;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    /** Multi-tenancy: which school this fee record belongs to. */
    @Column(name = "school_id")
    private Long schoolId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Optimistic lock: prevents two concurrent payments from both applying to a stale read. */
    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    public enum Status {
        PAID, PENDING, OVERDUE, PARTIAL
    }
}
