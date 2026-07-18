create table if not exists public.control_user_password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.control_users(id) on delete cascade,
  email text not null,
  requested_at timestamptz not null default now(),
  status text not null default 'pending',
  channel text not null default 'email',
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_control_user_password_reset_requests_user_id
  on public.control_user_password_reset_requests(user_id, requested_at desc);

create or replace function public.app_public_request_password_reset(
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_user public.control_users;
begin
  if nullif(v_email, '') is null then
    raise exception 'email_required';
  end if;

  select *
  into v_user
  from public.control_users
  where lower(coalesce(email, '')) = v_email
  limit 1;

  if v_user.id is not null then
    insert into public.control_user_password_reset_requests (
      user_id,
      email,
      metadata
    )
    values (
      v_user.id,
      v_email,
      jsonb_build_object(
        'source', 'public_login',
        'delivery_status', 'pending_email_setup'
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'Si existe una cuenta con ese correo, te ayudaremos a recuperar el acceso.'
  );
end;
$$;

grant execute on function public.app_public_request_password_reset(text) to anon, authenticated;
