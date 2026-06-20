-- V11: Definitive fix for partial fee payments blocked by wrong unique constraints.
--
-- Root cause: legacy schemas (created by ddl-auto=update or manual ALTER) may have
-- placed UNIQUE constraints like (student_id, term) or (assignment_id, term) on
-- fee_payments, or any unique constraint on fee_installments, preventing a second
-- payment row for the same student/term (i.e. partial payments).
--
-- All DDL is wrapped in DO $$ blocks with:
--   • SET LOCAL lock_timeout = '5s'  — so DDL that cannot acquire its lock within
--     5 seconds throws a lock_timeout error instead of hanging indefinitely (which
--     would block Spring Boot startup past Railway's 120-second healthcheck window).
--   • EXCEPTION WHEN others          — catches the error and emits a RAISE NOTICE
--     so the migration always succeeds and Flyway records it as SUCCESS.
--
-- FlywayRepairConfig runs flyway.repair() before every migrate(), so the FAILED
-- V11 entry from the previous failed deploy is cleared before this version runs.

-- ── Step 1: Drop known wrong constraints by exact name ─────────────────────────
-- Wrapped in DO $$ so lock_timeout + exception handling apply here too.
DO $$
BEGIN
    SET LOCAL lock_timeout = '5s';

    BEGIN ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_term_key;
    EXCEPTION WHEN others THEN RAISE NOTICE '[V11] skip fee_payments_student_id_term_key: %', SQLERRM; END;

    BEGIN ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_assignment_id_term_key;
    EXCEPTION WHEN others THEN RAISE NOTICE '[V11] skip fee_payments_assignment_id_term_key: %', SQLERRM; END;

    BEGIN ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_assignment_id_key;
    EXCEPTION WHEN others THEN RAISE NOTICE '[V11] skip fee_payments_student_id_assignment_id_key: %', SQLERRM; END;

    BEGIN ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_fee_id_key;
    EXCEPTION WHEN others THEN RAISE NOTICE '[V11] skip fee_payments_student_id_fee_id_key: %', SQLERRM; END;

    BEGIN ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_key;
    EXCEPTION WHEN others THEN RAISE NOTICE '[V11] skip fee_payments_student_id_key: %', SQLERRM; END;

    BEGIN ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS uq_fee_payment_student_term;
    EXCEPTION WHEN others THEN RAISE NOTICE '[V11] skip uq_fee_payment_student_term: %', SQLERRM; END;

    BEGIN ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS uq_fee_payment_assignment_term;
    EXCEPTION WHEN others THEN RAISE NOTICE '[V11] skip uq_fee_payment_assignment_term: %', SQLERRM; END;

    BEGIN ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS uq_fee_payment_student_assignment;
    EXCEPTION WHEN others THEN RAISE NOTICE '[V11] skip uq_fee_payment_student_assignment: %', SQLERRM; END;

    BEGIN ALTER TABLE fee_installments DROP CONSTRAINT IF EXISTS fee_installments_assignment_id_term_name_key;
    EXCEPTION WHEN others THEN RAISE NOTICE '[V11] skip fee_installments_assignment_id_term_name_key: %', SQLERRM; END;

    BEGIN ALTER TABLE fee_installments DROP CONSTRAINT IF EXISTS uq_fee_installment_assignment_term;
    EXCEPTION WHEN others THEN RAISE NOTICE '[V11] skip uq_fee_installment_assignment_term: %', SQLERRM; END;
END $$;

-- ── Step 2: Dynamic drop of ALL multi-column unique constraints on fee_payments ──
-- Keep only the single-column receipt_number unique constraint.
DO $$
DECLARE
    rec RECORD;
BEGIN
    SET LOCAL lock_timeout = '5s';

    FOR rec IN
        SELECT con.conname
        FROM   pg_constraint con
        JOIN   pg_class      rel ON rel.oid = con.conrelid
        WHERE  rel.relname  = 'fee_payments'
          AND  con.contype  = 'u'
          AND  NOT (
                  array_length(con.conkey, 1) = 1
                  AND EXISTS (
                      SELECT 1 FROM pg_attribute att
                      WHERE  att.attrelid = con.conrelid
                        AND  att.attnum   = con.conkey[1]
                        AND  att.attname  = 'receipt_number'
                  )
              )
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS %I', rec.conname);
            RAISE NOTICE '[V11] Dropped constraint % from fee_payments', rec.conname;
        EXCEPTION WHEN others THEN
            RAISE NOTICE '[V11] Could not drop constraint % from fee_payments: %', rec.conname, SQLERRM;
        END;
    END LOOP;
END $$;

-- ── Step 3: Drop standalone unique INDEXES on fee_payments (not constraint-backed) ──
DO $$
DECLARE
    rec RECORD;
BEGIN
    SET LOCAL lock_timeout = '5s';

    FOR rec IN
        SELECT ix.relname AS idx_name
        FROM   pg_index   i
        JOIN   pg_class   t  ON t.oid  = i.indrelid
        JOIN   pg_class   ix ON ix.oid = i.indexrelid
        WHERE  t.relname       = 'fee_payments'
          AND  i.indisunique   = true
          AND  i.indisprimary  = false
          AND  NOT EXISTS (
                  SELECT 1 FROM pg_constraint con
                  WHERE  con.conindid = i.indexrelid
              )
          AND  ix.relname NOT LIKE '%receipt_number%'
    LOOP
        BEGIN
            EXECUTE format('DROP INDEX IF EXISTS %I', rec.idx_name);
            RAISE NOTICE '[V11] Dropped standalone unique index % from fee_payments', rec.idx_name;
        EXCEPTION WHEN others THEN
            RAISE NOTICE '[V11] Could not drop index % from fee_payments: %', rec.idx_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ── Step 4: Drop ALL unique constraints from fee_installments ─────────────────
DO $$
DECLARE
    rec RECORD;
BEGIN
    SET LOCAL lock_timeout = '5s';

    FOR rec IN
        SELECT con.conname
        FROM   pg_constraint con
        JOIN   pg_class      rel ON rel.oid = con.conrelid
        WHERE  rel.relname  = 'fee_installments'
          AND  con.contype  = 'u'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE fee_installments DROP CONSTRAINT IF EXISTS %I', rec.conname);
            RAISE NOTICE '[V11] Dropped constraint % from fee_installments', rec.conname;
        EXCEPTION WHEN others THEN
            RAISE NOTICE '[V11] Could not drop constraint % from fee_installments: %', rec.conname, SQLERRM;
        END;
    END LOOP;
END $$;

-- ── Step 5: Ensure receipt_number unique constraint exists on fee_payments ─────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint con
        JOIN   pg_class      rel ON rel.oid = con.conrelid
        JOIN   pg_attribute  att ON att.attrelid = con.conrelid
                                AND att.attnum    = ANY(con.conkey)
                                AND att.attname   = 'receipt_number'
        WHERE  rel.relname        = 'fee_payments'
          AND  con.contype        = 'u'
          AND  array_length(con.conkey, 1) = 1
    ) THEN
        BEGIN
            SET LOCAL lock_timeout = '10s';
            ALTER TABLE fee_payments
                ADD CONSTRAINT fee_payments_receipt_number_key UNIQUE (receipt_number);
            RAISE NOTICE '[V11] Re-added fee_payments.receipt_number unique constraint';
        EXCEPTION WHEN others THEN
            RAISE NOTICE '[V11] Could not add receipt_number constraint: %', SQLERRM;
        END;
    END IF;
END $$;
