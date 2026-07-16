const authSessionStorageKey = 'pclaf-control-auth-session'

const normalizeUrl = (url) => String(url || '').trim().replace(/\/+$/, '')

const buildHeaders = (anonKey, accessToken = '', extra = {}) => ({
  apikey: anonKey,
  Authorization: `Bearer ${accessToken || anonKey}`,
  'Content-Type': 'application/json',
  ...extra,
})

const safeJson = async (response) => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export const createCloudAuthManager = ({ url, anonKey }) => {
  const baseUrl = normalizeUrl(url)
  const publishableKey = String(anonKey || '').trim()

  if (!baseUrl || !publishableKey) {
    return null
  }

  let session = null

  const persistSession = () => {
    try {
      if (!session) {
        localStorage.removeItem(authSessionStorageKey)
        return
      }
      localStorage.setItem(authSessionStorageKey, JSON.stringify(session))
    } catch {
      // ignore persistence issues
    }
  }

  const readSession = () => {
    try {
      const raw = localStorage.getItem(authSessionStorageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed?.access_token || !parsed?.refresh_token) return null
      return parsed
    } catch {
      return null
    }
  }

  const authRequest = async (pathname, { method = 'GET', body, token = '', headers = {} } = {}) => {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method,
      headers: buildHeaders(publishableKey, token, headers),
      body: body ? JSON.stringify(body) : undefined,
    })
    const payload = await safeJson(response)
    if (!response.ok) {
      throw new Error(payload?.msg || payload?.error_description || payload?.message || `Auth request failed (${response.status})`)
    }
    return payload
  }

  const restRequest = async (pathname, { method = 'GET', body, token = '', headers = {} } = {}) => {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method,
      headers: buildHeaders(publishableKey, token, headers),
      body: body ? JSON.stringify(body) : undefined,
    })
    const payload = await safeJson(response)
    if (!response.ok) {
      throw new Error(payload?.message || payload?.hint || payload?.details || `REST request failed (${response.status})`)
    }
    return payload
  }

  const setSession = (nextSession) => {
    session = nextSession && nextSession.access_token ? nextSession : null
    persistSession()
    return session
  }

  const signIn = async ({ email, password }) => {
    const payload = await authRequest('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email, password },
    })
    return setSession(payload)
  }

  const signUp = async ({ email, password, fullName }) => {
    const payload = await authRequest('/auth/v1/signup', {
      method: 'POST',
      body: {
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      },
    })
    if (payload?.session?.access_token) {
      setSession(payload.session)
    }
    return payload
  }

  const signOut = async () => {
    const currentToken = session?.access_token || ''
    if (currentToken) {
      try {
        await authRequest('/auth/v1/logout', { method: 'POST', token: currentToken })
      } catch {
        // best effort
      }
    }
    setSession(null)
  }

  const restoreSession = async () => {
    const restored = readSession()
    if (!restored) return null
    session = restored
    try {
      await getUser()
      persistSession()
      return session
    } catch {
      setSession(null)
      return null
    }
  }

  const getUser = async () => authRequest('/auth/v1/user', {
    token: session?.access_token || '',
  })

  const bootstrapProfile = async (fullName = '') => restRequest('/rest/v1/rpc/bootstrap_control_user', {
    method: 'POST',
    token: session?.access_token || '',
    body: { p_full_name: fullName || null, p_commerce_name: 'PCLAF Control' },
  })

  const getCommerceContext = async () => {
    const rows = await restRequest('/rest/v1/rpc/current_commerce_context', {
      method: 'POST',
      token: session?.access_token || '',
      body: {},
    })
    return Array.isArray(rows) ? (rows[0] || null) : rows
  }

  const updateCommerceProfile = async (payload) => restRequest('/rest/v1/rpc/upsert_commerce_profile', {
    method: 'POST',
    token: session?.access_token || '',
    body: payload,
  })

  const importSnapshotToCore = async (instanceKey = 'principal') => restRequest('/rest/v1/rpc/import_snapshot_to_core', {
    method: 'POST',
    token: session?.access_token || '',
    body: { p_instance_key: instanceKey },
  })

  const listControlUsers = async () => restRequest('/rest/v1/control_users?select=id,email,full_name,role_key,status,is_owner,created_at,updated_at&order=created_at.asc', {
    token: session?.access_token || '',
  })

  const updateControlUser = async (userId, payload) => restRequest(`/rest/v1/control_users?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    token: session?.access_token || '',
    headers: { Prefer: 'return=representation' },
    body: payload,
  })

  return {
    getSession: () => session,
    restoreSession,
    signIn,
    signUp,
    signOut,
    getUser,
    bootstrapProfile,
    getCommerceContext,
    updateCommerceProfile,
    importSnapshotToCore,
    listControlUsers,
    updateControlUser,
  }
}
