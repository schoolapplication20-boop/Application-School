-- Per-school privacy configuration.
-- hide_student_contact_info: when TRUE, teachers see only name/class/roll — no phone or email.
CREATE TABLE school_privacy_config (
    school_id                BIGINT      PRIMARY KEY,
    hide_student_contact_info BOOLEAN    NOT NULL DEFAULT FALSE,
    updated_at               TIMESTAMP
);
