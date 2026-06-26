package com.schoolers.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class BulkImportRequest {
    private List<StudentImportRowDto> rows;
    private boolean skipInvalid = true;

    /**
     * When true, a login account is created for every student row — even those
     * without an email. The login email is auto-generated as
     * {@code {admissionNumber}@my-skoolz.com} and credentials are returned in
     * the response so the admin can distribute them.
     */
    private boolean createAccounts = false;
}
