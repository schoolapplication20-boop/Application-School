package com.schoolers.dto.whatsapp;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/** Response for {@code GET /api/whatsapp/stats} — admin dashboard summary. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppStatsResponse {

    private long sentToday;
    private long sentThisMonth;
    private long deliveredThisMonth;
    private long failedThisMonth;
    private long pendingInQueue;

    /** Counts by {@code WhatsAppLogStatus} name, all-time. */
    private Map<String, Long> statusBreakdown;

    private List<WhatsAppCampaignResponse> recentCampaigns;

    private boolean providerConfigured;

    /** Owner-set monthly quota (null = no quota set); report-only, sending is never blocked on breach. */
    private Integer quota;
    private boolean quotaBreached;
}
