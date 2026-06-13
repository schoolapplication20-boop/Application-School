package com.schoolers.sms;

/** Result of a single {@link SmsProvider#send(String, String)} call. */
public record SmsSendResult(boolean accepted, String providerMessageId, String errorCode, String errorMessage, int segments) {

    public static SmsSendResult success(String providerMessageId, int segments) {
        return new SmsSendResult(true, providerMessageId, null, null, segments);
    }

    public static SmsSendResult failure(String errorCode, String errorMessage) {
        return new SmsSendResult(false, null, errorCode, errorMessage, 0);
    }
}
