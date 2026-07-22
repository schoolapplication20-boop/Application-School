-- V22: Enable Row-Level Security on every table in the public schema.
--
-- Supabase auto-exposes every public-schema table through its PostgREST API to
-- the anon/authenticated roles. This app never uses that API — it connects
-- directly via JDBC as the Supabase "postgres" role, a superuser that always
-- bypasses RLS — so this has no effect on the application itself. It only
-- closes the PostgREST API, which was otherwise wide open to anyone holding
-- the project's anon key.
--
-- Postgres-only: lives under db/migration/postgresql so it's skipped in H2 tests
-- (H2 has no RLS concept). See spring.flyway.locations in application.properties.
--
-- Reminder: RLS is not inherited by future tables — any migration that adds a
-- new public table should enable RLS on it directly.
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END LOOP;
END $$;
