package com.schoolers.service.sms;

import com.schoolers.model.sms.TargetType;

import java.time.LocalDate;
import java.util.List;

/**
 * Describes which recipients an SMS campaign targets. Fields not relevant to the
 * given {@link TargetType} are ignored (e.g. {@code className}/{@code section} for {@code SCHOOL}).
 */
public record TargetSelection(
        TargetType targetType,
        String className,
        String section,
        List<Long> studentIds,
        List<String> customPhones,
        /** Attendance date for {@code ABSENTEES}; defaults to today if null. */
        LocalDate date
) {
}
