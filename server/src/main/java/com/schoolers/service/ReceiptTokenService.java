package com.schoolers.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Generates/validates a self-contained signed token for the no-login receipt view
 * ({@code GET /api/receipts/{feePaymentId}?token=...}), sent as the WhatsApp receipt-link
 * template's button URL. No new secret or DB table — reuses the existing {@code encryption.key}
 * for HMAC-SHA256 signing, with the expiry embedded in the token itself.
 */
@Service
public class ReceiptTokenService {

    private static final long VALIDITY_SECONDS = 90L * 24 * 60 * 60; // 90 days

    private final String hmacKey;

    public ReceiptTokenService(@Value("${encryption.key:my-skoolz-local-dev-key}") String hmacKey) {
        this.hmacKey = hmacKey;
    }

    /** Returns a token valid for {@link #VALIDITY_SECONDS} from now, scoped to {@code feePaymentId}. */
    public String generate(Long feePaymentId) {
        long expiry = Instant.now().getEpochSecond() + VALIDITY_SECONDS;
        String payload = feePaymentId + ":" + expiry;
        String signature = sign(payload);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8)) + "." + signature;
    }

    /** Validates {@code token} against {@code feePaymentId}, checking both signature and expiry. */
    public boolean validate(Long feePaymentId, String token) {
        if (token == null || feePaymentId == null) return false;
        try {
            int dot = token.lastIndexOf('.');
            if (dot < 0) return false;
            String encodedPayload = token.substring(0, dot);
            String signature = token.substring(dot + 1);

            String payload = new String(Base64.getUrlDecoder().decode(encodedPayload), StandardCharsets.UTF_8);
            if (!constantTimeEquals(sign(payload), signature)) return false;

            String[] parts = payload.split(":");
            if (parts.length != 2) return false;
            long tokenFeePaymentId = Long.parseLong(parts[0]);
            long expiry = Long.parseLong(parts[1]);

            return tokenFeePaymentId == feePaymentId && Instant.now().getEpochSecond() <= expiry;
        } catch (Exception e) {
            return false;
        }
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hmacKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sign receipt token", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) result |= a.charAt(i) ^ b.charAt(i);
        return result == 0;
    }
}
