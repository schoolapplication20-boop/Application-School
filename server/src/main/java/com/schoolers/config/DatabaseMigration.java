package com.schoolers.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(DatabaseMigration.class);

    @Autowired
    private JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        log.info("Running DB constraint migrations...");

        // ── students: drop old global roll-number constraint, ensure school-scoped one ──
        // If the DB was created before school_id was part of the unique key, a constraint
        // like UNIQUE(roll_number, class_name, section) without school_id may still exist.
        // That causes cross-school duplicate errors at the DB level.
        exec("ALTER TABLE students DROP CONSTRAINT IF EXISTS students_roll_number_class_name_section_key");
        exec("ALTER TABLE students DROP CONSTRAINT IF EXISTS uq_roll_class_section");
        // Dynamically drop any remaining unique constraints on students that cover roll_number
        // but do NOT include school_id (catches any auto-generated Hibernate constraint names).
        execRaw(
            "DO $$ DECLARE rec RECORD; BEGIN " +
            "  FOR rec IN " +
            "    SELECT con.conname FROM pg_constraint con " +
            "    JOIN pg_class rel ON rel.oid = con.conrelid " +
            "    WHERE rel.relname = 'students' AND con.contype = 'u' " +
            "      AND con.conname != 'uq_roll_class_section_school' " +
            "      AND EXISTS (" +
            "        SELECT 1 FROM pg_attribute att " +
            "        WHERE att.attrelid = con.conrelid " +
            "          AND att.attnum = ANY(con.conkey) " +
            "          AND att.attname = 'roll_number'" +
            "      ) " +
            "      AND NOT EXISTS (" +
            "        SELECT 1 FROM pg_attribute att " +
            "        WHERE att.attrelid = con.conrelid " +
            "          AND att.attnum = ANY(con.conkey) " +
            "          AND att.attname = 'school_id'" +
            "      ) " +
            "  LOOP " +
            "    EXECUTE 'ALTER TABLE students DROP CONSTRAINT IF EXISTS \"' || rec.conname || '\"'; " +
            "  END LOOP; " +
            "END $$"
        );
        // Ensure the correct school-scoped constraint exists.
        execRaw(
            "DO $$ BEGIN " +
            "  IF NOT EXISTS (" +
            "    SELECT 1 FROM pg_constraint WHERE conname = 'uq_roll_class_section_school'" +
            "  ) THEN " +
            "    ALTER TABLE students ADD CONSTRAINT uq_roll_class_section_school " +
            "      UNIQUE (roll_number, class_name, section, school_id); " +
            "  END IF; " +
            "END $$"
        );
        log.debug("students roll-number constraint patched.");

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
        log.debug("Classrooms unique constraint patched.");

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
        log.debug("class_fee_structure unique constraint patched.");

        // ── fee_installments: ensure table exists with required columns ─────────
        // Hibernate ddl-auto=update will create the table, but we add the index
        // manually in case the table was created before the @Index annotation existed.
        exec("CREATE INDEX IF NOT EXISTS idx_fee_installments_assignment_id ON fee_installments(assignment_id)");
        log.debug("fee_installments index ensured.");

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
        log.debug("teachers employee_id constraint patched.");

        // ── teachers: ensure primary_class_id and teacher_type columns exist ──────
        // Hibernate ddl-auto=update may not have added these on older deployments.
        exec("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS primary_class_id BIGINT");
        exec("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS teacher_type VARCHAR(20) DEFAULT 'SUBJECT_TEACHER'");
        log.debug("teachers primary_class_id and teacher_type columns ensured.");

        // ── messages: add broadcast columns ───────────────────────────────────────
        exec("ALTER TABLE messages ADD COLUMN IF NOT EXISTS title VARCHAR(200)");
        exec("ALTER TABLE messages ADD COLUMN IF NOT EXISTS category VARCHAR(30) DEFAULT 'GENERAL'");
        exec("ALTER TABLE messages ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("ALTER TABLE messages ADD COLUMN IF NOT EXISTS class_section VARCHAR(20)");
        exec("ALTER TABLE messages ADD COLUMN IF NOT EXISTS target_student_id BIGINT");
        exec("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_school_wide BOOLEAN DEFAULT FALSE");
        exec("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT FALSE");
        exec("ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by_user_ids TEXT DEFAULT ''");
        log.debug("messages broadcast columns ensured.");

        // ── teacher_class_assignments: junction table for teacher→class→subject ──
        exec("CREATE TABLE IF NOT EXISTS teacher_class_assignments (" +
             "id BIGSERIAL PRIMARY KEY, " +
             "teacher_id BIGINT NOT NULL, " +
             "teacher_name VARCHAR(100), " +
             "class_section VARCHAR(50) NOT NULL, " +
             "subject VARCHAR(100) NOT NULL, " +
             "school_id BIGINT, " +
             "created_at TIMESTAMP DEFAULT NOW()" +
             ")");
        exec("CREATE INDEX IF NOT EXISTS idx_tca_teacher_id ON teacher_class_assignments(teacher_id)");
        exec("CREATE INDEX IF NOT EXISTS idx_tca_school_id  ON teacher_class_assignments(school_id)");
        log.debug("teacher_class_assignments table ensured.");

        // ── Widen subject columns to TEXT (was VARCHAR) for multi-subject support ──
        exec("ALTER TABLE teachers ALTER COLUMN subject TYPE TEXT");
        exec("ALTER TABLE teacher_class_assignments ALTER COLUMN subject TYPE TEXT");
        log.debug("subject columns widened to TEXT.");

        // ── leave_requests: ensure school_id column and indexes exist ─────────
        exec("ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("CREATE INDEX IF NOT EXISTS idx_leave_requests_school_id ON leave_requests(school_id)");
        exec("CREATE INDEX IF NOT EXISTS idx_leave_requests_requester ON leave_requests(requester_id, requester_type)");
        log.debug("leave_requests school_id column and indexes ensured.");

        // ── exam_schedules: ensure school_id column exists for multi-tenant isolation ──
        exec("ALTER TABLE exam_schedules ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("CREATE INDEX IF NOT EXISTS idx_exam_schedules_school_id ON exam_schedules(school_id)");
        exec("CREATE INDEX IF NOT EXISTS idx_exam_schedules_class_school ON exam_schedules(class_name, school_id)");
        log.debug("exam_schedules school_id column and indexes ensured.");

        // ── assignments: add school_id for tenant isolation ───────────────────────
        exec("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("CREATE INDEX IF NOT EXISTS idx_assignments_school_id ON assignments(school_id)");
        log.debug("assignments school_id ensured.");

        // ── admission_applications: add school_id ─────────────────────────────────
        exec("ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("CREATE INDEX IF NOT EXISTS idx_admission_applications_school_id ON admission_applications(school_id)");
        log.debug("admission_applications school_id ensured.");

        // ── certificates: add school_id ───────────────────────────────────────────
        exec("ALTER TABLE certificates ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("CREATE INDEX IF NOT EXISTS idx_certificates_school_id ON certificates(school_id)");
        log.debug("certificates school_id ensured.");

        // ── hall_tickets: add school_id ───────────────────────────────────────────
        exec("ALTER TABLE hall_tickets ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("CREATE INDEX IF NOT EXISTS idx_hall_tickets_school_id ON hall_tickets(school_id)");
        log.debug("hall_tickets school_id ensured.");

        // ── holidays: add school_id ───────────────────────────────────────────────
        exec("ALTER TABLE holidays ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("CREATE INDEX IF NOT EXISTS idx_holidays_school_id ON holidays(school_id)");
        log.debug("holidays school_id ensured.");

        // ── student_fee_assignments: add school_id, fix unique constraint ─────────
        exec("ALTER TABLE student_fee_assignments ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("ALTER TABLE student_fee_assignments DROP CONSTRAINT IF EXISTS student_fee_assignments_student_id_academic_year_key");
        exec("ALTER TABLE student_fee_assignments DROP CONSTRAINT IF EXISTS uq_student_fee_school");
        execRaw(
            "DO $$ BEGIN " +
            "  IF NOT EXISTS (" +
            "    SELECT 1 FROM pg_constraint WHERE conname = 'uq_student_fee_school'" +
            "  ) THEN " +
            "    ALTER TABLE student_fee_assignments ADD CONSTRAINT uq_student_fee_school " +
            "      UNIQUE (student_id, academic_year, school_id); " +
            "  END IF; " +
            "END $$"
        );
        exec("CREATE INDEX IF NOT EXISTS idx_student_fee_assignments_school_id ON student_fee_assignments(school_id)");
        log.debug("student_fee_assignments school_id and constraint ensured.");

        // ── student_transport: add school_id ──────────────────────────────────────
        exec("ALTER TABLE student_transport ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("CREATE INDEX IF NOT EXISTS idx_student_transport_school_id ON student_transport(school_id)");
        log.debug("student_transport school_id ensured.");

        // ── transport_buses: add school_id, relax global unique(bus_no) ──────────
        exec("ALTER TABLE transport_buses ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("ALTER TABLE transport_buses DROP CONSTRAINT IF EXISTS transport_buses_bus_no_key");
        exec("CREATE INDEX IF NOT EXISTS idx_transport_buses_school_id ON transport_buses(school_id)");
        execRaw(
            "DO $$ BEGIN " +
            "  IF NOT EXISTS (" +
            "    SELECT 1 FROM pg_constraint WHERE conname = 'uq_transport_buses_bus_no_school'" +
            "  ) THEN " +
            "    ALTER TABLE transport_buses ADD CONSTRAINT uq_transport_buses_bus_no_school " +
            "      UNIQUE (bus_no, school_id); " +
            "  END IF; " +
            "END $$"
        );
        log.debug("transport_buses school_id ensured.");

        // ── transport_routes, drivers, stops, fees, student_assignments ───────────
        exec("ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("CREATE INDEX IF NOT EXISTS idx_transport_routes_school_id ON transport_routes(school_id)");

        exec("ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS route_number VARCHAR(20)");
        exec("ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS bus_id BIGINT");
        exec("ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS bus_no VARCHAR(20)");
        exec("ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS driver_id BIGINT");
        exec("ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100)");
        exec("ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0");
        exec("ALTER TABLE transport_routes ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active'");
        log.debug("transport_routes extra fields ensured.");

        exec("ALTER TABLE transport_drivers ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("CREATE INDEX IF NOT EXISTS idx_transport_drivers_school_id ON transport_drivers(school_id)");

        exec("ALTER TABLE transport_stops ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("CREATE INDEX IF NOT EXISTS idx_transport_stops_school_id ON transport_stops(school_id)");

        exec("ALTER TABLE transport_fees ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("CREATE INDEX IF NOT EXISTS idx_transport_fees_school_id ON transport_fees(school_id)");

        exec("ALTER TABLE transport_student_assignments ADD COLUMN IF NOT EXISTS school_id BIGINT");
        exec("CREATE INDEX IF NOT EXISTS idx_transport_student_assignments_school_id ON transport_student_assignments(school_id)");

        exec("ALTER TABLE transport_student_assignments ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(200)");
        exec("ALTER TABLE transport_student_assignments ADD COLUMN IF NOT EXISTS drop_location VARCHAR(200)");
        exec("ALTER TABLE transport_student_assignments ADD COLUMN IF NOT EXISTS pickup_time VARCHAR(20)");
        exec("ALTER TABLE transport_student_assignments ADD COLUMN IF NOT EXISTS drop_time VARCHAR(20)");
        exec("ALTER TABLE transport_student_assignments ADD COLUMN IF NOT EXISTS transport_fee NUMERIC(10,2)");
        log.debug("transport tables school_id ensured.");

        // ── schools: rename school_number → school_id (or add school_id if absent) ──
        execRaw(
            "DO $$ BEGIN " +
            "  IF EXISTS (" +
            "    SELECT 1 FROM information_schema.columns " +
            "    WHERE table_name='schools' AND column_name='school_number'" +
            "  ) THEN " +
            "    ALTER TABLE schools RENAME COLUMN school_number TO school_id; " +
            "  END IF; " +
            "END $$"
        );
        exec("ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_id INTEGER");
        // Drop old constraint name if it still exists after rename
        exec("ALTER TABLE schools DROP CONSTRAINT IF EXISTS uq_schools_school_number");
        execRaw(
            "DO $$ BEGIN " +
            "  IF NOT EXISTS (" +
            "    SELECT 1 FROM pg_constraint WHERE conname = 'uq_schools_school_id'" +
            "  ) THEN " +
            "    ALTER TABLE schools ADD CONSTRAINT uq_schools_school_id UNIQUE (school_id); " +
            "  END IF; " +
            "END $$"
        );
        log.debug("schools.school_id column ensured.");

        // ── Migrate FK references: replace schools.id with schools.school_id ─────
        // Previously all tables stored the DB auto-generated PK (schools.id) as their
        // school_id FK.  We now use the human-assigned display number (schools.school_id)
        // so that every school_id column in the DB matches what is shown in the UI.
        // This block runs a safe UPDATE for every table.  Rows whose school already has
        // a school_id set will be updated; rows linked to schools without a school_id
        // are left unchanged (they will be corrected once the school is configured).
        String[] fkTables = {
            "users", "students", "teachers", "classrooms", "assignments",
            "attendance", "leave_requests", "fee_payments",
            "student_fee_assignments", "transport_fees", "class_diary",
            "admission_applications", "salaries", "teacher_class_assignments",
            "holidays", "exam_schedules", "certificates", "hall_tickets",
            "student_transport", "transport_buses", "transport_routes",
            "transport_drivers", "transport_stops", "transport_student_assignments",
            "messages", "class_fee_structure"
        };
        for (String table : fkTables) {
            execRaw(
                "DO $$ BEGIN " +
                "  IF EXISTS (" +
                "    SELECT 1 FROM information_schema.columns " +
                "    WHERE table_name='" + table + "' AND column_name='school_id'" +
                "  ) THEN " +
                "    UPDATE " + table + " t " +
                "    SET school_id = s.school_id " +
                "    FROM schools s " +
                "    WHERE t.school_id = s.id " +
                "      AND s.school_id IS NOT NULL " +
                "      AND t.school_id != s.school_id; " +
                "  END IF; " +
                "END $$"
            );
        }
        log.debug("school_id FK migration complete.");

        // ── Widen class_name columns from VARCHAR(10) to VARCHAR(50) ──────────────
        exec("ALTER TABLE students ALTER COLUMN class_name TYPE VARCHAR(50)");
        exec("ALTER TABLE certificates ALTER COLUMN class_name TYPE VARCHAR(50)");
        exec("ALTER TABLE hall_tickets ALTER COLUMN class_name TYPE VARCHAR(50)");
        log.debug("class_name columns widened to VARCHAR(50).");

        // ── users: account lockout columns ────────────────────────────────────────
        exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0");
        exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP");
        log.debug("users lockout columns ensured.");

        // ── audit_logs table ──────────────────────────────────────────────────────
        exec("CREATE TABLE IF NOT EXISTS audit_logs (" +
             "id BIGSERIAL PRIMARY KEY, " +
             "actor_id BIGINT, " +
             "actor_name VARCHAR(100), " +
             "actor_role VARCHAR(30), " +
             "school_id BIGINT, " +
             "action VARCHAR(30) NOT NULL, " +
             "entity_type VARCHAR(60), " +
             "entity_id BIGINT, " +
             "description TEXT, " +
             "old_value TEXT, " +
             "new_value TEXT, " +
             "ip_address VARCHAR(45), " +
             "created_at TIMESTAMP DEFAULT NOW()" +
             ")");
        exec("CREATE INDEX IF NOT EXISTS idx_audit_school_created ON audit_logs(school_id, created_at DESC)");
        exec("CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id)");
        log.debug("audit_logs table ensured.");

        // ── idempotency_keys table ────────────────────────────────────────────────
        exec("CREATE TABLE IF NOT EXISTS idempotency_keys (" +
             "id BIGSERIAL PRIMARY KEY, " +
             "idem_key VARCHAR(64) NOT NULL, " +
             "school_id BIGINT NOT NULL, " +
             "endpoint VARCHAR(120), " +
             "created_at TIMESTAMP DEFAULT NOW()" +
             ")");
        execRaw(
            "DO $$ BEGIN " +
            "  IF NOT EXISTS (" +
            "    SELECT 1 FROM pg_constraint WHERE conname = 'uk_idempotency_key_school'" +
            "  ) THEN " +
            "    ALTER TABLE idempotency_keys ADD CONSTRAINT uk_idempotency_key_school " +
            "      UNIQUE (idem_key, school_id); " +
            "  END IF; " +
            "END $$"
        );
        exec("CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency_keys(created_at)");
        log.debug("idempotency_keys table ensured.");

        // ── revoked_tokens table ──────────────────────────────────────────────
        exec("CREATE TABLE IF NOT EXISTS revoked_tokens (" +
             "id BIGSERIAL PRIMARY KEY, " +
             "token_hash VARCHAR(64) NOT NULL UNIQUE, " +
             "expires_at TIMESTAMP NOT NULL" +
             ")");
        exec("CREATE INDEX IF NOT EXISTS idx_revoked_tokens_hash    ON revoked_tokens(token_hash)");
        exec("CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at)");
        log.debug("revoked_tokens table ensured.");

        // ── users: widen reset_otp from VARCHAR(10) to VARCHAR(64) for hashed OTPs ──
        exec("ALTER TABLE users ALTER COLUMN reset_otp TYPE VARCHAR(64)");
        log.debug("users.reset_otp column widened to VARCHAR(64) for hashed storage.");

        // ── users: unlock ALL currently-locked accounts (one-time recovery) ──────
        // Accounts accumulated stale failed_login_attempts across sessions and got
        // locked before the threshold was raised to 10.  Reset every locked account
        // so admins/super-admins can log in again without using Forgot Password.
        execRaw(
            "UPDATE users SET locked_until = NULL, failed_login_attempts = 0 " +
            "WHERE locked_until IS NOT NULL"
        );
        log.info("Released all locked user accounts (locked_until → NULL).");

        // ── Production performance indexes ───────────────────────────────────────
        // These cover the most common query patterns in production.
        // All are IF NOT EXISTS so safe to re-run on every startup.
        exec("CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email)");
        exec("CREATE INDEX IF NOT EXISTS idx_users_school_role    ON users(school_id, role)");
        exec("CREATE INDEX IF NOT EXISTS idx_students_school      ON students(school_id)");
        exec("CREATE INDEX IF NOT EXISTS idx_students_class       ON students(class_name, section, school_id)");
        exec("CREATE INDEX IF NOT EXISTS idx_attendance_date      ON attendance(date, class_id)");
        exec("CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON attendance(school_id, date)");
        exec("CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id)");
        exec("CREATE INDEX IF NOT EXISTS idx_fee_payments_school  ON fee_payments(school_id, payment_date DESC)");
        exec("CREATE INDEX IF NOT EXISTS idx_leave_requests_class ON leave_requests(class_section, school_id, requester_type)");
        exec("CREATE INDEX IF NOT EXISTS idx_timetable_school     ON timetable(school_id, day)");
        exec("CREATE INDEX IF NOT EXISTS idx_marks_student_school ON marks(student_id, school_id)");
        exec("CREATE INDEX IF NOT EXISTS idx_salary_school_month  ON salaries(school_id, month, year)");
        exec("CREATE INDEX IF NOT EXISTS idx_expenses_school_date ON expenses(school_id, date DESC)");
        exec("CREATE INDEX IF NOT EXISTS idx_messages_school      ON messages(school_id, created_at DESC)");
        exec("CREATE INDEX IF NOT EXISTS idx_notifications_user   ON app_notifications(user_id, created_at DESC, is_read)");
        // ── Login-critical indexes: speed up user lookup and school-scoped queries ──
        exec("CREATE INDEX IF NOT EXISTS idx_users_school_id      ON users(school_id)");
        exec("CREATE INDEX IF NOT EXISTS idx_users_role           ON users(role)");
        exec("CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email)");
        exec("CREATE INDEX IF NOT EXISTS idx_users_username       ON users(username)");
        log.debug("Production performance indexes ensured.");

        log.info("DB migrations complete.");
    }

    private void exec(String sql) {
        try {
            jdbc.execute(sql);
        } catch (Exception e) {
            log.debug("Skipped: {} — {}", sql.split(" ")[2], e.getMessage());
        }
    }

    /** Like exec() but used for multi-statement blocks where split()[2] would be misleading. */
    private void execRaw(String sql) {
        try {
            jdbc.execute(sql);
        } catch (Exception e) {
            log.debug("Skipped block — {}", e.getMessage());
        }
    }
}
