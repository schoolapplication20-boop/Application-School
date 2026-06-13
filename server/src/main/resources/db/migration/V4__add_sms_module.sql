-- SMS / Bulk SMS notification module (Phase 1).
--
-- Six tables backing the admin-only SMS module:
--   sms_templates          - reusable message templates with {{variable}} placeholders
--   sms_campaigns           - a single send/bulk-send/scheduled-send request and its rollup counters
--   sms_queue               - DB-backed work queue processed by the @Scheduled poller
--   sms_logs                - immutable record of every SMS actually handed to the provider
--   sms_delivery_status     - audit trail of provider delivery-status webhook callbacks
--   notification_preferences - per-school, per-category SMS toggle (consumed by Phase 2 triggers)
--
-- All statements are idempotent so this migration is safe to re-run.

CREATE TABLE IF NOT EXISTS sms_templates (
    id           BIGSERIAL PRIMARY KEY,
    school_id    BIGINT       NOT NULL,
    name         VARCHAR(100) NOT NULL,
    category     VARCHAR(20)  NOT NULL,
    content      TEXT         NOT NULL,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by   BIGINT,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sms_templates_school_name UNIQUE (school_id, name)
);

CREATE TABLE IF NOT EXISTS sms_campaigns (
    id                BIGSERIAL PRIMARY KEY,
    school_id         BIGINT       NOT NULL,
    name              VARCHAR(150) NOT NULL,
    template_id       BIGINT       REFERENCES sms_templates(id) ON DELETE SET NULL,
    message_content   TEXT         NOT NULL,
    target_type       VARCHAR(20)  NOT NULL,
    target_filter     TEXT,
    total_recipients  INT          NOT NULL DEFAULT 0,
    sent_count        INT          NOT NULL DEFAULT 0,
    delivered_count   INT          NOT NULL DEFAULT 0,
    failed_count      INT          NOT NULL DEFAULT 0,
    pending_count     INT          NOT NULL DEFAULT 0,
    status            VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    scheduled_for     TIMESTAMP,
    idempotency_key   VARCHAR(100),
    created_by        BIGINT,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMP,
    CONSTRAINT uq_sms_campaigns_school_idempotency UNIQUE (school_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS sms_queue (
    id                   BIGSERIAL PRIMARY KEY,
    school_id            BIGINT       NOT NULL,
    campaign_id          BIGINT       REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    student_id           BIGINT,
    recipient_phone      VARCHAR(20)  NOT NULL,
    recipient_name       VARCHAR(100),
    message_content      TEXT         NOT NULL,
    status               VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    scheduled_for        TIMESTAMP,
    attempt_count        INT          NOT NULL DEFAULT 0,
    max_attempts         INT          NOT NULL DEFAULT 3,
    next_attempt_at      TIMESTAMP,
    last_error           VARCHAR(500),
    provider_message_id  VARCHAR(100),
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_queue_poll     ON sms_queue(status, scheduled_for, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_sms_queue_campaign ON sms_queue(school_id, campaign_id);

CREATE TABLE IF NOT EXISTS sms_logs (
    id                   BIGSERIAL PRIMARY KEY,
    school_id            BIGINT       NOT NULL,
    campaign_id          BIGINT       REFERENCES sms_campaigns(id) ON DELETE SET NULL,
    queue_id             BIGINT,
    student_id           BIGINT,
    recipient_phone      VARCHAR(20)  NOT NULL,
    recipient_name       VARCHAR(100),
    message_content      TEXT         NOT NULL,
    provider             VARCHAR(30)  NOT NULL,
    provider_message_id  VARCHAR(100),
    status               VARCHAR(20)  NOT NULL,
    segments             INT          NOT NULL DEFAULT 1,
    error_code           VARCHAR(30),
    error_message        VARCHAR(500),
    sent_at              TIMESTAMP,
    delivered_at         TIMESTAMP,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_school_created  ON sms_logs(school_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_provider_msg    ON sms_logs(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_campaign        ON sms_logs(school_id, campaign_id);

CREATE TABLE IF NOT EXISTS sms_delivery_status (
    id            BIGSERIAL PRIMARY KEY,
    sms_log_id    BIGINT       NOT NULL REFERENCES sms_logs(id) ON DELETE CASCADE,
    status        VARCHAR(20)  NOT NULL,
    error_code    VARCHAR(30),
    error_message VARCHAR(500),
    raw_payload   TEXT,
    received_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_delivery_status_log ON sms_delivery_status(sms_log_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id          BIGSERIAL PRIMARY KEY,
    school_id   BIGINT      NOT NULL,
    category    VARCHAR(20) NOT NULL,
    sms_enabled BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_notification_prefs_school_category UNIQUE (school_id, category)
);
