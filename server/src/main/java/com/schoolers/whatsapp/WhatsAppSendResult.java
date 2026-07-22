package com.schoolers.whatsapp;

/** Result of a single {@link WhatsAppCloudApiClient#sendTemplate} call. */
public record WhatsAppSendResult(boolean accepted, String providerMessageId, String errorCode, String errorMessage) {

    public static WhatsAppSendResult success(String providerMessageId) {
        return new WhatsAppSendResult(true, providerMessageId, null, null);
    }

    public static WhatsAppSendResult failure(String errorCode, String errorMessage) {
        return new WhatsAppSendResult(false, null, errorCode, errorMessage);
    }
}
