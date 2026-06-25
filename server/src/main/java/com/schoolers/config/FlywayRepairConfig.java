package com.schoolers.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Runs {@code flyway.repair()} before every migration pass.
 *
 * Repair removes any rows marked as FAILED in flyway_schema_history so they
 * can be retried. This is safe because:
 *  - Repair never touches the database schema itself.
 *  - A successfully applied migration is never re-run (its checksum matches).
 *  - Only a previously-FAILED migration (e.g. V9 with the now-fixed bad SQL)
 *    is retried, which is exactly what we want.
 */
@Configuration
public class FlywayRepairConfig {

    private static final Logger log = LoggerFactory.getLogger(FlywayRepairConfig.class);

    @Bean
    public FlywayMigrationStrategy repairThenMigrate() {
        return flyway -> {
            log.info("[Flyway] Running repair before migration to clear any previously-failed migrations...");
            flyway.repair();
            flyway.migrate();
        };
    }
}
