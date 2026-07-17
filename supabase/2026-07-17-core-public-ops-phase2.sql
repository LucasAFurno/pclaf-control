create or replace function public.app_public_upsert_product(
  p_session_token text,
  p_product_id text default null,
  p_name text default null,
  p_sku text default null,
  p_barcode text default null,
  p_stock numeric default 0,
  p_sale_price numeric default 0,
  p_cost_price numeric default 0,
  p_min_stock numeric default 0,
  p_category text default null,
  p_track_stock boolean default true,
  p_branch_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_product public.products;
  v_product_id uuid := coalesce(public.app_try_uuid(p_product_id), gen_random_uuid());
  v_branch_id uuid;
  v_existing_stock numeric := 0;
  v_new_stock numeric := greatest(coalesce(p_stock, 0), 0);
  v_delta numeric := 0;
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if coalesce(v_ctx.session_role_key, 'cashier') not in ('owner', 'admin', 'warehouse') then
    raise exception 'permission_denied';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'product_name_required';
  end if;

  v_branch_id := coalesce(
    public.app_try_uuid(p_branch_id),
    (select active_branch_id from public.control_users where id = v_ctx.session_user_id),
    (select id from public.branches where commerce_id = v_ctx.session_commerce_id order by created_at asc limit 1)
  );

  if v_branch_id is null then
    raise exception 'branch_not_found';
  end if;

  if exists (
    select 1
    from public.products
    where id = v_product_id
      and commerce_id <> v_ctx.session_commerce_id
  ) then
    raise exception 'product_not_in_commerce';
  end if;

  insert into public.products (
    id,
    commerce_id,
    name,
    sku,
    barcode,
    category,
    sale_price,
    cost_price,
    min_stock,
    track_stock,
    is_active
  )
  values (
    v_product_id,
    v_ctx.session_commerce_id,
    trim(p_name),
    trim(coalesce(p_sku, '')),
    trim(coalesce(p_barcode, '')),
    trim(coalesce(p_category, '')),
    greatest(coalesce(p_sale_price, 0), 0),
    greatest(coalesce(p_cost_price, 0), 0),
    greatest(coalesce(p_min_stock, 0), 0),
    coalesce(p_track_stock, true),
    true
  )
  on conflict (id) do update
  set
    name = excluded.name,
    sku = excluded.sku,
    barcode = excluded.barcode,
    category = excluded.category,
    sale_price = excluded.sale_price,
    cost_price = excluded.cost_price,
    min_stock = excluded.min_stock,
    track_stock = excluded.track_stock,
    updated_at = now()
  returning * into v_product;

  select quantity
  into v_existing_stock
  from public.product_branch_stock
  where commerce_id = v_ctx.session_commerce_id
    and product_id = v_product.id
    and branch_id = v_branch_id;

  v_existing_stock := coalesce(v_existing_stock, 0);
  v_delta := v_new_stock - v_existing_stock;

  insert into public.product_branch_stock (
    commerce_id,
    product_id,
    branch_id,
    quantity
  )
  values (
    v_ctx.session_commerce_id,
    v_product.id,
    v_branch_id,
    v_new_stock
  )
  on conflict (product_id, branch_id) do update
  set
    quantity = excluded.quantity,
    updated_at = now();

  if coalesce(v_product.track_stock, true) and v_delta <> 0 then
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
      v_branch_id,
      v_product.id,
      v_product.id,
      'product',
      case when v_delta >= 0 then 'adjustment_in' else 'adjustment_out' end,
      v_delta,
      case when v_existing_stock = 0 then 'Stock inicial' else 'Ajuste de stock desde producto' end,
      v_ctx.session_user_id
    );
  end if;

  return jsonb_build_object(
    'id', v_product.id,
    'name', v_product.name,
    'sku', v_product.sku,
    'barcode', v_product.barcode,
    'category', v_product.category,
    'sale_price', v_product.sale_price,
    'cost_price', v_product.cost_price,
    'min_stock', v_product.min_stock,
    'track_stock', v_product.track_stock,
    'branch_id', v_branch_id,
    'stock', v_new_stock
  );
end;
$$;

