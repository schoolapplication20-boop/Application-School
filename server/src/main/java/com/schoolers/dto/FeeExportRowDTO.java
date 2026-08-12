package com.schoolers.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
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
@JsonInclude(JsonInclude.Include.NON_NULL)
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
    /**
     * Single waiver amount in this system — shown as both "Concession" and "Condonation" in the
     * export (see excelExport.js). Left null (and so omitted from the JSON entirely, not just
     * zeroed) when the caller isn't allowed to see it — see AdminService.getFeeExportRows().
     */
    private BigDecimal concessionAmount;
    private String paymentStatus;
    private LocalDate lastPaidDate;
}
