-- Formation : cours / ressources suivis pour approfondir les technos.
-- Suivi personnel de montée en compétence (relire, réviser, creuser).
-- Même modèle mono-utilisateur + RLS owner-only que les autres tables jp_*.

create table if not exists public.jp_courses (
  id uuid primary key default gen_random_uuid(),
  -- nullable comme les autres tables jp_* : les écritures passent par le client
  -- service-role (sans user_id, auth.uid() = null). RLS reste actif.
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  provider text,                 -- Udemy, Coursera, YouTube, Docs officielles, Databricks Academy…
  skill text,                    -- techno visée (taxonomie skills.ts) : Spark, Kafka, Terraform…
  url text,
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  progress int not null default 0 check (progress between 0 and 100),
  plan text,                     -- plan de révision / approfondissement généré par l'IA
  notes text,
  order_index int default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_jp_courses_order on public.jp_courses(order_index);

-- RLS owner-only + grants (identique aux autres tables)
do $do$
begin
  execute 'alter table public.jp_courses enable row level security';
  execute 'grant select, insert, update, delete on public.jp_courses to authenticated, service_role';
  execute 'drop policy if exists own_all on public.jp_courses';
  execute 'create policy own_all on public.jp_courses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())';
end $do$;
