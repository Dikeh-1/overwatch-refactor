-- Run once before deploying to a Supabase-only environment. No candidate/configuration tables are modified.
CREATE TABLE IF NOT EXISTS admin_activity_events (
      id uuid PRIMARY KEY, timestamp timestamptz NOT NULL, data jsonb NOT NULL
    );
    CREATE INDEX IF NOT EXISTS admin_activity_time ON admin_activity_events (timestamp DESC, id DESC);
    CREATE INDEX IF NOT EXISTS admin_activity_section_time ON admin_activity_events ((data->>'section'), timestamp DESC, id DESC);
    CREATE INDEX IF NOT EXISTS admin_activity_role_time ON admin_activity_events ((data->>'roleId'), timestamp DESC, id DESC);
    CREATE INDEX IF NOT EXISTS admin_activity_cohort_time ON admin_activity_events ((data->>'cohortId'), timestamp DESC, id DESC);
    CREATE TABLE IF NOT EXISTS admin_communication_templates (id text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz DEFAULT NOW());
    ALTER TABLE admin_activity_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE admin_communication_templates ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON admin_activity_events FROM PUBLIC;
    REVOKE ALL ON admin_communication_templates FROM PUBLIC;
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON admin_activity_events FROM anon; END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON admin_activity_events FROM authenticated; END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON admin_communication_templates FROM anon; END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON admin_communication_templates FROM authenticated; END IF;
    END $$;
NOTIFY pgrst, 'reload schema';
