create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.fiscal_controls (
  singleton boolean primary key default true check (singleton),
  accepting_new_invoices boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into private.fiscal_controls (singleton, accepting_new_invoices)
values (true, true)
on conflict (singleton) do nothing;

create table if not exists private.fiscal_tenants (
  tenant_key text primary key check (tenant_key ~ '^[a-z0-9][a-z0-9_-]{2,80}$'),
  commerce_id uuid not null unique references public.commerce_accounts(id) on delete cascade,
  encrypted_record text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.fiscal_invoices (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references public.commerce_accounts(id) on delete restrict,
  sale_id uuid not null references public.sales(id) on delete restrict,
  receipt_type integer not null check (receipt_type between 1 and 999),
  point_of_sale integer not null check (point_of_sale between 1 and 99998),
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9_-]{8,128}$'),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  encrypted_request text not null,
  encrypted_response text,
  state text not null check (state in ('draft', 'pending', 'authorized', 'uncertain', 'rejected')),
  arca_sent_at timestamptz,
  arca_last_number integer,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  authorized_at timestamptz,
  unique (commerce_id, sale_id, receipt_type, point_of_sale),
  unique (commerce_id, idempotency_key)
);

create table if not exists private.fiscal_invoice_events (
  id bigint generated always as identity primary key,
  invoice_id uuid not null references private.fiscal_invoices(id) on delete cascade,
  from_state text,
  to_state text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists fiscal_invoices_pending_idx
  on private.fiscal_invoices (state, updated_at)
  where state in ('pending', 'uncertain');

alter table private.fiscal_controls enable row level security;
alter table private.fiscal_tenants enable row level security;
alter table private.fiscal_invoices enable row level security;
alter table private.fiscal_invoice_events enable row level security;

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;

create or replace function private.fiscal_invoice_json(p_invoice private.fiscal_invoices)
returns jsonb
language sql
stable
set search_path = private, pg_temp
as $$
  select jsonb_build_object(
    'id', p_invoice.id,
    'commerceId', p_invoice.commerce_id,
    'saleId', p_invoice.sale_id,
    'receiptType', p_invoice.receipt_type,
    'pointOfSale', p_invoice.point_of_sale,
    'idempotencyKey', p_invoice.idempotency_key,
    'requestHash', p_invoice.request_hash,
    'encryptedRequest', p_invoice.encrypted_request,
    'encryptedResponse', p_invoice.encrypted_response,
    'state', p_invoice.state,
    'arcaSentAt', p_invoice.arca_sent_at,
    'arcaLastNumber', p_invoice.arca_last_number,
    'errorCode', p_invoice.error_code,
    'createdAt', p_invoice.created_at,
    'updatedAt', p_invoice.updated_at,
    'authorizedAt', p_invoice.authorized_at
  );
$$;

create or replace function private.fiscal_assert_sale_commerce(p_sale_id uuid, p_commerce_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not exists (
    select 1 from public.sales
    where id = p_sale_id and commerce_id = p_commerce_id
  ) then
    raise exception 'sale does not belong to commerce' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.fiscal_read_tenant(p_tenant_key text)
returns jsonb
language sql
security definer
set search_path = private, pg_temp
as $$
  select jsonb_build_object(
    'tenantKey', tenant_key,
    'commerceId', commerce_id,
    'encryptedRecord', encrypted_record,
    'createdAt', created_at,
    'updatedAt', updated_at
  )
  from private.fiscal_tenants
  where tenant_key = lower(trim(p_tenant_key));
$$;

create or replace function public.fiscal_write_tenant(
  p_tenant_key text,
  p_commerce_id uuid,
  p_encrypted_record text
)
returns jsonb
language plpgsql
security definer
set search_path = private, pg_temp
as $$
declare
  v_row private.fiscal_tenants;
begin
  if p_tenant_key !~ '^[a-z0-9][a-z0-9_-]{2,80}$' then
    raise exception 'invalid tenant key' using errcode = '22023';
  end if;
  if p_commerce_id is null then
    select * into v_row from private.fiscal_tenants where tenant_key = lower(trim(p_tenant_key)) for update;
    if not found then raise exception 'fiscal tenant not found' using errcode = 'P0002'; end if;
    update private.fiscal_tenants set encrypted_record = p_encrypted_record, updated_at = now()
    where tenant_key = v_row.tenant_key returning * into v_row;
  else
    insert into private.fiscal_tenants (tenant_key, commerce_id, encrypted_record)
    values (lower(trim(p_tenant_key)), p_commerce_id, p_encrypted_record)
    on conflict (tenant_key) do update
      set encrypted_record = excluded.encrypted_record, updated_at = now()
      where private.fiscal_tenants.commerce_id = excluded.commerce_id
    returning * into v_row;
    if not found then raise exception 'tenant key belongs to a different commerce' using errcode = '42501'; end if;
  end if;
  return jsonb_build_object('tenantKey', v_row.tenant_key, 'commerceId', v_row.commerce_id, 'encryptedRecord', v_row.encrypted_record, 'createdAt', v_row.created_at, 'updatedAt', v_row.updated_at);
end;
$$;

create or replace function public.fiscal_claim_invoice(
  p_commerce_id uuid,
  p_sale_id uuid,
  p_receipt_type integer,
  p_point_of_sale integer,
  p_idempotency_key text,
  p_request_hash text,
  p_encrypted_request text
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_invoice private.fiscal_invoices;
  v_created boolean := false;
begin
  perform pg_advisory_xact_lock(hashtext(concat_ws(':', p_commerce_id::text, p_sale_id::text, p_receipt_type::text, p_point_of_sale::text)));
  perform private.fiscal_assert_sale_commerce(p_sale_id, p_commerce_id);

  select * into v_invoice from private.fiscal_invoices
  where commerce_id = p_commerce_id and idempotency_key = p_idempotency_key
  for update;
  if found then
    if v_invoice.request_hash <> p_request_hash then
      raise exception 'idempotency key was used with a different invoice' using errcode = '23505';
    end if;
    return private.fiscal_invoice_json(v_invoice) || jsonb_build_object('created', false);
  end if;

  select * into v_invoice from private.fiscal_invoices
  where commerce_id = p_commerce_id and sale_id = p_sale_id and receipt_type = p_receipt_type and point_of_sale = p_point_of_sale
  for update;
  if found then
    raise exception 'logical fiscal invoice already exists' using errcode = '23505';
  end if;

  insert into private.fiscal_invoices (commerce_id, sale_id, receipt_type, point_of_sale, idempotency_key, request_hash, encrypted_request, state)
  values (p_commerce_id, p_sale_id, p_receipt_type, p_point_of_sale, p_idempotency_key, p_request_hash, p_encrypted_request, 'draft')
  returning * into v_invoice;
  insert into private.fiscal_invoice_events (invoice_id, from_state, to_state, reason) values (v_invoice.id, null, 'draft', 'created');

  update private.fiscal_invoices set state = 'pending', updated_at = now() where id = v_invoice.id returning * into v_invoice;
  insert into private.fiscal_invoice_events (invoice_id, from_state, to_state, reason) values (v_invoice.id, 'draft', 'pending', 'claimed');
  return private.fiscal_invoice_json(v_invoice) || jsonb_build_object('created', true);
end;
$$;

create or replace function public.fiscal_mark_invoice_sent(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = private, pg_temp
as $$
declare v_invoice private.fiscal_invoices;
begin
  update private.fiscal_invoices set arca_sent_at = now(), updated_at = now()
  where id = p_invoice_id and state = 'pending'
  returning * into v_invoice;
  if not found then raise exception 'invoice is not pending' using errcode = '55000'; end if;
  return private.fiscal_invoice_json(v_invoice);
end;
$$;

create or replace function public.fiscal_transition_invoice(
  p_invoice_id uuid,
  p_target_state text,
  p_encrypted_response text default null,
  p_error_code text default null,
  p_arca_last_number integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = private, pg_temp
as $$
declare
  v_invoice private.fiscal_invoices;
  v_from_state text;
begin
  select * into v_invoice from private.fiscal_invoices where id = p_invoice_id for update;
  if not found then raise exception 'fiscal invoice not found' using errcode = 'P0002'; end if;
  v_from_state := v_invoice.state;
  if not (
    (v_from_state = 'draft' and p_target_state = 'pending') or
    (v_from_state = 'pending' and p_target_state in ('authorized', 'uncertain', 'rejected'))
  ) then
    raise exception 'invalid fiscal state transition % -> %', v_from_state, p_target_state using errcode = '55000';
  end if;
  update private.fiscal_invoices
  set state = p_target_state,
      encrypted_response = coalesce(p_encrypted_response, encrypted_response),
      error_code = coalesce(p_error_code, error_code),
      arca_last_number = coalesce(p_arca_last_number, arca_last_number),
      updated_at = now(),
      authorized_at = case when p_target_state = 'authorized' then now() else authorized_at end
  where id = p_invoice_id
  returning * into v_invoice;
  insert into private.fiscal_invoice_events (invoice_id, from_state, to_state, reason)
  values (v_invoice.id, v_from_state, p_target_state, p_error_code);
  return private.fiscal_invoice_json(v_invoice);
end;
$$;

create or replace function public.fiscal_read_control()
returns jsonb
language sql
security definer
set search_path = private, pg_temp
as $$
  select jsonb_build_object('acceptingNewInvoices', accepting_new_invoices, 'updatedAt', updated_at)
  from private.fiscal_controls where singleton = true;
$$;

revoke all on function public.fiscal_read_tenant(text) from public, anon, authenticated;
revoke all on function public.fiscal_write_tenant(text, uuid, text) from public, anon, authenticated;
revoke all on function public.fiscal_claim_invoice(uuid, uuid, integer, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.fiscal_mark_invoice_sent(uuid) from public, anon, authenticated;
revoke all on function public.fiscal_transition_invoice(uuid, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.fiscal_read_control() from public, anon, authenticated;

grant execute on function public.fiscal_read_tenant(text) to service_role;
grant execute on function public.fiscal_write_tenant(text, uuid, text) to service_role;
grant execute on function public.fiscal_claim_invoice(uuid, uuid, integer, integer, text, text, text) to service_role;
grant execute on function public.fiscal_mark_invoice_sent(uuid) to service_role;
grant execute on function public.fiscal_transition_invoice(uuid, text, text, text, integer) to service_role;
grant execute on function public.fiscal_read_control() to service_role;

comment on table private.fiscal_invoices is 'Private fiscal state machine. Only server-side service_role RPCs may access it.';
