-- Receipts need to be reprintable exactly as originally generated, even if the student's
-- fee assignment (total fee, concession, paid amount) changes afterwards. Snapshot the
-- figures that were true at the moment of payment, instead of recomputing them later from
-- the (possibly since-changed) StudentFeeAssignment.
--
-- section is also captured here since fee_payments.class_name only ever held the class name,
-- never the section, and the receipt needs "Class / Section".
--
-- All nullable: existing rows predate this snapshot and fall back to a best-effort
-- reconstruction at read time (see AdminService.getReceiptByNumber).
ALTER TABLE fee_payments
    ADD COLUMN IF NOT EXISTS section VARCHAR(20),
    ADD COLUMN IF NOT EXISTS total_fee_at_payment DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS paid_to_date_at_payment DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS balance_due_at_payment DECIMAL(10,2);
