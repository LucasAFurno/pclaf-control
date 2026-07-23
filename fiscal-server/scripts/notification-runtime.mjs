// Standalone notification scripts do not need fiscal service credentials.
const placeholderMasterKey = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

export const loadNotifications = async () => {
  process.env.FISCAL_SERVICE_TOKEN ||= 'notification-script'
  process.env.FISCAL_MASTER_KEY_BASE64 ||= placeholderMasterKey
  return import('../src/notifications.mjs')
}

export const missingVariables = (names) => names.filter((name) => !String(process.env[name] || '').trim())

export const printMissingVariables = (names) => {
  process.stderr.write(`Faltan variables requeridas: ${names.join(', ')}\n`)
}
