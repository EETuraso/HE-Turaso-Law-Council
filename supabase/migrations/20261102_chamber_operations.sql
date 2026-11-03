-- Extend the existing private law application schema for staff accounts and tasks.
-- Existing ADMIN and CLIENT roles remain valid without data rewrites.
alter table public.law_users drop constraint if exists law_users_role_check;
alter table public.law_users add constraint law_users_role_check
  check (role in ('ADMIN', 'CLIENT', 'HEAD_LAWYER', 'SENIOR_LAWYER', 'ASSOCIATE_LAWYER', 'SECRETARY', 'CLERK', 'ADMINISTRATOR'));

alter table public.law_sessions drop constraint if exists law_sessions_role_check;
alter table public.law_sessions add constraint law_sessions_role_check
  check (role in ('ADMIN', 'CLIENT', 'HEAD_LAWYER', 'SENIOR_LAWYER', 'ASSOCIATE_LAWYER', 'SECRETARY', 'CLERK', 'ADMINISTRATOR'));

create table if not exists public.law_tasks (
  id text primary key,
  status text not null,
  payload jsonb not null
);
create index if not exists law_tasks_status_idx on public.law_tasks (status);
alter table public.law_tasks enable row level security;

create table if not exists public.law_activity (
  id text primary key,
  created_at timestamptz not null,
  payload jsonb not null
);
create index if not exists law_activity_created_at_idx on public.law_activity (created_at desc);
alter table public.law_activity enable row level security;
