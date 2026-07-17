const buildHeaders = (anonKey) => ({
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  'Content-Type': 'application/json',
})

const normalizeUrl = (url) => String(url || '').trim().replace(/\/+$/, '')

const safeJson = async (response) => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export const createSupabaseCoreAdapter = (config) => {
  const baseUrl = normalizeUrl(config?.url)
  const anonKey = String(config?.anonKey || '').trim()
  const readSessionToken = typeof config?.getAccessToken === 'function' ? config.getAccessToken : () => ''

  if (!baseUrl || !anonKey) return null

  const rpc = async (fnName, body) => {
    const response = await fetch(`${baseUrl}/rest/v1/rpc/${fnName}`, {
      method: 'POST',
      headers: buildHeaders(anonKey),
      body: JSON.stringify(body),
    })
    const payload = await safeJson(response)
    if (!response.ok) throw new Error(payload?.message || payload?.hint || payload?.details || `${fnName} failed (${response.status})`)
    return payload
  }

  const getSessionToken = () => {
    const token = String(readSessionToken() || '').trim()
    if (!token) throw new Error('No hay sesion cloud activa.')
    return token
  }

  return {
    async updateCommerceProfile(payload) {
      return rpc('app_public_update_commerce_profile', {
        p_session_token: getSessionToken(),
        p_name: payload?.name || '',
        p_owner_email: payload?.ownerEmail || '',
        p_legal_name: payload?.legalName || '',
        p_active_plan: payload?.activePlan || '',
      })
    },
    async upsertCustomer(payload) {
      return rpc('app_public_upsert_customer', {
        p_session_token: getSessionToken(),
        p_customer_id: payload?.id || null,
        p_full_name: payload?.fullName || '',
        p_phone: payload?.phone || '',
        p_email: payload?.email || '',
        p_balance: Number(payload?.balance || 0),
        p_tag: payload?.tag || '',
        p_notes: payload?.notes || '',
      })
    },
    async upsertUser(payload) {
      return rpc('app_public_upsert_user', {
        p_session_token: getSessionToken(),
        p_user_id: payload?.id || null,
        p_full_name: payload?.fullName || '',
        p_role_key: payload?.roleKey || 'cashier',
        p_email: payload?.email || '',
        p_pin: payload?.pin || null,
        p_is_active: payload?.isActive !== false,
      })
    },
    async toggleUserActive(payload) {
      return rpc('app_public_toggle_user_active', {
        p_session_token: getSessionToken(),
        p_user_id: payload?.id || null,
        p_is_active: payload?.isActive !== false,
      })
    },
  }
}
