-- Pre-JPA migrations: columns required by entity mappings.
-- Runs before Hibernate schema validation on every startup (idempotent).
--
-- LEGACY — frozen as of the Flyway introduction (db/migration/V1__baseline.sql).
-- Do not add new statements here; add a new versioned migration under
-- db/migration instead.
ALTER TABLE fee_installments ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE fee_installments ADD COLUMN IF NOT EXISTS carry_over  DECIMAL(10,2) DEFAULT 0;

-- Widen columns that were too short for real-world class names / section strings
ALTER TABLE attendance     ALTER COLUMN class_name    TYPE VARCHAR(50);
ALTER TABLE leave_requests ALTER COLUMN class_section TYPE VARCHAR(50);

-- Rejection/approval notes for admission applications
ALTER TABLE admission_applications ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Online Exam feature (4 tables)
CREATE TABLE IF NOT EXISTS online_exams (
    id            BIGSERIAL PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    subject       VARCHAR(100),
    class_name    VARCHAR(50),
    section       VARCHAR(20),
    school_id     BIGINT,
    teacher_id    BIGINT,
    teacher_name  VARCHAR(100),
    due_date_time TIMESTAMP,
    instructions  TEXT,
    status        VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    total_marks   INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS online_exam_questions (
    id             BIGSERIAL PRIMARY KEY,
    exam_id        BIGINT       NOT NULL REFERENCES online_exams(id) ON DELETE CASCADE,
    question_text  TEXT         NOT NULL,
    question_type  VARCHAR(10)  NOT NULL DEFAULT 'WRITTEN',
    option_a       VARCHAR(500),
    option_b       VARCHAR(500),
    option_c       VARCHAR(500),
    option_d       VARCHAR(500),
    correct_answer VARCHAR(1),
    marks          INT          NOT NULL DEFAULT 1,
    order_index    INT          NOT NULL DEFAULT 0,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS online_exam_attempts (
    id           BIGSERIAL PRIMARY KEY,
    exam_id      BIGINT      NOT NULL REFERENCES online_exams(id) ON DELETE CASCADE,
    student_id   BIGINT      NOT NULL,
    student_name VARCHAR(100),
    class_name   VARCHAR(50),
    section      VARCHAR(20),
    school_id    BIGINT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'IN_PROGRESS',
    started_at   TIMESTAMP,
    submitted_at TIMESTAMP,
    total_score  INT,
    is_graded    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attempt_exam_student UNIQUE (exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS online_exam_answers (
    id             BIGSERIAL PRIMARY KEY,
    attempt_id     BIGINT   NOT NULL REFERENCES online_exam_attempts(id) ON DELETE CASCADE,
    question_id    BIGINT   NOT NULL,
    exam_id        BIGINT,
    student_answer TEXT,
    marks_awarded  INT,
    is_correct     BOOLEAN,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_answer_attempt_question UNIQUE (attempt_id, question_id)
);
