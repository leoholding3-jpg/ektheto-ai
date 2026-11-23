create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'authenticated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investigations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Verificação de imagem',
  image_name text,
  score numeric(5,4) not null,
  verdict text not null,
  deepfake_score numeric(5,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investigation_id uuid references public.investigations(id) on delete set null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investigation_id uuid references public.investigations(id) on delete cascade,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  enabled boolean not null default true,
  configuration jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.profiles enable row level security;
alter table public.investigations enable row level security;
alter table public.reports enable row level security;
alter table public.verification_history enable row level security;
alter table public.user_settings enable row level security;
alter table public.integrations enable row level security;

create policy "Users read their profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update their profile" on public.profiles for update using (auth.uid() = id);
create policy "Users manage investigations" on public.investigations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage reports" on public.reports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage history" on public.verification_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage settings" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage integrations" on public.integrations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.bug_registry (
  id uuid primary key default gen_random_uuid(),
  signature text not null,
  method text not null,
  path text not null,
  status integer not null,
  detail jsonb not null default '{}'::jsonb,
  exception_type text,
  request_id text,
  resolved boolean not null default false,
  resolution text,
  recurrence_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bug_registry_signature_idx
  on public.bug_registry(signature);

alter table public.bug_registry enable row level security;
