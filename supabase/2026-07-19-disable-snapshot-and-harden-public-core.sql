create or replace function public.app_public_load_core_state(
  p_session_token text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.app_public_export_snapshot(p_session_token);
$$;

revoke execute on function public.app_public_export_snapshot(text) from anon, authenticated, public;
revoke execute on function public.app_public_save_snapshot(text, jsonb) from anon, authenticated, public;
revoke execute on function public.app_public_session_context(text) from anon, authenticated, public;

grant execute on function public.app_public_load_core_state(text) to anon, authenticated;

revoke all on table public.app_snapshots from anon, authenticated;
revoke all on table public.commerce_module_settings from anon, authenticated;
revoke all on table public.control_user_password_reset_requests from anon, authenticated;
revoke all on table public.control_user_sessions from anon, authenticated;

drop policy if exists app_snapshots_select on public.app_snapshots;
drop policy if exists app_snapshots_insert on public.app_snapshots;
drop policy if exists app_snapshots_update on public.app_snapshots;

create policy app_snapshots_no_direct_access
on public.app_snapshots
for all
to anon, authenticated
using (false)
with check (false);

create policy commerce_module_settings_no_direct_access
on public.commerce_module_settings
for all
to anon, authenticated
using (false)
with check (false);

create policy control_user_password_reset_requests_no_direct_access
on public.control_user_password_reset_requests
for all
to anon, authenticated
using (false)
with check (false);

create policy control_user_sessions_no_direct_access
on public.control_user_sessions
for all
to anon, authenticated
using (false)
with check (false);
