create or replace function public.bootstrap_control_user(
  p_full_name text default null,
  p_commerce_name text default null
)
returns public.control_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_name text := nullif(trim(coalesce(p_full_name, '')), '');
  v_user public.control_users;
  v_commerce public.commerce_accounts;
  v_membership public.commerce_memberships;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if v_email = '' then
    raise exception 'missing_email';
  end if;

  if v_name is null then
    v_name := split_part(v_email, '@', 1);
  end if;

  insert into public.control_users (
    id,
    email,
    full_name,
    role_key,
    status,
    is_owner
  )
  values (
    v_uid,
    v_email,
    v_name,
    'cashier',
    'pending',
    false
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = case
      when public.control_users.full_name is null or public.control_users.full_name = '' then excluded.full_name
      else public.control_users.full_name
    end
  returning * into v_user;

  select *
  into v_commerce
  from public.commerce_accounts
  order by created_at asc
  limit 1;

  if v_commerce.id is not null then
    insert into public.commerce_memberships (
      commerce_id,
      user_id,
      role_key,
      status,
      is_owner
    )
    values (
      v_commerce.id,
      v_uid,
      case when lower(v_commerce.owner_email) = v_email then 'owner' else 'cashier' end,
      case when lower(v_commerce.owner_email) = v_email then 'active' else 'pending' end,
      lower(v_commerce.owner_email) = v_email
    )
    on conflict (commerce_id, user_id) do update
    set
      role_key = case
        when public.commerce_memberships.is_owner then public.commerce_memberships.role_key
        when lower(v_commerce.owner_email) = v_email then 'owner'
        else public.commerce_memberships.role_key
      end,
      status = case
        when public.commerce_memberships.is_owner then public.commerce_memberships.status
        when lower(v_commerce.owner_email) = v_email then 'active'
        else public.commerce_memberships.status
      end,
      is_owner = public.commerce_memberships.is_owner or lower(v_commerce.owner_email) = v_email
    returning * into v_membership;

    update public.control_users
    set
      active_commerce_id = coalesce(public.control_users.active_commerce_id, v_commerce.id),
      role_key = case
        when v_membership.role_key in ('owner', 'admin') then 'admin'
        when v_membership.role_key = 'warehouse' then 'warehouse'
        else 'cashier'
      end,
      status = v_membership.status,
      is_owner = v_membership.is_owner
    where id = v_uid
    returning * into v_user;
  end if;

  return v_user;
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
    jsonb_build_object('id', 'role-admin', 'key', 'admin', 'name', 'Administrador', 'permissions', jsonb_build_array('dashboard:view','customers:view','sales:view','cash:view','branches:view','registers:view','products:view','purchases:view','invoices:view','tickets:view','reports:view','settings:view')),
    jsonb_build_object('id', 'role-cashier', 'key', 'cashier', 'name', 'Caja', 'permissions', jsonb_build_array('dashboard:view','customers:view','sales:view','cash:view','invoices:view','reports:view')),
    jsonb_build_object('id', 'role-warehouse', 'key', 'warehouse', 'name', 'Deposito', 'permissions', jsonb_build_array('dashboard:view','products:view','purchases:view','tickets:view','reports:view'))
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
      'schemaVersion', 4,
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
      'enabledModules', coalesce(v_commerce.settings_json -> 'enabledModules', jsonb_build_array('dashboard','customers','sales','cash','branches','registers','products','purchases','invoices','tickets','reports','settings')),
      'activePlan', v_commerce.active_plan,
      'documentCounters', coalesce(v_commerce.settings_json -> 'documentCounters', '{}'::jsonb)
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
