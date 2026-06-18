package com.schoolers.dto.sms;

import lombok.Data;

@Data
public class SmsProviderSettingsRequest {
    private String authKey;
    private String senderId;
    private String dltTeId;
    private String route;
    private String countryCode;
}
