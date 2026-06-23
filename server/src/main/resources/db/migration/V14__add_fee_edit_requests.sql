-- V14: Fee Edit Requests — approval workflow for Admin-initiated fee modifications.
-- Admins submit requests; Super Admins approve or reject.
-- Records are never deleted (complete audit trail).

CREATE TABLE IF NOT EXISTS fee_edit_requests (
    id                      BIGSERIAL       PRIMARY KEY,
    request_id              VARCHAR(36)     NOT NULL UNIQUE,
    school_id               BIGINT          NOT NULL,
    requested_by_user_id    BIGINT          NOT NULL,
    requested_by_name       VARCHAR(150),
    request_type            VARCHAR(60)     NOT NULL,
    entity_id               BIGINT,
    student_name            VARCHAR(150),
    class_name              VARCHAR(60),
    existing_values         TEXT,
    new_values              TEXT,
    reason                  TEXT,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    approved_by_user_id     BIGINT,
    approved_by_name        VARCHAR(150),
    approval_notes          TEXT,
    pending_payload         TEXT,
    requested_at            TIMESTAMP       NOT NULL,
    actioned_at             TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fer_school_status  ON fee_edit_requests (school_id, status);
CREATE INDEX IF NOT EXISTS idx_fer_requested_by   ON fee_edit_requests (requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_fer_requested_at   ON fee_edit_requests (requested_at);
