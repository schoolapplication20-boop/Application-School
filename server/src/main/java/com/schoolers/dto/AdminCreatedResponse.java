package com.schoolers.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminCreatedResponse {
    private Long id;
    private String name;
    private String email;
    private String mobile;
    private String generatedPassword;
    /** School ID linked to this account — set for Super Admin accounts, null for plain admins. */
    private Long schoolId;
}
