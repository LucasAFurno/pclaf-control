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

  if (!baseUrl || !anonKey || !instanceKey) return null

  const endpoint = `${baseUrl}/rest/v1/app_snapshots`

  return {
    instanceKey,
    async load() {
      const query = `${endpoint}?instance_key=eq.${encodeURIComponent(instanceKey)}&select=instance_key,state_json,updated_at&limit=1`
      const response = await fetch(query, {
        method: 'GET',
        headers: buildHeaders(anonKey),
      })
      if (!response.ok) throw new Error(`Supabase load failed (${response.status})`)
      const rows = await response.json()
      return rows[0] || null
    },
    async save(state) {
      const response = await fetch(`${endpoint}?on_conflict=instance_key`, {
        method: 'POST',
        headers: {
          ...buildHeaders(anonKey),
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify([{
          instance_key: instanceKey,
          state_json: state,
          updated_at: new Date().toISOString(),
        }]),
      })
      if (!response.ok) throw new Error(`Supabase save failed (${response.status})`)
      const rows = await response.json()
      return rows[0] || null
    },
  }
}
