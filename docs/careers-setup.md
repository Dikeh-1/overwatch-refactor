# Recruitment setup

1. Create a Supabase project and run `docs/careers-supabase.sql` in its SQL editor. It creates private tables and a private CV bucket. No public read policies should be added.
2. Set server-only environment variables in your hosting dashboard and `.env.local`:
   - `SUPABASE_URL`: your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: the server service-role key (never NEXT_PUBLIC)
   - `CAREERS_ADMIN_PASSWORD`: a unique randomly generated password of at least 24 characters
   - `BREVO_API_KEY`: existing email notification key
3. Restart/redeploy. Open `/admin` and sign in with that password. No default password or login bypass is included.
4. CCTV starts open; the other three roles start closed. Manage roles updates the public pages within 10 seconds. Submission checks role availability again and the database serializes submissions against role changes.

Development without Supabase stores applications and CVs in ignored `.careers-data/`. Production never falls back to the local filesystem. Local data is not migrated automatically; configure Supabase before accepting real applications.

CV uploads accept PDF, DOC and DOCX up to 3 MB to stay below the host's request size limit. Downloads require an authenticated session. Every application field is available in the horizontally scrollable table, candidate detail panel, and CSV export; CVs are separate authenticated downloads. Session cookies expire after 8 hours. Changing the password invalidates existing sessions.

Login attempts have a process-local throttle; configure a shared hosting/WAF rate limit on `/api/admin/session` and `/api/careers` before public launch, especially for multiple instances. The service role key bypasses RLS and must remain server-only. Add file malware scanning if required by your internal recruitment policy.

Email alerts are best effort after durable persistence. The dashboard is the source of truth. Existing emailed applications are not imported. Applicants receive an on-page reference and a best-effort confirmation email in their selected language. The existing HR recipients are preserved.

Validation: `npm run build`, targeted ESLint, and `node --test tests/careers.integration.mjs` with a development server running and `CAREERS_TEST_PASSWORD` set to the configured local password. Tests require local development storage and create/remove their own application fixture.

