package com.schoolers.dto.sms;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/** Response for {@code GET /api/sms/stats} — admin dashboard summary. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmsStatsResponse {

    private long sentToday;
    private long sentThisMonth;
    private long deliveredThisMonth;
    private long failedThisMonth;
    private long pendingInQueue;

    /** Counts by {@code SmsLogStatus} name, all-time. */
    private Map<String, Long> statusBreakdown;

    private List<SmsCampaignResponse> recentCampaigns;

    private boolean providerConfigured;
    private String providerName;
}
