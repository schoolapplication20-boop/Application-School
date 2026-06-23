-- Fee Edit Requests — approval workflow for Admin-initiated fee modifications
-- Admins submit requests; Super Admins approve or reject.
-- Records are never deleted (full audit trail).

CREATE TABLE IF NOT EXISTS fee_edit_requests (
    id                      BIGINT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
    requested_at            DATETIME(6)     NOT NULL,
    actioned_at             DATETIME(6),

    INDEX idx_fer_school_status  (school_id, status),
    INDEX idx_fer_requested_by   (requested_by_user_id),
    INDEX idx_fer_requested_at   (requested_at)
);
