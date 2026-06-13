-- Adds an optimistic-locking version column to the fee/payment tables so concurrent
-- "collect fee" requests can't both apply a payment to the same row (lost-update /
-- over-payment race). Hibernate manages this column via @Version.

ALTER TABLE fees                   ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE student_fee_assignments ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE fee_installments        ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
