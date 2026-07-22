package com.schoolers.dto.whatsapp;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WhatsAppConfigurationResponse {
    private String phoneNumberId;
    private String accessTokenMasked;
    private String displayPhoneNumber;
    private boolean configured;
}
