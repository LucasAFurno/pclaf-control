import { loadNotifications, missingVariables, printMissingVariables } from './notification-runtime.mjs'

const status = String(process.argv[2] || '').toLowerCase()
if (!['started', 'success', 'failed', 'rollback'].includes(status)) {
  throw new Error('Uso: npm run notify:deploy -- started|success|failed|rollback')
}

const required = process.env.PCLAF_CONTROL_DISCORD_ENABLED === 'true'
  ? missingVariables(['PCLAF_CONTROL_DISCORD_DEPLOYS_WEBHOOK_URL'])
  : []

if (required.length) {
  printMissingVariables(required)
  process.exitCode = 1
} else {
  const { notifyDiscord } = await loadNotifications()
  const input = Object.fromEntries(process.argv.slice(3).map((arg) => {
    const [key, ...parts] = arg.replace(/^--/, '').split('=')
    return [key, parts.join('=')]
  }))
  const title = { started: 'Deploy iniciado', success: 'Deploy exitoso', failed: 'Deploy fallido', rollback: 'Rollback iniciado' }[status]
  const sent = await notifyDiscord('deploys', {
    type: `DEPLOY_${status.toUpperCase()}`,
    severity: status === 'failed' ? 'critical' : status === 'rollback' ? 'warning' : 'info',
    title,
    source: 'ci-cd',
    environment: input.environment || process.env.NODE_ENV || 'production',
    metadata: { version: input.version, commit: input.commit, rama: input.branch, autor: input.author, pipeline: input.pipeline, detalle: input.detail },
  })
  process.stdout.write(sent ? `Notificacion de deploy ${status} encolada.\n` : 'Discord deshabilitado o sin destino configurado; el deploy continua.\n')
}
