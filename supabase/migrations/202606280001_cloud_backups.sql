create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weight_unit text not null default 'kg',
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  platform text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, id)
);

create table if not exists public.cloud_backups (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text references public.devices(id) on delete set null,
  state_json jsonb not null,
  state_schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  restored_at timestamptz
);

create index if not exists cloud_backups_user_created_at_idx
  on public.cloud_backups (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.cloud_backups enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "devices_select_own"
  on public.devices for select
  using (auth.uid() = user_id);

create policy "devices_insert_own"
  on public.devices for insert
  with check (auth.uid() = user_id);

create policy "devices_update_own"
  on public.devices for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cloud_backups_select_own"
  on public.cloud_backups for select
  using (auth.uid() = user_id);

create policy "cloud_backups_insert_own"
  on public.cloud_backups for insert
  with check (auth.uid() = user_id);

create policy "cloud_backups_delete_own"
  on public.cloud_backups for delete
  using (auth.uid() = user_id);
