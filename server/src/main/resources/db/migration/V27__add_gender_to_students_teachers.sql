-- Capture gender for students and teachers (previously only collected on
-- admission applications, which are never linked to the resulting student record).
ALTER TABLE students ADD COLUMN gender VARCHAR(10);
ALTER TABLE teachers ADD COLUMN gender VARCHAR(10);
