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
        p_active_plan: '',
      })
    },
    async updateCommerceRuntime(payload) {
      return rpc('app_public_update_commerce_runtime', {
        p_session_token: getSessionToken(),
        p_active_plan: payload?.activePlan || 'custom',
        p_enabled_modules: Array.isArray(payload?.enabledModules) ? payload.enabledModules : null,
        p_allow_public_signup: typeof payload?.allowPublicSignup === 'boolean' ? payload.allowPublicSignup : null,
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
    async upsertProduct(payload) {
      return rpc('app_public_upsert_product', {
        p_session_token: getSessionToken(),
        p_product_id: payload?.id || null,
        p_name: payload?.name || '',
        p_sku: payload?.sku || '',
        p_barcode: payload?.barcode || '',
        p_stock: Number(payload?.stock || 0),
        p_sale_price: Number(payload?.salePrice || 0),
        p_cost_price: Number(payload?.costPrice || 0),
        p_min_stock: Number(payload?.minStock || 0),
        p_category: payload?.category || '',
        p_track_stock: payload?.trackStock !== false,
        p_branch_id: payload?.branchId || null,
      })
    },
    async openCashSession(payload) {
      return rpc('app_public_open_cash_session', {
        p_session_token: getSessionToken(),
        p_register_id: payload?.registerId || null,
        p_opening_amount: Number(payload?.openingAmount || 0),
      })
    },
    async closeCashSession(payload) {
      return rpc('app_public_close_cash_session', {
        p_session_token: getSessionToken(),
        p_cash_session_id: payload?.cashSessionId || null,
        p_counted_amount: Number(payload?.countedAmount || 0),
      })
    },
    async createCashMovement(payload) {
      return rpc('app_public_create_cash_movement', {
        p_session_token: getSessionToken(),
        p_cash_session_id: payload?.cashSessionId || null,
        p_kind: payload?.kind || 'income',
        p_amount: Number(payload?.amount || 0),
        p_note: payload?.note || '',
      })
    },
    async createSale(payload) {
      return rpc('app_public_create_sale', {
        p_session_token: getSessionToken(),
        p_customer_id: payload?.customerId || null,
        p_channel: payload?.channel || 'Mostrador',
        p_payment_method: payload?.paymentMethod || 'cash',
        p_discount_amount: Number(payload?.discountAmount || 0),
        p_note: payload?.note || '',
        p_is_paid: payload?.isPaid === true,
        p_auto_invoice: payload?.autoInvoice === true,
        p_cash_amount: Number(payload?.cashAmount || 0),
        p_transfer_amount: Number(payload?.transferAmount || 0),
        p_mercado_pago_amount: Number(payload?.mercadoPagoAmount || 0),
        p_account_amount: Number(payload?.accountAmount || 0),
        p_items: Array.isArray(payload?.items) ? payload.items : [],
        p_branch_id: payload?.branchId || null,
        p_register_id: payload?.registerId || null,
      })
    },
  }
}
