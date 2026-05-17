package com.schoolers.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BulkImportResult {
    private int totalRows;
    private int importedRows;
    private int failedRows;
    private int duplicateRows;
    private List<FailedRowDto> failedRowDetails;
    private Long importLogId;
    private String status;
}
