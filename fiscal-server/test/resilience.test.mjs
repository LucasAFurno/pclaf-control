import test from 'node:test'
import assert from 'node:assert/strict'
import { CircuitBreaker, FixedWindowRateLimiter } from '../src/resilience.mjs'

test('rate limiter rejects requests after the configured per-window limit', () => {
  const limiter = new FixedWindowRateLimiter({ windowMs: 60_000 })
  assert.equal(limiter.take('tenant-a', 2).allowed, true)
  assert.equal(limiter.take('tenant-a', 2).allowed, true)
  assert.equal(limiter.take('tenant-a', 2).allowed, false)
})

test('circuit breaker opens after consecutive final failures', async () => {
  const breaker = new CircuitBreaker({ name: 'test', failureThreshold: 2, cooldownMs: 60_000 })
  await assert.rejects(() => breaker.execute(async () => { throw new Error('down') }))
  await assert.rejects(() => breaker.execute(async () => { throw new Error('down') }))
  await assert.rejects(() => breaker.execute(async () => 'not reached'), /circuit is open/)
})
