-- V23: WhatsApp Communication Module (Phase 1).
-- Mirrors the SMS module's queue/log/campaign/template architecture (V4/V7),
-- scoped to Meta-approved message templates only (see whatsapp_templates comment).

CREATE TABLE IF NOT EXISTS whatsapp_configurations (
    id                      BIGSERIAL PRIMARY KEY,
    school_id               BIGINT       NOT NULL UNIQUE,
    phone_number_id         VARCHAR(50),
    access_token_encrypted  VARCHAR(1024),
    display_phone_number    VARCHAR(20),
    is_active               BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Templates map to Meta-approved WhatsApp message templates, not free text: Meta only allows
-- business-initiated messages (fee reminders, payment confirmations, receipt links — all sent
-- outside any 24h customer-service window) via pre-approved templates referenced by name.
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id                   BIGSERIAL PRIMARY KEY,
    school_id            BIGINT       NOT NULL,
    name                 VARCHAR(100) NOT NULL,
    category             VARCHAR(20)  NOT NULL,
    meta_template_name   VARCHAR(100) NOT NULL,
    meta_language_code   VARCHAR(10)  NOT NULL DEFAULT 'en',
    variable_labels      TEXT,
    has_url_button       BOOLEAN      NOT NULL DEFAULT FALSE,
    content_preview      TEXT,
    approval_status      VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by           BIGINT,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_templates_school_name UNIQUE (school_id, name)
);

CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
    id                BIGSERIAL PRIMARY KEY,
    school_id         BIGINT       NOT NULL,
    name              VARCHAR(150) NOT NULL,
    template_id       BIGINT       NOT NULL REFERENCES whatsapp_templates(id),
    target_type       VARCHAR(20)  NOT NULL,
    target_filter     TEXT,
    total_recipients  INT          NOT NULL DEFAULT 0,
    sent_count        INT          NOT NULL DEFAULT 0,
    delivered_count   INT          NOT NULL DEFAULT 0,
    failed_count      INT          NOT NULL DEFAULT 0,
    pending_count     INT          NOT NULL DEFAULT 0,
    status            VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    idempotency_key   VARCHAR(100),
    created_by        BIGINT,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMP,
    CONSTRAINT uq_whatsapp_campaigns_school_idempotency UNIQUE (school_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS whatsapp_queue (
    id                   BIGSERIAL PRIMARY KEY,
    school_id            BIGINT       NOT NULL,
    campaign_id          BIGINT       REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE,
    student_id           BIGINT,
    recipient_phone      VARCHAR(20)  NOT NULL,
    recipient_name       VARCHAR(100),
    template_id          BIGINT       NOT NULL REFERENCES whatsapp_templates(id),
    variables_json       TEXT         NOT NULL,
    button_url_param     VARCHAR(200),
    status               VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    attempt_count        INT          NOT NULL DEFAULT 0,
    max_attempts         INT          NOT NULL DEFAULT 3,
    next_attempt_at      TIMESTAMP,
    last_error           VARCHAR(500),
    provider_message_id  VARCHAR(100),
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_poll     ON whatsapp_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_campaign ON whatsapp_queue(school_id, campaign_id);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id                   BIGSERIAL PRIMARY KEY,
    school_id            BIGINT       NOT NULL,
    campaign_id          BIGINT       REFERENCES whatsapp_campaigns(id) ON DELETE SET NULL,
    queue_id             BIGINT,
    student_id           BIGINT,
    recipient_phone      VARCHAR(20)  NOT NULL,
    recipient_name       VARCHAR(100),
    category             VARCHAR(20),
    rendered_preview     TEXT,
    provider_message_id  VARCHAR(100),
    status               VARCHAR(20)  NOT NULL,
    error_code           VARCHAR(30),
    error_message        VARCHAR(500),
    sent_at              TIMESTAMP,
    delivered_at         TIMESTAMP,
    read_at              TIMESTAMP,
    created_at           TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_school_created ON whatsapp_logs(school_id, created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_provider_msg   ON whatsapp_logs(provider_message_id);

CREATE TABLE IF NOT EXISTS whatsapp_delivery_status (
    id                BIGSERIAL PRIMARY KEY,
    whatsapp_log_id   BIGINT       NOT NULL REFERENCES whatsapp_logs(id) ON DELETE CASCADE,
    status            VARCHAR(20)  NOT NULL,
    error_code        VARCHAR(30),
    error_message     VARCHAR(500),
    raw_payload       TEXT,
    received_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_delivery_status_log ON whatsapp_delivery_status(whatsapp_log_id);

-- Owner-set monthly quota, mirroring School.pricePerUser/paymentPlan (report-only, not enforced at send time).
ALTER TABLE schools ADD COLUMN IF NOT EXISTS whatsapp_monthly_quota INT;

-- Platform-wide per-module kill switch (new concept). Opt-out semantics matching school_features:
-- a missing row means enabled.
CREATE TABLE IF NOT EXISTS platform_module_settings (
    module_key   VARCHAR(30)  PRIMARY KEY,
    enabled      BOOLEAN      NOT NULL DEFAULT TRUE,
    updated_by   BIGINT,
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- WhatsApp ships OFF platform-wide by default: this is a brand-new, unconfigured module and
-- schools already onboarded in production must see zero change (no new nav item, no new API
-- surface reachable) until the Owner deliberately turns it on. The Owner dashboard's
-- enable/disable toggle is the intended on-ramp, not a silent opt-out default.
INSERT INTO platform_module_settings (module_key, enabled)
VALUES ('whatsapp', FALSE) ON CONFLICT (module_key) DO NOTHING;

-- Belt-and-braces for schools that already exist at the time this migration runs: also disable
-- the per-school flag explicitly, so even if the platform-wide switch is later turned on
-- (intending to roll out to NEW schools), already-onboarded schools stay off until the Owner
-- opts them in individually via the existing per-school toggle.
INSERT INTO school_features (school_id, feature_key, enabled)
SELECT id, 'whatsapp', FALSE FROM schools
ON CONFLICT (school_id, feature_key) DO NOTHING;
