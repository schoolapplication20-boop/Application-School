-- Per-school toggle: when TRUE, hides total fee and fee concession (condonation)
-- amount from the student portal (also covers parents, who view fees via the
-- student login — this app has no separate parent login).
ALTER TABLE school_privacy_config
    ADD COLUMN hide_fee_info_from_students BOOLEAN NOT NULL DEFAULT FALSE;
