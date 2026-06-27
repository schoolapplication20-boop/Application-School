-- Stores manually entered working days / present days for each student
-- per exam type so the report card can display attendance without relying
-- solely on the automated daily attendance records.
CREATE TABLE IF NOT EXISTS report_card_attendance (
    id                BIGSERIAL    PRIMARY KEY,
    school_id         BIGINT       NOT NULL,
    class_name        VARCHAR(100) NOT NULL,
    section           VARCHAR(20),
    exam_type         VARCHAR(50)  NOT NULL,
    academic_year     VARCHAR(20),
    student_id        BIGINT       NOT NULL,
    total_working_days INT          NOT NULL DEFAULT 0,
    present_days      INT          NOT NULL DEFAULT 0,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rca_school_class_exam_student
        UNIQUE (school_id, class_name, section, exam_type, student_id, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_rca_school_class_exam
    ON report_card_attendance(school_id, class_name, exam_type);
CREATE INDEX IF NOT EXISTS idx_rca_student_exam
    ON report_card_attendance(student_id, exam_type);
