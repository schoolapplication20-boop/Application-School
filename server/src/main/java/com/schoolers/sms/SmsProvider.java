package com.schoolers.sms;

/**
 * Provider-agnostic SMS sending abstraction. {@code SmsService}/{@code SmsQueueProcessor} depend only
 * on this interface, so swapping the underlying SMS gateway (e.g. for an India-DLT-compliant
 * provider) is an isolated change — implement this interface and select it via {@code sms.provider}.
 */
public interface SmsProvider {

    /** Short identifier stored on {@code sms_logs.provider}, e.g. "twilio". */
    String getProviderName();

    /** Whether the provider has the credentials/config it needs to send. */
    boolean isConfigured();

    /**
     * Sends a single SMS. Must never throw — failures (including "not configured") are
     * reported via {@link SmsSendResult#failure}.
     *
     * @param toPhoneE164 recipient phone number in E.164 format (e.g. "+919876543210")
     * @param message     rendered message body
     */
    SmsSendResult send(String toPhoneE164, String message);
}
