package com.schoolers.dto.whatsapp;

import lombok.Data;

@Data
public class WhatsAppConfigurationRequest {
    private String phoneNumberId;
    private String accessToken;
    private String displayPhoneNumber;
}
