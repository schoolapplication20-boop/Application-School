package com.schoolers.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * Lightweight ping that touches the database with SELECT 1.
     * Called by an external cron (e.g. cron-job.org every 10 min) to prevent:
     *  - Railway free tier cold start (JVM spin-down after inactivity)
     *  - Supabase free tier DB pause (pauses after 7 days without a query)
     * Response is intentionally minimal to keep latency low.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        long start = System.currentTimeMillis();
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return ResponseEntity.ok(Map.of(
                "status", "UP",
                "db",     "OK",
                "ms",     System.currentTimeMillis() - start
            ));
        } catch (Exception e) {
            return ResponseEntity.status(503).body(Map.of(
                "status", "DOWN",
                "db",     "UNREACHABLE",
                "error",  e.getMessage() != null ? e.getMessage() : "unknown"
            ));
        }
    }
}
