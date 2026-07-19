create or replace function public.app_public_load_core_state(p_session_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $function$
begin
  return public.app_public_export_snapshot(p_session_token);
end;
$function$;

grant execute on function public.app_public_load_core_state(text) to anon, authenticated;
grant execute on function public.app_public_export_snapshot(text) to anon, authenticated;
