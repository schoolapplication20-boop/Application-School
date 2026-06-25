-- V8: Remove any multi-column unique constraints on fee_payments and fee_installments
-- that block multiple payments for the same student / term.
--
-- The ONLY allowed unique constraint on fee_payments is receipt_number.
-- Any constraint like (student_id, assignment_id), (assignment_id, term),
-- (student_id, term_name), etc. would incorrectly prevent partial / multiple
-- payments for the same term and must be dropped.

DO $$
DECLARE
    rec RECORD;
BEGIN
    -- ── fee_payments: drop every unique constraint EXCEPT the one on receipt_number ──
    FOR rec IN
        SELECT con.conname
        FROM   pg_constraint con
        JOIN   pg_class      rel ON rel.oid = con.conrelid
        WHERE  rel.relname  = 'fee_payments'
          AND  con.contype  = 'u'
          -- keep only the single-column receipt_number unique constraint
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
        RAISE NOTICE 'Dropped constraint % from fee_payments', rec.conname;
    END LOOP;

    -- ── fee_installments: drop every unique constraint (none should exist here) ──
    FOR rec IN
        SELECT con.conname
        FROM   pg_constraint con
        JOIN   pg_class      rel ON rel.oid = con.conrelid
        WHERE  rel.relname  = 'fee_installments'
          AND  con.contype  = 'u'
    LOOP
        EXECUTE format('ALTER TABLE fee_installments DROP CONSTRAINT IF EXISTS %I', rec.conname);
        RAISE NOTICE 'Dropped constraint % from fee_installments', rec.conname;
    END LOOP;
END $$;

-- Ensure receipt_number unique index exists (re-add if it was somehow dropped above)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        JOIN   pg_class rel ON rel.oid = con.conrelid
        JOIN   pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
        WHERE  rel.relname = 'fee_payments'
          AND  con.contype = 'u'
          AND  array_length(con.conkey, 1) = 1
          AND  att.attname = 'receipt_number'
    ) THEN
        ALTER TABLE fee_payments ADD CONSTRAINT fee_payments_receipt_number_key UNIQUE (receipt_number);
    END IF;
END $$;
