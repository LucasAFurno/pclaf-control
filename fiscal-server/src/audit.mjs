export const audit = (event, fields = {}) => {
  const safe = Object.fromEntries(Object.entries(fields)
    .filter(([key]) => !/token|sign|certificate|private|xml|secret|key|payload/i.test(key))
    .map(([key, value]) => [key, typeof value === 'string' ? value.replace(/<[^>]+>/g, '[redacted]').slice(0, 180) : value]))
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), service: 'fiscal', event, ...safe })}\n`)
}

export const sendAlert = async (url, event, details = {}) => {
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source: 'pclaf-fiscal-service', event, timestamp: new Date().toISOString(), ...details }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    audit('alert_delivery_failed', { event })
  }
}
