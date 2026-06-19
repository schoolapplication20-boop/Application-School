-- V10: Definitive cleanup of fee_payments and fee_installments constraints.
--
-- Root cause of "A duplicate entry was detected" during fee collection:
-- Older deployments with spring.jpa.hibernate.ddl-auto=update may have created
-- unique indexes on fee_payments (e.g. on student_id+term, or assignment_id+term)
-- that block multiple partial payments for the same installment.
--
-- V8 cleaned up unknown constraints dynamically. This migration explicitly
-- names and drops every known incorrect constraint plus runs the same dynamic
-- cleanup, so it is safe regardless of whether V8 ran or not.

-- ── Drop explicitly-named wrong constraints (from older Hibernate-generated schemas) ──
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_term_key;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_assignment_id_term_key;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_assignment_id_key;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_fee_id_key;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_student_id_key;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS uq_fee_payment_student_term;
ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS uq_fee_payment_assignment_term;

ALTER TABLE fee_installments DROP CONSTRAINT IF EXISTS fee_installments_assignment_id_term_name_key;
ALTER TABLE fee_installments DROP CONSTRAINT IF EXISTS uq_fee_installment_assignment_term;

-- ── Dynamic cleanup: drop any remaining multi-column unique constraints on fee_payments ──
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
        RAISE NOTICE '[V10] Dropped constraint % from fee_payments', rec.conname;
    END LOOP;
END $$;

-- ── Dynamic cleanup: drop any unique constraints from fee_installments ──
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
        RAISE NOTICE '[V10] Dropped constraint % from fee_installments', rec.conname;
    END LOOP;
END $$;

-- ── Ensure the only unique constraint on fee_payments is receipt_number ──
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN   pg_class rel ON rel.oid = con.conrelid
        JOIN   pg_attribute att ON att.attrelid = con.conrelid
                               AND att.attnum = ANY(con.conkey)
                               AND att.attname = 'receipt_number'
        WHERE  rel.relname = 'fee_payments'
          AND  con.contype = 'u'
          AND  array_length(con.conkey, 1) = 1
    ) THEN
        ALTER TABLE fee_payments
            ADD CONSTRAINT fee_payments_receipt_number_key UNIQUE (receipt_number);
        RAISE NOTICE '[V10] Re-added fee_payments receipt_number unique constraint';
    END IF;
END $$;
