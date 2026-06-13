package com.schoolers.dto.sms;

import com.schoolers.model.sms.CampaignStatus;
import com.schoolers.model.sms.SmsCampaign;
import com.schoolers.model.sms.TargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmsCampaignResponse {

    private Long id;
    private String name;
    private Long templateId;
    private String messageContent;
    private TargetType targetType;
    private String targetFilter;
    private Integer totalRecipients;
    private Integer sentCount;
    private Integer deliveredCount;
    private Integer failedCount;
    private Integer pendingCount;
    private CampaignStatus status;
    private LocalDateTime scheduledFor;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    public static SmsCampaignResponse from(SmsCampaign c) {
        return SmsCampaignResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .templateId(c.getTemplateId())
                .messageContent(c.getMessageContent())
                .targetType(c.getTargetType())
                .targetFilter(c.getTargetFilter())
                .totalRecipients(c.getTotalRecipients())
                .sentCount(c.getSentCount())
                .deliveredCount(c.getDeliveredCount())
                .failedCount(c.getFailedCount())
                .pendingCount(c.getPendingCount())
                .status(c.getStatus())
                .scheduledFor(c.getScheduledFor())
                .createdAt(c.getCreatedAt())
                .completedAt(c.getCompletedAt())
                .build();
    }
}
