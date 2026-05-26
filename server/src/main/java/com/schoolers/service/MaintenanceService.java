package com.schoolers.service;

import com.schoolers.config.RateLimitingInterceptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Scheduled housekeeping tasks:
 * - Purge stale rate-limit buckets (every 30 min) to prevent memory leaks
 * - Purge idempotency keys older than 24 h (every hour)
 * - Purge audit logs older than 2 years (daily)
 * - Warn at startup when critical env vars are missing
 */
@Service
public class MaintenanceService {

    private static final Logger log = LoggerFactory.getLogger(MaintenanceService.class);

    @Autowired private JdbcTemplate jdbc;
    @Autowired private RateLimitingInterceptor rateLimitingInterceptor;

    @Value("${whatsapp.cloud.app.secret:}") private String waAppSecret;
    @Value("${whatsapp.cloud.verify.token:}") private String waVerifyToken;
    @Value("${resend.api.key:}")              private String resendKey;

    // ── Startup validation ────────────────────────────────────────────────────

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        if (waAppSecret == null || waAppSecret.isBlank()) {
            log.warn("⚠ WHATSAPP_APP_SECRET is not set — incoming webhook signature verification is DISABLED.");
        }
        if (waVerifyToken == null || waVerifyToken.isBlank()) {
            log.warn("⚠ WHATSAPP_VERIFY_TOKEN is not set — webhook verification endpoint will reject all Meta calls.");
        }
        if (resendKey == null || resendKey.isBlank()) {
            log.warn("⚠ RESEND_API_KEY is not set — OTP emails will not be delivered.");
        }
    }

    // ── Rate-limit bucket cleanup (every 30 minutes) ──────────────────────────
    // Buckets are per-IP and refill over time. Stale entries for IPs that
    // haven't made a request in >1 hour are safe to evict to prevent unbounded growth.

    @Scheduled(fixedDelay = 30 * 60 * 1000)
    public void cleanStaleRateLimitBuckets() {
        int removed = rateLimitingInterceptor.evictStaleBuckets();
        if (removed > 0) log.info("[Maintenance] Evicted {} stale rate-limit buckets.", removed);
    }

    // ── Idempotency key cleanup (every hour — remove keys older than 24 h) ────

    @Scheduled(fixedDelay = 60 * 60 * 1000)
    public void cleanIdempotencyKeys() {
        try {
            int rows = jdbc.update(
                "DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '24 hours'");
            if (rows > 0) log.info("[Maintenance] Deleted {} expired idempotency keys.", rows);
        } catch (Exception e) {
            log.error("[Maintenance] Failed to clean idempotency keys: {}", e.getMessage());
        }
    }

    // ── Audit log cleanup (daily — remove entries older than 2 years) ─────────

    @Scheduled(cron = "0 0 3 * * *") // 3 AM UTC daily
    public void cleanOldAuditLogs() {
        try {
            int rows = jdbc.update(
                "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years'");
            if (rows > 0) log.info("[Maintenance] Deleted {} audit log entries older than 2 years.", rows);
        } catch (Exception e) {
            log.error("[Maintenance] Failed to clean audit logs: {}", e.getMessage());
        }
    }
}
