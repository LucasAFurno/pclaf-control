alter table public.commerce_accounts
  drop constraint if exists commerce_accounts_active_plan_check;

alter table public.commerce_accounts
  add constraint commerce_accounts_active_plan_check
  check (active_plan in ('basic', 'retail', 'full', 'multi', 'custom'));

create or replace function public.app_public_session_context(
  p_session_token text
)
returns table (
  session_token uuid,
  session_user_id uuid,
  session_commerce_id uuid,
  session_role_key text,
  session_is_owner boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.control_user_sessions;
  v_user public.control_users;
  v_membership public.commerce_memberships;
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
  where id = v_session.user_id;

  if v_user.id is null or v_user.status <> 'active' then
    raise exception 'user_inactive';
  end if;

  select *
  into v_membership
  from public.commerce_memberships
  where commerce_id = v_session.commerce_id
    and user_id = v_session.user_id
    and status = 'active'
  order by is_owner desc, updated_at desc
  limit 1;

  if v_membership.id is null then
    raise exception 'membership_not_found';
  end if;

  return query
  select
    v_session.token,
    v_user.id,
    v_session.commerce_id,
    coalesce(v_membership.role_key, v_user.role_key, 'cashier'),
    coalesce(v_membership.is_owner, v_user.is_owner, false);
end;
$$;

create or replace function public.app_public_update_commerce_profile(
  p_session_token text,
  p_name text default null,
  p_owner_email text default null,
  p_legal_name text default null,
  p_active_plan text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_commerce public.commerce_accounts;
  v_active_plan text := lower(coalesce(nullif(trim(p_active_plan), ''), ''));
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if not coalesce(v_ctx.session_is_owner, false) then
    raise exception 'owner_required';
  end if;

  if v_active_plan <> '' and v_active_plan not in ('basic', 'retail', 'full', 'multi', 'custom') then
    raise exception 'invalid_active_plan';
  end if;

  update public.commerce_accounts
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    owner_email = coalesce(nullif(lower(trim(p_owner_email)), ''), owner_email),
    legal_name = coalesce(nullif(trim(p_legal_name), ''), legal_name),
    active_plan = coalesce(nullif(v_active_plan, ''), active_plan),
    updated_at = now()
  where id = v_ctx.session_commerce_id
  returning * into v_commerce;

  return jsonb_build_object(
    'id', v_commerce.id,
    'commerce_name', v_commerce.name,
    'owner_email', v_commerce.owner_email,
    'legal_name', v_commerce.legal_name,
    'active_plan', v_commerce.active_plan,
    'status', v_commerce.status,
    'instance_key', v_commerce.instance_key
  );
end;
$$;

create or replace function public.app_public_upsert_customer(
  p_session_token text,
  p_customer_id text default null,
  p_full_name text default null,
  p_phone text default null,
  p_email text default null,
  p_balance numeric default 0,
  p_tag text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_customer public.customers;
  v_customer_id uuid := coalesce(public.app_try_uuid(p_customer_id), gen_random_uuid());
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if coalesce(v_ctx.session_role_key, 'cashier') not in ('owner', 'admin', 'cashier') then
    raise exception 'permission_denied';
  end if;

  if nullif(trim(coalesce(p_full_name, '')), '') is null then
    raise exception 'customer_name_required';
  end if;

  if exists (
    select 1
    from public.customers
    where id = v_customer_id
      and commerce_id <> v_ctx.session_commerce_id
  ) then
    raise exception 'customer_not_in_commerce';
  end if;

  insert into public.customers (
    id,
    commerce_id,
    full_name,
    phone,
    email,
    balance,
    tag,
    notes,
    is_active
  )
  values (
    v_customer_id,
    v_ctx.session_commerce_id,
    trim(p_full_name),
    trim(coalesce(p_phone, '')),
    lower(trim(coalesce(p_email, ''))),
    coalesce(p_balance, 0),
    trim(coalesce(p_tag, '')),
    trim(coalesce(p_notes, '')),
    true
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    balance = excluded.balance,
    tag = excluded.tag,
    notes = excluded.notes,
    updated_at = now()
  where public.customers.commerce_id = v_ctx.session_commerce_id
  returning * into v_customer;

  if v_customer.id is null then
    raise exception 'customer_save_failed';
  end if;

  return jsonb_build_object(
    'id', v_customer.id,
    'full_name', v_customer.full_name,
    'phone', v_customer.phone,
    'email', v_customer.email,
    'balance', v_customer.balance,
    'tag', v_customer.tag,
    'notes', v_customer.notes,
    'is_active', v_customer.is_active,
    'created_at', v_customer.created_at,
    'updated_at', v_customer.updated_at
  );
end;
$$;

create or replace function public.app_public_upsert_user(
  p_session_token text,
  p_user_id text default null,
  p_full_name text default null,
  p_role_key text default 'cashier',
  p_email text default null,
  p_pin text default null,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_user public.control_users;
  v_membership public.commerce_memberships;
  v_user_id uuid := public.app_try_uuid(p_user_id);
  v_role_key text := lower(coalesce(nullif(trim(p_role_key), ''), 'cashier'));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_full_name text := trim(coalesce(p_full_name, ''));
  v_login_name text;
  v_pin_hash text;
  v_status text := case when coalesce(p_is_active, true) then 'active' else 'disabled' end;
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if not coalesce(v_ctx.session_is_owner, false) then
    raise exception 'owner_required';
  end if;

  if v_full_name = '' then
    raise exception 'user_name_required';
  end if;

  if v_email = '' then
    raise exception 'user_email_required';
  end if;

  if v_role_key not in ('admin', 'cashier', 'warehouse') then
    raise exception 'invalid_role_key';
  end if;

  if v_user_id is null and nullif(coalesce(p_pin, ''), '') is null then
    raise exception 'pin_required';
  end if;

  if nullif(coalesce(p_pin, ''), '') is not null and length(p_pin) < 4 then
    raise exception 'pin_too_short';
  end if;

  if v_user_id is not null then
    select *
    into v_membership
    from public.commerce_memberships
    where commerce_id = v_ctx.session_commerce_id
      and user_id = v_user_id
    limit 1;

    if v_membership.id is null then
      raise exception 'user_not_in_commerce';
    end if;

    select *
    into v_user
    from public.control_users
    where id = v_user_id;

    if v_user.id is null then
      raise exception 'user_not_found';
    end if;

    if v_ctx.session_user_id = v_user_id and coalesce(p_is_active, true) = false then
      raise exception 'cannot_disable_current_session';
    end if;
  else
    v_user_id := gen_random_uuid();
  end if;

  if exists (
    select 1
    from public.control_users
    where lower(email) = v_email
      and id <> v_user_id
  ) then
    raise exception 'email_already_exists';
  end if;

  v_login_name := public.app_pick_login(v_email, null, v_full_name, v_user_id);
  v_pin_hash := case
    when nullif(coalesce(p_pin, ''), '') is not null then extensions.crypt(p_pin, extensions.gen_salt('bf'))
    else null
  end;

  insert into public.control_users (
    id,
    email,
    login_name,
    full_name,
    role_key,
    status,
    is_owner,
    pin_hash,
    active_commerce_id
  )
  values (
    v_user_id,
    v_email,
    v_login_name,
    v_full_name,
    case when coalesce(v_membership.is_owner, false) then 'admin' else v_role_key end,
    case when coalesce(v_membership.is_owner, false) then 'active' else v_status end,
    coalesce(v_membership.is_owner, false),
    v_pin_hash,
    v_ctx.session_commerce_id
  )
  on conflict (id) do update
  set
    email = excluded.email,
    login_name = excluded.login_name,
    full_name = excluded.full_name,
    role_key = case when public.control_users.is_owner then public.control_users.role_key else excluded.role_key end,
    status = case when public.control_users.is_owner then 'active' else excluded.status end,
    pin_hash = coalesce(excluded.pin_hash, public.control_users.pin_hash),
    active_commerce_id = coalesce(public.control_users.active_commerce_id, excluded.active_commerce_id),
    updated_at = now()
  returning * into v_user;

  insert into public.commerce_memberships (
    commerce_id,
    user_id,
    role_key,
    status,
    is_owner
  )
  values (
    v_ctx.session_commerce_id,
    v_user.id,
    case when coalesce(v_membership.is_owner, false) then 'admin' else v_role_key end,
    case when coalesce(v_membership.is_owner, false) then 'active' else v_status end,
    coalesce(v_membership.is_owner, false)
  )
  on conflict (commerce_id, user_id) do update
  set
    role_key = case when public.commerce_memberships.is_owner then public.commerce_memberships.role_key else excluded.role_key end,
    status = case when public.commerce_memberships.is_owner then 'active' else excluded.status end,
    updated_at = now()
  returning * into v_membership;

  return jsonb_build_object(
    'id', v_user.id,
    'full_name', v_user.full_name,
    'email', v_user.email,
    'role_key', coalesce(v_membership.role_key, v_user.role_key),
    'status', coalesce(v_membership.status, v_user.status),
    'is_owner', coalesce(v_membership.is_owner, v_user.is_owner),
    'login_name', coalesce(v_user.login_name, ''),
    'created_at', v_user.created_at,
    'updated_at', v_user.updated_at
  );
end;
$$;

create or replace function public.app_public_toggle_user_active(
  p_session_token text,
  p_user_id text,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_user public.control_users;
  v_membership public.commerce_memberships;
  v_user_id uuid := public.app_try_uuid(p_user_id);
  v_status text := case when coalesce(p_is_active, true) then 'active' else 'disabled' end;
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if not coalesce(v_ctx.session_is_owner, false) then
    raise exception 'owner_required';
  end if;

  if v_user_id is null then
    raise exception 'user_not_found';
  end if;

  if v_ctx.session_user_id = v_user_id and coalesce(p_is_active, true) = false then
    raise exception 'cannot_disable_current_session';
  end if;

  select *
  into v_membership
  from public.commerce_memberships
  where commerce_id = v_ctx.session_commerce_id
    and user_id = v_user_id
  limit 1;

  if v_membership.id is null then
    raise exception 'user_not_in_commerce';
  end if;

  select *
  into v_user
  from public.control_users
  where id = v_user_id;

  if v_user.id is null then
    raise exception 'user_not_found';
  end if;

  if coalesce(v_membership.is_owner, false) and coalesce(p_is_active, true) = false then
    raise exception 'cannot_disable_owner';
  end if;

  update public.control_users
  set
    status = case when is_owner then 'active' else v_status end,
    updated_at = now()
  where id = v_user_id
  returning * into v_user;

  update public.commerce_memberships
  set
    status = case when is_owner then 'active' else v_status end,
    updated_at = now()
  where commerce_id = v_ctx.session_commerce_id
    and user_id = v_user_id
  returning * into v_membership;

  return jsonb_build_object(
    'id', v_user.id,
    'full_name', v_user.full_name,
    'email', v_user.email,
    'role_key', coalesce(v_membership.role_key, v_user.role_key),
    'status', coalesce(v_membership.status, v_user.status),
    'is_owner', coalesce(v_membership.is_owner, v_user.is_owner),
    'login_name', coalesce(v_user.login_name, ''),
    'created_at', v_user.created_at,
    'updated_at', v_user.updated_at
  );
end;
$$;

revoke all on function public.app_public_session_context(text) from public;
revoke all on function public.app_public_update_commerce_profile(text, text, text, text, text) from public;
revoke all on function public.app_public_upsert_customer(text, text, text, text, text, numeric, text, text) from public;
revoke all on function public.app_public_upsert_user(text, text, text, text, text, text, boolean) from public;
revoke all on function public.app_public_toggle_user_active(text, text, boolean) from public;

grant execute on function public.app_public_session_context(text) to anon, authenticated;
grant execute on function public.app_public_update_commerce_profile(text, text, text, text, text) to anon, authenticated;
grant execute on function public.app_public_upsert_customer(text, text, text, text, text, numeric, text, text) to anon, authenticated;
grant execute on function public.app_public_upsert_user(text, text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.app_public_toggle_user_active(text, text, boolean) to anon, authenticated;
