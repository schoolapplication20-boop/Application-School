package com.schoolers.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class BulkImportRequest {
    private List<StudentImportRowDto> rows;
    private boolean skipInvalid = true;
}
