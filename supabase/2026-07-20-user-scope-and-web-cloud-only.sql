alter table public.commerce_memberships
  add column if not exists allowed_modules jsonb not null default '[]'::jsonb,
  add column if not exists blocked_permissions jsonb not null default '[]'::jsonb;

update public.commerce_memberships
set
  allowed_modules = coalesce(allowed_modules, '[]'::jsonb),
  blocked_permissions = coalesce(blocked_permissions, '[]'::jsonb)
where allowed_modules is null
   or blocked_permissions is null;

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
      'assigned_register_id', v_user.assigned_register_id,
      'allowed_modules', coalesce(v_membership.allowed_modules, '[]'::jsonb),
      'blocked_permissions', coalesce(v_membership.blocked_permissions, '[]'::jsonb)
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
        'isActive', (cu.status = 'active' and coalesce(cm.status, 'active') = 'active'),
        'allowedModules', coalesce(cm.allowed_modules, '[]'::jsonb),
        'blockedPermissions', coalesce(cm.blocked_permissions, '[]'::jsonb),
        'isOwner', coalesce(cm.is_owner, cu.is_owner, false)
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
    'cashMovements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'cashSessionId', cash_session_id,
        'kind', kind,
        'amount', amount,
        'signedAmount', case when kind = 'expense' then amount * -1 else amount end,
        'note', note,
        'createdAt', created_at,
        'createdBy', created_by,
        'branchId', branch_id,
        'registerId', register_id
      ) order by created_at desc)
      from public.cash_movements
      where commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'sales', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'customerId', s.customer_id,
        'sellerUserId', s.seller_user_id,
        'cashSessionId', s.cash_session_id,
        'channel', s.channel,
        'paymentMethod', s.payment_method,
        'subtotalAmount', s.subtotal_amount,
        'discountAmount', s.discount_amount,
        'totalAmount', s.total_amount,
        'amountPaid', s.amount_paid,
        'paymentBreakdown', coalesce((
          select jsonb_object_agg(method_key, amount)
          from public.sale_payments
          where sale_id = s.id
        ), '{}'::jsonb),
        'status', s.status,
        'note', s.note,
        'soldAt', s.sold_at,
        'branchId', s.branch_id,
        'registerId', s.register_id,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'productId', si.product_id,
            'quantity', si.quantity,
            'unitPrice', si.unit_price,
            'lineTotal', si.line_total
          ) order by si.id asc)
          from public.sale_items si
          where si.sale_id = s.id
        ), '[]'::jsonb)
      ) order by s.sold_at desc)
      from public.sales s
      where commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'purchaseReceipts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'supplierId', supplier_id,
        'productId', product_id,
        'documentNumber', document_number,
        'quantity', quantity,
        'unitCost', unit_cost,
        'totalCost', total_cost,
        'note', note,
        'receivedAt', received_at,
        'receivedBy', received_by,
        'branchId', branch_id
      ) order by received_at desc)
      from public.purchase_receipts
      where commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'number', document_number,
        'customerId', customer_id,
        'totalAmount', total_amount,
        'status', status,
        'fiscalStatus', fiscal_status,
        'type', fiscal_type,
        'kind', kind,
        'dueDate', issued_at::date,
        'saleId', sale_id,
        'branchId', branch_id
      ) order by issued_at desc)
      from public.documents
      where commerce_id = v_commerce.id
        and kind in ('factura', 'presupuesto', 'remito', 'nota_credito')
    ), '[]'::jsonb),
    'tickets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'number', document_number,
        'customerId', customer_id,
        'device', coalesce(payload_json ->> 'device', ''),
        'issue', coalesce(payload_json ->> 'issue', ''),
        'status', status,
        'updatedAt', updated_at,
        'branchId', branch_id,
        'saleId', sale_id
      ) order by updated_at desc)
      from public.documents
      where commerce_id = v_commerce.id
        and kind = 'ticket'
    ), '[]'::jsonb),
    'stockMovements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'productId', product_id,
        'quantity', quantity,
        'type', movement_type,
        'referenceType', reference_type,
        'referenceId', reference_id,
        'branchId', branch_id,
        'registerId', null,
        'createdBy', created_by,
        'createdAt', created_at
      ) order by created_at desc)
      from public.stock_movements
      where commerce_id = v_commerce.id
    ), '[]'::jsonb),
    'auditLogs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'actorUserId', actor_user_id,
        'entityType', entity_type,
        'entityId', entity_id,
        'action', action,
        'createdAt', created_at
      ) order by created_at desc)
      from public.audit_logs_core
      where commerce_id = v_commerce.id
    ), '[]'::jsonb)
  );
