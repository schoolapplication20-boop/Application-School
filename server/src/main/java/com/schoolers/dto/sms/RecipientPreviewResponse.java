package com.schoolers.dto.sms;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Response for {@code GET /api/sms/recipients/preview} — recipient count plus a small sample for the compose UI. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecipientPreviewResponse {

    private int totalCount;
    private List<Sample> sample;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Sample {
        private Long studentId;
        private String name;
        private String phone;
    }
}
