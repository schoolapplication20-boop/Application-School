package com.schoolers.model.sms;

/** Delivery status of a sent SMS, as recorded in {@link SmsLog} / {@link SmsDeliveryStatus}. */
public enum SmsLogStatus {
    SENT, DELIVERED, FAILED, UNDELIVERED
}
