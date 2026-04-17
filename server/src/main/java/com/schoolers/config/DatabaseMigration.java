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

        // ── Classrooms: fix multi-tenant unique constraint ─────────────────────
        // Old schema had UNIQUE(class_name, section) without school_id, which
        // prevents the same class/section from existing in two different schools.
        // Drop any such constraint and ensure the correct school-scoped one exists.
        exec("ALTER TABLE classrooms DROP CONSTRAINT IF EXISTS uq_classrooms_name_section");
        exec("ALTER TABLE classrooms DROP CONSTRAINT IF EXISTS classrooms_class_name_section_key");
        exec("ALTER TABLE classrooms DROP CONSTRAINT IF EXISTS classrooms_name_section_key");
        // Add the school-scoped constraint (IF NOT EXISTS via a DO block)
        execRaw(
            "DO $$ BEGIN " +
            "  IF NOT EXISTS (" +
            "    SELECT 1 FROM pg_constraint WHERE conname = 'uq_classrooms_name_section_school'" +
            "  ) THEN " +
            "    ALTER TABLE classrooms ADD CONSTRAINT uq_classrooms_name_section_school " +
            "      UNIQUE (class_name, section, school_id); " +
            "  END IF; " +
            "END $$"
        );
        System.out.println("[DatabaseMigration] Classrooms unique constraint patched.");

        // ── class_fee_structure: fix multi-tenant unique constraint ───────────────
        // Old constraint was (class_name, academic_year) without school_id, blocking
        // multiple schools from having a fee structure for the same class/year.
        exec("ALTER TABLE class_fee_structure ADD COLUMN IF NOT EXISTS school_id BIGINT");
        // Drop the new school-scoped constraint first (will be re-added below)
        exec("ALTER TABLE class_fee_structure DROP CONSTRAINT IF EXISTS uq_class_fee_name_year_school");
        // Drop all possible names for the OLD (class_name, academic_year) only constraint
        exec("ALTER TABLE class_fee_structure DROP CONSTRAINT IF EXISTS class_fee_structure_class_name_academic_year_key");
        exec("ALTER TABLE class_fee_structure DROP CONSTRAINT IF EXISTS uq_class_fee_name_year");
        exec("ALTER TABLE class_fee_structure DROP CONSTRAINT IF EXISTS class_fee_class_name_year_key");
        // Dynamically drop ANY remaining unique constraints that do NOT involve school_id
        execRaw(
            "DO $$ " +
            "DECLARE rec RECORD; " +
            "BEGIN " +
            "  FOR rec IN " +
            "    SELECT con.conname " +
            "    FROM pg_constraint con " +
            "    JOIN pg_class rel ON rel.oid = con.conrelid " +
            "    WHERE rel.relname = 'class_fee_structure' " +
            "      AND con.contype = 'u' " +
            "      AND con.conname != 'uq_class_fee_name_year_school' " +
            "      AND NOT EXISTS (" +
            "        SELECT 1 FROM pg_attribute att " +
            "        WHERE att.attrelid = con.conrelid " +
            "          AND att.attnum = ANY(con.conkey) " +
            "          AND att.attname = 'school_id'" +
            "      ) " +
            "  LOOP " +
            "    EXECUTE 'ALTER TABLE class_fee_structure DROP CONSTRAINT IF EXISTS \"' || rec.conname || '\"'; " +
            "  END LOOP; " +
            "END $$"
        );
        // Now add the correct school-scoped unique constraint
        execRaw(
            "DO $$ BEGIN " +
            "  IF NOT EXISTS (" +
            "    SELECT 1 FROM pg_constraint WHERE conname = 'uq_class_fee_name_year_school'" +
            "  ) THEN " +
            "    ALTER TABLE class_fee_structure ADD CONSTRAINT uq_class_fee_name_year_school " +
            "      UNIQUE (class_name, academic_year, school_id); " +
            "  END IF; " +
            "END $$"
        );
        System.out.println("[DatabaseMigration] class_fee_structure unique constraint patched.");

        // ── fee_installments: ensure table exists with required columns ─────────
        // Hibernate ddl-auto=update will create the table, but we add the index
        // manually in case the table was created before the @Index annotation existed.
        exec("CREATE INDEX IF NOT EXISTS idx_fee_installments_assignment_id ON fee_installments(assignment_id)");
        System.out.println("[DatabaseMigration] fee_installments index ensured.");

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

        // ── teachers: drop old global unique(employee_id) constraint ─────────────
        // The old schema had UNIQUE(employee_id) without school_id, which blocks
        // the same employee ID from being used in two different schools.
        // The correct constraint is unique_school_emp = UNIQUE(school_id, employee_id).
        exec("ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_employee_id_key");
        exec("ALTER TABLE teachers DROP CONSTRAINT IF EXISTS uq_teachers_employee_id");
        // Dynamically drop any remaining unique constraints that include employee_id but NOT school_id
        execRaw(
            "DO $$ DECLARE rec RECORD; BEGIN " +
            "  FOR rec IN " +
            "    SELECT con.conname FROM pg_constraint con " +
            "    JOIN pg_class rel ON rel.oid = con.conrelid " +
            "    WHERE rel.relname = 'teachers' AND con.contype = 'u' " +
            "      AND con.conname != 'unique_school_emp' " +
            "      AND NOT EXISTS (" +
            "        SELECT 1 FROM pg_attribute att " +
            "        WHERE att.attrelid = con.conrelid " +
            "          AND att.attnum = ANY(con.conkey) " +
            "          AND att.attname = 'school_id'" +
            "      ) " +
            "      AND EXISTS (" +
            "        SELECT 1 FROM pg_attribute att " +
            "        WHERE att.attrelid = con.conrelid " +
            "          AND att.attnum = ANY(con.conkey) " +
            "          AND att.attname = 'employee_id'" +
            "      ) " +
            "  LOOP " +
            "    EXECUTE 'ALTER TABLE teachers DROP CONSTRAINT IF EXISTS \"' || rec.conname || '\"'; " +
            "  END LOOP; " +
            "END $$"
        );
        System.out.println("[DatabaseMigration] teachers employee_id constraint patched.");

        // ── teachers: ensure primary_class_id and teacher_type columns exist ──────
        // Hibernate ddl-auto=update may not have added these on older deployments.
        exec("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS primary_class_id BIGINT");
        exec("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS teacher_type VARCHAR(20) DEFAULT 'SUBJECT_TEACHER'");
        System.out.println("[DatabaseMigration] teachers primary_class_id and teacher_type columns ensured.");

        System.out.println("[DatabaseMigration] Done.");
    }

    private void exec(String sql) {
        try {
            jdbc.execute(sql);
        } catch (Exception e) {
            System.out.println("[DatabaseMigration] skipped: " + sql.split(" ")[2] + " — " + e.getMessage());
        }
    }

    /** Like exec() but used for multi-statement blocks where split()[2] would be misleading. */
    private void execRaw(String sql) {
        try {
            jdbc.execute(sql);
        } catch (Exception e) {
            System.out.println("[DatabaseMigration] skipped block — " + e.getMessage());
        }
    }
}
