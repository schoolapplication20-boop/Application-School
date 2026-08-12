package com.schoolers.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Full fee-receipt payload for both the just-collected receipt and reprints — see AdminService.getReceiptByNumber(). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptDTO {
    private String receiptNo;
    private LocalDate date;
    private String studentName;
    private String rollNo;
    private String className;
    private String section;
    private BigDecimal totalFee;
    private BigDecimal amountPaid;
    private BigDecimal paidSoFar;
    private BigDecimal dueAmount;
    private String paymentMode;
    private String term;
    private String receivedBy;
    /** True whenever this receipt is being re-fetched after the original collection — drives the "Duplicate Copy / Reprint" watermark. */
    private boolean reprint;
}
