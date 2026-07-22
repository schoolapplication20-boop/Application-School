package com.schoolers.model.whatsapp;

/**
 * Who a WhatsApp campaign targets. Deliberately narrower than SMS's {@code TargetType} —
 * Phase 1 excludes class/section/absentee/custom-phone broadcast.
 */
public enum WhatsAppTargetType {
    /** A single recipient (payment confirmation, receipt link). */
    SINGLE,
    /** Specific students chosen by id. */
    STUDENTS,
    /** Students with a pending/overdue/partial fee assignment. */
    FEE_DUE
}
