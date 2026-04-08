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
@Table(name = "salary_payments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalaryPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "salary_id")
    private Long salaryId;

    @Column(name = "staff_id")
    private Long staffId;

    @Column(name = "staff_name", length = 100)
    private String staffName;

    @Column(name = "amount_paid", nullable = false, precision = 10, scale = 2)
    private BigDecimal amountPaid;

    @Column(name = "paid_date", nullable = false)
    private LocalDate paidDate;

    @Column(name = "payment_mode", length = 30)
    @Builder.Default
    private String paymentMode = "Cash";

    @Column(name = "receipt_number", length = 50)
    private String receiptNumber;

    @Column(length = 255)
    private String remarks;

    @Column(length = 20)
    private String month;

    @Column(length = 10)
    private String year;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
