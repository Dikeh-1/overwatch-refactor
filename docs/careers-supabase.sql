-- Run once in the Supabase SQL editor. These tables are private; only the server service role can access them.
create table if not exists public.career_roles (id text primary key, open boolean not null default false);
insert into public.career_roles (id,open) values ('cctv',true),('operations',false),('technical',false),('sales',false) on conflict do nothing;
create table if not exists public.career_applications (id uuid primary key, created_at timestamptz not null default now(), data jsonb not null);
alter table public.career_roles enable row level security;
alter table public.career_applications enable row level security;
revoke all on public.career_roles, public.career_applications from anon, authenticated;
grant all on public.career_roles, public.career_applications to service_role;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('career-cvs','career-cvs',false,3145728,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']) on conflict (id) do nothing;
create or replace function public.submit_career_application(application jsonb) returns void language plpgsql as $$
begin
  perform 1 from public.career_roles where id = application->>'role' and open = true for update;
  if not found then raise exception 'ROLE_CLOSED'; end if;
  insert into public.career_applications (id,created_at,data) values ((application->>'id')::uuid,(application->>'createdAt')::timestamptz,application);
end;
$$;
create or replace function public.update_career_status(application_id uuid,new_status text) returns void language plpgsql as $$
begin
  if new_status not in ('new','reviewing','shortlisted','interview','hired','rejected') then raise exception 'INVALID_STATUS'; end if;
  update public.career_applications set data=jsonb_set(data,'{status}',to_jsonb(new_status)) where id=application_id;
end;
$$;
revoke all on function public.submit_career_application(jsonb),public.update_career_status(uuid,text) from public,anon,authenticated;
grant execute on function public.submit_career_application(jsonb),public.update_career_status(uuid,text) to service_role;