end;
$$;

drop function if exists public.app_public_upsert_user(text, text, text, text, text, text, boolean);

create function public.app_public_upsert_user(
  p_session_token text,
  p_user_id text default null,
  p_full_name text default null,
  p_role_key text default 'cashier',
  p_email text default null,
  p_pin text default null,
  p_is_active boolean default true,
  p_allowed_modules jsonb default null,
  p_blocked_permissions jsonb default null
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
  v_allowed_modules jsonb := '[]'::jsonb;
  v_blocked_permissions jsonb := '[]'::jsonb;
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if not (coalesce(v_ctx.session_is_owner, false) or coalesce(v_ctx.session_role_key, '') in ('owner', 'admin')) then
    raise exception 'admin_required';
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

  select coalesce(jsonb_agg(value), '[]'::jsonb)
  into v_allowed_modules
  from (
    select distinct value
    from jsonb_array_elements_text(coalesce(p_allowed_modules, '[]'::jsonb)) as value
    where value in ('dashboard','customers','sales','cash','branches','registers','products','purchases','invoices','tickets','reports','settings')
  ) filtered_allowed;

  select coalesce(jsonb_agg(value), '[]'::jsonb)
  into v_blocked_permissions
  from (
    select distinct value
    from jsonb_array_elements_text(coalesce(p_blocked_permissions, '[]'::jsonb)) as value
    where value in ('customers:write','sales:write','cash:operate','branches:manage','registers:manage','products:write','products:adjust','products:transfer','purchases:write','invoices:write','tickets:write','reports:export','settings:manage')
  ) filtered_blocked;

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

    if coalesce(v_membership.is_owner, false) and not coalesce(v_ctx.session_is_owner, false) then
      raise exception 'owner_required';
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
    is_owner,
    allowed_modules,
    blocked_permissions
  )
  values (
    v_ctx.session_commerce_id,
    v_user.id,
    case when coalesce(v_membership.is_owner, false) then 'admin' else v_role_key end,
    case when coalesce(v_membership.is_owner, false) then 'active' else v_status end,
    coalesce(v_membership.is_owner, false),
    v_allowed_modules,
    v_blocked_permissions
  )
  on conflict (commerce_id, user_id) do update
  set
    role_key = case when public.commerce_memberships.is_owner then public.commerce_memberships.role_key else excluded.role_key end,
    status = case when public.commerce_memberships.is_owner then 'active' else excluded.status end,
    allowed_modules = excluded.allowed_modules,
    blocked_permissions = excluded.blocked_permissions,
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
    'allowed_modules', coalesce(v_membership.allowed_modules, '[]'::jsonb),
    'blocked_permissions', coalesce(v_membership.blocked_permissions, '[]'::jsonb),
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

  if not (coalesce(v_ctx.session_is_owner, false) or coalesce(v_ctx.session_role_key, '') in ('owner', 'admin')) then
    raise exception 'admin_required';
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

  if coalesce(v_membership.is_owner, false) and not coalesce(v_ctx.session_is_owner, false) then
    raise exception 'owner_required';
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
    'allowed_modules', coalesce(v_membership.allowed_modules, '[]'::jsonb),
    'blocked_permissions', coalesce(v_membership.blocked_permissions, '[]'::jsonb),
    'created_at', v_user.created_at,
    'updated_at', v_user.updated_at
  );
end;
$$;

revoke all on function public.app_public_upsert_user(text, text, text, text, text, text, boolean, jsonb, jsonb) from public;
revoke all on function public.app_public_upsert_user(text, text, text, text, text, text, boolean, jsonb, jsonb) from authenticated;
grant execute on function public.app_public_upsert_user(text, text, text, text, text, text, boolean, jsonb, jsonb) to anon;

revoke all on function public.app_public_toggle_user_active(text, text, boolean) from public;
revoke all on function public.app_public_toggle_user_active(text, text, boolean) from authenticated;
grant execute on function public.app_public_toggle_user_active(text, text, boolean) to anon;
