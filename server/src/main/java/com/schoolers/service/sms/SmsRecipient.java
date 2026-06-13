package com.schoolers.service.sms;

/** A resolved SMS recipient: {@code studentId}/{@code name} are null for {@code CUSTOM} phone numbers. */
public record SmsRecipient(Long studentId, String name, String phone) {
}
