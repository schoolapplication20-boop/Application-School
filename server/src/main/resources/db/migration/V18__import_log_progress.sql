-- Track per-row progress for async bulk imports so the frontend can poll
ALTER TABLE import_logs
  ADD COLUMN IF NOT EXISTS processed_rows INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credentials_json TEXT;
