-- Pre-JPA migrations: columns required by entity mappings.
-- Runs before Hibernate schema validation on every startup (idempotent).
ALTER TABLE fee_installments ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE fee_installments ADD COLUMN IF NOT EXISTS carry_over  DECIMAL(10,2) DEFAULT 0;
