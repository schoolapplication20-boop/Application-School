package com.schoolers.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Runs idempotent schema repairs at startup — ORDER 1, before DataInitializer.
 *
 * Problem:  Hibernate ddl-auto=update creates missing columns but NEVER repairs
 *           an existing id column that lacks a SERIAL / DEFAULT nextval(...).
 *           Without that DEFAULT, every INSERT omitting the id column gets null
 *           and hits the NOT NULL constraint → "null value in column id".
 *
 *           Also handles the case where column_default references a sequence that
 *           was dropped (e.g. the old global "hibernate_sequence") — in that case
 *           column_default IS NOT NULL but the sequence is gone, so INSERTs still fail.
 *
 * Solution: At startup, check every table's id column properly:
 *           1. Skip IDENTITY columns (managed by PostgreSQL natively).
 *           2. If column_default references a sequence, verify that sequence exists.
 *           3. If anything is missing, create the sequence and wire it up.
 */
@Component
@Order(1)
public class DatabaseMigration implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        System.out.println("[DatabaseMigration] Starting schema repairs...");

        // ── id sequence repair for every seeded table ──────────────────────────
        repairIdSequence("users");
        repairIdSequence("teachers");
        repairIdSequence("students");
        repairIdSequence("parent_profiles");
        repairIdSequence("class_rooms");
        repairIdSequence("fees");
        repairIdSequence("expenses");
        repairIdSequence("notifications");

        // ── users table — fix NULL boolean columns ─────────────────────────────
        safeUpdate("UPDATE users SET is_active   = true  WHERE is_active   IS NULL");
        safeUpdate("UPDATE users SET first_login = false WHERE first_login IS NULL");

        // ── students — drop ALL single-column unique constraints on roll_number ─
        // (name varies depending on when/how the DB was first created)
        dropAllSingleColUniqueConstraints("students", "roll_number");

        // ── students — ensure composite unique constraint (roll+class+section) ──
        ensureCompositeUniqueConstraint("students", "uq_roll_class_section",
                "roll_number, class_name, section");

        // ── students — document columns must be TEXT ───────────────────────────
        alterToText("students", "photo_url");
        alterToText("students", "id_proof");
        alterToText("students", "id_proof_name");
        alterToText("students", "tc_document");
        alterToText("students", "tc_document_name");
        alterToText("students", "bonafide_document");
        alterToText("students", "bonafide_document_name");

        // ── admission_applications — document columns ──────────────────────────
        alterToText("admission_applications", "id_proof");
        alterToText("admission_applications", "tc_doc");
        alterToText("admission_applications", "bonafide_doc");

        System.out.println("[DatabaseMigration] Schema repairs complete.");
    }

    /**
     * Ensures the given table's id column has a working sequence-backed DEFAULT.
     *
     * Handles all scenarios:
     *   A) Table doesn't exist yet   → skip (Hibernate will create it correctly)
     *   B) IDENTITY column           → skip (PostgreSQL manages it natively)
     *   C) DEFAULT nextval(seq) + seq exists → skip (already working)
     *   D) DEFAULT nextval(seq) + seq MISSING → repair (stale reference to dropped sequence)
     *   E) No DEFAULT at all         → repair
     */
    private void repairIdSequence(String table) {

        // ── Guard 1: table must exist ──────────────────────────────────────────
        try {
            Integer tableCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE table_schema = 'public' AND table_name = ?",
                Integer.class, table
            );
            if (tableCount == null || tableCount == 0) return; // Table not created yet
        } catch (Exception e) {
            return;
        }

        // ── Guard 2: IDENTITY column → nothing to do ───────────────────────────
        try {
            Integer identCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_schema = 'public' AND table_name = ? AND column_name = 'id' " +
                "AND identity_generation IS NOT NULL",
                Integer.class, table
            );
            if (identCount != null && identCount > 0) return;
        } catch (Exception e) {
            return;
        }

        // ── Guard 3: Has DEFAULT and that sequence still exists → nothing to do ─
        try {
            String colDefault = jdbcTemplate.queryForObject(
                "SELECT column_default FROM information_schema.columns " +
                "WHERE table_schema = 'public' AND table_name = ? AND column_name = 'id'",
                String.class, table
            );

            if (colDefault != null && colDefault.startsWith("nextval(")) {
                // Extract the sequence name from nextval('seq_name'::regclass) or nextval('seq_name')
                String seqName = colDefault
                    .replaceAll("nextval\\('([^':]+).*", "$1")
                    .replaceAll("^public\\.", ""); // strip schema prefix if present

                Integer seqExists = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM pg_sequences " +
                    "WHERE sequencename = ? AND schemaname = 'public'",
                    Integer.class, seqName
                );
                if (seqExists != null && seqExists > 0) {
                    // Sequence exists — just make sure the value is ahead of MAX(id)
                    try {
                        jdbcTemplate.execute(
                            "SELECT setval('" + seqName + "', " +
                            "GREATEST(nextval('" + seqName + "'), " +
                            "COALESCE((SELECT MAX(id) FROM " + table + "), 0) + 1))"
                        );
                    } catch (Exception ignored) {}
                    return; // Already properly configured
                }
                // Sequence referenced in DEFAULT but doesn't exist — fall through to repair
                System.out.println("[DatabaseMigration] Broken sequence reference for " + table + ": " + seqName + " not found. Repairing...");
            } else if (colDefault != null) {
                return; // Some other kind of default — leave it alone
            }
            // colDefault == null → no default at all → fall through to repair
        } catch (Exception e) {
            // Couldn't read column info — skip
            return;
        }

        // ── Repair: create sequence and wire it to the column ──────────────────
        System.out.println("[DatabaseMigration] Repairing id sequence for table: " + table);
        String seq = table + "_id_seq";

        // Step 1 — create the sequence (idempotent)
        try {
            jdbcTemplate.execute("CREATE SEQUENCE IF NOT EXISTS " + seq);
        } catch (Exception e) {
            System.out.println("[DatabaseMigration] WARN step1 " + table + ": " + e.getMessage());
        }

        // Step 2 — advance the sequence past the current max id to prevent PK conflicts
        try {
            jdbcTemplate.execute(
                "SELECT setval('" + seq + "', " +
                "COALESCE((SELECT MAX(id) FROM " + table + "), 0) + 1, false)"
            );
        } catch (Exception e) {
            System.out.println("[DatabaseMigration] WARN step2 " + table + ": " + e.getMessage());
        }

        // Step 3 — attach the sequence as the column DEFAULT  ← the critical step
        try {
            jdbcTemplate.execute(
                "ALTER TABLE " + table +
                " ALTER COLUMN id SET DEFAULT nextval('" + seq + "')"
            );
            System.out.println("[DatabaseMigration] id DEFAULT set for table: " + table);
        } catch (Exception e) {
            System.out.println("[DatabaseMigration] ERROR step3 " + table + ": " + e.getMessage());
        }

        // Step 4 — mark the sequence as owned by the column (auto-drop with column)
        try {
            jdbcTemplate.execute(
                "ALTER SEQUENCE " + seq + " OWNED BY " + table + ".id"
            );
        } catch (Exception e) {
            System.out.println("[DatabaseMigration] WARN step4 " + table + ": " + e.getMessage());
        }
    }

    /** Drops every unique constraint whose ONLY column is the given column. */
    private void dropAllSingleColUniqueConstraints(String table, String column) {
        try {
            // Find all unique constraint names that cover exactly this one column
            List<String> names = jdbcTemplate.queryForList(
                "SELECT tc.constraint_name " +
                "FROM information_schema.table_constraints tc " +
                "JOIN information_schema.constraint_column_usage ccu " +
                "  ON tc.constraint_name = ccu.constraint_name " +
                " AND tc.table_schema   = ccu.table_schema " +
                "WHERE tc.table_schema  = 'public' " +
                "  AND tc.table_name    = ? " +
                "  AND tc.constraint_type = 'UNIQUE' " +
                "  AND ccu.column_name  = ? " +
                "  AND (SELECT COUNT(*) FROM information_schema.constraint_column_usage c2 " +
                "       WHERE c2.constraint_name = tc.constraint_name " +
                "         AND c2.table_schema    = tc.table_schema) = 1",
                String.class, table, column
            );
            for (String name : names) {
                try {
                    jdbcTemplate.execute("ALTER TABLE " + table + " DROP CONSTRAINT \"" + name + "\"");
                    System.out.println("[DatabaseMigration] Dropped single-col unique constraint: " + name);
                } catch (Exception e) {
                    System.out.println("[DatabaseMigration] WARN dropping " + name + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            System.out.println("[DatabaseMigration] WARN dropAllSingleColUniqueConstraints: " + e.getMessage());
        }
    }

    /** Creates a named composite unique constraint if it does not already exist. */
    private void ensureCompositeUniqueConstraint(String table, String constraintName, String columns) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.table_constraints " +
                "WHERE table_schema = 'public' AND table_name = ? AND constraint_name = ?",
                Integer.class, table, constraintName
            );
            if (count != null && count > 0) return; // already exists
            jdbcTemplate.execute(
                "ALTER TABLE " + table +
                " ADD CONSTRAINT " + constraintName +
                " UNIQUE (" + columns + ")"
            );
            System.out.println("[DatabaseMigration] Created constraint: " + constraintName);
        } catch (Exception e) {
            System.out.println("[DatabaseMigration] WARN ensureCompositeUniqueConstraint: " + e.getMessage());
        }
    }

    private void dropConstraintIfExists(String table, String constraint) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.table_constraints " +
                "WHERE table_schema = 'public' AND table_name = ? AND constraint_name = ?",
                Integer.class, table, constraint
            );
            if (count != null && count > 0) {
                jdbcTemplate.execute("ALTER TABLE " + table + " DROP CONSTRAINT " + constraint);
                System.out.println("[DatabaseMigration] Dropped constraint: " + constraint + " on " + table);
            }
        } catch (Exception ignored) {}
    }

    private void alterToText(String table, String column) {
        try {
            jdbcTemplate.execute(
                "ALTER TABLE " + table + " ALTER COLUMN " + column + " TYPE TEXT"
            );
        } catch (Exception ignored) {
            // Column does not exist yet or is already TEXT
        }
    }

    private void safeUpdate(String sql) {
        try {
            jdbcTemplate.update(sql);
        } catch (Exception ignored) {
            // Table may not exist yet on very first run
        }
    }
}
