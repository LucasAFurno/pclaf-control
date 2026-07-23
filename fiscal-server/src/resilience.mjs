export class FixedWindowRateLimiter {
  constructor({ windowMs }) {
    this.windowMs = windowMs
    this.counters = new Map()
  }

  take(key, limit) {
    const now = Date.now()
    const current = this.counters.get(key)
    const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + this.windowMs } : current
    entry.count += 1
    this.counters.set(key, entry)
    return { allowed: entry.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) }
  }
}

export class CircuitBreaker {
  constructor({ name, failureThreshold, cooldownMs }) {
    this.name = name
    this.failureThreshold = failureThreshold
    this.cooldownMs = cooldownMs
    this.failures = 0
    this.openedAt = 0
  }

  async execute(operation) {
    const now = Date.now()
    if (this.openedAt && now - this.openedAt < this.cooldownMs) {
      const retryIn = Math.ceil((this.cooldownMs - (now - this.openedAt)) / 1000)
      throw new Error(`${this.name} circuit is open; retry in ${retryIn}s`)
    }
    if (this.openedAt) {
      this.openedAt = 0
      this.failures = 0
    }
    try {
      const value = await operation()
      this.failures = 0
      return value
    } catch (error) {
      this.failures += 1
      if (this.failures >= this.failureThreshold) this.openedAt = Date.now()
      throw error
    }
  }
}
