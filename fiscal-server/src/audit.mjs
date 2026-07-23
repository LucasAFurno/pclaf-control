export const audit = (event, fields = {}) => {
  const safe = Object.fromEntries(Object.entries(fields)
    .filter(([key]) => !/token|sign|certificate|private|xml|secret|key|payload/i.test(key))
    .map(([key, value]) => [key, typeof value === 'string' ? value.replace(/<[^>]+>/g, '[redacted]').slice(0, 180) : value]))
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), service: 'fiscal', event, ...safe })}\n`)
}
