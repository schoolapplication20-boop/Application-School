-- V21: Student Deletion Approval Workflow.
-- Admins submit a deletion request with a reason instead of deleting directly;
-- Super Admins approve (soft-delete + disable login) or reject. Records are
-- never deleted — this table is the complete audit trail.

ALTER TABLE students ADD COLUMN IF NOT EXISTS deletion_status VARCHAR(20) NOT NULL DEFAULT 'NONE';

CREATE TABLE IF NOT EXISTS student_deletion_requests (
    id                      BIGSERIAL       PRIMARY KEY,
    request_id              VARCHAR(36)     NOT NULL UNIQUE,
    student_id              BIGINT          NOT NULL,
    school_id               BIGINT          NOT NULL,
    student_name            VARCHAR(150),
    class_name              VARCHAR(60),
    requested_by_user_id    BIGINT,
    requested_by_name       VARCHAR(150),
    reason                  TEXT            NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    approved_by_user_id     BIGINT,
    approved_by_name        VARCHAR(150),
    decision_notes          TEXT,
    requested_at            TIMESTAMP       NOT NULL,
    actioned_at             TIMESTAMP
);

-- Prevents a second PENDING deletion request from being created for the same student.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sdr_student_pending
    ON student_deletion_requests (student_id)
    WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_sdr_school_status  ON student_deletion_requests (school_id, status);
CREATE INDEX IF NOT EXISTS idx_sdr_requested_by   ON student_deletion_requests (requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_sdr_requested_at   ON student_deletion_requests (requested_at);
