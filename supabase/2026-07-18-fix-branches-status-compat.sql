alter table public.branches
  add column if not exists status text not null default 'active';

update public.branches
set status = case
  when coalesce(is_active, true) then 'active'
  else 'disabled'
end
where status is distinct from case
  when coalesce(is_active, true) then 'active'
  else 'disabled'
end;

alter table public.branches
  drop constraint if exists branches_status_check;

alter table public.branches
  add constraint branches_status_check
  check (status in ('active', 'disabled'));

alter table public.registers
  add column if not exists status text not null default 'active';

update public.registers
set status = case
  when coalesce(is_active, true) then 'active'
  else 'disabled'
end
where status is distinct from case
  when coalesce(is_active, true) then 'active'
  else 'disabled'
end;

alter table public.registers
  drop constraint if exists registers_status_check;

alter table public.registers
  add constraint registers_status_check
  check (status in ('active', 'disabled'));
