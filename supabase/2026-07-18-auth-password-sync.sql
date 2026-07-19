create or replace function public.app_sync_password_from_auth(
  p_new_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_user public.control_users;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if nullif(trim(coalesce(p_new_pin, '')), '') is null or length(trim(p_new_pin)) < 6 then
    raise exception 'owner_pin_too_short';
  end if;

  select *
  into v_user
  from public.control_users
  where id = v_uid
     or lower(coalesce(email, '')) = v_email
  order by case when id = v_uid then 0 else 1 end
  limit 1;

  if v_user.id is null then
    raise exception 'user_not_found';
  end if;

  update public.control_users
  set
    pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf')),
    last_login_at = now(),
    status = case when status = 'pending' then 'active' else status end
  where id = v_user.id;

  return jsonb_build_object(
    'ok', true,
    'email', v_user.email
  );
end;
$$;

revoke all on function public.app_sync_password_from_auth(text) from public;
grant execute on function public.app_sync_password_from_auth(text) to authenticated;
