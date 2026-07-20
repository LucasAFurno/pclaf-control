create or replace function public.app_public_platform_overview(
  p_session_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.control_user_sessions;
  v_user public.control_users;
begin
  select *
  into v_session
  from public.control_user_sessions
  where token = public.app_try_uuid(p_session_token)
    and revoked_at is null
    and expires_at > now()
  limit 1;

  if v_session.token is null then
    raise exception 'session_not_found';
  end if;

  select *
  into v_user
  from public.control_users
  where id = v_session.user_id
  limit 1;

  if v_user.id is null or v_user.status <> 'active' then
    raise exception 'user_inactive';
  end if;

  if not coalesce(v_user.is_platform_admin, false) then
    raise exception 'platform_admin_required';
  end if;

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'total_commerces', (select count(*) from public.commerce_accounts),
      'trial_commerces', (select count(*) from public.commerce_accounts where billing_status = 'trial'),
      'active_commerces', (select count(*) from public.commerce_accounts where status = 'active'),
      'paused_commerces', (select count(*) from public.commerce_accounts where status = 'paused' or billing_status = 'paused'),
      'expired_commerces', (select count(*) from public.commerce_accounts where billing_status in ('past_due', 'cancelled')),
      'total_users', (select count(*) from public.control_users),
      'total_branches', (select count(*) from public.branches),
      'total_registers', (select count(*) from public.registers)
    ),
    'commerces', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', commerce.id,
        'name', commerce.name,
        'instance_key', commerce.instance_key,
        'owner_email', commerce.owner_email,
        'active_plan', commerce.active_plan,
        'status', commerce.status,
        'billing_status', commerce.billing_status,
        'onboarding_status', commerce.onboarding_status,
        'allow_public_signup', commerce.allow_public_signup,
        'trial_started_at', commerce.trial_started_at,
        'trial_ends_at', commerce.trial_ends_at,
        'created_at', commerce.created_at,
        'updated_at', commerce.updated_at,
        'last_access_at', (
          select max(cu.last_login_at)
          from public.commerce_memberships cm
          join public.control_users cu on cu.id = cm.user_id
          where cm.commerce_id = commerce.id
        ),
        'branches_count', (select count(*) from public.branches where commerce_id = commerce.id),
        'registers_count', (select count(*) from public.registers where commerce_id = commerce.id),
        'users_count', (select count(*) from public.commerce_memberships where commerce_id = commerce.id and status = 'active'),
        'support_owner', coalesce(commerce.settings_json -> 'platformAdmin' ->> 'supportOwner', ''),
        'support_status', coalesce(commerce.settings_json -> 'platformAdmin' ->> 'supportStatus', 'pendiente'),
        'billing_note', coalesce(commerce.settings_json -> 'platformAdmin' ->> 'billingNote', ''),
        'commercial_note', coalesce(commerce.settings_json -> 'platformAdmin' ->> 'commercialNote', ''),
        'internal_tag', coalesce(commerce.settings_json -> 'platformAdmin' ->> 'internalTag', ''),
        'enabled_modules', public.app_effective_enabled_modules(commerce.id),
        'branches', coalesce((select jsonb_agg(jsonb_build_object('id', branch.id, 'name', branch.name, 'code', branch.code, 'address', branch.address, 'is_active', branch.is_active) order by branch.created_at asc) from public.branches branch where branch.commerce_id = commerce.id), '[]'::jsonb),
        'registers', coalesce((select jsonb_agg(jsonb_build_object('id', register.id, 'branch_id', register.branch_id, 'name', register.name, 'code', register.code, 'is_active', register.is_active) order by register.created_at asc) from public.registers register where register.commerce_id = commerce.id), '[]'::jsonb),
        'users', coalesce((select jsonb_agg(jsonb_build_object('id', cu.id, 'full_name', cu.full_name, 'email', cu.email, 'role_key', cm.role_key, 'status', cm.status, 'is_owner', cm.is_owner, 'last_login_at', cu.last_login_at) order by cm.is_owner desc, cu.created_at asc) from public.commerce_memberships cm join public.control_users cu on cu.id = cm.user_id where cm.commerce_id = commerce.id), '[]'::jsonb)
      ) order by commerce.created_at desc)
      from public.commerce_accounts commerce
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.app_public_platform_update_commerce(
  p_session_token text,
  p_commerce_id uuid,
  p_active_plan text default null,
  p_status text default null,
  p_billing_status text default null,
  p_allow_public_signup boolean default null,
  p_support_owner text default null,
  p_support_status text default null,
  p_internal_tag text default null,
  p_commercial_note text default null,
  p_billing_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.control_user_sessions;
  v_user public.control_users;
  v_commerce public.commerce_accounts;
  v_platform_admin jsonb;
begin
  select *
  into v_session
  from public.control_user_sessions
  where token = public.app_try_uuid(p_session_token)
    and revoked_at is null
    and expires_at > now()
  limit 1;

  if v_session.token is null then
    raise exception 'session_not_found';
  end if;

  select *
  into v_user
  from public.control_users
  where id = v_session.user_id
  limit 1;

  if v_user.id is null or v_user.status <> 'active' then
    raise exception 'user_inactive';
  end if;

  if not coalesce(v_user.is_platform_admin, false) then
    raise exception 'platform_admin_required';
  end if;

  select coalesce(settings_json -> 'platformAdmin', '{}'::jsonb)
  into v_platform_admin
  from public.commerce_accounts
  where id = p_commerce_id
  limit 1;

  update public.commerce_accounts
  set
    active_plan = coalesce(nullif(trim(coalesce(p_active_plan, '')), ''), active_plan),
    status = coalesce(nullif(trim(coalesce(p_status, '')), ''), status),
    billing_status = coalesce(nullif(trim(coalesce(p_billing_status, '')), ''), billing_status),
    allow_public_signup = coalesce(p_allow_public_signup, allow_public_signup),
    settings_json = jsonb_set(
      coalesce(settings_json, '{}'::jsonb),
      '{platformAdmin}',
      coalesce(v_platform_admin, '{}'::jsonb) || jsonb_build_object(
        'supportOwner', coalesce(p_support_owner, v_platform_admin ->> 'supportOwner', ''),
        'supportStatus', coalesce(nullif(trim(coalesce(p_support_status, '')), ''), v_platform_admin ->> 'supportStatus', 'pendiente'),
        'internalTag', coalesce(p_internal_tag, v_platform_admin ->> 'internalTag', ''),
        'commercialNote', coalesce(p_commercial_note, v_platform_admin ->> 'commercialNote', ''),
        'billingNote', coalesce(p_billing_note, v_platform_admin ->> 'billingNote', '')
      ),
      true
    ),
    updated_at = now()
  where id = p_commerce_id
  returning * into v_commerce;

  if v_commerce.id is null then
    raise exception 'commerce_not_found';
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'Comercio actualizado.',
    'commerce_id', v_commerce.id
  );
end;
$$;
