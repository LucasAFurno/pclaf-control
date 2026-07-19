-- Harden public function surface after removing snapshot web flow
revoke execute on function public.app_public_load_core_state(text) from public;
revoke execute on function public.app_public_request_password_reset(text) from public;
revoke execute on function public.app_public_update_commerce_runtime(text, text, jsonb, boolean) from public;

grant execute on function public.app_public_load_core_state(text) to anon, authenticated;
grant execute on function public.app_public_request_password_reset(text) to anon, authenticated;
grant execute on function public.app_public_update_commerce_runtime(text, text, jsonb, boolean) to authenticated;

alter function public.touch_control_users_updated_at() set search_path = public, extensions;
alter function public.app_try_uuid(text) set search_path = public, extensions;
alter function public.touch_updated_at() set search_path = public, extensions;
alter function public.app_user_has_commerce_access(uuid) set search_path = public, extensions;
alter function public.app_user_is_commerce_admin(uuid) set search_path = public, extensions;
alter function public.app_user_can_access_branch(uuid, uuid) set search_path = public, extensions;
alter function public.current_commerce_context() set search_path = public, extensions;
alter function public.app_slugify(text) set search_path = public, extensions;
alter function public.app_role_id(text) set search_path = public, extensions;
alter function public.app_role_key_from_role_id(text, text) set search_path = public, extensions;
alter function public.app_sign_amount(text, numeric) set search_path = public, extensions;
alter function public.app_pick_login(text, text, text, uuid) set search_path = public, extensions;
alter function public.app_public_load_core_state(text) set search_path = public, extensions;
