package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "fee_payments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fee_id", nullable = false)
    private Long feeId;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "student_name", length = 100)
    private String studentName;

    @Column(name = "roll_number", length = 20)
    private String rollNumber;

    @Column(name = "class_name", length = 20)
    private String className;

    @Column(name = "fee_type", length = 50)
    private String feeType;

    @Column(name = "amount_paid", nullable = false, precision = 10, scale = 2)
    private BigDecimal amountPaid;

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    @Column(name = "payment_mode", nullable = false, length = 20)
    private String paymentMode;

    @Column(name = "receipt_number", nullable = false, length = 50, unique = true)
    private String receiptNumber;

    @Column(name = "received_by", length = 100)
    private String receivedBy;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
