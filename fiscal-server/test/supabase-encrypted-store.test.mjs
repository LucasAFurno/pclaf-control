import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { SupabaseEncryptedFiscalStore } from '../src/supabase-encrypted-store.mjs'

test('uses the private fiscal RPC surface and preserves persistent claim results', async () => {
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body) })
    return new Response(JSON.stringify({ id: '7a0f53b1-5b45-4b56-8ca3-4f379d3dcc9c', state: 'pending', created: true }), { status: 200 })
  }
  try {
    const store = new SupabaseEncryptedFiscalStore({ url: 'https://example.supabase.co', serviceRoleKey: 'service-role', masterKey: randomBytes(32) })
    const claim = await store.claimInvoice({
      commerceId: '7a0f53b1-5b45-4b56-8ca3-4f379d3dcc9c',
      saleId: '4cb7c1ca-98f9-48fa-afb9-4c47f6e42021',
      receiptType: 6,
      pointOfSale: 2,
      idempotencyKey: 'sale-12345',
      requestHash: 'a'.repeat(64),
      encryptedRequest: 'ciphertext',
    })
    assert.equal(claim.state, 'pending')
    assert.equal(claim.created, true)
    assert.match(calls[0].url, /\/rest\/v1\/rpc\/fiscal_claim_invoice$/)
    assert.equal(calls[0].body.p_commerce_id, '7a0f53b1-5b45-4b56-8ca3-4f379d3dcc9c')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('does not accept a failed private RPC as a successful fiscal write', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response('{"message":"denied"}', { status: 403 })
  try {
    const store = new SupabaseEncryptedFiscalStore({ url: 'https://example.supabase.co', serviceRoleKey: 'service-role', masterKey: randomBytes(32) })
    await assert.rejects(() => store.emergencyStop(), /fiscal_read_control failed \(403\)/)
  } finally {
    globalThis.fetch = originalFetch
  }
})
