package com.schoolers.sms;

import java.util.regex.Pattern;

/** Normalizes raw phone numbers (as stored on {@code Student}) to E.164 for the SMS provider. */
public final class PhoneUtil {

    private static final Pattern E164 = Pattern.compile("^\\+[1-9]\\d{6,14}$");

    private PhoneUtil() {}

    /**
     * Normalizes {@code rawPhone} to E.164.
     *
     * <p>Accepts a 10-digit local number (prefixed with {@code defaultCountryCode}), a number
     * already prefixed with the country code (with or without a leading {@code +}), or a
     * number already in E.164 form. Returns {@code null} for anything else (invalid input,
     * skipped by the caller and logged).
     *
     * @param defaultCountryCode e.g. {@code "+91"}
     */
    public static String normalize(String rawPhone, String defaultCountryCode) {
        if (rawPhone == null || rawPhone.isBlank()) return null;

        String digits = rawPhone.trim().replaceAll("[^+\\d]", "");
        if (digits.isEmpty()) return null;

        if (digits.startsWith("+")) {
            return E164.matcher(digits).matches() ? digits : null;
        }

        digits = digits.replaceFirst("^0+", "");
        if (digits.isEmpty()) return null;

        String cc = defaultCountryCode.replace("+", "");
        String candidate;
        if (digits.length() == 10) {
            candidate = "+" + cc + digits;
        } else if (digits.length() == 10 + cc.length() && digits.startsWith(cc)) {
            candidate = "+" + digits;
        } else {
            return null;
        }

        return E164.matcher(candidate).matches() ? candidate : null;
    }

    /** Masks all but the last 4 digits, for safe logging. */
    public static String mask(String phone) {
        if (phone == null || phone.length() <= 4) return "****";
        return "*".repeat(phone.length() - 4) + phone.substring(phone.length() - 4);
    }
}
