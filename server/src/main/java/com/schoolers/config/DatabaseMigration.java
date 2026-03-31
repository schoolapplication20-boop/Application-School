package com.schoolers.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * No-op stub — schema migrations are not needed for BigQuery.
 * All tables were created directly in the BigQuery console.
 */
@Component
@Order(1)
public class DatabaseMigration implements CommandLineRunner {

    @Override
    public void run(String... args) {
        System.out.println("[DatabaseMigration] BigQuery mode — no schema migration needed.");
    }
}
