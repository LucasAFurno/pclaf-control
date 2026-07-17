create or replace function public.app_public_upsert_branch(
  p_session_token text,
  p_branch_id text default null,
  p_name text default null,
  p_code text default null,
  p_address text default null,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_branch public.branches;
  v_branch_id uuid := coalesce(public.app_try_uuid(p_branch_id), gen_random_uuid());
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if coalesce(v_ctx.session_role_key, 'cashier') not in ('owner', 'admin') then
    raise exception 'permission_denied';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'branch_name_required';
  end if;

  if nullif(trim(coalesce(p_code, '')), '') is null then
    raise exception 'branch_code_required';
  end if;

  if exists (
    select 1
    from public.branches
    where id = v_branch_id
      and commerce_id <> v_ctx.session_commerce_id
  ) then
    raise exception 'branch_not_in_commerce';
  end if;

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
    v_ctx.session_commerce_id,
    upper(trim(p_code)),
    trim(p_name),
    trim(coalesce(p_address, '')),
    coalesce(p_is_active, true)
  )
  on conflict (id) do update
  set
    code = excluded.code,
    name = excluded.name,
    address = excluded.address,
    is_active = excluded.is_active,
    updated_at = now()
  returning * into v_branch;

  return jsonb_build_object(
    'id', v_branch.id,
    'code', v_branch.code,
    'name', v_branch.name,
    'address', v_branch.address,
    'is_active', v_branch.is_active
  );
end;
$$;

create or replace function public.app_public_upsert_register(
  p_session_token text,
  p_register_id text default null,
  p_branch_id text default null,
  p_name text default null,
  p_code text default null,
  p_cashier_user_id text default null,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_register public.registers;
  v_register_id uuid := coalesce(public.app_try_uuid(p_register_id), gen_random_uuid());
  v_branch_id uuid := public.app_try_uuid(p_branch_id);
  v_cashier_user_id uuid := public.app_try_uuid(p_cashier_user_id);
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if coalesce(v_ctx.session_role_key, 'cashier') not in ('owner', 'admin') then
    raise exception 'permission_denied';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'register_name_required';
  end if;

  if nullif(trim(coalesce(p_code, '')), '') is null then
    raise exception 'register_code_required';
  end if;

  select id
  into v_branch_id
  from public.branches
  where id = coalesce(v_branch_id, (select id from public.branches where commerce_id = v_ctx.session_commerce_id order by created_at asc limit 1))
    and commerce_id = v_ctx.session_commerce_id
  limit 1;

  if v_branch_id is null then
    raise exception 'branch_not_found';
  end if;

  if v_cashier_user_id is not null and not exists (
    select 1
    from public.commerce_memberships
    where commerce_id = v_ctx.session_commerce_id
      and user_id = v_cashier_user_id
  ) then
    raise exception 'cashier_not_in_commerce';
  end if;

  if exists (
    select 1
    from public.registers
    where id = v_register_id
      and commerce_id <> v_ctx.session_commerce_id
  ) then
    raise exception 'register_not_in_commerce';
  end if;

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
    v_ctx.session_commerce_id,
    v_branch_id,
    upper(trim(p_code)),
    trim(p_name),
    v_cashier_user_id,
    coalesce(p_is_active, true)
  )
  on conflict (id) do update
  set
    branch_id = excluded.branch_id,
    code = excluded.code,
    name = excluded.name,
    cashier_user_id = excluded.cashier_user_id,
    is_active = excluded.is_active,
    updated_at = now()
  returning * into v_register;

  return jsonb_build_object(
    'id', v_register.id,
    'branch_id', v_register.branch_id,
    'code', v_register.code,
    'name', v_register.name,
    'cashier_user_id', v_register.cashier_user_id,
    'is_active', v_register.is_active
  );
end;
$$;

