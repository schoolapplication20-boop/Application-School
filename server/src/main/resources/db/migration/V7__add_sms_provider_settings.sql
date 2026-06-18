CREATE TABLE IF NOT EXISTS sms_provider_settings (
    id           BIGSERIAL PRIMARY KEY,
    school_id    BIGINT       NOT NULL UNIQUE,
    provider     VARCHAR(20)  NOT NULL DEFAULT 'msg91',
    auth_key_encrypted VARCHAR(512),
    sender_id    VARCHAR(20),
    dlt_te_id    VARCHAR(100),
    route        VARCHAR(5)   NOT NULL DEFAULT '4',
    country_code VARCHAR(5)   NOT NULL DEFAULT '91',
    is_active    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
