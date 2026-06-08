-- Pre-JPA migrations: columns required by entity mappings.
-- Runs before Hibernate schema validation on every startup (idempotent).
ALTER TABLE fee_installments ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE fee_installments ADD COLUMN IF NOT EXISTS carry_over  DECIMAL(10,2) DEFAULT 0;

-- Widen columns that were too short for real-world class names / section strings
ALTER TABLE attendance     ALTER COLUMN class_name    TYPE VARCHAR(50);
ALTER TABLE leave_requests ALTER COLUMN class_section TYPE VARCHAR(50);
