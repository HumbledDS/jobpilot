-- JobPilot — schéma initial
-- Tables préfixées jp_ dans le schéma public du projet Supabase "Tailor CV Resume"
-- (isolation par préfixe pour cohabiter sans risque avec l'app existante).
-- Appliqué le 2026-06-26 via Supabase MCP (migration "jobpilot_init").

create table if not exists public.jp_companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  domain text, sector text, location text, website text, linkedin_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.jp_cv_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text not null,
  target_role text,
  content text,
  file_url text,
  source_format text,
  version int not null default 1,
  parent_id uuid references public.jp_cv_versions(id) on delete set null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.jp_cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text,
  content text,
  tone text,
  version int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.jp_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source text not null default 'manual',          -- france_travail | adzuna | manual ...
  external_id text,
  title text not null,
  company_id uuid references public.jp_companies(id) on delete set null,
  company_name text,
  location text,
  remote text,                                     -- onsite | hybrid | remote
  contract_type text,
  salary_min int, salary_max int, currency text default 'EUR',
  url text,
  description text,
  tags text[],
  posted_at timestamptz,
  ingested_at timestamptz not null default now(),
  raw jsonb,
  unique (user_id, source, external_id)
);

create table if not exists public.jp_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job_id uuid references public.jp_jobs(id) on delete set null,
  company_id uuid references public.jp_companies(id) on delete set null,
  status text not null default 'a_postuler'
    check (status in ('a_postuler','postule','relance','entretien','offre','refuse','sans_reponse')),
  priority int not null default 0,
  cv_version_id uuid references public.jp_cv_versions(id) on delete set null,
  cover_letter_id uuid references public.jp_cover_letters(id) on delete set null,
  applied_at timestamptz,
  next_action_at timestamptz,
  source_channel text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jp_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid references public.jp_companies(id) on delete cascade,
  application_id uuid references public.jp_applications(id) on delete set null,
  full_name text not null,
  role text, email text, phone text, linkedin_url text, notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.jp_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_id uuid references public.jp_applications(id) on delete cascade,
  type text not null,            -- applied | follow_up | email | call | interview | note | status_change
  content text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.jp_skill_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  target_role text,
  cloud text,
  status text not null default 'todo' check (status in ('todo','in_progress','deployed','done')),
  repo_url text, deployed_url text,
  order_index int default 0,
  started_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.jp_saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  query jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.jp_set_updated_at()
returns trigger language plpgsql as $fn$
begin new.updated_at = now(); return new; end; $fn$;

drop trigger if exists trg_jp_applications_updated on public.jp_applications;
create trigger trg_jp_applications_updated
  before update on public.jp_applications
  for each row execute function public.jp_set_updated_at();

create index if not exists idx_jp_jobs_user_ingested on public.jp_jobs(user_id, ingested_at desc);
create index if not exists idx_jp_apps_user_status on public.jp_applications(user_id, status);
create index if not exists idx_jp_contacts_company on public.jp_contacts(company_id);
create index if not exists idx_jp_activities_app on public.jp_activities(application_id, occurred_at desc);

-- RLS owner-only + grants
do $do$
declare t text;
begin
  foreach t in array array['jp_companies','jp_jobs','jp_applications','jp_contacts','jp_activities','jp_cv_versions','jp_cover_letters','jp_skill_projects','jp_saved_searches']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role;', t);
    execute format('drop policy if exists own_all on public.%I;', t);
    execute format('create policy own_all on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
  end loop;
end $do$;
