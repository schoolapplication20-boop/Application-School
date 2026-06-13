package com.schoolers.model.sms;

/** Who an SMS campaign targets. */
public enum TargetType {
    /** Every active student's parent in the school. */
    SCHOOL,
    /** All active students in a class (every section). */
    CLASS,
    /** All active students in a specific class + section. */
    SECTION,
    /** Specific students chosen by id. */
    STUDENTS,
    /** Students with a pending/overdue/partial fee assignment. */
    FEE_DUE,
    /** Students marked ABSENT on a given date (default today). */
    ABSENTEES,
    /** Raw phone numbers supplied directly by the admin. */
    CUSTOM
}
