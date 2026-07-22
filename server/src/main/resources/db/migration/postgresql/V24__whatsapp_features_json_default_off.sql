-- V24: Close a gap in the WhatsApp zero-impact rollout.
--
-- schools.features (JSON blob) is a SEPARATE mechanism from the school_features table:
-- it drives the actual Sidebar nav visibility and route access (SchoolContext.hasFeature()),
-- while school_features only gates backend API calls (FeatureFlagInterceptor). V23 only
-- disabled WhatsApp in school_features, so the nav item was still visible/clickable for
-- every school regardless. This backfills an EXPLICIT "whatsapp": false into schools.features
-- for any school that doesn't already have that key — explicit, not just absent, because the
-- "Manage Modules" UI treats an absent key as true and would silently re-enable it on next save.
--
-- SMS is deliberately NOT touched here: unlike WhatsApp it's pre-existing, possibly already in
-- active use by a school, and forcibly hiding it would be a real regression, not a safe default.
UPDATE schools
SET features = (COALESCE(features, '{}')::jsonb || '{"whatsapp": false}'::jsonb)::text
WHERE features IS NULL OR NOT (features::jsonb ? 'whatsapp');
