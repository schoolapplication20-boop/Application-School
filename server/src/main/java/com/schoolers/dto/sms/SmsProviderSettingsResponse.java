package com.schoolers.dto.sms;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SmsProviderSettingsResponse {
    private String provider;
    private String authKeyMasked;
    private String senderId;
    private String dltTeId;
    private String route;
    private String countryCode;
    private boolean configured;
}