create or replace function public.app_public_upsert_supplier(
  p_session_token text,
  p_supplier_id text default null,
  p_name text default null,
  p_contact text default null,
  p_phone text default null,
  p_email text default null,
  p_category text default null,
  p_balance numeric default 0,
  p_last_delivery date default null,
  p_notes text default null,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_supplier public.suppliers;
  v_supplier_id uuid := coalesce(public.app_try_uuid(p_supplier_id), gen_random_uuid());
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if coalesce(v_ctx.session_role_key, 'cashier') not in ('owner', 'admin', 'warehouse') then
    raise exception 'permission_denied';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'supplier_name_required';
  end if;

  if exists (
    select 1
    from public.suppliers
    where id = v_supplier_id
      and commerce_id <> v_ctx.session_commerce_id
  ) then
    raise exception 'supplier_not_in_commerce';
  end if;

  insert into public.suppliers (
    id,
    commerce_id,
    name,
    contact,
    phone,
    email,
    category,
    balance,
    last_delivery,
    notes,
    is_active
  )
  values (
    v_supplier_id,
    v_ctx.session_commerce_id,
    trim(p_name),
    trim(coalesce(p_contact, '')),
    trim(coalesce(p_phone, '')),
    lower(trim(coalesce(p_email, ''))),
    trim(coalesce(p_category, '')),
    coalesce(p_balance, 0),
    p_last_delivery,
    trim(coalesce(p_notes, '')),
    coalesce(p_is_active, true)
  )
  on conflict (id) do update
  set
    name = excluded.name,
    contact = excluded.contact,
    phone = excluded.phone,
    email = excluded.email,
    category = excluded.category,
    balance = excluded.balance,
    last_delivery = excluded.last_delivery,
    notes = excluded.notes,
    is_active = excluded.is_active,
    updated_at = now()
  returning * into v_supplier;

  return jsonb_build_object(
    'id', v_supplier.id,
    'name', v_supplier.name,
    'contact', v_supplier.contact,
    'phone', v_supplier.phone,
    'email', v_supplier.email,
    'category', v_supplier.category,
    'balance', v_supplier.balance,
    'last_delivery', v_supplier.last_delivery,
    'notes', v_supplier.notes,
    'is_active', v_supplier.is_active
  );
end;
$$;

create or replace function public.app_public_upsert_purchase_receipt(
  p_session_token text,
  p_receipt_id text default null,
  p_supplier_id text default null,
  p_product_id text default null,
  p_document_number text default null,
  p_quantity numeric default 0,
  p_unit_cost numeric default 0,
  p_note text default null,
  p_branch_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_receipt public.purchase_receipts;
  v_previous public.purchase_receipts;
  v_receipt_id uuid := coalesce(public.app_try_uuid(p_receipt_id), gen_random_uuid());
  v_branch_id uuid := public.app_try_uuid(p_branch_id);
  v_product_id uuid := public.app_try_uuid(p_product_id);
  v_supplier_id uuid := public.app_try_uuid(p_supplier_id);
  v_quantity numeric := greatest(coalesce(p_quantity, 0), 0);
  v_unit_cost numeric := greatest(coalesce(p_unit_cost, 0), 0);
  v_total_cost numeric := v_quantity * v_unit_cost;
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if coalesce(v_ctx.session_role_key, 'cashier') not in ('owner', 'admin', 'warehouse') then
    raise exception 'permission_denied';
  end if;

  if v_quantity <= 0 then
    raise exception 'invalid_quantity';
  end if;

  select id
  into v_branch_id
  from public.branches
  where id = coalesce(v_branch_id, (select id from public.branches where commerce_id = v_ctx.session_commerce_id order by created_at asc limit 1))
    and commerce_id = v_ctx.session_commerce_id
  limit 1;

  if v_branch_id is null then
    raise exception 'branch_not_found';
  end if;

  if not exists (
    select 1 from public.products
    where id = v_product_id
      and commerce_id = v_ctx.session_commerce_id
  ) then
    raise exception 'product_not_found';
  end if;

  if not exists (
    select 1 from public.suppliers
    where id = v_supplier_id
      and commerce_id = v_ctx.session_commerce_id
  ) then
    raise exception 'supplier_not_found';
  end if;

  select *
  into v_previous
  from public.purchase_receipts
  where id = v_receipt_id
    and commerce_id = v_ctx.session_commerce_id
  limit 1;

  if v_previous.id is not null then
    insert into public.product_branch_stock (
      commerce_id,
      product_id,
      branch_id,
      quantity
    )
    values (
      v_ctx.session_commerce_id,
      v_previous.product_id,
      v_previous.branch_id,
      0
    )
    on conflict (product_id, branch_id) do nothing;

    update public.product_branch_stock
    set
      quantity = quantity - v_previous.quantity,
      updated_at = now()
    where commerce_id = v_ctx.session_commerce_id
      and product_id = v_previous.product_id
      and branch_id = v_previous.branch_id;
  end if;

  insert into public.purchase_receipts (
    id,
    commerce_id,
    branch_id,
    supplier_id,
    product_id,
    received_by,
    document_number,
    quantity,
    unit_cost,
    total_cost,
    note
  )
  values (
    v_receipt_id,
    v_ctx.session_commerce_id,
    v_branch_id,
    v_supplier_id,
    v_product_id,
    v_ctx.session_user_id,
    trim(coalesce(p_document_number, '')),
    v_quantity,
    v_unit_cost,
    v_total_cost,
    trim(coalesce(p_note, ''))
  )
  on conflict (id) do update
  set
    branch_id = excluded.branch_id,
    supplier_id = excluded.supplier_id,
    product_id = excluded.product_id,
    document_number = excluded.document_number,
    quantity = excluded.quantity,
    unit_cost = excluded.unit_cost,
    total_cost = excluded.total_cost,
    note = excluded.note,
    received_by = v_ctx.session_user_id,
    updated_at = now()
  returning * into v_receipt;

  insert into public.product_branch_stock (
    commerce_id,
    product_id,
    branch_id,
    quantity
  )
  values (
    v_ctx.session_commerce_id,
    v_receipt.product_id,
    v_receipt.branch_id,
    0
  )
  on conflict (product_id, branch_id) do nothing;

  update public.product_branch_stock
  set
    quantity = quantity + v_receipt.quantity,
    updated_at = now()
  where commerce_id = v_ctx.session_commerce_id
    and product_id = v_receipt.product_id
    and branch_id = v_receipt.branch_id;

  insert into public.stock_movements (
    commerce_id,
    branch_id,
    product_id,
    reference_id,
    reference_type,
    movement_type,
    quantity,
    notes,
    created_by
  )
  values (
    v_ctx.session_commerce_id,
    v_receipt.branch_id,
    v_receipt.product_id,
    v_receipt.id,
    'purchase_receipt',
    'purchase',
    v_receipt.quantity,
    case when v_previous.id is null then 'Ingreso de stock por recepcion' else 'Ajuste de recepcion de stock' end,
    v_ctx.session_user_id
  );

  return jsonb_build_object(
    'id', v_receipt.id,
    'branch_id', v_receipt.branch_id,
    'supplier_id', v_receipt.supplier_id,
    'product_id', v_receipt.product_id,
    'document_number', v_receipt.document_number,
    'quantity', v_receipt.quantity,
    'unit_cost', v_receipt.unit_cost,
    'total_cost', v_receipt.total_cost,
    'note', v_receipt.note,
    'received_at', v_receipt.received_at
  );
end;
$$;

create or replace function public.app_public_upsert_document(
  p_session_token text,
  p_document_id text default null,
  p_branch_id text default null,
  p_sale_id text default null,
  p_customer_id text default null,
  p_related_document_id text default null,
  p_document_number text default null,
  p_kind text default 'factura',
  p_fiscal_type text default 'B',
  p_status text default 'emitida',
  p_fiscal_status text default 'pendiente',
  p_total_amount numeric default 0,
  p_payload_json jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_document public.documents;
  v_document_id uuid := coalesce(public.app_try_uuid(p_document_id), gen_random_uuid());
  v_branch_id uuid := public.app_try_uuid(p_branch_id);
  v_sale_id uuid := public.app_try_uuid(p_sale_id);
  v_customer_id uuid := public.app_try_uuid(p_customer_id);
  v_related_document_id uuid := public.app_try_uuid(p_related_document_id);
  v_kind text := lower(trim(coalesce(p_kind, 'factura')));
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if coalesce(v_ctx.session_role_key, 'cashier') not in ('owner', 'admin', 'cashier', 'warehouse') then
    raise exception 'permission_denied';
  end if;

  if v_kind not in ('ticket', 'presupuesto', 'factura', 'remito', 'nota_credito', 'postventa') then
    raise exception 'invalid_document_kind';
  end if;

  if nullif(trim(coalesce(p_document_number, '')), '') is null then
    raise exception 'document_number_required';
  end if;

  select id
  into v_branch_id
  from public.branches
  where id = coalesce(v_branch_id, (select id from public.branches where commerce_id = v_ctx.session_commerce_id order by created_at asc limit 1))
    and commerce_id = v_ctx.session_commerce_id
  limit 1;

  if v_branch_id is null then
    raise exception 'branch_not_found';
  end if;

  if v_sale_id is not null and not exists (
    select 1 from public.sales
    where id = v_sale_id
      and commerce_id = v_ctx.session_commerce_id
  ) then
    raise exception 'sale_not_found';
  end if;

  if v_customer_id is not null and not exists (
    select 1 from public.customers
    where id = v_customer_id
      and commerce_id = v_ctx.session_commerce_id
  ) then
    raise exception 'customer_not_found';
  end if;

  if v_related_document_id is not null and not exists (
    select 1 from public.documents
    where id = v_related_document_id
      and commerce_id = v_ctx.session_commerce_id
  ) then
    raise exception 'related_document_not_found';
  end if;

  if exists (
    select 1
    from public.documents
    where id = v_document_id
      and commerce_id <> v_ctx.session_commerce_id
  ) then
    raise exception 'document_not_in_commerce';
  end if;

  insert into public.documents (
    id,
    commerce_id,
    branch_id,
    sale_id,
    customer_id,
    related_document_id,
    document_number,
    kind,
    fiscal_type,
    status,
    fiscal_status,
    total_amount,
    payload_json
  )
  values (
    v_document_id,
    v_ctx.session_commerce_id,
    v_branch_id,
    v_sale_id,
    v_customer_id,
    v_related_document_id,
    trim(p_document_number),
    v_kind,
    trim(coalesce(p_fiscal_type, 'B')),
    trim(coalesce(p_status, 'emitida')),
    trim(coalesce(p_fiscal_status, 'pendiente')),
    greatest(coalesce(p_total_amount, 0), 0),
    coalesce(p_payload_json, '{}'::jsonb)
  )
  on conflict (id) do update
  set
    branch_id = excluded.branch_id,
    sale_id = excluded.sale_id,
    customer_id = excluded.customer_id,
    related_document_id = excluded.related_document_id,
    document_number = excluded.document_number,
    kind = excluded.kind,
    fiscal_type = excluded.fiscal_type,
    status = excluded.status,
    fiscal_status = excluded.fiscal_status,
    total_amount = excluded.total_amount,
    payload_json = excluded.payload_json,
    updated_at = now()
  returning * into v_document;

  return jsonb_build_object(
    'id', v_document.id,
    'branch_id', v_document.branch_id,
    'sale_id', v_document.sale_id,
    'customer_id', v_document.customer_id,
    'related_document_id', v_document.related_document_id,
    'document_number', v_document.document_number,
    'kind', v_document.kind,
    'fiscal_type', v_document.fiscal_type,
    'status', v_document.status,
    'fiscal_status', v_document.fiscal_status,
    'total_amount', v_document.total_amount,
    'payload_json', v_document.payload_json
  );
end;
$$;

revoke all on function public.app_public_upsert_branch(text, text, text, text, text, boolean) from public;
revoke all on function public.app_public_upsert_register(text, text, text, text, text, text, boolean) from public;
revoke all on function public.app_public_upsert_supplier(text, text, text, text, text, text, text, numeric, date, text, boolean) from public;
revoke all on function public.app_public_upsert_purchase_receipt(text, text, text, text, text, numeric, numeric, text, text) from public;
revoke all on function public.app_public_upsert_document(text, text, text, text, text, text, text, text, text, text, text, numeric, jsonb) from public;

grant execute on function public.app_public_upsert_branch(text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.app_public_upsert_register(text, text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.app_public_upsert_supplier(text, text, text, text, text, text, text, numeric, date, text, boolean) to anon, authenticated;
grant execute on function public.app_public_upsert_purchase_receipt(text, text, text, text, text, numeric, numeric, text, text) to anon, authenticated;
grant execute on function public.app_public_upsert_document(text, text, text, text, text, text, text, text, text, text, text, numeric, jsonb) to anon, authenticated;
