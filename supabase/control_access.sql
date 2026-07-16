create table if not exists public.control_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role_key text not null default 'cashier' check (role_key in ('admin', 'cashier', 'warehouse')),
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled')),
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_control_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists control_users_touch_updated_at on public.control_users;
create trigger control_users_touch_updated_at
before update on public.control_users
for each row
execute function public.touch_control_users_updated_at();

alter table public.control_users enable row level security;

drop policy if exists "control_users_select" on public.control_users;
create policy "control_users_select"
on public.control_users
for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.control_users cu
    where cu.id = (select auth.uid())
      and cu.status = 'active'
      and cu.role_key = 'admin'
  )
);

drop policy if exists "control_users_update_admin" on public.control_users;
create policy "control_users_update_admin"
on public.control_users
for update
to authenticated
using (
  exists (
    select 1
    from public.control_users cu
    where cu.id = (select auth.uid())
      and cu.status = 'active'
      and cu.role_key = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.control_users cu
    where cu.id = (select auth.uid())
      and cu.status = 'active'
      and cu.role_key = 'admin'
  )
);

create or replace function public.bootstrap_control_user(p_full_name text default null)
returns public.control_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_name text := nullif(trim(coalesce(p_full_name, '')), '');
  v_owner_email constant text := 'sirdurotan@gmail.com';
  v_row public.control_users;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if v_email = '' then
    raise exception 'missing_email';
  end if;

  if v_name is null then
    v_name := split_part(v_email, '@', 1);
  end if;

  insert into public.control_users (
    id,
    email,
    full_name,
    role_key,
    status,
    is_owner
  )
  values (
    v_uid,
    v_email,
    v_name,
    case when v_email = v_owner_email then 'admin' else 'cashier' end,
    case when v_email = v_owner_email then 'active' else 'pending' end,
    v_email = v_owner_email
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = case
      when public.control_users.full_name is null or public.control_users.full_name = '' then excluded.full_name
      else public.control_users.full_name
    end
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.bootstrap_control_user(text) from public;
grant execute on function public.bootstrap_control_user(text) to authenticated;

revoke all on public.control_users from anon;
grant select, update on public.control_users to authenticated;

alter table public.app_snapshots enable row level security;

drop policy if exists "app_snapshots_select" on public.app_snapshots;
create policy "app_snapshots_select"
on public.app_snapshots
for select
to authenticated
using (
  exists (
    select 1
    from public.control_users cu
    where cu.id = (select auth.uid())
      and cu.status = 'active'
  )
);

drop policy if exists "app_snapshots_insert" on public.app_snapshots;
create policy "app_snapshots_insert"
on public.app_snapshots
for insert
to authenticated
with check (
  exists (
    select 1
    from public.control_users cu
    where cu.id = (select auth.uid())
      and cu.status = 'active'
  )
);

drop policy if exists "app_snapshots_update" on public.app_snapshots;
create policy "app_snapshots_update"
on public.app_snapshots
for update
to authenticated
using (
  exists (
    select 1
    from public.control_users cu
    where cu.id = (select auth.uid())
      and cu.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.control_users cu
    where cu.id = (select auth.uid())
      and cu.status = 'active'
  )
);

revoke all on public.app_snapshots from anon;
grant select, insert, update on public.app_snapshots to authenticated;
