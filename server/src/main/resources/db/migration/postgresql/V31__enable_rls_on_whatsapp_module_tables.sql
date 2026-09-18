-- V31: Close the RLS gap opened by V23 (WhatsApp module).
--
-- V22 enabled Row-Level Security on every public-schema table that existed at the time, but RLS
-- is not inherited by tables created afterward (see V22's own reminder). V23 then created 7 new
-- tables and none of them got RLS enabled:
--   whatsapp_configurations, whatsapp_templates, whatsapp_campaigns, whatsapp_queue,
--   whatsapp_logs, whatsapp_delivery_status, platform_module_settings
-- Supabase auto-exposes every public-schema table through its PostgREST API to the
-- anon/authenticated roles, so these were reachable by anyone holding the project's anon key,
-- same as the tables V22 originally covered. This app still only ever connects via JDBC as the
-- Supabase "postgres" role (a superuser that bypasses RLS), so enabling it here has no effect on
-- the application itself — it only closes the PostgREST API.
--
-- Rather than list the 7 tables by name (and risk the same gap next time a migration adds a
-- table), this re-runs V22's loop over every public table, skipping ones that already have RLS
-- enabled. ALTER TABLE ... ENABLE ROW LEVEL SECURITY is a no-op if already enabled, so this is
-- safe to run repeatedly and self-heals any future table that gets missed.
--
-- Postgres-only: lives under db/migration/postgresql so it's skipped in H2 tests.
--
-- ENABLE ROW LEVEL SECURITY takes an AccessExclusiveLock per table. Fail fast instead of hanging
-- if a lock isn't available — FlywayRepairConfig auto-repairs a failed migration on the next
-- startup, so a clean failure here is safe to just retry.
SET lock_timeout = '5s';

-- flyway_schema_history is deliberately excluded: Flyway holds its own lock on this table for the
-- duration of the migration run, so altering it from inside a Flyway-run migration self-deadlocks.
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename != 'flyway_schema_history'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END LOOP;
END $$;
