import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const authSessionStorageKey = 'pclaf-control-auth-session'
const legacyAuthSessionStorageKey = 'pclaf-control-auth-session'
const authRecoveryStorageKey = 'pclaf-control-auth-recovery'

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
  const supabase = createClient(baseUrl, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: true,
    },
  })

  const persistSession = () => {
    try {
      if (!session) {
        sessionStorage.removeItem(authSessionStorageKey)
        localStorage.removeItem(legacyAuthSessionStorageKey)
        return
      }
      sessionStorage.setItem(authSessionStorageKey, JSON.stringify(session))
      localStorage.removeItem(legacyAuthSessionStorageKey)
    } catch {
      // ignore persistence issues
    }
  }

  const readSession = () => {
    try {
      const raw = sessionStorage.getItem(authSessionStorageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed?.sessionToken || !parsed?.profile) return null
      return parsed
    } catch {
      return null
    }
  }

  const migrateLegacySession = () => {
    try {
      const legacyRaw = localStorage.getItem(legacyAuthSessionStorageKey)
      if (!legacyRaw) return
      const parsed = JSON.parse(legacyRaw)
      if (!parsed?.sessionToken || !parsed?.profile) {
        localStorage.removeItem(legacyAuthSessionStorageKey)
        return
      }
      sessionStorage.setItem(authSessionStorageKey, JSON.stringify(parsed))
      localStorage.removeItem(legacyAuthSessionStorageKey)
    } catch {
      try {
        localStorage.removeItem(legacyAuthSessionStorageKey)
      } catch {
        // ignore cleanup issues
      }
    }
  }

  const persistRecovery = (payload) => {
    try {
      if (!payload) {
        sessionStorage.removeItem(authRecoveryStorageKey)
        return
      }
      sessionStorage.setItem(authRecoveryStorageKey, JSON.stringify(payload))
    } catch {
      // ignore recovery persistence issues
    }
  }

  const readRecovery = () => {
    try {
      const raw = sessionStorage.getItem(authRecoveryStorageKey)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed?.email) return null
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

  const rpcWithToken = async (fnName, body = {}, accessToken = '') => {
    const response = await fetch(`${baseUrl}/rest/v1/rpc/${fnName}`, {
      method: 'POST',
      headers: buildHeaders(publishableKey, accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

  const sendRecoveryMagicLink = async ({ email, redirectTo }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase()
    await requestPasswordReset({ email: normalizedEmail })
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    })
    if (error) throw error
    persistRecovery({ email: normalizedEmail, requestedAt: new Date().toISOString() })
    return {
      ok: true,
      message: 'Te enviamos un enlace para recuperar el acceso. Revisa tu correo y luego define una clave nueva.',
    }
  }

  const consumeRecoverySession = async () => {
    const url = new URL(window.location.href)
    const isRecoveryRoute = url.searchParams.get('auth_action') === 'recover'
    const { data } = await supabase.auth.getSession()
    const sessionData = data?.session || null
    if (!isRecoveryRoute || !sessionData?.access_token) return null
    const payload = {
      email: sessionData.user?.email || readRecovery()?.email || '',
      accessToken: sessionData.access_token,
    }
    persistRecovery(payload)
    return payload
  }

  const completeRecovery = async ({ password }) => {
    const recovery = readRecovery()
    const { data } = await supabase.auth.getSession()
    const authSession = data?.session || null
    const accessToken = authSession?.access_token || recovery?.accessToken || ''
    if (!accessToken) throw new Error('recovery_session_missing')
    const normalizedPassword = String(password || '')
    if (normalizedPassword.trim().length < 6) throw new Error('owner_pin_too_short')
    const { error } = await supabase.auth.updateUser({ password: normalizedPassword })
    if (error) throw error
    await rpcWithToken('app_sync_password_from_auth', {
      p_new_pin: normalizedPassword,
    }, accessToken)
    await supabase.auth.signOut()
    persistRecovery(null)
    return {
      ok: true,
      message: 'Clave actualizada. Ya puedes entrar con la nueva clave.',
    }
  }

  const clearRecoveryState = async () => {
    persistRecovery(null)
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore cleanup issues
    }
    const url = new URL(window.location.href)
    if (url.searchParams.get('auth_action') === 'recover' || url.hash) {
      url.searchParams.delete('auth_action')
      window.history.replaceState({}, '', `${url.pathname}${url.search}`)
    }
  }

  migrateLegacySession()

  return {
    getSession: () => session,
    getSetupStatus,
    setupInstance,
    signIn,
    requestPasswordReset,
    sendRecoveryMagicLink,
    consumeRecoverySession,
    completeRecovery,
    clearRecoveryState,
    restoreSession,
    signOut,
  }
}
