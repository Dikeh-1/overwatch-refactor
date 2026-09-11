import pg8000.native, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

con = pg8000.native.Connection(
    user='postgres.pnrjytqtjhprrlwkgwls',
    host='aws-0-eu-west-2.pooler.supabase.com',
    port=5432,
    database='postgres',
    password='Overwatch_Moz26',
    ssl_context=ctx
)

sql_file = r'C:\Users\ebube\OneDrive\Desktop\Overwatch_Website\overwatch-refactor\docs\careers-supabase.sql'
with open(sql_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Execute each statement
statements = [
    # career_roles table
    \"CREATE TABLE IF NOT EXISTS public.career_roles (id text PRIMARY KEY, open boolean NOT NULL DEFAULT false);\",
    \"INSERT INTO public.career_roles (id,open) VALUES ('cctv',true),('operations',false),('technical',false),('sales',false) ON CONFLICT DO NOTHING;\",
    # career_applications table
    \"CREATE TABLE IF NOT EXISTS public.career_applications (id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), data jsonb NOT NULL);\",
    \"ALTER TABLE public.career_roles ENABLE ROW LEVEL SECURITY;\",
    \"ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;\",
    \"REVOKE ALL ON public.career_roles, public.career_applications FROM anon, authenticated;\",
    \"GRANT ALL ON public.career_roles, public.career_applications TO service_role;\",
    \"INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('career-cvs','career-cvs',false,3145728,ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']) ON CONFLICT (id) DO NOTHING;\",
    \"\"\"CREATE OR REPLACE FUNCTION public.submit_career_application(application jsonb) RETURNS void LANGUAGE plpgsql AS \$\$
BEGIN
  PERFORM 1 FROM public.career_roles WHERE id = application->>'role' AND open = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ROLE_CLOSED'; END IF;
  INSERT INTO public.career_applications (id,created_at,data) VALUES ((application->>'id')::uuid,(application->>'createdAt')::timestamptz,application);
END;
\$\$;\"\"\",
    \"\"\"CREATE OR REPLACE FUNCTION public.update_career_status(application_id uuid,new_status text) RETURNS void LANGUAGE plpgsql AS \$\$
BEGIN
  IF new_status NOT IN ('new','reviewing','shortlisted','interview','hired','rejected') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;
  UPDATE public.career_applications SET data=jsonb_set(data,'{status}',to_jsonb(new_status)) WHERE id=application_id;
END;
\$\$;\"\"\",
    \"REVOKE ALL ON FUNCTION public.submit_career_application(jsonb),public.update_career_status(uuid,text) FROM public,anon,authenticated;\",
    \"GRANT EXECUTE ON FUNCTION public.submit_career_application(jsonb),public.update_career_status(uuid,text) TO service_role;\"
]

for stmt in statements:
    print('Running statement...')
    con.run(stmt)

print('All migrations completed successfully!')
roles = con.run('SELECT * FROM public.career_roles')
print('Roles:', roles)
buckets = con.run('SELECT id, name, public FROM storage.buckets')
print('Buckets:', buckets)