create or replace function public.app_public_open_cash_session(
  p_session_token text,
  p_register_id text,
  p_opening_amount numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_register public.registers;
  v_session public.cash_sessions;
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if coalesce(v_ctx.session_role_key, 'cashier') not in ('owner', 'admin', 'cashier') then
    raise exception 'permission_denied';
  end if;

  select *
  into v_register
  from public.registers
  where id = public.app_try_uuid(p_register_id)
    and commerce_id = v_ctx.session_commerce_id
    and is_active = true
  limit 1;

  if v_register.id is null then
    raise exception 'register_not_found';
  end if;

  if exists (
    select 1
    from public.cash_sessions
    where commerce_id = v_ctx.session_commerce_id
      and register_id = v_register.id
      and status = 'open'
  ) then
    raise exception 'cash_session_already_open';
  end if;

  insert into public.cash_sessions (
    commerce_id,
    branch_id,
    register_id,
    opened_by,
    opening_amount,
    status,
    opened_at
  )
  values (
    v_ctx.session_commerce_id,
    v_register.branch_id,
    v_register.id,
    v_ctx.session_user_id,
    greatest(coalesce(p_opening_amount, 0), 0),
    'open',
    now()
  )
  returning * into v_session;

  update public.control_users
  set
    active_branch_id = v_register.branch_id,
    assigned_register_id = v_register.id,
    updated_at = now()
  where id = v_ctx.session_user_id;

  return jsonb_build_object(
    'id', v_session.id,
    'branch_id', v_session.branch_id,
    'register_id', v_session.register_id,
    'opening_amount', v_session.opening_amount,
    'status', v_session.status,
    'opened_at', v_session.opened_at
  );
end;
$$;

create or replace function public.app_public_close_cash_session(
  p_session_token text,
  p_cash_session_id text,
  p_counted_amount numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_session public.cash_sessions;
  v_cash_sales numeric := 0;
  v_manual_delta numeric := 0;
  v_expected_amount numeric := 0;
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if coalesce(v_ctx.session_role_key, 'cashier') not in ('owner', 'admin', 'cashier') then
    raise exception 'permission_denied';
  end if;

  select *
  into v_session
  from public.cash_sessions
  where id = public.app_try_uuid(p_cash_session_id)
    and commerce_id = v_ctx.session_commerce_id
    and status = 'open'
  limit 1;

  if v_session.id is null then
    raise exception 'cash_session_not_found';
  end if;

  select coalesce(sum(payment.amount), 0)
  into v_cash_sales
  from public.sale_payments payment
  join public.sales sale on sale.id = payment.sale_id
  where sale.cash_session_id = v_session.id
    and payment.method_key = 'cash';

  select coalesce(sum(signed_amount), 0)
  into v_manual_delta
  from public.cash_movements
  where cash_session_id = v_session.id;

  v_expected_amount := coalesce(v_session.opening_amount, 0) + v_cash_sales + v_manual_delta;

  update public.cash_sessions
  set
    counted_amount = coalesce(p_counted_amount, 0),
    expected_amount = v_expected_amount,
    difference_amount = coalesce(p_counted_amount, 0) - v_expected_amount,
    closed_by = v_ctx.session_user_id,
    status = 'closed',
    closed_at = now()
  where id = v_session.id
  returning * into v_session;

  return jsonb_build_object(
    'id', v_session.id,
    'status', v_session.status,
    'counted_amount', v_session.counted_amount,
    'expected_amount', v_session.expected_amount,
    'difference_amount', v_session.difference_amount,
    'closed_at', v_session.closed_at
  );
end;
$$;

create or replace function public.app_public_create_cash_movement(
  p_session_token text,
  p_cash_session_id text,
  p_kind text,
  p_amount numeric,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_session public.cash_sessions;
  v_kind text := lower(coalesce(nullif(trim(p_kind), ''), 'income'));
  v_amount numeric := greatest(coalesce(p_amount, 0), 0);
  v_signed_amount numeric := 0;
  v_movement public.cash_movements;
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if coalesce(v_ctx.session_role_key, 'cashier') not in ('owner', 'admin', 'cashier') then
    raise exception 'permission_denied';
  end if;

  if v_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  if v_kind not in ('income', 'deposit', 'expense', 'withdrawal', 'sale', 'refund', 'adjustment') then
    raise exception 'invalid_cash_movement_kind';
  end if;

  select *
  into v_session
  from public.cash_sessions
  where id = public.app_try_uuid(p_cash_session_id)
    and commerce_id = v_ctx.session_commerce_id
    and status = 'open'
  limit 1;

  if v_session.id is null then
    raise exception 'cash_session_not_found';
  end if;

  v_signed_amount := public.app_sign_amount(v_kind, v_amount);

  insert into public.cash_movements (
    commerce_id,
    branch_id,
    register_id,
    cash_session_id,
    created_by,
    kind,
    amount,
    signed_amount,
    note
  )
  values (
    v_ctx.session_commerce_id,
    v_session.branch_id,
    v_session.register_id,
    v_session.id,
    v_ctx.session_user_id,
    v_kind,
    v_amount,
    v_signed_amount,
    trim(coalesce(p_note, ''))
  )
  returning * into v_movement;

  return jsonb_build_object(
    'id', v_movement.id,
    'kind', v_movement.kind,
    'amount', v_movement.amount,
    'signed_amount', v_movement.signed_amount,
    'note', v_movement.note,
    'cash_session_id', v_movement.cash_session_id,
    'created_at', v_movement.created_at
  );
end;
$$;

create or replace function public.app_public_create_sale(
  p_session_token text,
  p_customer_id text default null,
  p_channel text default 'Mostrador',
  p_payment_method text default 'cash',
  p_discount_amount numeric default 0,
  p_note text default null,
  p_is_paid boolean default false,
  p_auto_invoice boolean default false,
  p_cash_amount numeric default 0,
  p_transfer_amount numeric default 0,
  p_mercado_pago_amount numeric default 0,
  p_account_amount numeric default 0,
  p_items jsonb default '[]'::jsonb,
  p_branch_id text default null,
  p_register_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx record;
  v_branch_id uuid;
  v_register_id uuid;
  v_customer_id uuid := public.app_try_uuid(p_customer_id);
  v_cash_session public.cash_sessions;
  v_sale public.sales;
  v_item jsonb;
  v_product public.products;
  v_item_quantity numeric;
  v_unit_price numeric;
  v_line_total numeric;
  v_available numeric;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_raw_paid numeric := 0;
  v_amount_paid numeric := 0;
  v_cash_amount numeric := greatest(coalesce(p_cash_amount, 0), 0);
  v_transfer_amount numeric := greatest(coalesce(p_transfer_amount, 0), 0);
  v_mp_amount numeric := greatest(coalesce(p_mercado_pago_amount, 0), 0);
  v_account_amount numeric := greatest(coalesce(p_account_amount, 0), 0);
  v_total_quantity numeric := 0;
  v_sale_status text;
  v_balance_due numeric := 0;
  v_document_id uuid := null;
  v_document_number text := null;
  v_branch_code text := 'SUC';
begin
  select * into v_ctx from public.app_public_session_context(p_session_token);

  if coalesce(v_ctx.session_role_key, 'cashier') not in ('owner', 'admin', 'cashier') then
    raise exception 'permission_denied';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'sale_items_required';
  end if;

  v_branch_id := coalesce(
    public.app_try_uuid(p_branch_id),
    (select active_branch_id from public.control_users where id = v_ctx.session_user_id),
    (select id from public.branches where commerce_id = v_ctx.session_commerce_id order by created_at asc limit 1)
  );

  if v_branch_id is null then
    raise exception 'branch_not_found';
  end if;

  select code into v_branch_code from public.branches where id = v_branch_id;

  v_register_id := coalesce(
    public.app_try_uuid(p_register_id),
    (select assigned_register_id from public.control_users where id = v_ctx.session_user_id),
    (select id from public.registers where commerce_id = v_ctx.session_commerce_id and branch_id = v_branch_id order by created_at asc limit 1)
  );

  if v_register_id is null then
    raise exception 'register_not_found';
  end if;

  if v_customer_id is not null and not exists (
    select 1 from public.customers where id = v_customer_id and commerce_id = v_ctx.session_commerce_id
  ) then
    raise exception 'customer_not_in_commerce';
  end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    select *
    into v_product
    from public.products
    where id = public.app_try_uuid(v_item ->> 'productId')
      and commerce_id = v_ctx.session_commerce_id
    limit 1;

    if v_product.id is null then
      raise exception 'product_not_found';
    end if;

    v_item_quantity := greatest(coalesce((v_item ->> 'quantity')::numeric, 0), 0);
    if v_item_quantity <= 0 then
      continue;
    end if;

    v_unit_price := greatest(coalesce(v_product.sale_price, 0), 0);
    v_line_total := v_unit_price * v_item_quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_total_quantity := v_total_quantity + v_item_quantity;

    if coalesce(v_product.track_stock, true) then
      select coalesce(quantity, 0)
      into v_available
      from public.product_branch_stock
      where commerce_id = v_ctx.session_commerce_id
        and product_id = v_product.id
        and branch_id = v_branch_id;

      v_available := coalesce(v_available, 0);
      if v_available < v_item_quantity then
        raise exception 'stock_insufficient_for_%', v_product.name;
      end if;
    end if;
  end loop;

  if v_total_quantity <= 0 then
    raise exception 'sale_items_required';
  end if;

  v_discount := greatest(0, least(coalesce(p_discount_amount, 0), v_subtotal));
  v_total := v_subtotal - v_discount;

  if lower(coalesce(p_payment_method, 'cash')) = 'mixed' then
    v_raw_paid := v_cash_amount + v_transfer_amount + v_mp_amount + v_account_amount;
  elsif lower(coalesce(p_payment_method, 'cash')) = 'cash' then
    v_cash_amount := case when coalesce(p_is_paid, false) then v_total else greatest(coalesce(p_cash_amount, 0), 0) end;
    v_raw_paid := v_cash_amount;
  elsif lower(coalesce(p_payment_method, 'cash')) = 'transfer' then
    v_transfer_amount := case when coalesce(p_is_paid, false) then v_total else greatest(coalesce(p_transfer_amount, 0), 0) end;
    v_raw_paid := v_transfer_amount;
  elsif lower(coalesce(p_payment_method, 'cash')) = 'mercado_pago' then
    v_mp_amount := case when coalesce(p_is_paid, false) then v_total else greatest(coalesce(p_mercado_pago_amount, 0), 0) end;
    v_raw_paid := v_mp_amount;
  elsif lower(coalesce(p_payment_method, 'cash')) = 'account' then
    v_account_amount := v_total;
    v_raw_paid := greatest(coalesce(v_cash_amount, 0), 0) + greatest(coalesce(v_transfer_amount, 0), 0) + greatest(coalesce(v_mp_amount, 0), 0);
  else
    raise exception 'invalid_payment_method';
  end if;

  if v_raw_paid > v_total then
    raise exception 'amount_paid_exceeds_total';
  end if;

  v_amount_paid := greatest(0, least(v_raw_paid, v_total));
  v_sale_status := case
    when v_total <= 0 then 'completed'
    when v_amount_paid <= 0 then 'pending'
    when v_amount_paid >= v_total then 'completed'
    else 'partial'
  end;

  if v_cash_amount > 0 then
    select *
    into v_cash_session
    from public.cash_sessions
    where commerce_id = v_ctx.session_commerce_id
      and register_id = v_register_id
      and status = 'open'
    order by opened_at desc
    limit 1;

    if v_cash_session.id is null then
      raise exception 'cash_session_required';
    end if;
  end if;

  insert into public.sales (
    commerce_id,
    branch_id,
    register_id,
    seller_user_id,
    customer_id,
    cash_session_id,
    channel,
    payment_method,
    status,
    subtotal_amount,
    discount_amount,
    total_amount,
    amount_paid,
    total_quantity,
    note
  )
  values (
    v_ctx.session_commerce_id,
    v_branch_id,
    v_register_id,
    v_ctx.session_user_id,
    v_customer_id,
    case when v_cash_amount > 0 then v_cash_session.id else null end,
    lower(trim(coalesce(p_channel, 'mostrador'))),
    lower(trim(coalesce(p_payment_method, 'cash'))),
    v_sale_status,
    v_subtotal,
    v_discount,
    v_total,
    v_amount_paid,
    v_total_quantity,
    trim(coalesce(p_note, ''))
  )
  returning * into v_sale;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    select *
    into v_product
    from public.products
    where id = public.app_try_uuid(v_item ->> 'productId')
      and commerce_id = v_ctx.session_commerce_id
    limit 1;

    v_item_quantity := greatest(coalesce((v_item ->> 'quantity')::numeric, 0), 0);
    if v_product.id is null or v_item_quantity <= 0 then
      continue;
    end if;

    v_unit_price := greatest(coalesce(v_product.sale_price, 0), 0);
    v_line_total := v_unit_price * v_item_quantity;

    insert into public.sale_items (
      commerce_id,
      sale_id,
      product_id,
      quantity,
      unit_price,
      line_total
    )
    values (
      v_ctx.session_commerce_id,
      v_sale.id,
      v_product.id,
      v_item_quantity,
      v_unit_price,
      v_line_total
    );

    if coalesce(v_product.track_stock, true) then
      update public.product_branch_stock
      set
        quantity = quantity - v_item_quantity,
        updated_at = now()
      where commerce_id = v_ctx.session_commerce_id
        and product_id = v_product.id
        and branch_id = v_branch_id;

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
        v_branch_id,
        v_product.id,
        v_sale.id,
        'sale',
        'sale',
        v_item_quantity * -1,
        'Venta ' || initcap(lower(trim(coalesce(p_channel, 'mostrador')))),
        v_ctx.session_user_id
      );
    end if;
  end loop;

  if v_cash_amount > 0 then
    insert into public.sale_payments (commerce_id, sale_id, method_key, amount)
    values (v_ctx.session_commerce_id, v_sale.id, 'cash', v_cash_amount);

    insert into public.cash_movements (
      commerce_id,
      branch_id,
      register_id,
      cash_session_id,
      created_by,
      kind,
      amount,
      signed_amount,
      note
    )
    values (
      v_ctx.session_commerce_id,
      v_branch_id,
      v_register_id,
      v_cash_session.id,
      v_ctx.session_user_id,
      'sale',
      v_cash_amount,
      abs(v_cash_amount),
      'Cobro de venta'
    );
  end if;

  if v_transfer_amount > 0 then
    insert into public.sale_payments (commerce_id, sale_id, method_key, amount)
    values (v_ctx.session_commerce_id, v_sale.id, 'transfer', v_transfer_amount);
  end if;

  if v_mp_amount > 0 then
    insert into public.sale_payments (commerce_id, sale_id, method_key, amount)
    values (v_ctx.session_commerce_id, v_sale.id, 'mercado_pago', v_mp_amount);
  end if;

  if v_account_amount > 0 then
    insert into public.sale_payments (commerce_id, sale_id, method_key, amount)
    values (v_ctx.session_commerce_id, v_sale.id, 'account', v_account_amount);
  end if;

  v_balance_due := greatest(v_total - v_amount_paid, 0);
  if v_customer_id is not null and v_balance_due > 0 then
    update public.customers
    set
      balance = coalesce(balance, 0) + v_balance_due,
      updated_at = now()
    where id = v_customer_id
      and commerce_id = v_ctx.session_commerce_id;
  end if;

  if coalesce(p_auto_invoice, false) and v_customer_id is not null and v_amount_paid > 0 then
    v_document_id := gen_random_uuid();
    v_document_number := 'FAC-' || coalesce(v_branch_code, 'SUC') || '-' || to_char(now(), 'YYYYMMDDHH24MISSMS');

    insert into public.documents (
      id,
      commerce_id,
      branch_id,
      sale_id,
      customer_id,
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
      v_sale.id,
      v_customer_id,
      v_document_number,
      'factura',
      'B',
      case when v_amount_paid >= v_total then 'Cobrada' else 'Emitida' end,
      'Pendiente',
      v_total,
      jsonb_build_object(
        'generatedFrom', 'sale',
        'saleId', v_sale.id
      )
    );
  end if;

  return jsonb_build_object(
    'sale_id', v_sale.id,
    'invoice_id', v_document_id,
    'invoice_number', v_document_number,
    'status', v_sale.status,
    'total_amount', v_sale.total_amount,
    'amount_paid', v_sale.amount_paid
  );
end;
$$;

revoke all on function public.app_public_upsert_product(text, text, text, text, text, numeric, numeric, numeric, numeric, text, boolean, text) from public;
revoke all on function public.app_public_open_cash_session(text, text, numeric) from public;
revoke all on function public.app_public_close_cash_session(text, text, numeric) from public;
revoke all on function public.app_public_create_cash_movement(text, text, text, numeric, text) from public;
revoke all on function public.app_public_create_sale(text, text, text, text, numeric, text, boolean, boolean, numeric, numeric, numeric, numeric, jsonb, text, text) from public;

grant execute on function public.app_public_upsert_product(text, text, text, text, text, numeric, numeric, numeric, numeric, text, boolean, text) to anon, authenticated;
grant execute on function public.app_public_open_cash_session(text, text, numeric) to anon, authenticated;
grant execute on function public.app_public_close_cash_session(text, text, numeric) to anon, authenticated;
grant execute on function public.app_public_create_cash_movement(text, text, text, numeric, text) to anon, authenticated;
grant execute on function public.app_public_create_sale(text, text, text, text, numeric, text, boolean, boolean, numeric, numeric, numeric, numeric, jsonb, text, text) to anon, authenticated;
