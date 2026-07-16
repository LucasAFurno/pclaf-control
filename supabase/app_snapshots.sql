create table if not exists public.app_snapshots (
  instance_key text primary key,
  state_json jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.app_snapshots enable row level security;

drop policy if exists "app_snapshots_select" on public.app_snapshots;
create policy "app_snapshots_select"
on public.app_snapshots
for select
to anon, authenticated
using (true);

drop policy if exists "app_snapshots_insert" on public.app_snapshots;
create policy "app_snapshots_insert"
on public.app_snapshots
for insert
to anon, authenticated
with check (true);

drop policy if exists "app_snapshots_update" on public.app_snapshots;
create policy "app_snapshots_update"
on public.app_snapshots
for update
to anon, authenticated
using (true)
with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.app_snapshots to anon, authenticated;
