import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

process.env.FISCAL_SERVICE_TOKEN ||= 'test-service-token'
process.env.FISCAL_MASTER_KEY_BASE64 ||= randomBytes(32).toString('base64')
process.env.FISCAL_STORE = 'filesystem'

const { ArcaClient } = await import('../src/arca-client.mjs')

test('never retries FECAESolicitar after an ambiguous transport failure', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    throw new TypeError('socket closed after request was sent')
  }
  try {
    const client = new ArcaClient({ store: { read: async () => null } })
    client.authCache.set('tenant-test', { token: 'token', sign: 'sign', expiresAt: new Date(Date.now() + 120_000).toISOString() })
    await assert.rejects(
      () => client.requestCae({ tenantId: 'tenant-test', cuit: '20123456789', requestXml: '<FeCAEReq><FeCabReq/></FeCAEReq>' }),
      /socket closed/,
    )
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})
