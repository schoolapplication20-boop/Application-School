-- V9: Add missing performance indexes not covered by V3.
-- V3 already created school_id indexes for most tables and FK indexes for common joins.
-- This migration adds the remaining high-value indexes identified in the perf audit.

-- attendance.student_id — high-traffic FK used in every per-student attendance query
CREATE INDEX IF NOT EXISTS idx_attendance_student_id           ON attendance(student_id);

-- salaries.teacher_id — used in teacher salary lookup joins
CREATE INDEX IF NOT EXISTS idx_salaries_teacher_id             ON salaries(teacher_id);

-- marks — school_id, student_id, and class_name are the three most common filter columns
CREATE INDEX IF NOT EXISTS idx_marks_school_id                 ON marks(school_id);
CREATE INDEX IF NOT EXISTS idx_marks_student_id                ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_class_name                ON marks(class_name);

-- fee_installments has no student_id column — student is resolved via assignment_id → student_fee_assignments
-- The correct index is on assignment_id, which already exists (V3: idx_fee_installments_assignment_id)
