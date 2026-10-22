-- Private Communications Studio storage. Run as the database owner before deploying.
CREATE TABLE IF NOT EXISTS admin_mail_items (
    id text PRIMARY KEY, kind text NOT NULL, scope text NOT NULL, version integer NOT NULL DEFAULT 1,
    updated_at timestamptz NOT NULL DEFAULT NOW(), data jsonb NOT NULL
  );
  CREATE INDEX IF NOT EXISTS admin_mail_scope_time ON admin_mail_items(scope, updated_at DESC);
  ALTER TABLE admin_mail_items ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON admin_mail_items FROM PUBLIC;
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON admin_mail_items FROM anon; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON admin_mail_items FROM authenticated; END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN GRANT ALL ON admin_mail_items TO service_role; END IF;
  END $$;
  NOTIFY pgrst, 'reload schema';
