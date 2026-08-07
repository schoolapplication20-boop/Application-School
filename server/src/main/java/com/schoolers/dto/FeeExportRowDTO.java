package com.schoolers.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/** One row of the class/section fee-details Excel export — see AdminService.getFeeExportRows(). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeExportRowDTO {
    private String studentName;
    private String admissionNumber;
    private String rollNumber;
    private String className;
    private String section;
    private String fatherName;
    private String fatherPhone;
    private BigDecimal totalFee;
    private BigDecimal paidAmount;
    private BigDecimal dueAmount;
    /** Single waiver amount in this system — shown as both "Concession" and "Condonation" in the export (see excelExport.js). */
    private BigDecimal concessionAmount;
    private String paymentStatus;
    private LocalDate lastPaidDate;
}
