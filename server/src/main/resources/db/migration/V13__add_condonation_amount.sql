-- V13: Add condonation_amount to student_fee_assignments and fee_installments.
--
-- Condonation (fee concession/waiver) reduces the net payable fee for a
-- specific student. The original fee is preserved; only the net amount is
-- shown as due/payable throughout the system.
--
-- student_fee_assignments.condonation_amount — total condonation for the
--   student's entire assignment (sum of per-term condonations).
-- fee_installments.condonation_amount — condonation specific to one term,
--   so effectiveDue = (amount - condonation) + carryOver - paidAmount.

ALTER TABLE student_fee_assignments
    ADD COLUMN IF NOT EXISTS condonation_amount DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE fee_installments
    ADD COLUMN IF NOT EXISTS condonation_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
