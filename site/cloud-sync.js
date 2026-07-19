const buildHeaders = (anonKey) => ({
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  'Content-Type': 'application/json',
})

const normalizeUrl = (url) => String(url || '').trim().replace(/\/+$/, '')

export const createSupabaseSnapshotAdapter = (config) => {
  const baseUrl = normalizeUrl(config?.url)
  const anonKey = String(config?.anonKey || '').trim()
  const instanceKey = String(config?.instanceKey || 'default').trim().toLowerCase()
  const readSessionToken = typeof config?.getAccessToken === 'function' ? config.getAccessToken : () => ''

  if (!baseUrl || !anonKey || !instanceKey) return null

  const rpc = async (fnName, body) => {
    const response = await fetch(`${baseUrl}/rest/v1/rpc/${fnName}`, {
      method: 'POST',
      headers: buildHeaders(anonKey),
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.message || payload?.hint || payload?.details || `${fnName} failed (${response.status})`)
    return payload
  }

  return {
    instanceKey,
    async load() {
      const stateJson = await rpc('app_public_load_core_state', {
        p_session_token: readSessionToken(),
      })
      return {
        instance_key: instanceKey,
        state_json: stateJson,
        updated_at: new Date().toISOString(),
      }
    },
    async save() {
      throw new Error('snapshot_disabled')
    },
  }
}
