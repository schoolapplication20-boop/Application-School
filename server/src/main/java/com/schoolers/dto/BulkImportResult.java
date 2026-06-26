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

    /**
     * Populated only when {@code createAccounts=true} was set in the request.
     * Contains one entry per successfully created student account so the admin
     * can download or share login credentials.
     */
    @Builder.Default
    private List<StudentCredentialDto> credentials = new java.util.ArrayList<>();
}
