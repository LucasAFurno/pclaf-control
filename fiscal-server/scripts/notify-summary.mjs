import { Storage } from '@google-cloud/storage'
import { loadNotifications, missingVariables, printMissingVariables } from './notification-runtime.mjs'

const required = missingVariables(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])
if (required.length) {
  printMissingVariables(required)
  process.exitCode = 1
} else {
  // The summary itself needs no fiscal credentials.
  const { notifyDiscord, notifyTelegram } = await loadNotifications()
  const { config } = await import('../src/config.mjs')
  const today = new Date().toISOString().slice(0, 10)
  const headers = { apikey: config.supabaseServiceRoleKey, authorization: `Bearer ${config.supabaseServiceRoleKey}`, prefer: 'count=exact' }
  const count = async (table, filter = '', schema = 'public', optional = false) => {
    try {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}?select=id${filter}&limit=1`, { headers: { ...headers, 'accept-profile': schema }, signal: AbortSignal.timeout(10_000) })
      if (!response.ok) throw new Error(`Supabase no respondio correctamente para ${table} (${response.status})`)
      const total = Number((response.headers.get('content-range') || '').split('/')[1])
      if (!Number.isFinite(total)) throw new Error(`Supabase no devolvio conteo para ${table}`)
      return total
    } catch (error) {
      if (optional) return null
      throw new Error(`No se pudo consultar Supabase para ${table}`)
    }
  }

  const entries = await Promise.all([
    ['Comercios totales', count('commerce_accounts')],
    ['Comercios activos', count('commerce_accounts', '&status=eq.active')],
    ['Comercios nuevos', count('commerce_accounts', `&created_at=gte.${today}`)],
    ['Usuarios totales', count('control_users')],
    ['Usuarios nuevos', count('control_users', `&created_at=gte.${today}`)],
    ['Facturas emitidas', count('documents', `&kind=eq.factura&issued_at=gte.${today}`)],
    ['CAE aprobados', count('fiscal_invoices', `&state=eq.authorized&updated_at=gte.${today}`, 'private', true)],
    ['CAE rechazados', count('fiscal_invoices', `&state=eq.rejected&updated_at=gte.${today}`, 'private', true)],
  ].map(async ([label, value]) => [label, await value]))
  const metrics = Object.fromEntries(entries.filter(([, value]) => value !== null))
  const backupBucket = String(process.env.BACKUP_GCS_BUCKET || '').trim()
  const backupPrefix = String(process.env.BACKUP_GCS_PREFIX || 'pclaf-control/backups').trim().replace(/^\/+|\/+$/g, '')
  if (backupBucket) {
    try {
      const [content] = await new Storage().bucket(backupBucket).file(`${backupPrefix}/last-success.json`).download()
      const backup = JSON.parse(content.toString('utf8'))
      if (backup?.completedAt && backup?.bytes && backup?.destination) metrics['Ultimo backup'] = `${backup.completedAt} · ${backup.bytes} bytes · ${backup.destination}`
    } catch {
      process.stdout.write('{"service":"fiscal","event":"backup_metadata_unavailable"}\n')
    }
  }
  const message = [`Fecha: ${today}`, ...Object.entries(metrics).map(([label, value]) => `${label}: ${value}`)].join('\n')
  const event = { destination: 'resumen', type: 'DAILY_SUMMARY', severity: 'info', title: 'Resumen diario', source: 'pclaf-control', environment: String(process.env.NOTIFICATIONS_ENVIRONMENT || '').trim() || undefined, message }
  const discordSent = await notifyDiscord('resumen', event)
  if (!discordSent) process.stdout.write('{"service":"fiscal","event":"discord_summary_not_delivered"}\n')
  if (config.telegram.enabled) {
    const telegramSent = await notifyTelegram(event)
    if (!telegramSent) process.stdout.write('{"service":"fiscal","event":"telegram_summary_not_delivered"}\n')
  }
  process.stdout.write('Resumen diario encolado.\n')
}
