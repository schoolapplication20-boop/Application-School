package com.schoolers.dto.whatsapp;

import com.schoolers.model.sms.CampaignStatus;
import com.schoolers.model.whatsapp.WhatsAppCampaign;
import com.schoolers.model.whatsapp.WhatsAppTargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppCampaignResponse {

    private Long id;
    private String name;
    private Long templateId;
    private WhatsAppTargetType targetType;
    private String targetFilter;
    private Integer totalRecipients;
    private Integer sentCount;
    private Integer deliveredCount;
    private Integer failedCount;
    private Integer pendingCount;
    private CampaignStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    public static WhatsAppCampaignResponse from(WhatsAppCampaign c) {
        return WhatsAppCampaignResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .templateId(c.getTemplateId())
                .targetType(c.getTargetType())
                .targetFilter(c.getTargetFilter())
                .totalRecipients(c.getTotalRecipients())
                .sentCount(c.getSentCount())
                .deliveredCount(c.getDeliveredCount())
                .failedCount(c.getFailedCount())
                .pendingCount(c.getPendingCount())
                .status(c.getStatus())
                .createdAt(c.getCreatedAt())
                .completedAt(c.getCompletedAt())
                .build();
    }
}
