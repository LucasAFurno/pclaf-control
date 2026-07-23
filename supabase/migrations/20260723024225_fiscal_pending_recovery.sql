alter table private.fiscal_invoices
  add column if not exists processing_lease_until timestamptz;

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
    'processingLeaseUntil', p_invoice.processing_lease_until,
    'arcaLastNumber', p_invoice.arca_last_number,
    'errorCode', p_invoice.error_code,
    'createdAt', p_invoice.created_at,
    'updatedAt', p_invoice.updated_at,
    'authorizedAt', p_invoice.authorized_at
  );
$$;

drop function public.fiscal_claim_invoice(uuid, uuid, integer, integer, text, text, text);

create function public.fiscal_claim_invoice(
  p_commerce_id uuid,
  p_sale_id uuid,
  p_receipt_type integer,
  p_point_of_sale integer,
  p_idempotency_key text,
  p_request_hash text,
  p_encrypted_request text,
  p_processing_lease_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_invoice private.fiscal_invoices;
  v_created boolean := false;
  v_processing_acquired boolean := false;
begin
  if p_processing_lease_seconds not between 46 and 300 then
    raise exception 'invalid processing lease' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(concat_ws(':', p_commerce_id::text, p_sale_id::text, p_receipt_type::text, p_point_of_sale::text)));
  perform private.fiscal_assert_sale_commerce(p_sale_id, p_commerce_id);

  select * into v_invoice from private.fiscal_invoices
  where commerce_id = p_commerce_id and idempotency_key = p_idempotency_key
  for update;
  if found then
    if v_invoice.request_hash <> p_request_hash then
      raise exception 'idempotency key was used with a different invoice' using errcode = '23505';
    end if;
    if v_invoice.state = 'pending' and v_invoice.arca_sent_at is null
      and (v_invoice.processing_lease_until is null or v_invoice.processing_lease_until <= now()) then
      update private.fiscal_invoices
      set processing_lease_until = now() + (p_processing_lease_seconds * interval '1 second'), updated_at = now()
      where id = v_invoice.id
      returning * into v_invoice;
      v_processing_acquired := true;
    end if;
    return private.fiscal_invoice_json(v_invoice) || jsonb_build_object('created', false, 'processingAcquired', v_processing_acquired);
  end if;

  select * into v_invoice from private.fiscal_invoices
  where commerce_id = p_commerce_id and sale_id = p_sale_id and receipt_type = p_receipt_type and point_of_sale = p_point_of_sale
  for update;
  if found then
    raise exception 'logical fiscal invoice already exists' using errcode = '23505';
  end if;

  insert into private.fiscal_invoices (
    commerce_id, sale_id, receipt_type, point_of_sale, idempotency_key, request_hash, encrypted_request, state, processing_lease_until
  ) values (
    p_commerce_id, p_sale_id, p_receipt_type, p_point_of_sale, p_idempotency_key, p_request_hash, p_encrypted_request, 'draft', now() + (p_processing_lease_seconds * interval '1 second')
  ) returning * into v_invoice;
  insert into private.fiscal_invoice_events (invoice_id, from_state, to_state, reason) values (v_invoice.id, null, 'draft', 'created');
  update private.fiscal_invoices set state = 'pending', updated_at = now() where id = v_invoice.id returning * into v_invoice;
  insert into private.fiscal_invoice_events (invoice_id, from_state, to_state, reason) values (v_invoice.id, 'draft', 'pending', 'claimed');
  return private.fiscal_invoice_json(v_invoice) || jsonb_build_object('created', true, 'processingAcquired', true);
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
    (v_from_state = 'pending' and p_target_state in ('authorized', 'uncertain', 'rejected')) or
    (v_from_state = 'uncertain' and p_target_state in ('authorized', 'rejected'))
  ) then
    raise exception 'invalid fiscal state transition % -> %', v_from_state, p_target_state using errcode = '55000';
  end if;
  update private.fiscal_invoices
  set state = p_target_state,
      encrypted_response = coalesce(p_encrypted_response, encrypted_response),
      error_code = coalesce(p_error_code, error_code),
      arca_last_number = coalesce(p_arca_last_number, arca_last_number),
      processing_lease_until = null,
      updated_at = now(),
      authorized_at = case when p_target_state = 'authorized' then now() else authorized_at end
  where id = p_invoice_id
  returning * into v_invoice;
  insert into private.fiscal_invoice_events (invoice_id, from_state, to_state, reason)
  values (v_invoice.id, v_from_state, p_target_state, p_error_code);
  return private.fiscal_invoice_json(v_invoice);
end;
$$;

revoke all on function public.fiscal_claim_invoice(uuid, uuid, integer, integer, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.fiscal_claim_invoice(uuid, uuid, integer, integer, text, text, text, integer) to service_role;
