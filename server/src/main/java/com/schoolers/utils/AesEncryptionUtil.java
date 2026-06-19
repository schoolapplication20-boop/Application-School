package com.schoolers.utils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM encryption for sensitive fields (SMS auth keys, etc.).
 * Set {@code ENCRYPTION_KEY} env var to a strong secret in production.
 * Falls back to a weak default for local dev — logs a CRITICAL warning.
 */
@Component
public class AesEncryptionUtil {

    private static final Logger log = LoggerFactory.getLogger(AesEncryptionUtil.class);
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LEN = 12;
    private static final int TAG_BITS = 128;
    private static final String DEFAULT_KEY = "my-skoolz-local-dev-key";

    private final byte[] keyBytes;

    public AesEncryptionUtil(@Value("${encryption.key:my-skoolz-local-dev-key}") String encryptionKey) {
        if (encryptionKey == null || encryptionKey.isBlank() || encryptionKey.equals(DEFAULT_KEY)) {
            log.error("*** SECURITY WARNING: ENCRYPTION_KEY environment variable is not set or uses the " +
                      "insecure default value. SMS provider credentials stored in the database are NOT " +
                      "properly protected. Set a strong ENCRYPTION_KEY in your Railway environment variables. ***");
            // Allow startup to continue — throwing here would take the application offline.
            // The default key is still AES-256 so data is encrypted; it is just not secret
            // if an attacker has read access to the source code.
            encryptionKey = DEFAULT_KEY;
        }
        try {
            this.keyBytes = MessageDigest.getInstance("SHA-256")
                    .digest(encryptionKey.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new RuntimeException("AesEncryptionUtil init failed", e);
        }
    }

    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) return null;
        try {
            byte[] iv = new byte[IV_LEN];
            new SecureRandom().nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new GCMParameterSpec(TAG_BITS, iv));
            byte[] enc = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[IV_LEN + enc.length];
            System.arraycopy(iv, 0, combined, 0, IV_LEN);
            System.arraycopy(enc, 0, combined, IV_LEN, enc.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    public String decrypt(String encryptedBase64) {
        if (encryptedBase64 == null || encryptedBase64.isBlank()) return null;
        try {
            byte[] combined = Base64.getDecoder().decode(encryptedBase64);
            byte[] iv = new byte[IV_LEN];
            byte[] ct = new byte[combined.length - IV_LEN];
            System.arraycopy(combined, 0, iv, 0, IV_LEN);
            System.arraycopy(combined, IV_LEN, ct, 0, ct.length);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(ct), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }
}
