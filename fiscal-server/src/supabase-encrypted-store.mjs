import { EncryptedFiscalStore } from './encrypted-store.mjs'

const commerceId = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)) throw new Error('A valid commerce id is required')
  return normalized
}

export class SupabaseEncryptedFiscalStore extends EncryptedFiscalStore {
  constructor({ url, serviceRoleKey, masterKey }) {
    super({ dataDir: '', masterKey })
    this.url = url
    this.serviceRoleKey = serviceRoleKey
  }

  async rpc(name, body = {}) {
    const response = await fetch(`${this.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: this.serviceRoleKey,
        authorization: `Bearer ${this.serviceRoleKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`Supabase fiscal RPC ${name} failed (${response.status})`)
    const value = await response.json()
    return Array.isArray(value) ? value[0] : value
  }

  async read(tenantId) {
    const row = await this.rpc('fiscal_read_tenant', { p_tenant_key: this.safeTenantId(tenantId) })
    return row?.encryptedRecord ? this.decrypt(row.encryptedRecord) : null
  }

  async write(tenantId, value) {
    const row = await this.rpc('fiscal_write_tenant', {
      p_tenant_key: this.safeTenantId(tenantId),
      p_commerce_id: value.commerceId || null,
      p_encrypted_record: this.encrypt(value),
    })
    if (!row?.tenantKey) throw new Error('Supabase did not persist fiscal tenant')
  }

  async createKeyPair(tenantId, subject, pCommerceId) {
    const existing = await this.read(tenantId)
    if (existing?.privateKeyPem) throw new Error('A key pair already exists for this tenant')
    return super.createKeyPair(tenantId, subject, commerceId(pCommerceId))
  }

  async claimInvoice({ commerceId: pCommerceId, saleId, receiptType, pointOfSale, idempotencyKey, requestHash, encryptedRequest, processingLeaseSeconds }) {
    return this.rpc('fiscal_claim_invoice', {
      p_commerce_id: commerceId(pCommerceId), p_sale_id: saleId, p_receipt_type: receiptType,
      p_point_of_sale: pointOfSale, p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash, p_encrypted_request: encryptedRequest,
      p_processing_lease_seconds: processingLeaseSeconds,
    })
  }

  async markInvoiceSent(invoiceId) { return this.rpc('fiscal_mark_invoice_sent', { p_invoice_id: invoiceId }) }

  async transitionInvoice({ invoiceId, targetState, encryptedResponse = null, errorCode = null, arcaLastNumber = null }) {
    return this.rpc('fiscal_transition_invoice', {
      p_invoice_id: invoiceId, p_target_state: targetState, p_encrypted_response: encryptedResponse,
      p_error_code: errorCode, p_arca_last_number: arcaLastNumber,
    })
  }

  async emergencyStop() {
    const control = await this.rpc('fiscal_read_control')
    return control?.acceptingNewInvoices === false
  }
}
