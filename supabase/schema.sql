create table if not exists public.law_users (
  id text primary key,
  email text not null unique,
  role text not null check (role in ('ADMIN', 'CLIENT')),
  payload jsonb not null
);

create table if not exists public.law_cases (
  id text primary key,
  case_number text not null unique,
  client_email text,
  payload jsonb not null
);

create index if not exists law_cases_client_email_idx on public.law_cases (lower(client_email));

create table if not exists public.law_consultations (
  reference text primary key,
  payload jsonb not null
);

create table if not exists public.law_sessions (
  token_hash text primary key,
  user_id text not null references public.law_users(id) on delete cascade,
  role text not null check (role in ('ADMIN', 'CLIENT')),
  expires_at timestamptz not null
);

create index if not exists law_sessions_expiry_idx on public.law_sessions (expires_at);

alter table public.law_users enable row level security;
alter table public.law_cases enable row level security;
alter table public.law_consultations enable row level security;
alter table public.law_sessions enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'law-documents',
  'law-documents',
  false,
  3145728,
  array['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
