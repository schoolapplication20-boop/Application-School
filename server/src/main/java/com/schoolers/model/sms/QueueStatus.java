package com.schoolers.model.sms;

/** Lifecycle status of a single {@link SmsQueueItem} row processed by the SMS queue poller. */
public enum QueueStatus {
    PENDING, PROCESSING, SENT, FAILED, CANCELLED
}
