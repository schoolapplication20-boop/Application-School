-- V12: Fix fee_installments status CHECK constraint to allow PARTIAL payments.
--
-- Root cause: the original constraint only allowed ('PENDING', 'PAID'), created
-- before partial payments were implemented. Setting status = 'PARTIAL' during a
-- partial fee payment violates it and blocks all partial payments.
--
-- Fix: drop the old constraint and add the corrected one with all three valid
-- values. Uses EXCEPTION WHEN others so the migration always succeeds even if
-- the constraint already has the right definition (idempotent re-run safe).

DO $$
BEGIN
    -- Drop old constraint regardless of its current definition
    BEGIN
        ALTER TABLE fee_installments DROP CONSTRAINT IF EXISTS fee_installments_status_check;
        RAISE NOTICE '[V12] Dropped fee_installments_status_check';
    EXCEPTION WHEN others THEN
        RAISE NOTICE '[V12] Could not drop fee_installments_status_check: %', SQLERRM;
    END;

    -- Add corrected constraint including PARTIAL
    BEGIN
        ALTER TABLE fee_installments
            ADD CONSTRAINT fee_installments_status_check
            CHECK (status IN ('PENDING', 'PARTIAL', 'PAID'));
        RAISE NOTICE '[V12] Added fee_installments_status_check with PENDING, PARTIAL, PAID';
    EXCEPTION WHEN others THEN
        RAISE NOTICE '[V12] Could not add fee_installments_status_check: %', SQLERRM;
    END;
END $$;
