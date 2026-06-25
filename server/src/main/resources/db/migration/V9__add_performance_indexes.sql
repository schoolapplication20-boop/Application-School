-- V9: Add missing performance indexes not covered by V3.
-- Every index creation is wrapped in a column-existence check so this migration
-- never fails on schemas where a column has a different name or doesn't exist.

-- attendance.student_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'attendance' AND column_name = 'student_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
        RAISE NOTICE '[V9] created idx_attendance_student_id';
    ELSE
        RAISE NOTICE '[V9] skipped idx_attendance_student_id — column does not exist';
    END IF;
END $$;

-- salaries.teacher_id (column absent in some production schemas — skip safely)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'salaries' AND column_name = 'teacher_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_salaries_teacher_id ON salaries(teacher_id);
        RAISE NOTICE '[V9] created idx_salaries_teacher_id';
    ELSE
        RAISE NOTICE '[V9] skipped idx_salaries_teacher_id — column does not exist';
    END IF;
END $$;

-- marks.school_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'marks' AND column_name = 'school_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_marks_school_id ON marks(school_id);
        RAISE NOTICE '[V9] created idx_marks_school_id';
    ELSE
        RAISE NOTICE '[V9] skipped idx_marks_school_id — column does not exist';
    END IF;
END $$;

-- marks.student_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'marks' AND column_name = 'student_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id);
        RAISE NOTICE '[V9] created idx_marks_student_id';
    ELSE
        RAISE NOTICE '[V9] skipped idx_marks_student_id — column does not exist';
    END IF;
END $$;

-- marks.class_name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'marks' AND column_name = 'class_name'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_marks_class_name ON marks(class_name);
        RAISE NOTICE '[V9] created idx_marks_class_name';
    ELSE
        RAISE NOTICE '[V9] skipped idx_marks_class_name — column does not exist';
    END IF;
END $$;
