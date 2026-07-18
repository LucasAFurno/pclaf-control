const authSessionStorageKey = 'pclaf-control-auth-session'

const normalizeUrl = (url) => String(url || '').trim().replace(/\/+$/, '')

const buildHeaders = (anonKey, extra = {}) => ({
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
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

const normalizeSessionPayload = (payload) => {
  if (!payload?.session_token || !payload?.profile) return null
  return {
    sessionToken: payload.session_token,
    profile: payload.profile,
    commerceContext: payload.commerce_context || null,
  }
}

export const createCloudAuthManager = ({ url, anonKey, instanceKey = 'pclaf-dev' }) => {
  const baseUrl = normalizeUrl(url)
  const publishableKey = String(anonKey || '').trim()
  const currentInstanceKey = String(instanceKey || 'pclaf-dev').trim().toLowerCase()

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
      if (!parsed?.sessionToken || !parsed?.profile) return null
      return parsed
    } catch {
      return null
    }
  }

  const rpc = async (fnName, body = {}) => {
    const response = await fetch(`${baseUrl}/rest/v1/rpc/${fnName}`, {
      method: 'POST',
      headers: buildHeaders(publishableKey),
      body: JSON.stringify(body),
    })
    const payload = await safeJson(response)
    if (!response.ok) {
      throw new Error(payload?.message || payload?.hint || payload?.details || `RPC failed (${response.status})`)
    }
    return payload
  }

  const setSession = (payload) => {
    session = normalizeSessionPayload(payload)
    persistSession()
    return session
  }

  const normalizeInstanceKey = (value) => String(value || currentInstanceKey || 'pclaf-dev').trim().toLowerCase() || 'pclaf-dev'
  const normalizeOptionalInstanceKey = (value) => {
    if (value == null) return ''
    const normalized = String(value).trim().toLowerCase()
    return normalized || ''
  }

  const getSetupStatus = async ({ instanceKey: requestedInstanceKey } = {}) => rpc('app_get_setup_status', {
    p_instance_key: normalizeInstanceKey(requestedInstanceKey),
  })

  const setupInstance = async ({ instanceKey: requestedInstanceKey, commerceName, ownerName, ownerLogin, ownerEmail, ownerPin, branchName, branchCode, registerName, registerCode }) => {
    const payload = await rpc('app_setup_instance', {
      p_instance_key: normalizeInstanceKey(requestedInstanceKey),
      p_commerce_name: commerceName,
      p_owner_name: ownerName,
      p_owner_login: ownerLogin,
      p_owner_email: ownerEmail,
      p_owner_pin: ownerPin,
      p_branch_name: branchName,
      p_branch_code: branchCode,
      p_register_name: registerName,
      p_register_code: registerCode,
    })
    return setSession(payload)
  }

  const signIn = async ({ instanceKey: requestedInstanceKey, identifier, pin }) => {
    const payload = await rpc('app_public_sign_in', {
      p_instance_key: normalizeOptionalInstanceKey(requestedInstanceKey),
      p_identifier: identifier,
      p_pin: pin,
    })
    return setSession(payload)
  }

  const restoreSession = async () => {
    const restored = readSession()
    if (!restored?.sessionToken) return null
    try {
      const payload = await rpc('app_public_restore_session', {
        p_session_token: restored.sessionToken,
      })
      return setSession(payload)
    } catch {
      session = null
      persistSession()
      return null
    }
  }

  const signOut = async () => {
    const token = session?.sessionToken || readSession()?.sessionToken || ''
    if (token) {
      try {
        await rpc('app_public_sign_out', { p_session_token: token })
      } catch {
        // best effort
      }
    }
    session = null
    persistSession()
  }

  const requestPasswordReset = async ({ email }) => rpc('app_public_request_password_reset', {
    p_email: String(email || '').trim().toLowerCase(),
  })

  return {
    getSession: () => session,
    getSetupStatus,
    setupInstance,
    signIn,
    requestPasswordReset,
    restoreSession,
    signOut,
  }
}
