-- Roll number is often assigned after admission (or never, for some schools), so it should
-- not block adding a student. Multiple NULLs don't violate the existing
-- uq_roll_class_section_school unique constraint (NULL is never equal to NULL in SQL),
-- so students without a roll number can coexist in the same class/section.
ALTER TABLE students ALTER COLUMN roll_number DROP NOT NULL;
