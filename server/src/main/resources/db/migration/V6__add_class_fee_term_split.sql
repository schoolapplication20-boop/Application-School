-- Adds an optional term-wise split (JSON array of {termName, amount}) to each class's
-- annual fee structure, so admins can break the total fee into Term 1 / Term 2 / Term 3
-- (or custom terms) at the class level.

ALTER TABLE class_fee_structure ADD COLUMN IF NOT EXISTS term_fees TEXT;
