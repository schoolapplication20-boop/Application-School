package com.schoolers.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Runs once at startup to patch any DB constraints that
 * Hibernate's ddl-auto=update cannot fix on its own.
 * Every statement is wrapped in its own try/catch — safe to run on every restart.
 */
@Component
@Order(1)
public class DatabaseMigration implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        System.out.println("[DatabaseMigration] Running expense table patches...");

        // 1. Drop NOT NULL from legacy columns so INSERT works without them
        exec("ALTER TABLE expenses ALTER COLUMN category    DROP NOT NULL");
        exec("ALTER TABLE expenses ALTER COLUMN type        DROP NOT NULL");
        exec("ALTER TABLE expenses ALTER COLUMN leaves_count DROP NOT NULL");
        exec("ALTER TABLE expenses ALTER COLUMN month       DROP NOT NULL");
        exec("ALTER TABLE expenses ALTER COLUMN staff_name  DROP NOT NULL");
        exec("ALTER TABLE expenses ALTER COLUMN total_days  DROP NOT NULL");
        exec("ALTER TABLE expenses ALTER COLUMN working_days DROP NOT NULL");

        // 2. Add title column if it doesn't exist yet
        exec("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS title VARCHAR(255)");

        // 3. Add status column if it doesn't exist yet (for very old schemas)
        exec("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30)");
        exec("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status VARCHAR(10)");

        // 4. Back-fill any rows that are missing required values
        exec("UPDATE expenses SET title  = COALESCE(description, category, 'Expense') WHERE title  IS NULL OR title = ''");
        exec("UPDATE expenses SET status = 'UNPAID' WHERE status IS NULL OR status NOT IN ('PAID','UNPAID')");

        // 5. Now make title + status NOT NULL (safe after back-fill)
        exec("ALTER TABLE expenses ALTER COLUMN title  SET NOT NULL");
        exec("ALTER TABLE expenses ALTER COLUMN status SET NOT NULL");

        System.out.println("[DatabaseMigration] Done.");
    }

    private void exec(String sql) {
        try {
            jdbc.execute(sql);
        } catch (Exception e) {
            System.out.println("[DatabaseMigration] skipped: " + sql.split(" ")[2] + " — " + e.getMessage());
        }
    }
}
