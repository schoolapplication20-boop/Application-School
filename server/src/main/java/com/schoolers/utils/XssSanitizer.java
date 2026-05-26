package com.schoolers.utils;

import java.util.regex.Pattern;

/**
 * XSS Prevention Utility
 * 
 * Sanitizes user input to prevent Cross-Site Scripting (XSS) attacks
 * by escaping HTML special characters and removing dangerous patterns.
 * 
 * Usage: String cleanInput = XssSanitizer.sanitize(userInput);
 */
public class XssSanitizer {

    // Regex to detect common XSS patterns
    private static final Pattern XSS_PATTERN = Pattern.compile(
        "<script[^>]*>.*?</script>|" +
        "javascript:|" +
        "on\\w+\\s*=|" +
        "<iframe[^>]*>|" +
        "<embed[^>]*>|" +
        "<object[^>]*>|" +
        "<img[^>]*onerror|" +
        "<svg[^>]*onload"
    );

    // HTML entities for escaping
    private static final String[][] HTML_ENTITIES = {
            {"&", "&amp;"},
            {"<", "&lt;"},
            {">", "&gt;"},
            {"\"", "&quot;"},
            {"'", "&#x27;"},
            {"/", "&#x2F;"}
    };

    /**
     * Sanitizes input by:
     * 1. Escaping HTML special characters
     * 2. Removing script tags and event handlers
     * 3. Trimming whitespace
     * 
     * @param input Raw user input
     * @return Sanitized string safe for display
     */
    public static String sanitize(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }

        // Trim whitespace
        String sanitized = input.trim();

        // Check for XSS patterns and remove them
        if (XSS_PATTERN.matcher(sanitized).find()) {
            sanitized = XSS_PATTERN.matcher(sanitized).replaceAll("");
        }

        // Escape HTML special characters
        for (String[] entity : HTML_ENTITIES) {
            sanitized = sanitized.replace(entity[0], entity[1]);
        }

        return sanitized;
    }

    /**
     * Sanitizes while preserving newlines (for text areas)
     * 
     * @param input Raw user input
     * @return Sanitized string with newlines preserved
     */
    public static String sanitizeMultiline(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }

        String sanitized = sanitize(input);

        // Restore line breaks (they were escaped, we need them back)
        sanitized = sanitized.replace("&#x0A;", "\n")
                             .replace("&#x0D;", "\r");

        return sanitized;
    }

    /**
     * Sanitizes HTML content while allowing safe tags (bold, italic, links)
     * For rich text editors
     * 
     * @param input Raw HTML input
     * @return Sanitized HTML with dangerous tags removed
     */
    public static String sanitizeHtml(String input) {
        if (input == null || input.isEmpty()) {
            return input;
        }

        String sanitized = input;

        // Remove script tags completely
        sanitized = sanitized.replaceAll("(?i)<script[^>]*>.*?</script>", "");

        // Remove event handlers (onclick, onload, etc.)
        sanitized = sanitized.replaceAll("(?i)\\s*on\\w+\\s*=", " ");

        // Remove dangerous tags
        String[] dangerousTags = {"iframe", "embed", "object", "applet", "meta", "link", "style"};
        for (String tag : dangerousTags) {
            sanitized = sanitized.replaceAll("(?i)<" + tag + "[^>]*>.*?</" + tag + ">", "");
            sanitized = sanitized.replaceAll("(?i)<" + tag + "[^>]*/?>", "");
        }

        return sanitized;
    }
}
