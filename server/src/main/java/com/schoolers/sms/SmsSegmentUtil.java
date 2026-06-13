package com.schoolers.sms;

import java.util.regex.Pattern;

/**
 * Estimates SMS segment count for providers (e.g. MSG91) that don't report it in their API
 * response. Mirrors the GSM-7 vs UCS-2 heuristic used by the admin compose UI
 * ({@code client/src/pages/admin/sms/constants.js#countSegments}): plain ASCII content packs
 * 160 chars per segment (153 when concatenated across multiple segments), while content with
 * any non-ASCII character (e.g. Hindi/regional scripts) requires UCS-2 at 70/67 chars.
 */
public final class SmsSegmentUtil {

    private static final Pattern NON_ASCII = Pattern.compile("[^\\x00-\\x7F]");

    private SmsSegmentUtil() {}

    public static int countSegments(String message) {
        if (message == null || message.isEmpty()) return 1;
        int len = message.length();
        boolean unicode = NON_ASCII.matcher(message).find();
        if (unicode) {
            return len <= 70 ? 1 : (int) Math.ceil(len / 67.0);
        }
        return len <= 160 ? 1 : (int) Math.ceil(len / 153.0);
    }
}
