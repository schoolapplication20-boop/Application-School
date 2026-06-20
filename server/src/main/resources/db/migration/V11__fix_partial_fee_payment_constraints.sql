-- V11: Definitive fix for partial fee payments blocked by wrong unique constraints.
--
-- Root cause: legacy schemas (created by ddl-auto=update or manual ALTER) may have
-- placed UNIQUE constraints like (student_id, term) or (assignment_id, term) on
-- fee_payments, or any unique constraint on fee_installments, preventing a second
-- payment row for the same student/term (i.e. partial payments).
--
-- This migration is idempotent and safe to run even if V8 and V10 already ran.
-- It also drops standalone UNIQUE INDEXES (not constraint-backed) which V8/V10 missed.

-- ── Step 1: Drop known wrong constraints by exact name ─────────────────────────
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_term_key;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_assignment_id_term_key;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_assignment_id_key;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_fee_id_key;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_key;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS uq_fee_payment_student_term;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS uq_fee_payment_assignment_term;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS uq_fee_payment_student_assignment;

ALTER TABLE fee_installments DROP CONSTRAINT IF EXISTS fee_installments_assignment_id_term_name_key;
ALTER TABLE fee_installments DROP CONSTRAINT IF EXISTS uq_fee_installment_assignment_term;

-- ── Step 2: Dynamic drop of ALL multi-column unique constraints on fee_payments ──
-- Keep only the single-column receipt_number unique constraint.
DO $$
DECLARE
    rec RECORD;
BEGIN
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
        EXECUTE format('ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS %I', rec.conname);
        RAISE NOTICE '[V11] Dropped constraint % from fee_payments', rec.conname;
    END LOOP;
END $$;

-- ── Step 3: Drop standalone unique INDEXES on fee_payments (not constraint-backed) ──
-- pg_constraint only finds constraint-backed indexes; standalone CREATE UNIQUE INDEX
-- is found via pg_index. Drop all unique indexes except receipt_number and the PK.
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT ix.relname AS idx_name
        FROM   pg_index   i
        JOIN   pg_class   t  ON t.oid  = i.indrelid
        JOIN   pg_class   ix ON ix.oid = i.indexrelid
        WHERE  t.relname       = 'fee_payments'
          AND  i.indisunique   = true
          AND  i.indisprimary  = false
          -- skip constraint-backed indexes (handled above)
          AND  NOT EXISTS (
                  SELECT 1 FROM pg_constraint con
                  WHERE  con.conindid = i.indexrelid
              )
          -- keep the receipt_number index (it may be standalone in some schemas)
          AND  ix.relname NOT LIKE '%receipt_number%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', rec.idx_name);
        RAISE NOTICE '[V11] Dropped standalone unique index % from fee_payments', rec.idx_name;
    END LOOP;
END $$;

-- ── Step 4: Drop ALL unique constraints from fee_installments ─────────────────
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT con.conname
        FROM   pg_constraint con
        JOIN   pg_class      rel ON rel.oid = con.conrelid
        WHERE  rel.relname  = 'fee_installments'
          AND  con.contype  = 'u'
    LOOP
        EXECUTE format('ALTER TABLE fee_installments DROP CONSTRAINT IF EXISTS %I', rec.conname);
        RAISE NOTICE '[V11] Dropped constraint % from fee_installments', rec.conname;
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
        ALTER TABLE fee_payments
            ADD CONSTRAINT fee_payments_receipt_number_key UNIQUE (receipt_number);
        RAISE NOTICE '[V11] Re-added fee_payments.receipt_number unique constraint';
    END IF;
END $$;
