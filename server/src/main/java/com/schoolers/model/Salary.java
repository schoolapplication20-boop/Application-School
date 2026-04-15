package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "salaries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Salary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "staff_id")
    private Long staffId;

    @Column(name = "staff_name", nullable = false, length = 100)
    private String staffName;

    @Column(length = 20)
    private String role;

    @Column(length = 50)
    private String department;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal basic = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal hra = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal da = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal medical = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal pf = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal tax = BigDecimal.ZERO;

    @Column(length = 20)
    private String month;

    @Column(length = 10)
    private String year;

    // Attendance-based fields
    @Column(name = "total_days_in_month")
    @Builder.Default
    private Integer totalDaysInMonth = 0;

    @Column(name = "total_working_days")
    @Builder.Default
    private Integer totalWorkingDays = 0;

    @Column(name = "leaves_taken")
    @Builder.Default
    private Integer leavesTaken = 0;

    @Column(name = "worked_days")
    @Builder.Default
    private Integer workedDays = 0;

    @Column(name = "per_day_salary", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal perDaySalary = BigDecimal.ZERO;

    @Column(name = "calculated_salary", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal calculatedSalary = BigDecimal.ZERO;

    @Column(name = "paid_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    @Column(name = "paid_date")
    private LocalDate paidDate;

    /** Multi-tenancy: which school this salary record belongs to. */
    @Column(name = "school_id")
    private Long schoolId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Transient
    public BigDecimal getGross() {
        BigDecimal b = basic != null ? basic : BigDecimal.ZERO;
        BigDecimal h = hra != null ? hra : BigDecimal.ZERO;
        BigDecimal d = da != null ? da : BigDecimal.ZERO;
        BigDecimal m = medical != null ? medical : BigDecimal.ZERO;
        return b.add(h).add(d).add(m);
    }

    @Transient
    public BigDecimal getDueAmount() {
        BigDecimal calc = calculatedSalary != null ? calculatedSalary : BigDecimal.ZERO;
        BigDecimal paid = paidAmount != null ? paidAmount : BigDecimal.ZERO;
        return calc.subtract(paid).max(BigDecimal.ZERO);
    }

    public enum Status {
        PAID, PENDING, PROCESSING
    }
}
