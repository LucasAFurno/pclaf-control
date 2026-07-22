alter table public.commerce_accounts
  add column if not exists billing_status text not null default 'trial',
  add column if not exists onboarding_status text not null default 'ready',
  add column if not exists trial_started_at timestamptz not null default now(),
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '180 days'),
  add column if not exists allow_public_signup boolean not null default true;

alter table public.commerce_accounts
  drop constraint if exists commerce_accounts_billing_status_check;

alter table public.commerce_accounts
  add constraint commerce_accounts_billing_status_check
  check (billing_status in ('trial', 'active', 'past_due', 'paused', 'cancelled'));

alter table public.commerce_accounts
  drop constraint if exists commerce_accounts_onboarding_status_check;

alter table public.commerce_accounts
  add constraint commerce_accounts_onboarding_status_check
  check (onboarding_status in ('draft', 'ready', 'live', 'paused'));

create table if not exists public.commerce_module_settings (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references public.commerce_accounts(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  source text not null default 'plan',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (commerce_id, module_key)
);

alter table public.commerce_module_settings
  drop constraint if exists commerce_module_settings_module_key_check;

alter table public.commerce_module_settings
  add constraint commerce_module_settings_module_key_check
  check (module_key in ('dashboard', 'customers', 'sales', 'cash', 'branches', 'registers', 'products', 'purchases', 'invoices', 'tickets', 'reports', 'settings'));

alter table public.commerce_module_settings
  drop constraint if exists commerce_module_settings_source_check;

alter table public.commerce_module_settings
  add constraint commerce_module_settings_source_check
  check (source in ('plan', 'custom', 'system'));

alter table public.commerce_module_settings enable row level security;
alter table public.control_user_sessions enable row level security;

create or replace function public.app_plan_module_keys(
  p_active_plan text default 'full'
)
returns jsonb
language sql
immutable
as $$
  select case lower(coalesce(nullif(trim(p_active_plan), ''), 'full'))
    when 'basic' then '["dashboard","products","purchases","invoices","settings"]'::jsonb
    when 'retail' then '["dashboard","customers","sales","cash","products","invoices","settings"]'::jsonb
    when 'multi' then '["dashboard","customers","sales","cash","branches","registers","products","purchases","invoices","tickets","reports","settings"]'::jsonb
    else '["dashboard","customers","sales","cash","products","purchases","invoices","reports","settings"]'::jsonb
  end;
$$;

create or replace function public.app_effective_enabled_modules(
  p_commerce_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_modules jsonb;
  v_commerce public.commerce_accounts;
begin
  select coalesce(
    jsonb_agg(module_key order by sort_order),
    '[]'::jsonb
  )
  into v_modules
  from (
    select
      cms.module_key,
      case cms.module_key
        when 'dashboard' then 1
        when 'customers' then 2
        when 'sales' then 3
        when 'cash' then 4
        when 'branches' then 5
        when 'registers' then 6
        when 'products' then 7
        when 'purchases' then 8
        when 'invoices' then 9
        when 'tickets' then 10
        when 'reports' then 11
        when 'settings' then 12
        else 999
      end as sort_order
    from public.commerce_module_settings cms
    where cms.commerce_id = p_commerce_id
      and cms.enabled = true
  ) ordered_modules;

  if jsonb_array_length(v_modules) > 0 then
    return v_modules;
  end if;

  select *
  into v_commerce
  from public.commerce_accounts
  where id = p_commerce_id;

  if v_commerce.id is null then
    return public.app_plan_module_keys('full');
  end if;

  if jsonb_typeof(v_commerce.settings_json -> 'enabledModules') = 'array'
     and jsonb_array_length(v_commerce.settings_json -> 'enabledModules') > 0 then
    return v_commerce.settings_json -> 'enabledModules';
  end if;

  return public.app_plan_module_keys(v_commerce.active_plan);
end;
$$;

create or replace function public.app_sync_commerce_modules(
  p_commerce_id uuid,
  p_active_plan text,
  p_enabled_modules jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_all_modules text[] := array['dashboard', 'customers', 'sales', 'cash', 'branches', 'registers', 'products', 'purchases', 'invoices', 'tickets', 'reports', 'settings'];
  v_selected_modules text[] := array[]::text[];
  v_source text := case when jsonb_typeof(p_enabled_modules) = 'array' and jsonb_array_length(p_enabled_modules) > 0 then 'custom' else 'plan' end;
begin
  if jsonb_typeof(p_enabled_modules) = 'array' and jsonb_array_length(p_enabled_modules) > 0 then
    select coalesce(array_agg(distinct trimmed_key), array[]::text[])
    into v_selected_modules
    from (
      select trim(value) as trimmed_key
      from jsonb_array_elements_text(p_enabled_modules) as value
    ) normalized
    where trimmed_key = any (v_all_modules);
  else
    select coalesce(array_agg(value), array[]::text[])
    into v_selected_modules
    from jsonb_array_elements_text(public.app_plan_module_keys(p_active_plan)) as value;
  end if;

  if not ('dashboard' = any (v_selected_modules)) then
    v_selected_modules := array_append(v_selected_modules, 'dashboard');
  end if;

  if not ('settings' = any (v_selected_modules)) then
    v_selected_modules := array_append(v_selected_modules, 'settings');
  end if;

  insert into public.commerce_module_settings (
    commerce_id,
    module_key,
    enabled,
    source
  )
  select
    p_commerce_id,
    module_key,
    module_key = any (v_selected_modules),
    v_source
  from unnest(v_all_modules) as module_key
  on conflict (commerce_id, module_key) do update
  set
    enabled = excluded.enabled,
    source = excluded.source,
    updated_at = now();

  update public.commerce_accounts
  set
    settings_json = jsonb_strip_nulls(
      coalesce(settings_json, '{}'::jsonb)
      || jsonb_build_object('enabledModules', public.app_effective_enabled_modules(p_commerce_id))
    ),
    updated_at = now()
  where id = p_commerce_id;

  return public.app_effective_enabled_modules(p_commerce_id);
end;
$$;

do $$
declare
  v_commerce record;
begin
  for v_commerce in
    select
      id,
      active_plan,
      case
        when jsonb_typeof(settings_json -> 'enabledModules') = 'array' and jsonb_array_length(settings_json -> 'enabledModules') > 0
          then settings_json -> 'enabledModules'
        else null
      end as enabled_modules
    from public.commerce_accounts
  loop
    perform public.app_sync_commerce_modules(v_commerce.id, v_commerce.active_plan, v_commerce.enabled_modules);
  end loop;
end;
$$;

create or replace function public.app_setup_instance(
  p_instance_key text,
  p_commerce_name text,
  p_owner_name text,
  p_owner_login text,
  p_owner_email text,
  p_owner_pin text,
  p_branch_name text,
  p_branch_code text default 'CASA',
  p_register_name text default 'Caja 1',
  p_register_code text default 'CAJA-01'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instance_key text := lower(coalesce(nullif(trim(p_instance_key), ''), 'principal'));
  v_commerce public.commerce_accounts;
  v_existing_count integer := 0;
  v_user_id uuid := gen_random_uuid();
  v_branch_id uuid := gen_random_uuid();
  v_register_id uuid := gen_random_uuid();
  v_login_name text;
  v_token uuid;
begin
  if nullif(trim(coalesce(p_commerce_name, '')), '') is null then
    raise exception 'commerce_name_required';
  end if;
  if nullif(trim(coalesce(p_owner_name, '')), '') is null then
    raise exception 'owner_name_required';
  end if;
  if nullif(trim(coalesce(p_owner_pin, '')), '') is null or length(trim(p_owner_pin)) < 6 then
    raise exception 'owner_pin_too_short';
  end if;

  select *
  into v_commerce
  from public.commerce_accounts
  where lower(instance_key) = v_instance_key
  limit 1;

  if v_commerce.id is not null then
    select count(*)
    into v_existing_count
    from public.commerce_memberships
    where commerce_id = v_commerce.id;

    if v_existing_count > 0 then
      raise exception 'instance_already_initialized';
    end if;
  end if;

  v_login_name := public.app_pick_login(p_owner_email, p_owner_login, p_owner_name, v_user_id);

  if exists (
    select 1 from public.control_users
    where lower(coalesce(login_name, '')) = lower(v_login_name)
  ) then
    raise exception 'login_name_already_exists';
  end if;

  if v_commerce.id is null then
    insert into public.commerce_accounts (
      id,
      instance_key,
      name,
      slug,
      legal_name,
      owner_email,
      active_plan,
      status,
      billing_status,
      onboarding_status,
      trial_started_at,
      trial_ends_at,
      allow_public_signup,
      settings_json
    )
    values (
      gen_random_uuid(),
      v_instance_key,
      trim(p_commerce_name),
      coalesce(nullif(public.app_slugify(p_commerce_name), ''), 'control') || '-' || v_instance_key,
      trim(coalesce(p_commerce_name, '')),
      lower(trim(coalesce(p_owner_email, ''))),
      'full',
      'active',
      'trial',
      'ready',
      now(),
      now() + interval '180 days',
      true,
      jsonb_build_object(
        'documentCounters', jsonb_build_object(
          'invoiceA', 1,
          'invoiceB', 1,
          'invoiceC', 1,
          'quote', 1,
          'remito', 1,
          'creditNoteA', 1,
          'creditNoteB', 1,
          'creditNoteC', 1,
          'receipt', 1,
          'ticket', 1
        )
      )
    )
    returning * into v_commerce;
  else
    update public.commerce_accounts
    set
      name = trim(p_commerce_name),
      legal_name = trim(coalesce(p_commerce_name, '')),
      owner_email = lower(trim(coalesce(p_owner_email, ''))),
      active_plan = 'full',
      status = 'active',
      billing_status = coalesce(nullif(billing_status, ''), 'trial'),
      onboarding_status = coalesce(nullif(onboarding_status, ''), 'ready'),
      allow_public_signup = true
    where id = v_commerce.id
    returning * into v_commerce;
  end if;

  perform public.app_sync_commerce_modules(v_commerce.id, 'full', null);

  insert into public.control_users (
    id,
    email,
    login_name,
    full_name,
    role_key,
    status,
    is_owner,
    pin_hash,
    active_commerce_id,
    active_branch_id,
    assigned_register_id
  )
  values (
    v_user_id,
    lower(trim(coalesce(p_owner_email, ''))),
    v_login_name,
    trim(p_owner_name),
    'admin',
    'active',
    true,
    extensions.crypt(p_owner_pin, extensions.gen_salt('bf')),
    v_commerce.id,
    v_branch_id,
    v_register_id
  );

  insert into public.commerce_memberships (
    commerce_id,
    user_id,
    role_key,
    status,
    is_owner
  )
  values (
    v_commerce.id,
    v_user_id,
    'admin',
    'active',
    true
  );

  insert into public.branches (
    id,
    commerce_id,
    code,
    name,
    address,
    is_active
  )
  values (
    v_branch_id,
    v_commerce.id,
    upper(coalesce(nullif(trim(p_branch_code), ''), 'CASA')),
    trim(coalesce(p_branch_name, 'Casa central')),
    '',
    true
  );

  insert into public.registers (
    id,
    commerce_id,
    branch_id,
    code,
    name,
    cashier_user_id,
    is_active
  )
  values (
    v_register_id,
    v_commerce.id,
    v_branch_id,
    upper(coalesce(nullif(trim(p_register_code), ''), 'CAJA-01')),
    trim(coalesce(p_register_name, 'Caja 1')),
    v_user_id,
    true
  );

  insert into public.control_user_sessions (
    token,
    user_id,
    commerce_id
  )
  values (
    gen_random_uuid(),
    v_user_id,
    v_commerce.id
  )
  returning token into v_token;

  return public.app_build_public_session_payload(v_token, v_user_id, v_commerce.id);
end;
$$;

create or replace function public.app_build_public_session_payload(
  p_token uuid,
  p_user_id uuid,
  p_commerce_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.control_users;
  v_membership public.commerce_memberships;
  v_commerce public.commerce_accounts;
begin
  select *
  into v_user
  from public.control_users
  where id = p_user_id;

  select *
  into v_membership
  from public.commerce_memberships
  where commerce_id = p_commerce_id
    and user_id = p_user_id
  order by is_owner desc, updated_at desc
  limit 1;

  select *
  into v_commerce
  from public.commerce_accounts
  where id = p_commerce_id;

  if v_user.id is null or v_membership.id is null or v_commerce.id is null then
    raise exception 'session_not_found';
  end if;

  return jsonb_build_object(
    'session_token', p_token,
    'profile', jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'login_name', coalesce(v_user.login_name, ''),
      'full_name', v_user.full_name,
      'role_key', coalesce(v_membership.role_key, v_user.role_key, 'cashier'),
      'status', v_membership.status,
      'is_owner', coalesce(v_membership.is_owner, v_user.is_owner, false),
      'active_branch_id', v_user.active_branch_id,
      'assigned_register_id', v_user.assigned_register_id
    ),
    'commerce_context', jsonb_build_object(
      'commerce_id', v_commerce.id,
      'instance_key', v_commerce.instance_key,
      'commerce_name', v_commerce.name,
      'legal_name', v_commerce.legal_name,
      'owner_email', v_commerce.owner_email,
      'active_plan', v_commerce.active_plan,
      'status', v_commerce.status,
      'billing_status', v_commerce.billing_status,
      'onboarding_status', v_commerce.onboarding_status,
      'trial_ends_at', v_commerce.trial_ends_at,
      'allow_public_signup', v_commerce.allow_public_signup
    )
  );
end;
$$;

create or replace function public.app_public_update_commerce_runtime(
  p_session_token text,
  p_active_plan text default null,
  p_enabled_modules jsonb default null,
  p_allow_public_signup boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_commerce public.commerce_accounts;
  v_active_plan text := lower(coalesce(nullif(trim(p_active_plan), ''), 'custom'));
  v_modules jsonb;
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if not coalesce(v_ctx.session_is_owner, false) then
    raise exception 'owner_required';
  end if;

  if v_active_plan not in ('basic', 'retail', 'full', 'multi', 'custom') then
    raise exception 'invalid_active_plan';
  end if;

  update public.commerce_accounts
  set
    active_plan = v_active_plan,
    allow_public_signup = coalesce(p_allow_public_signup, allow_public_signup),
    updated_at = now()
  where id = v_ctx.session_commerce_id
  returning * into v_commerce;

  v_modules := public.app_sync_commerce_modules(
    v_ctx.session_commerce_id,
    v_active_plan,
    case
      when v_active_plan = 'custom' then p_enabled_modules
      else null
    end
  );

  return jsonb_build_object(
    'commerce_id', v_commerce.id,
    'active_plan', v_commerce.active_plan,
    'enabled_modules', v_modules,
    'billing_status', v_commerce.billing_status,
    'onboarding_status', v_commerce.onboarding_status,
    'trial_ends_at', v_commerce.trial_ends_at,
    'allow_public_signup', v_commerce.allow_public_signup
  );
end;
$$;

create or replace function public.app_public_export_snapshot(
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
  v_commerce public.commerce_accounts;
  v_membership public.commerce_memberships;
  v_is_admin boolean := false;
  v_roles jsonb := jsonb_build_array(
    jsonb_build_object('id', 'role-admin', 'key', 'admin', 'name', 'Administrador', 'permissions', jsonb_build_array('dashboard:view','customers:view','sales:view','cash:view','branches:view','registers:view','products:view','purchases:view','invoices:view','tickets:view','reports:view','settings:view','customers:write','sales:write','cash:operate','branches:manage','registers:manage','products:write','products:adjust','products:transfer','purchases:write','invoices:write','tickets:write','reports:export','settings:manage')),
    jsonb_build_object('id', 'role-cashier', 'key', 'cashier', 'name', 'Caja', 'permissions', jsonb_build_array('dashboard:view','customers:view','sales:view','cash:view','invoices:view','reports:view','customers:write','sales:write','cash:operate','invoices:write')),
    jsonb_build_object('id', 'role-warehouse', 'key', 'warehouse', 'name', 'Deposito', 'permissions', jsonb_build_array('dashboard:view','customers:view','products:view','purchases:view','tickets:view','reports:view','customers:write','products:write','products:adjust','products:transfer','purchases:write','tickets:write'))
  );
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

  select * into v_user from public.control_users where id = v_session.user_id;
  select * into v_commerce from public.commerce_accounts where id = v_session.commerce_id;
  select *
  into v_membership
  from public.commerce_memberships
  where commerce_id = v_session.commerce_id
    and user_id = v_session.user_id
    and status = 'active'
  order by is_owner desc, updated_at desc
  limit 1;

  if v_membership.id is null then
    raise exception 'session_forbidden';
  end if;

  v_is_admin := coalesce(v_membership.is_owner, false) or coalesce(v_membership.role_key, '') in ('owner', 'admin');

  return jsonb_build_object(
    'meta', jsonb_build_object(
      'schemaVersion', 5,
      'edition', 'cloud-core',
      'adapter', 'supabase-core',
      'syncStatus', 'online',
      'lastSyncedAt', now(),
      'instanceKey', v_commerce.instance_key
    ),
    'business', jsonb_build_object(
      'name', v_commerce.name,
      'organization', coalesce(nullif(v_commerce.legal_name, ''), v_commerce.name),
      'currentBranchId', coalesce(v_user.active_branch_id, (select id from public.branches where commerce_id = v_commerce.id order by created_at asc limit 1)),
      'currentRegisterId', coalesce(v_user.assigned_register_id, (select id from public.registers where commerce_id = v_commerce.id order by created_at asc limit 1)),
      'enabledModules', public.app_effective_enabled_modules(v_commerce.id),
      'activePlan', v_commerce.active_plan,
      'documentCounters', coalesce(v_commerce.settings_json -> 'documentCounters', '{}'::jsonb),
      'billingStatus', v_commerce.billing_status,
      'onboardingStatus', v_commerce.onboarding_status,
      'trialEndsAt', v_commerce.trial_ends_at,
      'allowPublicSignup', v_commerce.allow_public_signup
    ),
    'branches', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'code', code,
        'address', address,
        'isActive', is_active
      ) order by created_at asc)
      from public.branches
      where commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'registers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'branchId', branch_id,
        'name', name,
        'code', code,
        'cashierUserId', cashier_user_id,
        'isActive', is_active
      ) order by created_at asc)
      from public.registers
      where commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'roles', v_roles,
    'users', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cu.id,
        'fullName', cu.full_name,
        'roleId', public.app_role_id(coalesce(cm.role_key, cu.role_key)),
        'roleKey', coalesce(cm.role_key, cu.role_key),
        'email', case when v_is_admin or cu.id = v_user.id then cu.email else '' end,
        'loginName', case when v_is_admin or cu.id = v_user.id then coalesce(cu.login_name, '') else '' end,
        'pin', '',
        'isActive', (cu.status = 'active' and coalesce(cm.status, 'active') = 'active')
      ) order by cm.is_owner desc, cu.created_at asc)
      from public.control_users cu
      join public.commerce_memberships cm
        on cm.user_id = cu.id
       and cm.commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'session', jsonb_build_object(
      'userId', v_user.id,
      'authenticated', true
    ),
    'customers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'fullName', full_name,
        'phone', phone,
        'email', email,
        'balance', balance,
        'tag', tag
      ) order by created_at asc)
      from public.customers
      where commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'sku', p.sku,
        'barcode', p.barcode,
        'stock', coalesce((select sum(quantity) from public.product_branch_stock where product_id = p.id), 0),
        'salePrice', p.sale_price,
        'costPrice', p.cost_price,
        'minStock', p.min_stock,
        'category', p.category,
        'trackStock', p.track_stock,
        'stockByBranch', coalesce((
          select jsonb_object_agg(branch_id::text, quantity)
          from public.product_branch_stock
          where product_id = p.id
        ), '{}'::jsonb)
      ) order by p.created_at asc)
      from public.products p
      where p.commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'suppliers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'contact', contact,
        'phone', phone,
        'email', email,
        'category', category,
        'balance', balance,
        'lastDelivery', last_delivery,
        'notes', notes
      ) order by created_at asc)
      from public.suppliers
      where commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'cashSessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'openedBy', opened_by,
        'openingAmount', opening_amount,
        'status', status,
        'openedAt', opened_at,
        'closedAt', closed_at,
        'countedAmount', counted_amount,
        'differenceAmount', difference_amount,
        'branchId', branch_id,
        'registerId', register_id
      ) order by opened_at desc)
      from public.cash_sessions
      where commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'purchaseReceipts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'branchId', branch_id,
        'supplierId', supplier_id,
        'productId', product_id,
        'receivedBy', received_by,
        'documentNumber', document_number,
        'quantity', quantity,
        'unitCost', unit_cost,
        'note', note,
        'receivedAt', received_at,
        'updatedAt', updated_at
      ) order by received_at desc)
      from public.purchase_receipts
      where commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'sales', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'branchId', s.branch_id,
        'registerId', s.register_id,
        'sellerUserId', s.seller_user_id,
        'customerId', s.customer_id,
        'cashSessionId', s.cash_session_id,
        'channel', initcap(s.channel),
        'paymentMethod', s.payment_method,
        'status', s.status,
        'subtotalAmount', s.subtotal_amount,
        'discountAmount', s.discount_amount,
        'totalAmount', s.total_amount,
        'amountPaid', s.amount_paid,
        'note', s.note,
        'soldAt', s.sold_at,
        'updatedAt', s.updated_at,
        'paymentBreakdown', coalesce((
          select jsonb_object_agg(method_key, amount)
          from public.sale_payments
          where sale_id = s.id
        ), '{}'::jsonb),
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'productId', product_id,
            'quantity', quantity,
            'unitPrice', unit_price,
            'lineTotal', line_total
          ) order by id asc)
          from public.sale_items
          where sale_id = s.id
        ), '[]'::jsonb)
      ) order by s.sold_at desc)
      from public.sales s
      where s.commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'branchId', branch_id,
        'saleId', sale_id,
        'customerId', customer_id,
        'number', document_number,
        'kind', kind,
        'type', fiscal_type,
        'status', status,
        'fiscalStatus', fiscal_status,
        'totalAmount', total_amount,
        'dueDate', issued_at::date,
        'issuedAt', issued_at,
        'updatedAt', updated_at
      ) order by issued_at desc)
      from public.documents
      where commerce_id = v_commerce.id
        and kind in ('factura', 'presupuesto', 'remito', 'nota_credito')
    ), '[]'::jsonb),
    'tickets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'branchId', branch_id,
        'saleId', sale_id,
        'customerId', customer_id,
        'number', document_number,
        'device', coalesce(payload_json ->> 'device', ''),
        'issue', coalesce(payload_json ->> 'issue', ''),
        'status', status,
        'updatedAt', updated_at
      ) order by updated_at desc)
      from public.documents
      where commerce_id = v_commerce.id
        and kind in ('ticket', 'postventa')
    ), '[]'::jsonb),
    'cashMovements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'branchId', branch_id,
        'registerId', register_id,
        'cashSessionId', cash_session_id,
        'createdBy', created_by,
        'kind', kind,
        'amount', amount,
        'signedAmount', signed_amount,
        'note', note,
        'createdAt', created_at
      ) order by created_at desc)
      from public.cash_movements
      where commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'stockMovements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'branchId', branch_id,
        'productId', product_id,
        'referenceId', reference_id,
        'type', movement_type,
        'movementType', movement_type,
        'referenceType', reference_type,
        'quantity', quantity,
        'notes', notes,
        'createdBy', created_by,
        'createdAt', created_at
      ) order by created_at desc)
      from public.stock_movements
      where commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'auditLogs', case
      when v_is_admin then coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', id,
          'actorUserId', actor_user_id,
          'entityType', entity_type,
          'entityId', entity_id,
          'action', action,
          'beforeData', before_data,
          'afterData', after_data,
          'createdAt', created_at
        ) order by created_at desc)
        from public.audit_logs_core
        where commerce_id = v_commerce.id
      ), '[]'::jsonb)
      else '[]'::jsonb
    end
  );
end;
$$;
