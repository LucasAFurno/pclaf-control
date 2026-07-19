import { createBrowserDataStore } from './data-store.js?v=20260718c'
import { createCloudAuthManager } from './cloud-auth.js?v=20260718c'

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const today = new Date().toISOString().slice(0, 10)
const productName = 'PCLAF Control'
const supportUrl = 'https://wa.me/5491135708345?text=Hola%20PCLAF%2C%20necesito%20soporte%20de%20PCLAF%20Control.'
const publicSiteUrl = 'https://www.pclafcontrol.com.ar'
const themeStorageKey = 'pclaf-control-theme'
const sectionStorageKey = 'pclaf-control-section'
const instanceStorageKey = 'pclaf-control-instance'
const dataStorageKey = 'pclaf-control-data'
const cloudConfigStorageKey = 'pclaf-control-cloud-config'
const defaultSupabaseUrl = 'https://rfwsnqmjkclxhbmidbkm.supabase.co'

let store = null
let authManager = null
const safeStorage = {
  getItem(key, fallback = '') {
    try {
      const value = globalThis.localStorage?.getItem(key)
      return value ?? fallback
    } catch {
      return fallback
    }
  },
  setItem(key, value) {
    try {
      globalThis.localStorage?.setItem(key, value)
    } catch {
      // Ignore storage write failures in restricted browsers
    }
  },
  removeItem(key) {
    try {
      globalThis.localStorage?.removeItem(key)
    } catch {
      // Ignore storage cleanup failures in restricted browsers
    }
  },
}

const icon = (path) => `
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    ${path}
  </svg>
`

const navItems = [
  { id: 'dashboard', moduleKey: 'dashboard', label: 'Inicio', permission: 'dashboard:view', icon: icon('<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/>') },
  { id: 'clientes', moduleKey: 'customers', label: 'Clientes', permission: 'customers:view', icon: icon('<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3"/><path d="M20 8v6"/><path d="M17 11h6"/>') },
  { id: 'ventas', moduleKey: 'sales', label: 'Ventas', permission: 'sales:view', icon: icon('<path d="M4 17h16"/><path d="M7 17V9"/><path d="M12 17V5"/><path d="M17 17v-6"/>') },
  { id: 'caja', moduleKey: 'cash', label: 'Caja', permission: 'cash:view', icon: icon('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16"/><path d="M16 14h2"/>') },
  { id: 'sucursales', moduleKey: 'branches', label: 'Sucursales', permission: 'branches:view', icon: icon('<path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-6h6v6"/><path d="M4 10h16"/>') },
  { id: 'cajeros', moduleKey: 'registers', label: 'Cajas', permission: 'registers:view', icon: icon('<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8"/><path d="M9 12h1"/><path d="M12 12h1"/><path d="M15 12h1"/><path d="M9 15h1"/><path d="M12 15h4"/>') },
  { id: 'productos', moduleKey: 'products', label: 'Productos', permission: 'products:view', icon: icon('<path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z"/><path d="M3 7.5V16.5L12 21l9-4.5V7.5"/>') },
  { id: 'compras', moduleKey: 'purchases', label: 'Compras', permission: 'purchases:view', icon: icon('<circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/><path d="M3 4h2l2.4 10.5h10.8L21 8H8"/>') },
  { id: 'facturacion', moduleKey: 'invoices', label: 'Facturas', permission: 'invoices:view', icon: icon('<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M10 12h6"/><path d="M10 16h6"/>') },
  { id: 'tickets', moduleKey: 'tickets', label: 'Tickets', permission: 'tickets:view', icon: icon('<rect x="4" y="5" width="16" height="10" rx="2"/><path d="M8 19h8"/><path d="M10 15v4"/><path d="M14 15v4"/>') },
  { id: 'reportes', moduleKey: 'reports', label: 'Reportes', permission: 'reports:view', icon: icon('<path d="M5 19V9"/><path d="M12 19V5"/><path d="M19 19v-8"/><path d="M3 19h18"/>') },
  { id: 'mi-admin', moduleKey: 'settings', label: 'Mi admin', permission: 'settings:view', ownerOnly: true, icon: icon('<path d="M4 19.5v-9l8-5 8 5v9"/><path d="M9 19.5v-4h6v4"/><path d="M8 9h8"/><path d="M12 3v3"/>') },
  { id: 'ajustes', moduleKey: 'settings', label: 'Ajustes', permission: 'settings:view', icon: icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8a1.65 1.65 0 0 0 .6 1 1.65 1.65 0 0 0 1 .33H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1 .33 1.65 1.65 0 0 0-.51 1.34Z"/>') },
]

const app = document.querySelector('#app')
const bootStatus = document.querySelector('#boot-status')
let theme = safeStorage.getItem(themeStorageKey, 'dark') || 'dark'
let activeSection = safeStorage.getItem(sectionStorageKey, 'dashboard') || 'dashboard'
let loginMessage = ''
let signupMessage = ''
let feedbackMessage = ''
let saleEditingId = ''
let purchaseEditingId = ''
let invoiceEditingId = ''
let ticketEditingId = ''
let branchEditingId = ''
let registerEditingId = ''
let userEditingId = ''
let reportRegisterFilter = 'all'
let reportDateFrom = ''
let reportDateTo = ''
let saleDraftQuantities = {}
let saleQuickAddCode = ''
let topbarSearch = ''
let cloudSyncBusy = false
let customerFormOpen = false
let productFormOpen = false
let supplierFormOpen = false
let commerceContext = null
let setupStatus = null
let authInstanceKey = ''
let authViewMode = 'landing'
let recoveryState = null
let hardwareScanBuffer = ''
let hardwareScanTimer = null
let hardwareScanListenerBound = false

const normalizeInstanceKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-') || 'pclaf-dev'
const createCommerceKey = (value) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || `comercio-${Date.now().toString().slice(-6)}`
const persistInstanceKey = (value) => {
  authInstanceKey = normalizeInstanceKey(value)
  safeStorage.setItem(instanceStorageKey, authInstanceKey)
  return authInstanceKey
}

const loadCloudAccess = async (sessionPayload = null) => {
  if (!authManager) throw new Error('La conexion cloud no esta lista.')
  const currentSession = sessionPayload || authManager.getSession()
  if (!currentSession?.sessionToken) throw new Error('No hay sesion valida para sincronizar.')
  commerceContext = currentSession.commerceContext || null
  store.setCloudAccessToken(currentSession.sessionToken)
  await store.syncFromCloud()
  const activeProfile = store.setCloudAuthSession(currentSession.profile, [])
  if (!activeProfile) {
    commerceContext = null
    store.clearCloudAuthSession()
    throw new Error('No se pudo activar la sesion del usuario.')
  }
  return activeProfile
}

const money = (value) => currency.format(Number(value) || 0)
const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')
const maskEmail = (value) => {
  const email = String(value || '').trim().toLowerCase()
  if (!email || !email.includes('@')) return ''
  const [name, domain] = email.split('@')
  if (!name || !domain) return email
  if (name.length <= 2) return `${name[0] || '*'}***@${domain}`
  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`
}
const getPublicAppBaseUrl = () => {
  const origin = String(window.location.origin || '').trim()
  if (!origin) return publicSiteUrl
  if (/localhost|127\.0\.0\.1/i.test(origin)) return publicSiteUrl
  return origin
}
const mapPublicAuthError = (message, context = 'login') => {
  const normalized = String(message || '').trim().toLowerCase()
  if (!normalized) return context === 'signup' ? 'No se pudo crear la cuenta.' : 'No se pudo iniciar sesion.'
  const messages = {
    user_not_found: 'No encontramos una cuenta con ese correo.',
    invalid_pin: 'La clave no coincide. Pruebala de nuevo o recupera el acceso.',
    owner_email_already_exists: 'Ya existe una cuenta con ese correo. Puedes entrar o recuperar la clave.',
    login_name_already_exists: 'Ese acceso ya existe. Prueba con otro correo o inicia sesion.',
    instance_already_initialized: 'Ese comercio ya existe. Inicia sesion con la cuenta principal.',
    instance_not_initialized: 'Ese acceso todavia no tiene una cuenta activa. Crea tu comercio o pide ayuda.',
    commerce_name_required: 'Escribe el nombre comercial para continuar.',
    owner_name_required: 'Escribe tu nombre para crear la cuenta.',
    owner_email_required: 'Escribe un correo valido para crear la cuenta.',
    owner_pin_too_short: 'La clave debe tener al menos 6 caracteres.',
    email_required: 'Escribe tu correo para continuar.',
    duplicate_key_value_violates_unique_constraint_control_users_email_key: 'Ya existe una cuenta con ese correo. Entra o recupera el acceso.',
    password_confirmation_mismatch: 'Las claves nuevas no coinciden.',
    recovery_session_missing: 'El enlace de recuperacion ya no es valido. Pide uno nuevo.',
    'password should be at least 6 characters.': 'La clave debe tener al menos 6 caracteres.',
    password_too_short: 'La clave debe tener al menos 6 caracteres.',
    'column "status" of relation "branches" does not exist': 'Estamos terminando una actualizacion interna del alta. Escribe a soporte y lo habilitamos enseguida.',
    'column "status" of relation "registers" does not exist': 'Estamos terminando una actualizacion interna del alta. Escribe a soporte y lo habilitamos enseguida.',
  }
  return messages[normalized] || message
}
const applyTheme = () => { document.documentElement.dataset.theme = theme }
const markBootComplete = () => {
  window.__pclafBooted = true
  bootStatus?.remove()
}
const saveSection = () => safeStorage.setItem(sectionStorageKey, activeSection)
const resetBrokenBrowserState = () => {
  safeStorage.removeItem(dataStorageKey)
  safeStorage.removeItem(cloudConfigStorageKey)
}
const byRecentDate = (items, key) => items.slice().sort((a, b) => String(b[key]).localeCompare(String(a[key])))
const isWithinDateRange = (value, from, to) => {
  const normalized = String(value || '').slice(0, 10)
  if (!normalized) return false
  if (from && normalized < from) return false
  if (to && normalized > to) return false
  return true
}
const csvEscape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
const readCurrentSaleQuantities = () => Object.fromEntries(
  [...document.querySelectorAll('input[name^="qty_"]')]
    .map((input) => [input.name.replace('qty_', ''), Number(input.value || 0)])
    .filter(([, quantity]) => quantity > 0),
)

const dataTable = (headers, rows) => `
  <div class="data-table">
    <div class="data-head">${headers.map((header) => `<span>${header}</span>`).join('')}</div>
    ${rows.length ? rows.join('') : '<div class="data-empty">No hay registros todavia.</div>'}
  </div>
`

const inventoryTable = (rows) => `
  <div class="inventory-table">
    <div class="inventory-head">
      <span>Producto</span>
      <span>Codigo</span>
      <span>Stock suc.</span>
      <span>Total</span>
      <span>Precio</span>
      <span>Accion</span>
    </div>
    ${rows.length ? rows.join('') : '<div class="data-empty">No hay productos cargados todavia.</div>'}
  </div>
`

const actionButton = (entity, id) => `<button type="button" class="inline-action" data-delete="${entity}" data-id="${id}">Eliminar</button>`
const createToggleButton = (key, isOpen, label = 'Agregar') => `<button type="button" class="${isOpen ? 'ghost-action' : 'primary-action'}" data-action="${isOpen ? `close-${key}-form` : `open-${key}-form`}">${isOpen ? 'Cerrar' : label}</button>`
const saleActionButtons = (sale) => `
  <div class="inline-action-group sale-actions-compact">
    <button type="button" class="inline-action is-strong" data-sale-action="edit" data-id="${sale.id}">Editar</button>
    <button type="button" class="inline-action" data-sale-action="invoice" data-id="${sale.id}">Factura</button>
    <button type="button" class="inline-action" data-sale-action="ticket" data-id="${sale.id}">Ticket</button>
    <button type="button" class="inline-action" data-sale-action="receipt-80" data-id="${sale.id}">Ticket 80</button>
    <button type="button" class="inline-action" data-sale-action="receipt-58" data-id="${sale.id}">Ticket 58</button>
    <button type="button" class="inline-action" data-sale-action="export" data-id="${sale.id}">Exportar</button>
    <button type="button" class="inline-action" data-sale-action="return" data-id="${sale.id}">Devol.</button>
    <button type="button" class="inline-action" data-sale-action="cancel" data-id="${sale.id}">Anular</button>
    <button type="button" class="inline-action danger" data-delete="sale" data-id="${sale.id}">Eliminar</button>
  </div>
`
const purchaseActionButtons = (receipt) => `
  <div class="inline-action-group">
    <button type="button" class="inline-action" data-purchase-action="edit" data-id="${receipt.id}">Editar</button>
    <button type="button" class="inline-action danger" data-delete="purchase_receipt" data-id="${receipt.id}">Eliminar</button>
  </div>
`
const invoiceActionButtons = (invoice) => `
  <div class="inline-action-group">
    <button type="button" class="inline-action" data-invoice-action="edit" data-id="${invoice.id}">Editar</button>
    <button type="button" class="inline-action danger" data-delete="invoice" data-id="${invoice.id}">Eliminar</button>
  </div>
`
const ticketActionButtons = (ticket) => `
  <div class="inline-action-group">
    <button type="button" class="inline-action" data-ticket-action="edit" data-id="${ticket.id}">Editar</button>
    <button type="button" class="inline-action danger" data-delete="ticket" data-id="${ticket.id}">Eliminar</button>
  </div>
`
const branchActionButtons = (branch) => `
  <div class="inline-action-group">
    <button type="button" class="inline-action" data-branch-action="select" data-id="${branch.id}">Usar</button>
    <button type="button" class="inline-action" data-branch-action="edit" data-id="${branch.id}">Editar</button>
  </div>
`
const registerActionButtons = (register) => `
  <button type="button" class="inline-action" data-register-action="edit" data-id="${register.id}">Editar</button>
  <button type="button" class="inline-action danger" data-delete="register" data-id="${register.id}">Eliminar</button>
`
const userActionButtons = (user) => `
  <div class="inline-action-group">
    <button type="button" class="inline-action" data-user-action="edit" data-id="${user.id}">Editar</button>
    <button type="button" class="inline-action" data-user-action="toggle" data-id="${user.id}" data-active="${user.isActive ? 'true' : 'false'}">${user.isActive ? 'Desactivar' : 'Activar'}</button>
  </div>
`
const planLabels = {
  basic: 'Gestion base',
  retail: 'Mostrador',
  full: 'Operacion',
  multi: 'Multi sucursal',
  custom: 'Personalizado',
}

const scannerInputSelector = {
  sales: 'input[name="quickAddCode"]',
  products: 'input[name="barcode"]',
}

const focusScannerInput = (targetKey) => {
  const input = document.querySelector(scannerInputSelector[targetKey] || '')
  if (!input) return false
  input.focus()
  input.select?.()
  return true
}

const routeHardwareScan = (rawValue) => {
  const scanned = String(rawValue || '').trim()
  if (!scanned) return false
  if (activeSection === 'ventas') {
    const product = store.findProductByCode(scanned)
    if (!product) {
      feedbackMessage = 'No encontre un producto con ese codigo.'
      render()
      return true
    }
    saleDraftQuantities = {
      ...readCurrentSaleQuantities(),
      [product.id]: Number(readCurrentSaleQuantities()[product.id] || 0) + 1,
    }
    saleQuickAddCode = ''
    feedbackMessage = `${product.name} agregado a la venta.`
    render()
    return true
  }
  if (activeSection === 'productos') {
    const barcodeInput = document.querySelector(scannerInputSelector.products)
    if (!barcodeInput) return false
    barcodeInput.value = scanned
    barcodeInput.dispatchEvent(new Event('input', { bubbles: true }))
    feedbackMessage = 'Codigo de barras capturado.'
    return true
  }
  return false
}

const clearHardwareScanBuffer = () => {
  hardwareScanBuffer = ''
  if (hardwareScanTimer) {
    clearTimeout(hardwareScanTimer)
    hardwareScanTimer = null
  }
}

const queueHardwareScanCharacter = (char) => {
  if (!char) return
  hardwareScanBuffer += char
  if (hardwareScanTimer) clearTimeout(hardwareScanTimer)
  hardwareScanTimer = window.setTimeout(() => {
    clearHardwareScanBuffer()
  }, 180)
}

const bindHardwareScanner = () => {
  if (hardwareScanListenerBound) return
  document.addEventListener('keydown', (event) => {
    if (!['ventas', 'productos'].includes(activeSection)) return
    const target = event.target
    const isEditable = target instanceof HTMLElement && (
      target.tagName === 'INPUT'
      || target.tagName === 'TEXTAREA'
      || target.tagName === 'SELECT'
      || target.isContentEditable
    )
    if (isEditable) return
    if (event.key === 'Enter') {
      if (hardwareScanBuffer) {
        event.preventDefault()
        const scannedCode = hardwareScanBuffer
        clearHardwareScanBuffer()
        routeHardwareScan(scannedCode)
      }
      return
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      queueHardwareScanCharacter(event.key)
    }
  })
  hardwareScanListenerBound = true
}
const planCatalog = {
  basic: {
    name: 'Gestion base',
    description: 'Para el cliente que quiere empezar simple con proveedores, productos y facturacion.',
    idealFor: 'Prueba inicial, servicio tecnico o gestion sin mostrador.',
    modules: ['products', 'purchases', 'invoices'],
  },
  retail: {
    name: 'Mostrador',
    description: 'Para un local con una sola caja y venta diaria sin abrumar con sucursales.',
    idealFor: 'Negocio chico con una caja.',
    modules: ['customers', 'sales', 'cash', 'products', 'invoices'],
  },
  full: {
    name: 'Operacion',
    description: 'Suma compras, reportes y control operativo para un comercio que ya trabaja a diario.',
    idealFor: 'Comercio estable con stock y seguimiento.',
    modules: ['customers', 'sales', 'cash', 'products', 'purchases', 'invoices', 'reports'],
  },
  multi: {
    name: 'Multi sucursal',
    description: 'Habilita toda la estructura para varias cajas, sucursales, tickets y reportes completos.',
    idealFor: 'Locales con crecimiento o varias cajas.',
    modules: Object.keys({
      dashboard: true,
      customers: true,
      sales: true,
      cash: true,
      branches: true,
      registers: true,
      products: true,
      purchases: true,
      invoices: true,
      tickets: true,
      reports: true,
      settings: true,
    }),
  },
}
const getInitials = (name) => String(name || '')
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() || '')
  .join('') || 'PC'
const getScopedStock = (product, branchId) => {
  const branchStock = product?.stockByBranch && typeof product.stockByBranch === 'object' ? product.stockByBranch : null
  if (branchId && branchStock) return Number(branchStock[branchId] || 0)
  return Number(product?.stock || 0)
}
const buildQuickSearchTargets = (ui) => {
  const normalizedEntries = []
  const pushTarget = (section, label, keywords = []) => {
    normalizedEntries.push({
      section,
      label,
      search: [label, ...keywords].filter(Boolean).join(' ').toLowerCase(),
    })
  }
  for (const item of getAllowedNav(ui)) pushTarget(item.id, item.label, [item.moduleKey])
  for (const customer of ui.snapshot.customers) pushTarget('clientes', customer.fullName, [customer.email, customer.phone, customer.tag])
  for (const product of ui.snapshot.products) pushTarget('productos', product.name, [product.sku, product.barcode, product.category])
  for (const supplier of ui.snapshot.suppliers) pushTarget('compras', supplier.name, [supplier.contact, supplier.phone, supplier.category])
  for (const invoice of ui.snapshot.invoices) pushTarget('facturacion', invoice.number, [invoice.kind, invoice.type, invoice.status])
  for (const ticket of ui.snapshot.tickets) pushTarget('tickets', ticket.number, [ticket.device, ticket.issue, ticket.status])
  for (const branch of ui.snapshot.branches) pushTarget('sucursales', branch.name, [branch.code, branch.address])
  for (const register of ui.snapshot.registers) pushTarget('cajeros', register.name, [register.code])
  return normalizedEntries
}
const getAllowedNav = (ui) => navItems.filter((item) => (
  store.canAccessModule(item.moduleKey, item.permission)
  && (!item.ownerOnly || ui.user?.isOwner)
))

const getUiState = () => {
  const snapshot = store.getSnapshot()
  const user = snapshot.users.find((entry) => entry.id === snapshot.session.userId) || snapshot.users[0]
  const role = snapshot.roles.find((entry) => entry.id === user?.roleId) || snapshot.roles[0]
  const customerMap = new Map(snapshot.customers.map((item) => [item.id, item]))
  const userMap = new Map(snapshot.users.map((item) => [item.id, item]))
  const supplierMap = new Map(snapshot.suppliers.map((item) => [item.id, item]))
  const branchMap = new Map(snapshot.branches.map((item) => [item.id, item]))
  const registerMap = new Map(snapshot.registers.map((item) => [item.id, item]))
  const openCashSession = snapshot.cashSessions.find((session) => session.status === 'open') || null
  const cashSales = snapshot.sales.filter((sale) => sale.cashSessionId === openCashSession?.id && sale.paymentMethod === 'cash')
  const cashSalesTotal = cashSales.reduce((sum, sale) => sum + sale.amountPaid, 0)
  const currentBranch = branchMap.get(snapshot.business.currentBranchId) || snapshot.branches[0]
  const currentRegister = registerMap.get(snapshot.business.currentRegisterId) || snapshot.registers.find((register) => register.branchId === currentBranch?.id) || null
  const branchRegisters = snapshot.registers.filter((register) => register.branchId === currentBranch?.id)
  const scopedProducts = snapshot.products.map((product) => ({
    ...product,
    scopedStock: getScopedStock(product, currentBranch?.id),
    totalStock: Number(product.stock || 0),
  }))
  const productMap = new Map(scopedProducts.map((item) => [item.id, item]))
  const scopedSales = snapshot.sales.filter((sale) => sale.branchId === currentBranch?.id && (reportRegisterFilter === 'all' || sale.registerId === reportRegisterFilter))
  const scopedInvoices = snapshot.invoices.filter((invoice) => invoice.branchId === currentBranch?.id)
  const scopedTickets = snapshot.tickets.filter((ticket) => ticket.branchId === currentBranch?.id)
  const scopedCashSessions = snapshot.cashSessions.filter((session) => session.branchId === currentBranch?.id && (reportRegisterFilter === 'all' || session.registerId === reportRegisterFilter))
  const scopedCashMovements = snapshot.cashMovements.filter((movement) => movement.branchId === currentBranch?.id && (reportRegisterFilter === 'all' || movement.registerId === reportRegisterFilter))
  const salesById = new Map(snapshot.sales.map((sale) => [sale.id, sale]))
  const scopedStockMovements = snapshot.stockMovements.filter((movement) => {
    if (movement.branchId && movement.branchId !== currentBranch?.id) return false
    const sale = salesById.get(movement.referenceId)
    if (sale && reportRegisterFilter !== 'all') return sale.registerId === reportRegisterFilter
    return reportRegisterFilter === 'all' || !movement.registerId || movement.registerId === reportRegisterFilter
  })
  const sessionCashMovementTotal = openCashSession ? snapshot.cashMovements.filter((movement) => movement.cashSessionId === openCashSession.id).reduce((sum, movement) => sum + Number(movement.signedAmount || 0), 0) : 0

  const enrichedSales = byRecentDate(snapshot.sales, 'soldAt').map((sale) => ({
    ...sale,
    customerName: customerMap.get(sale.customerId)?.fullName || 'Mostrador',
    itemSummary: sale.items.map((item) => `${productMap.get(item.productId)?.name || 'Articulo'} x${item.quantity}`).join(', '),
    branchName: branchMap.get(sale.branchId)?.name || 'Sucursal',
    registerName: registerMap.get(sale.registerId)?.name || 'Sin caja',
    paymentSummary: sale.paymentMethod === 'mixed'
      ? `Mixto: Ef ${money(sale.paymentBreakdown?.cash || 0)} / Tr ${money(sale.paymentBreakdown?.transfer || 0)} / MP ${money(sale.paymentBreakdown?.mercadoPago || 0)}`
      : sale.paymentMethod,
  }))
  const filteredSales = byRecentDate(enrichedSales.filter((sale) => sale.branchId === currentBranch?.id && (reportRegisterFilter === 'all' || sale.registerId === reportRegisterFilter)), 'soldAt')
  const reportScopedSales = filteredSales.filter((sale) => isWithinDateRange(sale.soldAt, reportDateFrom, reportDateTo))
  const enrichedInvoices = byRecentDate(scopedInvoices, 'dueDate').map((invoice) => ({ ...invoice, customerName: customerMap.get(invoice.customerId)?.fullName || 'Sin cliente', branchName: branchMap.get(invoice.branchId)?.name || 'Sucursal' }))
  const enrichedTickets = byRecentDate(scopedTickets, 'updatedAt').map((ticket) => ({ ...ticket, customerName: customerMap.get(ticket.customerId)?.fullName || 'Sin cliente', branchName: branchMap.get(ticket.branchId)?.name || 'Sucursal' }))
  const reportScopedInvoices = enrichedInvoices.filter((invoice) => isWithinDateRange(invoice.dueDate, reportDateFrom, reportDateTo))
  const reportScopedCashMovements = scopedCashMovements.filter((movement) => isWithinDateRange(movement.createdAt, reportDateFrom, reportDateTo))
  const reportScopedStockMovements = scopedStockMovements.filter((movement) => isWithinDateRange(movement.createdAt, reportDateFrom, reportDateTo))

  return {
    snapshot,
    moduleCatalog: store.moduleCatalog,
    modulePresets: store.modulePresets,
    user,
    role,
    commerceContext,
    cloudConnection: store.getCloudConnection(),
    isAuthenticated: store.isAuthenticated(),
    openCashSession,
    cashSalesTotal,
    sessionCashMovementTotal,
    expectedCash: openCashSession ? Number(openCashSession.openingAmount) + cashSalesTotal + sessionCashMovementTotal : 0,
    unpaidSales: scopedSales.reduce((sum, sale) => sum + Math.max(0, Number(sale.totalAmount || 0) - Number(sale.amountPaid || 0)), 0),
    totalSales: scopedSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
    pendingInvoices: scopedInvoices.filter((invoice) => invoice.status !== 'Cobrada').reduce((sum, invoice) => sum + invoice.totalAmount, 0),
    scopedProducts,
    lowStock: scopedProducts.filter((product) => product.trackStock && product.scopedStock <= product.minStock),
    topProducts: [...scopedSales.reduce((map, sale) => {
      for (const item of sale.items) {
        const key = productMap.get(item.productId)?.name || 'Sin producto'
        map.set(key, (map.get(key) || 0) + item.quantity)
      }
      return map
    }, new Map()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    enrichedSales: filteredSales,
    enrichedInvoices,
    enrichedTickets,
    enrichedAudit: byRecentDate(snapshot.auditLogs, 'createdAt').slice(0, 8).map((log) => ({ ...log, actorName: userMap.get(log.actorUserId)?.fullName || 'Sistema' })),
    enrichedUsers: snapshot.users.map((entry) => ({
      ...entry,
      roleName: snapshot.roles.find((roleEntry) => roleEntry.id === entry.roleId)?.name || 'Sin rol',
    })),
    enrichedReceipts: byRecentDate(snapshot.purchaseReceipts, 'receivedAt').map((receipt) => ({
      ...receipt,
      supplierName: supplierMap.get(receipt.supplierId)?.name || 'Proveedor',
      productName: productMap.get(receipt.productId)?.name || 'Producto',
    })),
    currentBranch,
    currentRegister,
    branchRegisters,
    scopedCashSessions,
    scopedStockMovements,
    scopedCashMovements,
    reportDateFrom,
    reportDateTo,
    reportScopedSales,
    reportScopedInvoices,
    reportScopedCashMovements,
    reportScopedStockMovements,
    enrichedRegisters: snapshot.registers.map((register) => ({
      ...register,
      branchName: branchMap.get(register.branchId)?.name || 'Sucursal',
      cashierName: userMap.get(register.cashierUserId)?.fullName || 'Sin asignar',
    })),
    enrichedCashMovements: byRecentDate(scopedCashMovements, 'createdAt').map((movement) => ({
      ...movement,
      registerName: registerMap.get(movement.registerId)?.name || 'Caja',
      actorName: userMap.get(movement.createdBy)?.fullName || 'Usuario',
    })),
  }
}

const loginView = (ui) => {
  if (recoveryState) {
    return `
  <div class="login-shell login-shell-home">
    <div class="recovery-shell">
      <header class="public-topbar">
        <div class="public-topbar-brand">
          <img class="public-topbar-logo" src="/pclaf-logo.png" alt="PCLAF" />
          <div class="public-topbar-copy">
            <strong>${productName}</strong>
            <span>Recuperacion de acceso</span>
          </div>
        </div>
      </header>
      <section class="recovery-panel">
        <div class="login-card recovery-card" id="acceso-recovery">
          <p class="kicker">Recuperar acceso</p>
          <h2>Nueva clave</h2>
          <p class="login-copy">Define una clave nueva para ${maskEmail(recoveryState.email) || 'tu cuenta'} y vuelve a entrar normalmente.</p>
          <form class="login-form" data-form="password-recovery" autocomplete="off">
            <label>Nueva clave<input type="password" name="password" value="" placeholder="Minimo 6 caracteres" autocomplete="new-password" required /></label>
            <label>Repetir clave<input type="password" name="passwordConfirm" value="" placeholder="Repite la clave" autocomplete="new-password" required /></label>
            ${loginMessage ? `<p class="login-error">${loginMessage}</p>` : ''}
            <button type="submit">Guardar nueva clave</button>
          </form>
          <div class="login-actions">
            <button type="button" class="ghost-action" data-action="cancel-recovery">Cancelar</button>
            <button type="button" class="ghost-action" data-action="open-support">Necesito ayuda</button>
          </div>
        </div>
      </section>
    </div>
  </div>
`
  }

  return `
  <div class="login-shell login-shell-home">
    <div class="public-home">
      <header class="public-topbar">
        <div class="public-topbar-brand">
          <img class="public-topbar-logo" src="/pclaf-logo.png" alt="PCLAF" />
          <div class="public-topbar-copy">
            <strong>${productName}</strong>
            <span>Control comercial online</span>
          </div>
        </div>
        <div class="public-topbar-actions">
          <button type="button" class="ghost-action topbar-auth-button" data-action="show-login">Iniciar sesion</button>
          <button type="button" class="primary-action topbar-auth-button" data-action="show-signup">Crear cuenta</button>
        </div>
        ${authViewMode !== 'landing' ? `
        <div class="public-auth-popover">
          ${authViewMode === 'login' ? `
          <div class="login-card compact-auth-card" id="acceso-login">
            <p class="kicker">${ui.cloudConnection.enabled ? 'Ingreso al sistema' : 'Acceso temporalmente bloqueado'}</p>
            <h2>Entrar</h2>
            <p class="login-copy">Ingresa con tu correo y tu clave para seguir trabajando.</p>
            <form class="login-form" data-form="login" autocomplete="off">
              <label>Email de acceso<input type="email" name="identifier" value="" placeholder="tu@email.com" autocomplete="username" autocapitalize="off" spellcheck="false" required /></label>
              <label>Clave<input type="password" name="pin" value="" placeholder="Tu clave" autocomplete="current-password" required /></label>
              ${loginMessage ? `<p class="login-error">${loginMessage}</p>` : ''}
              <button type="submit">Ingresar</button>
            </form>
            <div class="login-actions">
              <button type="button" class="ghost-action" data-action="recover-password">Recuperar clave</button>
              <button type="button" class="ghost-action" data-action="back-landing">Cerrar</button>
            </div>
          </div>
          ` : ''}
          ${authViewMode === 'signup' ? `
          <div class="login-card compact-auth-card login-card-secondary" id="acceso-signup">
            <p class="kicker">Prueba gratis</p>
            <h2>Crear cuenta</h2>
            <p class="login-copy">Crea tu acceso principal y empieza a usar el sistema en minutos.</p>
            <form class="login-form compact-signup-form" data-form="instance-setup" autocomplete="off">
              <div class="login-form-grid-1">
                <label>Nombre comercial<input type="text" name="commerceName" value="" placeholder="Mi comercio" autocomplete="organization" required /></label>
                <label>Tu nombre<input type="text" name="ownerName" value="" placeholder="Nombre del responsable" autocomplete="name" required /></label>
                <label>Email<input type="email" name="ownerEmail" value="" placeholder="tu@email.com" autocomplete="email" autocapitalize="off" spellcheck="false" required /></label>
                <label>Clave<input type="password" name="ownerPin" value="" placeholder="Minimo 6 caracteres" autocomplete="new-password" required /></label>
              </div>
              <input type="hidden" name="instanceKey" value="" />
              <input type="hidden" name="ownerLogin" value="" />
              <input type="hidden" name="branchName" value="Casa central" />
              <input type="hidden" name="branchCode" value="CASA" />
              <input type="hidden" name="registerName" value="Caja 1" />
              <input type="hidden" name="registerCode" value="CAJA-01" />
              ${signupMessage ? `<p class="login-error">${signupMessage}</p>` : ''}
              <button type="submit">Crear cuenta y empezar</button>
            </form>
            <div class="login-actions">
              <button type="button" class="ghost-action" data-action="back-landing">Cerrar</button>
            </div>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </header>
      <section class="public-hero">
        <div class="public-hero-copy">
          <p class="kicker">Sistema de gestion comercial</p>
          <h1>${productName}</h1>
          <p class="login-copy login-copy-hero">Vende, cobra, controla stock y ordena el trabajo diario desde una sola web, tanto en PC como en celular.</p>
          ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
          <div class="login-badges">
            <span class="login-badge ${ui.cloudConnection.enabled ? 'is-ok' : 'is-warn'}">${ui.cloudConnection.enabled ? 'Base online activa' : 'Activacion pendiente'}</span>
            <span class="login-badge">Ventas y caja</span>
            <span class="login-badge">Stock y clientes</span>
            <span class="login-badge">Comprobantes</span>
          </div>
          <div class="public-feature-grid">
            <article class="landing-feature-card"><strong>Vende y cobra rapido</strong><span>Ticket, caja y cobros diarios en una vista clara.</span></article>
            <article class="landing-feature-card"><strong>Controla productos y stock</strong><span>Altas, compras, ajustes y orden de inventario.</span></article>
            <article class="landing-feature-card"><strong>Escala cuando haga falta</strong><span>Usuarios, permisos, sucursales y reportes sobre base cloud.</span></article>
          </div>
          <div class="landing-contact compact-contact">
            <div>
              <strong>Contacto directo</strong>
              <span>Consultas y soporte por WhatsApp</span>
            </div>
            <button type="button" class="ghost-action" data-action="open-support">Hablar con soporte</button>
          </div>
        </div>
      </section>
    </div>
  </div>
`
}
const loginViewV2 = (ui) => `
  <div class="login-shell login-shell-home">
    <div class="login-grid">
      <section class="login-overview">
        <div class="login-overview-card">
          <div class="login-brand-row">
            <img class="login-logo login-logo-large" src="/pclaf-logo.png" alt="PCLAF" />
            <div class="login-brand-copy">
              <p class="kicker">Sistema de gestion comercial</p>
              <h1>${productName}</h1>
            </div>
          </div>
          <p class="login-copy login-copy-hero">Un sistema comercial web para vender, cobrar, controlar stock y ordenar el negocio desde un solo lugar, sin instalar nada y con acceso desde PC o celular.</p>
          <div class="login-badges">
            <span class="login-badge">Ventas</span>
            <span class="login-badge">Caja</span>
            <span class="login-badge">Stock</span>
            <span class="login-badge">Comprobantes</span>
          </div>
          <div class="login-seo-copy">
            <p>PCLAF Control es un software de gestion comercial para kioscos, locales, tiendas y negocios que necesitan vender, cobrar, ordenar stock y emitir comprobantes desde la web.</p>
            <p>La herramienta arranca simple para no abrumar y despues puede crecer con usuarios, cajas, sucursales y modulos segun el tipo de comercio.</p>
          </div>
          <div class="login-hero-note">
            <strong>Entrá si ya tenés cuenta.</strong>
            <span>Si es tu primera vez, creá tu cuenta y empezá a probar.</span>
          </div>
          <div class="landing-feature-stack">
            <article class="landing-feature-card">
              <strong>Operacion diaria simple</strong>
              <span>Ventas, caja y cobros con una vista clara y lista para trabajar.</span>
            </article>
            <article class="landing-feature-card">
              <strong>Control de stock real</strong>
              <span>Productos, ingresos, ajustes y orden para cada comercio.</span>
            </article>
            <article class="landing-feature-card">
              <strong>Listo para crecer</strong>
              <span>Usuarios, permisos, reportes y soporte comercial cuando lo necesites.</span>
            </article>
          </div>
          <div class="landing-contact">
            <div>
              <strong>Contacto PCLAF</strong>
              <span>Consultas comerciales, implementacion y soporte por WhatsApp</span>
            </div>
            <button type="button" class="ghost-action" data-action="open-support">Hablar con soporte</button>
          </div>
          <div class="login-actions login-cta-row">
            <button type="button" class="primary-action hero-action" data-action="show-login">Iniciar sesion</button>
            <button type="button" class="ghost-action hero-action" data-action="show-signup">Crear cuenta</button>
          </div>
        </div>
      </section>
      <section class="login-side ${authViewMode === 'landing' ? 'is-hidden' : ''}">
        ${authViewMode === 'login' ? `
        <div class="login-card">
          <p class="kicker">${ui.cloudConnection.enabled ? 'Ingreso al sistema' : 'Acceso temporalmente bloqueado'}</p>
          <h2>Entrar</h2>
          <p class="login-copy">Ingresa con tu correo y tu clave para volver a tu panel.</p>
          <form class="login-form" data-form="login" autocomplete="off">
            <label>Email de acceso<input type="email" name="identifier" value="" placeholder="tu@email.com" autocomplete="off" autocapitalize="off" spellcheck="false" data-lpignore="true" required /></label>
            <label>Clave<input type="password" name="pin" placeholder="Tu clave" autocomplete="current-password" required /></label>
            <input type="hidden" name="instanceKey" value="${ui.cloudConnection.environment === 'development' ? (ui.cloudConnection.instanceKey || 'pclaf-dev') : ''}" />
            <p class="login-hints">Si no recuerdas tu clave, puedes pedir recuperacion o hablar con soporte.</p>
            ${loginMessage ? `<p class="login-error">${loginMessage}</p>` : ''}
            <button type="submit">Ingresar</button>
          </form>
          <div class="login-actions">
            <button type="button" class="ghost-action" data-action="recover-password">Recuperar acceso</button>
            <button type="button" class="ghost-action" data-action="back-landing">Volver</button>
            <button type="button" class="ghost-action" data-action="open-support">Necesito ayuda</button>
          </div>
        </div>
        ` : ''}
        ${authViewMode === 'signup' ? `
        <div class="login-card login-card-secondary">
          <p class="kicker">Prueba gratis</p>
          <h2>Crear cuenta</h2>
          <p class="login-copy">Completa tus datos y se crea tu comercio con acceso administrador para empezar a usarlo en minutos.</p>
          <form class="login-form compact-signup-form" data-form="instance-setup" autocomplete="off">
            <div class="login-form-grid-1">
              <label>Nombre comercial<input type="text" name="commerceName" value="" placeholder="Mi comercio" autocomplete="organization" required /></label>
              <label>Tu nombre<input type="text" name="ownerName" value="" placeholder="Nombre del responsable" autocomplete="name" required /></label>
              <label>Email<input type="email" name="ownerEmail" value="" placeholder="tu@email.com" autocomplete="email" autocapitalize="off" spellcheck="false" required /></label>
              <label>Clave<input type="password" name="ownerPin" value="" placeholder="Minimo 6 caracteres" autocomplete="new-password" required /></label>
            </div>
            <input type="hidden" name="instanceKey" value="" />
            <input type="hidden" name="ownerLogin" value="" />
            <input type="hidden" name="branchName" value="Casa central" />
            <input type="hidden" name="branchCode" value="CASA" />
            <input type="hidden" name="registerName" value="Caja 1" />
            <input type="hidden" name="registerCode" value="CAJA-01" />
            <div class="login-inline-note">
              <strong>Alta automatica</strong>
              <span>Se crea tu comercio, tu usuario administrador y la primera caja para arrancar sin pasos tecnicos.</span>
            </div>
            ${signupMessage ? `<p class="login-error">${signupMessage}</p>` : ''}
            <button type="submit">Crear cuenta y empezar</button>
          </form>
          <div class="login-actions">
            <button type="button" class="ghost-action" data-action="back-landing">Volver</button>
            <button type="button" class="ghost-action" data-action="open-support">Hablar con soporte</button>
          </div>
        </div>
        ` : ''}
      </section>
    </div>
  </div>
`

const setupView = (ui) => `
  <div class="login-shell">
    <div class="login-card login-card-wide">
      <img class="login-logo" src="/pclaf-logo.png" alt="PCLAF" />
      <p class="kicker">Alta inicial</p>
      <h1>${productName}</h1>
      <p class="login-copy">Completa tus datos y dejamos listo tu comercio con una cuenta administradora para empezar a trabajar sin configuraciones raras.</p>
      <form class="login-form compact-signup-form" data-form="instance-setup" autocomplete="off">
        <div class="login-form-grid-1">
          <label>Nombre comercial<input type="text" name="commerceName" value="" placeholder="Mi comercio" autocomplete="organization" required /></label>
          <label>Tu nombre<input type="text" name="ownerName" value="" placeholder="Nombre del responsable" autocomplete="name" required /></label>
          <label>Email<input type="email" name="ownerEmail" value="" placeholder="tu@email.com" autocomplete="email" autocapitalize="off" spellcheck="false" required /></label>
          <label>Clave<input type="password" name="ownerPin" value="" placeholder="Minimo 6 caracteres" autocomplete="new-password" required /></label>
        </div>
        <input type="hidden" name="instanceKey" value="" />
        <input type="hidden" name="ownerLogin" value="" />
        <input type="hidden" name="branchName" value="Casa central" />
        <input type="hidden" name="branchCode" value="CASA" />
        <input type="hidden" name="registerName" value="Caja 1" />
        <input type="hidden" name="registerCode" value="CAJA-01" />
        <div class="login-inline-note">
          <strong>Alta automatica</strong>
          <span>Se crea tu cuenta principal y una caja inicial lista para arrancar.</span>
        </div>
        ${loginMessage ? `<p class="login-error">${loginMessage}</p>` : ''}
        <button type="submit">Crear cuenta y empezar</button>
      </form>
      <div class="login-actions">
        <button type="button" class="ghost-action" data-action="back-landing">Volver</button>
        <button type="button" class="ghost-action" data-action="open-support">Hablar con soporte</button>
      </div>
    </div>
  </div>
`

const cloudActivationView = (ui) => `
  <div class="login-shell">
    <div class="login-card login-card-wide">
      <img class="login-logo" src="/pclaf-logo.png" alt="PCLAF" />
      <p class="kicker">Activacion requerida</p>
      <h1>${productName}</h1>
      <p class="login-copy">Esta instalacion necesita la base cloud conectada antes de permitir ingresos o pruebas con clientes.</p>
      <div class="info-strip"><strong>Base obligatoria</strong><span>Sin conexion activa la app queda bloqueada para evitar pruebas falsas o datos perdidos.</span></div>
      <form class="login-form" data-form="cloud-connection">
        <div class="login-form-grid-2">
          <label>URL Supabase<input type="url" name="url" value="${ui.cloudConnection.url || defaultSupabaseUrl}" placeholder="https://xxxx.supabase.co" required /></label>
          <label>Clave publica<input type="text" name="anonKey" value="${ui.cloudConnection.anonKey || ''}" placeholder="sb_publishable_xxx o anon key" required /></label>
          <label class="full-span">Instancia<input type="text" name="instanceKey" value="${ui.cloudConnection.instanceKey || 'pclaf-dev'}" placeholder="pclaf-dev" required /></label>
        </div>
        <button type="submit">Activar base</button>
      </form>
      ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
      <div class="login-actions">
        <button type="button" class="ghost-action" data-action="open-support">Necesito asistencia</button>
      </div>
    </div>
  </div>
`

const dashboardView = (ui) => `
  <section class="view-section">
    <div class="section-header"><div><p class="kicker">Resumen diario</p><h2>Operacion del local</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="metrics-grid">
      <article class="metric-card"><span>Ventas registradas</span><strong>${money(ui.totalSales)}</strong><p>${ui.snapshot.sales.length} tickets</p></article>
      <article class="metric-card"><span>Por cobrar</span><strong>${money(ui.unpaidSales)}</strong><p>Cuentas corrientes abiertas</p></article>
      <article class="metric-card"><span>Caja actual</span><strong>${ui.openCashSession ? money(ui.expectedCash) : 'Cerrada'}</strong><p>${ui.openCashSession ? 'Caja abierta' : 'Abrir para operar'}</p></article>
      <article class="metric-card"><span>Facturas abiertas</span><strong>${money(ui.pendingInvoices)}</strong><p>${ui.snapshot.invoices.length} comprobantes</p></article>
    </section>
    <section class="dashboard-grid">
      <article class="panel"><div class="panel-head"><div><h3>Ventas recientes</h3><p>Con multiples articulos</p></div></div><div class="list">
        ${ui.enrichedSales.slice(0, 5).map((sale) => `<div class="list-row"><div><strong>${sale.customerName}</strong><p>${sale.itemSummary}</p></div><div class="right"><strong>${money(sale.totalAmount)}</strong><p>${sale.channel} - ${sale.paymentMethod}</p></div></div>`).join('')}
      </div></article>
      <article class="panel"><div class="panel-head"><div><h3>Top productos</h3><p>Ranking de movimiento</p></div></div><div class="top-list">
        ${ui.topProducts.length ? ui.topProducts.map(([name, qty], index) => `<div class="top-row"><span>${index + 1}</span><div><strong>${name}</strong><p>${qty} unidades vendidas</p></div></div>`).join('') : '<p class="empty-state">Todavia no hay ventas cargadas.</p>'}
      </div></article>
      <article class="panel"><div class="panel-head"><div><h3>Stock critico</h3><p>Reposicion inmediata</p></div></div><div class="alert-list">
        ${ui.lowStock.length ? ui.lowStock.map((product) => `<div class="alert-card"><strong>${product.name}</strong><p>Stock ${product.scopedStock} en ${ui.currentBranch?.name || 'sucursal'} / minimo ${product.minStock}</p></div>`).join('') : '<div class="alert-card ok"><strong>Sin alertas</strong><p>Inventario estable.</p></div>'}
      </div></article>
      <article class="panel"><div class="panel-head"><div><h3>Auditoria</h3><p>Ultimas acciones</p></div></div><div class="timeline-list">
        ${ui.enrichedAudit.map((log) => `<div class="timeline-item"><strong>${log.action}</strong><p>${log.actorName} - ${log.entityType}</p><span>${log.createdAt.slice(0, 16).replace('T', ' ')}</span></div>`).join('')}
      </div></article>
    </section>
  </section>
`

const customersView = (ui) => `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Clientes</p><h2>Base comercial</h2></div></div>
    <section class="content-grid single-focus">
      <article class="panel"><div class="panel-head"><div><h3>Alta de cliente</h3><p>Cuenta corriente y contacto</p></div></div>
        <form class="form-grid" data-form="customer">
          <label>Nombre<input type="text" name="fullName" required /></label>
          <label>Telefono<input type="text" name="phone" required /></label>
          <label>Email<input type="email" name="email" /></label>
          <label>Saldo<input type="number" name="balance" min="0" value="0" required /></label>
          <label class="full-span">Etiqueta<input type="text" name="tag" required /></label>
          <button type="submit">Guardar cliente</button>
        </form>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Clientes</h3><p>Preparado para cuentas corrientes</p></div></div>
        ${dataTable(['Cliente', 'Telefono', 'Email', 'Saldo', 'Accion'], ui.snapshot.customers.map((customer) => `<div class="data-row"><span>${customer.fullName}</span><span>${customer.phone || '-'}</span><span>${customer.email || '-'}</span><span>${money(customer.balance)}</span><span>${actionButton('customer', customer.id)}</span></div>`))}
      </article>
    </section>
  </section>
`

const customersViewV2 = (ui) => `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Clientes</p><h2>Base comercial</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="module-summary-grid">
      <article class="metric-card compact"><span>Clientes activos</span><strong>${ui.snapshot.customers.length}</strong><p>Base disponible para ventas y facturas</p></article>
      <article class="metric-card compact"><span>Saldo total</span><strong>${money(ui.snapshot.customers.reduce((sum, customer) => sum + Number(customer.balance || 0), 0))}</strong><p>Cuentas corrientes acumuladas</p></article>
      <article class="metric-card compact"><span>Mostrador</span><strong>${ui.snapshot.customers.filter((customer) => String(customer.tag || '').toLowerCase().includes('mostrador')).length}</strong><p>Clientes genericos o rapidos</p></article>
    </section>
    <section class="module-board customers-board">
      <div class="module-main">
        <article class="panel">
          <div class="panel-head"><div><h3>Resumen comercial</h3><p>Vista rapida de la cartera actual</p></div></div>
          <div class="priority-list sales-kpis">
            <div class="priority-item"><strong>Sucursal</strong><p>${ui.currentBranch?.name || 'Principal'}</p></div>
            <div class="priority-item"><strong>Clientes con saldo</strong><p>${ui.snapshot.customers.filter((customer) => Number(customer.balance || 0) > 0).length}</p></div>
            <div class="priority-item"><strong>Listos para venta</strong><p>${ui.snapshot.customers.length ? 'Base disponible' : 'Sin clientes cargados'}</p></div>
          </div>
        </article>
        <article class="panel"><div class="panel-head"><div><h3>Clientes</h3><p>Primero ves la base cargada y agregas solo si hace falta</p></div></div>
          <div class="settings-actions">${createToggleButton('customer', customerFormOpen, 'Agregar cliente')}</div>
          ${dataTable(['Cliente', 'Telefono', 'Email', 'Saldo', 'Accion'], ui.snapshot.customers.map((customer) => `<div class="data-row"><span>${customer.fullName}<br /><small>${customer.tag || 'Sin etiqueta'}</small></span><span>${customer.phone || '-'}</span><span>${customer.email || '-'}</span><span>${money(customer.balance)}</span><span>${actionButton('customer', customer.id)}</span></div>`))}
        </article>
        ${customerFormOpen ? `<article class="panel"><div class="panel-head"><div><h3>Nuevo cliente</h3><p>Contacto, saldo y etiqueta comercial</p></div></div>
          <form class="form-grid" data-form="customer">
            <label>Nombre<input type="text" name="fullName" required /></label>
            <label>Telefono<input type="text" name="phone" required /></label>
            <label>Email<input type="email" name="email" /></label>
            <label>Saldo inicial<input type="number" name="balance" min="0" value="0" required /></label>
            <label class="full-span">Etiqueta<input type="text" name="tag" placeholder="Mayorista, taller, mostrador..." required /></label>
            <button type="submit">Guardar cliente</button>
          </form>
        </article>` : ''}
      </div>
    </section>
  </section>
`

const salesView = (ui) => `
  ${(() => {
    const editingSale = ui.snapshot.sales.find((sale) => sale.id === saleEditingId)
    if (editingSale && !Object.keys(saleDraftQuantities).length) {
      saleDraftQuantities = Object.fromEntries((editingSale.items || []).map((item) => [item.productId, item.quantity]))
    }
    const quantities = new Map(Object.entries(Object.keys(saleDraftQuantities).length ? saleDraftQuantities : Object.fromEntries((editingSale?.items || []).map((item) => [item.productId, item.quantity]))))
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Ventas</p><h2>Venta multi-item</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="content-grid single-focus">
      <article class="panel">
        <div class="panel-head"><div><h3>${editingSale ? 'Editar venta' : 'Nueva venta'}</h3><p>${editingSale ? 'Actualiza stock, cobro y comprobantes' : 'Carga rapida para mostrador o venta asistida'}</p></div></div>
        <form class="form-grid sales-form" data-form="sale">
          <input type="hidden" name="saleId" value="${editingSale?.id || ''}" />
          <label>Cliente<select name="customerId"><option value="">Mostrador</option>${ui.snapshot.customers.map((customer) => `<option value="${customer.id}" ${editingSale?.customerId === customer.id ? 'selected' : ''}>${customer.fullName}</option>`).join('')}</select></label>
          <label>Canal<select name="channel"><option ${editingSale?.channel === 'Mostrador' ? 'selected' : ''}>Mostrador</option><option ${editingSale?.channel === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option><option ${editingSale?.channel === 'Transferencia' ? 'selected' : ''}>Transferencia</option><option ${editingSale?.channel === 'Mercado Libre' ? 'selected' : ''}>Mercado Libre</option></select></label>
          <label>Pago<select name="paymentMethod"><option value="cash" ${editingSale?.paymentMethod === 'cash' ? 'selected' : ''}>Efectivo</option><option value="transfer" ${editingSale?.paymentMethod === 'transfer' ? 'selected' : ''}>Transferencia</option><option value="mercado_pago" ${editingSale?.paymentMethod === 'mercado_pago' ? 'selected' : ''}>Mercado Pago</option><option value="account" ${editingSale?.paymentMethod === 'account' ? 'selected' : ''}>Cuenta corriente</option><option value="mixed" ${editingSale?.paymentMethod === 'mixed' ? 'selected' : ''}>Mixto</option></select></label>
          <div class="toggle-grid full-span">
            <label class="checkbox-row compact-toggle"><input type="checkbox" name="isPaid" ${editingSale ? (editingSale.status === 'completed' ? 'checked' : '') : 'checked'} /><span>Cobrado</span></label>
            <label class="checkbox-row compact-toggle"><input type="checkbox" name="autoInvoice" /><span>Generar factura</span></label>
          </div>
          <label>Descuento<input type="number" min="0" name="discountAmount" value="${editingSale?.discountAmount || 0}" /></label>
          <label>Monto cobrado<input type="number" min="0" name="amountPaid" value="${editingSale?.amountPaid || 0}" /></label>
          <details class="sales-payment-detail full-span">
            <summary>Desglose de pago mixto</summary>
            <div class="payment-split-grid">
              <label>Efectivo<input type="number" min="0" name="cashAmount" value="${editingSale?.paymentBreakdown?.cash || 0}" /></label>
              <label>Transferencia<input type="number" min="0" name="transferAmount" value="${editingSale?.paymentBreakdown?.transfer || 0}" /></label>
              <label>Mercado Pago<input type="number" min="0" name="mercadoPagoAmount" value="${editingSale?.paymentBreakdown?.mercadoPago || 0}" /></label>
              <label>Cuenta corriente<input type="number" min="0" name="accountAmount" value="${editingSale?.paymentBreakdown?.account || 0}" /></label>
            </div>
          </details>
          <label class="full-span">Observaciones<input type="text" name="note" value="${editingSale?.note || ''}" placeholder="Detalle interno, referencia o condicion comercial" /></label>
          <div class="priority-list compact-list full-span sales-status-strip">
            <div class="priority-item"><strong>Sucursal</strong><p>${ui.currentBranch?.name || '-'}</p></div>
            <div class="priority-item"><strong>Caja</strong><p>${ui.openCashSession?.registerId ? (ui.enrichedRegisters.find((register) => register.id === ui.openCashSession.registerId)?.name || 'Caja activa') : (ui.currentRegister?.name || 'Sin caja seleccionada')}</p></div>
            <div class="priority-item"><strong>Modo</strong><p>${ui.openCashSession ? 'Venta ligada a caja abierta' : 'Transferencia o cuenta sin caja'}</p></div>
          </div>
          <div class="full-span">
            <div class="panel-head"><div><h3>Escaner rapido</h3><p>Lee codigo de barras, SKU o nombre exacto</p></div></div>
            <div class="inline-action-group scanner-row">
              <input type="text" class="scanner-input" name="quickAddCode" value="${saleQuickAddCode}" placeholder="Escanea o escribe codigo" />
              <button type="button" class="primary-action" data-action="quick-add-sale">Agregar</button>
            </div>
          </div>
          <p class="form-note full-span">Las ventas en efectivo solo se pueden registrar con una caja abierta. Los reportes toman sucursal y caja actual.</p>
          <div class="full-span cart-builder">
            ${ui.scopedProducts.map((product) => `
              <div class="cart-line">
                <div><strong>${product.name}</strong><p>${money(product.salePrice)} · stock ${product.scopedStock} · cod. ${product.barcode || '-'}</p></div>
                <input type="number" min="0" value="${quantities.get(product.id) || 0}" name="qty_${product.id}" />
              </div>`).join('')}
          </div>
          <button type="submit">${editingSale ? 'Guardar cambios' : 'Registrar venta'}</button>
          ${editingSale ? '<button type="button" class="danger-action" data-action="cancel-sale-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Historial</h3><p>Ventas recientes y acciones rapidas</p></div></div>
        <div class="sales-table">${dataTable(['Cliente', 'Detalle', 'Cobro', 'Acciones'], ui.enrichedSales.map((sale) => `<div class="data-row sales-history-row"><span>${sale.customerName}<br /><small>${sale.status === 'completed' ? 'Cobrada' : sale.status === 'partial' ? 'Pago parcial' : sale.status === 'cancelled' ? 'Anulada' : sale.status === 'returned' ? 'Devuelta' : 'Pendiente'}</small></span><span>${sale.itemSummary}${sale.note ? `<br /><small>${sale.note}</small>` : ''}<br /><small>${sale.branchName} / ${sale.registerName} Â· ${sale.paymentSummary}</small></span><span>${money(sale.amountPaid)} / ${money(sale.totalAmount)}${sale.discountAmount ? `<br /><small>Desc. ${money(sale.discountAmount)}</small>` : ''}</span><span>${saleActionButtons(sale)}</span></div>`))}</div>
      </article>
    </section>
  </section>
`})()}
`

const cashView = (ui) => `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Caja</p><h2>Apertura y cierre</h2></div></div>
    <section class="dashboard-grid reports-layout">
      <article class="panel">
        <div class="panel-head"><div><h3>Estado actual</h3><p>Control diario de efectivo</p></div></div>
        <div class="priority-list">
          <div class="priority-item"><strong>Estado</strong><p>${ui.openCashSession ? 'Abierta' : 'Cerrada'}</p></div>
          <div class="priority-item"><strong>Sucursal</strong><p>${ui.currentBranch?.name || '-'}</p></div>
          <div class="priority-item"><strong>Caja</strong><p>${ui.openCashSession?.registerId ? (ui.enrichedRegisters.find((register) => register.id === ui.openCashSession.registerId)?.name || 'Caja') : (ui.currentRegister?.name || 'Elegi una caja')}</p></div>
          <div class="priority-item"><strong>Fondo inicial</strong><p>${money(ui.openCashSession?.openingAmount || 0)}</p></div>
          <div class="priority-item"><strong>Ajustes manuales</strong><p>${money(ui.sessionCashMovementTotal)}</p></div>
          <div class="priority-item"><strong>Efectivo esperado</strong><p>${money(ui.expectedCash)}</p></div>
        </div>
      </article>
      <article class="panel">
        <div class="panel-head"><div><h3>${ui.openCashSession ? 'Cerrar caja' : 'Abrir caja'}</h3><p>${ui.openCashSession ? 'InformÃ¡ el efectivo contado' : 'DefinÃ­ el fondo inicial'}</p></div></div>
        <form class="form-grid" data-form="${ui.openCashSession ? 'close-cash' : 'open-cash'}">
          ${ui.openCashSession ? '' : `<label>Caja<select name="registerId" required>${ui.branchRegisters.map((register) => `<option value="${register.id}" ${ui.currentRegister?.id === register.id ? 'selected' : ''}>${register.name} (${register.code})</option>`).join('')}</select></label>`}
          <label>${ui.openCashSession ? 'Efectivo contado' : 'Monto inicial'}<input type="number" min="0" name="${ui.openCashSession ? 'countedAmount' : 'openingAmount'}" value="${ui.openCashSession ? ui.expectedCash : 0}" required /></label>
          <button type="submit">${ui.openCashSession ? 'Cerrar caja' : 'Abrir caja'}</button>
        </form>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Movimiento manual</h3><p>Ingresos, gastos y retiros</p></div></div>
        ${ui.openCashSession ? `<form class="form-grid" data-form="cash-movement">
          <label>Tipo<select name="kind"><option value="income">Ingreso</option><option value="deposit">Deposito</option><option value="expense">Gasto</option><option value="withdrawal">Retiro</option></select></label>
          <label>Importe<input type="number" min="1" name="amount" required /></label>
          <label class="full-span">Detalle<input type="text" name="note" placeholder="Motivo del movimiento" required /></label>
          <button type="submit">Registrar movimiento</button>
        </form>` : '<p class="empty-state">Abri una caja para registrar movimientos manuales.</p>'}
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Ultimos cierres</h3><p>Diferencias y arqueo</p></div></div><div class="timeline-list">
        ${byRecentDate(ui.scopedCashSessions.filter((session) => session.status === 'closed'), 'closedAt').slice(0, 5).map((session) => `<div class="timeline-item"><strong>Cierre ${session.closedAt?.slice(0, 10) || '-'}</strong><p>Contado ${money(session.countedAmount || 0)} / diferencia ${money(session.differenceAmount || 0)}</p><span>${ui.enrichedRegisters.find((register) => register.id === session.registerId)?.name || 'Caja'} / fondo ${money(session.openingAmount || 0)}</span></div>`).join('') || '<p class="empty-state">Todavia no hay cierres para este filtro.</p>'}
      </div></article>
      <article class="panel"><div class="panel-head"><div><h3>Bitacora de caja</h3><p>Impacta en el arqueo esperado</p></div></div><div class="timeline-list">
        ${ui.enrichedCashMovements.slice(0, 6).map((movement) => `<div class="timeline-item"><strong>${movement.kind}</strong><p>${movement.note}</p><span>${movement.registerName} Â· ${money(movement.signedAmount)} Â· ${movement.createdAt.slice(0, 16).replace('T', ' ')}</span></div>`).join('') || '<p class="empty-state">Todavia no hay movimientos manuales.</p>'}
      </div></article>
    </section>
  </section>
`

const salesViewV2 = (ui) => `
  ${(() => {
    const editingSale = ui.snapshot.sales.find((sale) => sale.id === saleEditingId)
    if (editingSale && !Object.keys(saleDraftQuantities).length) {
      saleDraftQuantities = Object.fromEntries((editingSale.items || []).map((item) => [item.productId, item.quantity]))
    }
    const quantities = new Map(Object.entries(Object.keys(saleDraftQuantities).length ? saleDraftQuantities : Object.fromEntries((editingSale?.items || []).map((item) => [item.productId, item.quantity]))))
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Ventas</p><h2>Venta multi-item</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="module-summary-grid">
      <article class="metric-card compact"><span>Ventas visibles</span><strong>${ui.enrichedSales.length}</strong><p>Operaciones en ${ui.currentBranch?.name || 'esta sucursal'}</p></article>
      <article class="metric-card compact"><span>Total vendido</span><strong>${money(ui.totalSales)}</strong><p>Ingresos del filtro activo</p></article>
      <article class="metric-card compact"><span>Por cobrar</span><strong>${money(ui.unpaidSales)}</strong><p>Saldo pendiente comercial</p></article>
    </section>
    <section class="module-board sales-board">
      <article class="panel module-side">
        <div class="panel-head"><div><h3>${editingSale ? 'Editar venta' : 'Nueva venta'}</h3><p>${editingSale ? 'Actualiza stock, cobro y comprobantes' : 'Carga rapida para mostrador o venta asistida'}</p></div></div>
        <form class="form-grid sales-form" data-form="sale">
          <input type="hidden" name="saleId" value="${editingSale?.id || ''}" />
          <label>Cliente<select name="customerId"><option value="">Mostrador</option>${ui.snapshot.customers.map((customer) => `<option value="${customer.id}" ${editingSale?.customerId === customer.id ? 'selected' : ''}>${customer.fullName}</option>`).join('')}</select></label>
          <label>Canal<select name="channel"><option ${editingSale?.channel === 'Mostrador' ? 'selected' : ''}>Mostrador</option><option ${editingSale?.channel === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option><option ${editingSale?.channel === 'Transferencia' ? 'selected' : ''}>Transferencia</option><option ${editingSale?.channel === 'Mercado Libre' ? 'selected' : ''}>Mercado Libre</option></select></label>
          <label>Pago<select name="paymentMethod"><option value="cash" ${editingSale?.paymentMethod === 'cash' ? 'selected' : ''}>Efectivo</option><option value="transfer" ${editingSale?.paymentMethod === 'transfer' ? 'selected' : ''}>Transferencia</option><option value="mercado_pago" ${editingSale?.paymentMethod === 'mercado_pago' ? 'selected' : ''}>Mercado Pago</option><option value="account" ${editingSale?.paymentMethod === 'account' ? 'selected' : ''}>Cuenta corriente</option><option value="mixed" ${editingSale?.paymentMethod === 'mixed' ? 'selected' : ''}>Mixto</option></select></label>
          <div class="toggle-grid full-span">
            <label class="checkbox-row compact-toggle"><input type="checkbox" name="isPaid" ${editingSale ? (editingSale.status === 'completed' ? 'checked' : '') : 'checked'} /><span>Cobrado</span></label>
            <label class="checkbox-row compact-toggle"><input type="checkbox" name="autoInvoice" /><span>Generar factura</span></label>
          </div>
          <label>Descuento<input type="number" min="0" name="discountAmount" value="${editingSale?.discountAmount || 0}" /></label>
          <label>Monto cobrado<input type="number" min="0" name="amountPaid" value="${editingSale?.amountPaid || 0}" /></label>
          <details class="sales-payment-detail full-span">
            <summary>Desglose de pago mixto</summary>
            <div class="payment-split-grid">
              <label>Efectivo<input type="number" min="0" name="cashAmount" value="${editingSale?.paymentBreakdown?.cash || 0}" /></label>
              <label>Transferencia<input type="number" min="0" name="transferAmount" value="${editingSale?.paymentBreakdown?.transfer || 0}" /></label>
              <label>Mercado Pago<input type="number" min="0" name="mercadoPagoAmount" value="${editingSale?.paymentBreakdown?.mercadoPago || 0}" /></label>
              <label>Cuenta corriente<input type="number" min="0" name="accountAmount" value="${editingSale?.paymentBreakdown?.account || 0}" /></label>
            </div>
          </details>
          <label class="full-span">Observaciones<input type="text" name="note" value="${editingSale?.note || ''}" placeholder="Detalle interno, referencia o condicion comercial" /></label>
          <div class="priority-list compact-list full-span sales-status-strip">
            <div class="priority-item"><strong>Sucursal</strong><p>${ui.currentBranch?.name || '-'}</p></div>
            <div class="priority-item"><strong>Caja</strong><p>${ui.openCashSession?.registerId ? (ui.enrichedRegisters.find((register) => register.id === ui.openCashSession.registerId)?.name || 'Caja activa') : (ui.currentRegister?.name || 'Sin caja seleccionada')}</p></div>
            <div class="priority-item"><strong>Estado</strong><p>${ui.openCashSession ? 'Caja lista para vender' : 'Solo cobros sin efectivo'}</p></div>
          </div>
          <div class="full-span sales-scanner-box">
            <div class="panel-head"><div><h3>Lector rapido</h3><p>Compatible con lector USB tipo teclado o ingreso manual</p></div></div>
            <div class="inline-action-group scanner-row">
              <input type="text" class="scanner-input" name="quickAddCode" value="${saleQuickAddCode}" placeholder="Escanea o escribe codigo de barras / SKU" />
              <button type="button" class="primary-action" data-action="quick-add-sale">Agregar</button>
              <button type="button" class="inline-action" data-action="focus-sale-scanner">Activar lector</button>
            </div>
            <p class="form-note scanner-note">Tip: si el lector USB esta conectado, apunta al producto y el sistema lo agrega a la venta con Enter.</p>
          </div>
          <p class="form-note full-span">Las ventas en efectivo solo se pueden registrar con una caja abierta. Los reportes toman sucursal y caja actual.</p>
          <div class="full-span cart-builder">
            ${ui.scopedProducts.map((product) => `
              <div class="cart-line ${product.trackStock && product.scopedStock <= product.minStock ? 'is-low' : ''}">
                <div><strong>${product.name}</strong><p>${money(product.salePrice)} Â· stock ${product.scopedStock} Â· cod. ${product.barcode || '-'}</p></div>
                <input type="number" min="0" value="${quantities.get(product.id) || 0}" name="qty_${product.id}" />
              </div>`).join('')}
          </div>
          <button type="submit">${editingSale ? 'Guardar cambios' : 'Registrar venta'}</button>
          ${editingSale ? '<button type="button" class="danger-action" data-action="cancel-sale-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <div class="module-main">
        <article class="panel">
          <div class="panel-head"><div><h3>Operacion rapida</h3><p>Resumen de la sesion actual</p></div></div>
          <div class="priority-list sales-kpis">
            <div class="priority-item"><strong>Caja</strong><p>${ui.openCashSession ? 'Abierta y ligada a ventas' : 'Cerrada para efectivo'}</p></div>
            <div class="priority-item"><strong>Canal sugerido</strong><p>${editingSale?.channel || 'Mostrador'}</p></div>
            <div class="priority-item"><strong>Cliente</strong><p>${editingSale?.customerId ? (ui.snapshot.customers.find((customer) => customer.id === editingSale.customerId)?.fullName || 'Cliente') : 'Mostrador'}</p></div>
          </div>
        </article>
        <article class="panel"><div class="panel-head"><div><h3>Historial</h3><p>Ventas recientes y acciones rapidas</p></div></div>
          <div class="sales-table">${dataTable(['Cliente', 'Detalle', 'Cobro', 'Acciones'], ui.enrichedSales.map((sale) => `<div class="data-row sales-history-row"><span>${sale.customerName}<br /><small>${sale.status === 'completed' ? 'Cobrada' : sale.status === 'partial' ? 'Pago parcial' : sale.status === 'cancelled' ? 'Anulada' : sale.status === 'returned' ? 'Devuelta' : 'Pendiente'}</small></span><span>${sale.itemSummary}${sale.note ? `<br /><small>${sale.note}</small>` : ''}<br /><small>${sale.branchName} / ${sale.registerName} · ${sale.paymentSummary}</small></span><span>${money(sale.amountPaid)} / ${money(sale.totalAmount)}${sale.discountAmount ? `<br /><small>Desc. ${money(sale.discountAmount)}</small>` : ''}</span><span>${saleActionButtons(sale)}</span></div>`))}</div>
        </article>
      </div>
    </section>
  </section>
`})()}
`

const cashViewV2 = (ui) => `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Caja</p><h2>Apertura y cierre</h2></div></div>
    <section class="module-summary-grid">
      <article class="metric-card compact"><span>Estado</span><strong>${ui.openCashSession ? 'Abierta' : 'Cerrada'}</strong><p>${ui.currentBranch?.name || 'Sucursal actual'}</p></article>
      <article class="metric-card compact"><span>Efectivo esperado</span><strong>${money(ui.expectedCash)}</strong><p>Incluye ventas cash y ajustes</p></article>
      <article class="metric-card compact"><span>Movimientos</span><strong>${ui.enrichedCashMovements.length}</strong><p>Bitacora visible del turno</p></article>
    </section>
    <section class="module-board cash-board">
      <article class="panel module-side">
        <div class="panel-head"><div><h3>Estado actual</h3><p>Control diario de efectivo</p></div></div>
        <div class="priority-list">
          <div class="priority-item"><strong>Estado</strong><p>${ui.openCashSession ? 'Abierta' : 'Cerrada'}</p></div>
          <div class="priority-item"><strong>Sucursal</strong><p>${ui.currentBranch?.name || '-'}</p></div>
          <div class="priority-item"><strong>Caja</strong><p>${ui.openCashSession?.registerId ? (ui.enrichedRegisters.find((register) => register.id === ui.openCashSession.registerId)?.name || 'Caja') : (ui.currentRegister?.name || 'ElegÃ­ una caja')}</p></div>
          <div class="priority-item"><strong>Fondo inicial</strong><p>${money(ui.openCashSession?.openingAmount || 0)}</p></div>
          <div class="priority-item"><strong>Ajustes manuales</strong><p>${money(ui.sessionCashMovementTotal)}</p></div>
          <div class="priority-item"><strong>Efectivo esperado</strong><p>${money(ui.expectedCash)}</p></div>
        </div>
      </article>
      <div class="module-main">
        <div class="compact-form-grid">
          <article class="panel">
            <div class="panel-head"><div><h3>${ui.openCashSession ? 'Cerrar caja' : 'Abrir caja'}</h3><p>${ui.openCashSession ? 'InformÃ¡ el efectivo contado' : 'DefinÃ­ el fondo inicial'}</p></div></div>
            <form class="form-grid compact-form" data-form="${ui.openCashSession ? 'close-cash' : 'open-cash'}">
              ${ui.openCashSession ? '' : `<label>Caja<select name="registerId" required>${ui.branchRegisters.map((register) => `<option value="${register.id}" ${ui.currentRegister?.id === register.id ? 'selected' : ''}>${register.name} (${register.code})</option>`).join('')}</select></label>`}
              <label>${ui.openCashSession ? 'Efectivo contado' : 'Monto inicial'}<input type="number" min="0" name="${ui.openCashSession ? 'countedAmount' : 'openingAmount'}" value="${ui.openCashSession ? ui.expectedCash : 0}" required /></label>
              <button type="submit">${ui.openCashSession ? 'Cerrar caja' : 'Abrir caja'}</button>
            </form>
          </article>
          <article class="panel"><div class="panel-head"><div><h3>Movimiento manual</h3><p>Ingresos, gastos y retiros</p></div></div>
            ${ui.openCashSession ? `<form class="form-grid compact-form" data-form="cash-movement">
              <label>Tipo<select name="kind"><option value="income">Ingreso</option><option value="deposit">Deposito</option><option value="expense">Gasto</option><option value="withdrawal">Retiro</option></select></label>
              <label>Importe<input type="number" min="1" name="amount" required /></label>
              <label class="full-span">Detalle<input type="text" name="note" placeholder="Motivo del movimiento" required /></label>
              <button type="submit">Registrar movimiento</button>
            </form>` : '<p class="empty-state">AbrÃ­ una caja para registrar movimientos manuales.</p>'}
          </article>
        </div>
        <article class="panel"><div class="panel-head"><div><h3>Ultimos cierres</h3><p>Diferencias y arqueo</p></div></div><div class="timeline-list">
          ${byRecentDate(ui.scopedCashSessions.filter((session) => session.status === 'closed'), 'closedAt').slice(0, 5).map((session) => `<div class="timeline-item"><strong>Cierre ${session.closedAt?.slice(0, 10) || '-'}</strong><p>Contado ${money(session.countedAmount || 0)} / diferencia ${money(session.differenceAmount || 0)}</p><span>${ui.enrichedRegisters.find((register) => register.id === session.registerId)?.name || 'Caja'} / fondo ${money(session.openingAmount || 0)}</span></div>`).join('') || '<p class="empty-state">TodavÃ­a no hay cierres para este filtro.</p>'}
        </div></article>
        <article class="panel"><div class="panel-head"><div><h3>Bitacora de caja</h3><p>Impacta en el arqueo esperado</p></div></div><div class="timeline-list">
          ${ui.enrichedCashMovements.slice(0, 6).map((movement) => `<div class="timeline-item"><strong>${movement.kind}</strong><p>${movement.note}</p><span>${movement.registerName} Â· ${money(movement.signedAmount)} Â· ${movement.createdAt.slice(0, 16).replace('T', ' ')}</span></div>`).join('') || '<p class="empty-state">TodavÃ­a no hay movimientos manuales.</p>'}
        </div></article>
      </div>
    </section>
  </section>
`

const productsView = (ui) => `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Productos</p><h2>Catalogo y stock</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="module-summary-grid">
      <article class="metric-card compact">
        <span>Productos activos</span>
        <strong>${ui.scopedProducts.length}</strong>
        <p>Catalogo disponible en ${ui.currentBranch?.name || 'la sucursal actual'}</p>
      </article>
      <article class="metric-card compact">
        <span>Stock bajo</span>
        <strong>${ui.lowStock.length}</strong>
        <p>Articulos para revisar o reponer</p>
      </article>
      <article class="metric-card compact">
        <span>Movimientos</span>
        <strong>${ui.scopedStockMovements.length}</strong>
        <p>Ajustes y transferencias del periodo</p>
      </article>
    </section>
    <section class="module-board products-board">
      <div class="module-main">
        <div class="compact-form-grid">
          <article class="panel">
            <div class="panel-head"><div><h3>Ajuste de stock</h3><p>Ingreso o salida manual por diferencia</p></div></div>
            <form class="form-grid compact-form" data-form="stock-adjustment">
              <label>Producto<select name="productId" required>${ui.scopedProducts.map((product) => `<option value="${product.id}">${product.name} (${product.scopedStock})</option>`).join('')}</select></label>
              <label>Cantidad (+/-)<input type="number" name="quantity" required /></label>
              <label class="full-span">Motivo<input type="text" name="note" placeholder="Conteo, rotura, merma o correccion" required /></label>
              <button type="submit">Aplicar ajuste</button>
            </form>
          </article>
          <article class="panel">
            <div class="panel-head"><div><h3>Transferencia</h3><p>Movimiento entre sucursales</p></div></div>
            <form class="form-grid compact-form" data-form="stock-transfer">
              <label>Producto<select name="productId" required>${ui.scopedProducts.map((product) => `<option value="${product.id}">${product.name} (${product.scopedStock})</option>`).join('')}</select></label>
              <label>Cantidad<input type="number" min="1" name="quantity" required /></label>
              <label>Desde<select name="fromBranchId" required>${ui.snapshot.branches.map((branch) => `<option value="${branch.id}" ${ui.currentBranch?.id === branch.id ? 'selected' : ''}>${branch.name}</option>`).join('')}</select></label>
              <label>Hacia<select name="toBranchId" required>${ui.snapshot.branches.map((branch) => `<option value="${branch.id}">${branch.name}</option>`).join('')}</select></label>
              <label class="full-span">Detalle<input type="text" name="note" placeholder="Reposicion entre locales" /></label>
              <button type="submit">Registrar transferencia</button>
            </form>
          </article>
        </div>
        <article class="panel inventory-panel">
          <div class="panel-head inventory-headline"><div><h3>Inventario</h3><p>Stock actual y precio de venta</p></div></div>
          <div class="settings-actions">${createToggleButton('product', productFormOpen, 'Agregar producto')}</div>
          ${inventoryTable(ui.scopedProducts.map((product) => `
            <div class="inventory-row ${product.trackStock && product.scopedStock <= product.minStock ? 'is-low' : ''}">
              <span class="inventory-product">${product.name}<small>${product.sku}</small></span>
              <span>${product.barcode || '-'}</span>
              <span><span class="stock-pill">${product.scopedStock}</span></span>
              <span>${product.totalStock}</span>
              <span>${money(product.salePrice)}</span>
              <span class="inventory-actions">${actionButton('product', product.id)}</span>
            </div>
          `))}
        </article>
        ${productFormOpen ? `<article class="panel"><div class="panel-head"><div><h3>Nuevo producto</h3><p>Carga simple para empezar rapido</p></div></div>
          <form class="form-grid" data-form="product">
            <label>Nombre<input type="text" name="name" required /></label>
            <label>SKU<input type="text" name="sku" required /></label>
            <label>Codigo de barras<input type="text" class="scanner-input" name="barcode" placeholder="Escanea o escribe codigo" /></label>
            <label>Stock<input type="number" name="stock" min="0" required /></label>
            <label>Precio venta<input type="number" name="salePrice" min="0" required /></label>
            <label>Costo<input type="number" name="costPrice" min="0" required /></label>
            <label>Minimo<input type="number" name="minStock" min="0" required /></label>
            <label>Categoria<input type="text" name="category" required /></label>
            <label class="field-check full-span"><input type="checkbox" name="trackStock" checked /><span class="field-check-box" aria-hidden="true"></span><span>Controlar stock de este articulo</span></label>
            <div class="full-span inline-action-group scanner-row">
              <button type="button" class="inline-action" data-action="focus-product-barcode">Usar lector</button>
              <span class="scanner-inline-copy">Captura el codigo desde un lector USB o escribilo manualmente.</span>
            </div>
            <button type="submit">Guardar producto</button>
          </form>
        </article>` : ''}
      </div>
    </section>
    <section class="content-grid single-focus">
      <article class="panel">
        <div class="panel-head"><div><h3>Base cloud actual</h3><p>Estado de persistencia con Supabase</p></div></div>
        <div class="info-strip"><strong>Modo actual</strong><span>${ui.snapshot.meta?.adapter || 'sin adaptador'}</span></div>
        <div class="panel-note"><span>Hoy esta guardando en Supabase por snapshot cloud.</span><span>El siguiente paso profesional es pasar productos, ventas, caja y facturas a tablas core separadas.</span></div>
      </article>
    </section>
  </section>
`

const purchasesView = (ui) => `
  ${(() => {
    const editingReceipt = ui.snapshot.purchaseReceipts.find((receipt) => receipt.id === purchaseEditingId)
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Compras</p><h2>Proveedores y recepcion</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="dashboard-grid reports-layout">
      <article class="panel"><div class="panel-head"><div><h3>Alta de proveedor</h3><p>Base de compras</p></div></div>
        <form class="form-grid" data-form="supplier">
          <label>Empresa<input type="text" name="name" required /></label>
          <label>Contacto<input type="text" name="contact" required /></label>
          <label>Telefono<input type="text" name="phone" required /></label>
          <label>Saldo pendiente<input type="number" name="balance" min="0" required /></label>
          <label>Ultima entrega<input type="date" name="lastDelivery" value="${today}" required /></label>
          <label>Categoria<input type="text" name="category" required /></label>
          <button type="submit">Guardar proveedor</button>
        </form>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>${editingReceipt ? 'Editar recepcion' : 'Recepcion de compra'}</h3><p>${editingReceipt ? 'Recalcula stock y saldo del proveedor' : 'Ingresa stock y costo'}</p></div></div>
        <form class="form-grid" data-form="purchase-receipt">
          <input type="hidden" name="receiptId" value="${editingReceipt?.id || ''}" />
          <label>Proveedor<select name="supplierId" required>${ui.snapshot.suppliers.map((supplier) => `<option value="${supplier.id}" ${editingReceipt?.supplierId === supplier.id ? 'selected' : ''}>${supplier.name}</option>`).join('')}</select></label>
          <label>Producto<select name="productId" required>${ui.snapshot.products.map((product) => `<option value="${product.id}" ${editingReceipt?.productId === product.id ? 'selected' : ''}>${product.name}</option>`).join('')}</select></label>
          <label>Comprobante<input type="text" name="documentNumber" value="${editingReceipt?.documentNumber || ''}" placeholder="FAC-000123" /></label>
          <label>Cantidad<input type="number" min="1" name="quantity" value="${editingReceipt?.quantity || ''}" required /></label>
          <label>Costo unitario<input type="number" min="0" name="unitCost" value="${editingReceipt?.unitCost || ''}" required /></label>
          <label class="full-span">Observaciones<input type="text" name="note" value="${editingReceipt?.note || ''}" placeholder="Pedido, lote, condicion o referencia" /></label>
          <button type="submit">${editingReceipt ? 'Guardar cambios' : 'Registrar recepcion'}</button>
          ${editingReceipt ? '<button type="button" class="danger-action" data-action="cancel-purchase-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Recepciones recientes</h3><p>Con impacto en stock</p></div></div>
        ${dataTable(['Proveedor', 'Producto', 'Cantidad', 'Costo', 'Accion'], ui.enrichedReceipts.map((receipt) => `<div class="data-row"><span>${receipt.supplierName}<br /><small>${receipt.documentNumber || 'Sin comprobante'}</small></span><span>${receipt.productName}${receipt.note ? `<br /><small>${receipt.note}</small>` : ''}</span><span>${receipt.quantity}</span><span>${money(receipt.totalCost)}</span><span>${purchaseActionButtons(receipt)}</span></div>`))}
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Proveedores</h3><p>Saldos y categorias</p></div></div>
        ${dataTable(['Proveedor', 'Categoria', 'Saldo', 'Ultima', 'Accion'], ui.snapshot.suppliers.map((supplier) => `<div class="data-row"><span>${supplier.name}</span><span>${supplier.category}</span><span>${money(supplier.balance)}</span><span>${supplier.lastDelivery}</span><span>${actionButton('supplier', supplier.id)}</span></div>`))}
      </article>
    </section>
  </section>
`})()}
`

const purchasesViewV2 = (ui) => `
  ${(() => {
    const editingReceipt = ui.snapshot.purchaseReceipts.find((receipt) => receipt.id === purchaseEditingId)
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Compras</p><h2>Proveedores y recepcion</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="module-summary-grid">
      <article class="metric-card compact"><span>Proveedores</span><strong>${ui.snapshot.suppliers.length}</strong><p>Base de compras disponible</p></article>
      <article class="metric-card compact"><span>Recepciones</span><strong>${ui.enrichedReceipts.length}</strong><p>Ingresos registrados</p></article>
      <article class="metric-card compact"><span>Saldo proveedor</span><strong>${money(ui.snapshot.suppliers.reduce((sum, supplier) => sum + Number(supplier.balance || 0), 0))}</strong><p>Compromiso comercial actual</p></article>
    </section>
    <section class="module-board purchases-board">
      <div class="module-main">
        <article class="panel"><div class="panel-head"><div><h3>${editingReceipt ? 'Editar recepcion' : 'Recepcion de compra'}</h3><p>${editingReceipt ? 'Recalcula stock y saldo del proveedor' : 'Ingresa stock y costo'}</p></div></div>
          <form class="form-grid compact-form" data-form="purchase-receipt">
            <input type="hidden" name="receiptId" value="${editingReceipt?.id || ''}" />
            <label>Proveedor<select name="supplierId" required>${ui.snapshot.suppliers.map((supplier) => `<option value="${supplier.id}" ${editingReceipt?.supplierId === supplier.id ? 'selected' : ''}>${supplier.name}</option>`).join('')}</select></label>
            <label>Producto<select name="productId" required>${ui.snapshot.products.map((product) => `<option value="${product.id}" ${editingReceipt?.productId === product.id ? 'selected' : ''}>${product.name}</option>`).join('')}</select></label>
            <label>Comprobante<input type="text" name="documentNumber" value="${editingReceipt?.documentNumber || ''}" placeholder="FAC-000123" /></label>
            <label>Cantidad<input type="number" min="1" name="quantity" value="${editingReceipt?.quantity || ''}" required /></label>
            <label>Costo unitario<input type="number" min="0" name="unitCost" value="${editingReceipt?.unitCost || ''}" required /></label>
            <label class="full-span">Observaciones<input type="text" name="note" value="${editingReceipt?.note || ''}" placeholder="Pedido, lote, condicion o referencia" /></label>
            <button type="submit">${editingReceipt ? 'Guardar cambios' : 'Registrar recepcion'}</button>
            ${editingReceipt ? '<button type="button" class="danger-action" data-action="cancel-purchase-edit">Cancelar edicion</button>' : ''}
          </form>
        </article>
        <div class="compact-form-grid">
          <article class="panel"><div class="panel-head"><div><h3>Recepciones recientes</h3><p>Con impacto en stock</p></div></div>
            ${dataTable(['Proveedor', 'Producto', 'Cantidad', 'Costo', 'Accion'], ui.enrichedReceipts.map((receipt) => `<div class="data-row"><span>${receipt.supplierName}<br /><small>${receipt.documentNumber || 'Sin comprobante'}</small></span><span>${receipt.productName}${receipt.note ? `<br /><small>${receipt.note}</small>` : ''}</span><span>${receipt.quantity}</span><span>${money(receipt.totalCost)}</span><span>${purchaseActionButtons(receipt)}</span></div>`))}
          </article>
          <article class="panel"><div class="panel-head"><div><h3>Proveedores</h3><p>Base visible para comprar y reponer</p></div></div>
            <div class="settings-actions">${createToggleButton('supplier', supplierFormOpen, 'Agregar proveedor')}</div>
            ${dataTable(['Proveedor', 'Categoria', 'Saldo', 'Ultima', 'Accion'], ui.snapshot.suppliers.map((supplier) => `<div class="data-row"><span>${supplier.name}</span><span>${supplier.category}</span><span>${money(supplier.balance)}</span><span>${supplier.lastDelivery}</span><span>${actionButton('supplier', supplier.id)}</span></div>`))}
          </article>
        </div>
        ${supplierFormOpen ? `<article class="panel"><div class="panel-head"><div><h3>Nuevo proveedor</h3><p>Base comercial de compras</p></div></div>
          <form class="form-grid" data-form="supplier">
            <label>Empresa<input type="text" name="name" required /></label>
            <label>Contacto<input type="text" name="contact" required /></label>
            <label>Telefono<input type="text" name="phone" required /></label>
            <label>Saldo pendiente<input type="number" name="balance" min="0" required /></label>
            <label>Ultima entrega<input type="date" name="lastDelivery" value="${today}" required /></label>
            <label>Categoria<input type="text" name="category" required /></label>
            <button type="submit">Guardar proveedor</button>
          </form>
        </article>` : ''}
      </div>
    </section>
  </section>
`})()}
`

const invoicesView = (ui) => `
  ${(() => {
    const editingInvoice = ui.snapshot.invoices.find((invoice) => invoice.id === invoiceEditingId)
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Facturacion</p><h2>Comprobantes</h2></div></div>
    <section class="content-grid single-focus">
      <article class="panel"><div class="panel-head"><div><h3>${editingInvoice ? 'Editar factura' : 'Nueva factura'}</h3><p>Numeracion real por sucursal</p></div></div>
        <form class="form-grid" data-form="invoice">
          <input type="hidden" name="invoiceId" value="${editingInvoice?.id || ''}" />
          <label>Numero<input type="text" name="number" value="${editingInvoice?.number || ''}" placeholder="Se autogenera si lo dejÃ¡s vacÃ­o" /></label>
          <label>Cliente<select name="customerId" required>${ui.snapshot.customers.map((customer) => `<option value="${customer.id}" ${editingInvoice?.customerId === customer.id ? 'selected' : ''}>${customer.fullName}</option>`).join('')}</select></label>
          <label>Clase<select name="kind"><option ${editingInvoice?.kind === 'Factura' || !editingInvoice ? 'selected' : ''}>Factura</option><option ${editingInvoice?.kind === 'Ticket' ? 'selected' : ''}>Ticket</option><option ${editingInvoice?.kind === 'Presupuesto' ? 'selected' : ''}>Presupuesto</option><option ${editingInvoice?.kind === 'Remito' ? 'selected' : ''}>Remito</option><option ${editingInvoice?.kind === 'Nota de credito' ? 'selected' : ''}>Nota de credito</option></select></label>
          <label>Total<input type="number" min="1" name="totalAmount" value="${editingInvoice?.totalAmount || ''}" required /></label>
          <label>Tipo<select name="type"><option ${editingInvoice?.type === 'A' ? 'selected' : ''}>A</option><option ${editingInvoice?.type === 'B' || !editingInvoice ? 'selected' : ''}>B</option><option ${editingInvoice?.type === 'C' ? 'selected' : ''}>C</option></select></label>
          <label>Vencimiento<input type="date" name="dueDate" value="${editingInvoice?.dueDate || today}" required /></label>
          <label>Estado<select name="status"><option ${editingInvoice?.status === 'Emitida' || !editingInvoice ? 'selected' : ''}>Emitida</option><option ${editingInvoice?.status === 'En revision' ? 'selected' : ''}>En revision</option><option ${editingInvoice?.status === 'Cobrada' ? 'selected' : ''}>Cobrada</option></select></label>
          <label>Estado fiscal<select name="fiscalStatus"><option ${editingInvoice?.fiscalStatus === 'Pendiente' || !editingInvoice ? 'selected' : ''}>Pendiente</option><option ${editingInvoice?.fiscalStatus === 'Listo para enviar' ? 'selected' : ''}>Listo para enviar</option><option ${editingInvoice?.fiscalStatus === 'Aprobado' ? 'selected' : ''}>Aprobado</option><option ${editingInvoice?.fiscalStatus === 'Rechazado' ? 'selected' : ''}>Rechazado</option><option ${editingInvoice?.fiscalStatus === 'Anulado' ? 'selected' : ''}>Anulado</option></select></label>
          <button type="submit">${editingInvoice ? 'Guardar cambios' : 'Guardar factura'}</button>
          ${editingInvoice ? '<button type="button" class="danger-action" data-action="cancel-invoice-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Comprobantes</h3><p>Seguimiento comercial y fiscal</p></div></div>
        ${dataTable(['Numero', 'Cliente', 'Sucursal', 'Total', 'Accion'], ui.enrichedInvoices.map((invoice) => `<div class="data-row"><span>${invoice.number}</span><span>${invoice.customerName}<br /><small>${invoice.kind || 'Factura'} Â· ${invoice.fiscalStatus || 'Pendiente'}</small></span><span>${invoice.branchName}<br /><small>${invoice.status}</small></span><span>${money(invoice.totalAmount)}</span><span>${invoiceActionButtons(invoice)}</span></div>`))}
      </article>
    </section>
  </section>
`})()}
`

const invoicesViewV2 = (ui) => `
  ${(() => {
    const editingInvoice = ui.snapshot.invoices.find((invoice) => invoice.id === invoiceEditingId)
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Facturacion</p><h2>Comprobantes</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="module-summary-grid">
      <article class="metric-card compact"><span>Comprobantes</span><strong>${ui.enrichedInvoices.length}</strong><p>Emitidos para ${ui.currentBranch?.name || 'esta sucursal'}</p></article>
      <article class="metric-card compact"><span>Abiertas</span><strong>${ui.enrichedInvoices.filter((invoice) => invoice.status !== 'Cobrada').length}</strong><p>Pendientes de cobro o revision</p></article>
      <article class="metric-card compact"><span>Monto total</span><strong>${money(ui.enrichedInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0))}</strong><p>FacturaciÃ³n visible del filtro</p></article>
    </section>
    <section class="module-board invoices-board">
      <article class="panel module-side"><div class="panel-head"><div><h3>${editingInvoice ? 'Editar factura' : 'Nueva factura'}</h3><p>Numeracion real por sucursal</p></div></div>
        <form class="form-grid" data-form="invoice">
          <input type="hidden" name="invoiceId" value="${editingInvoice?.id || ''}" />
          <label>Numero<input type="text" name="number" value="${editingInvoice?.number || ''}" placeholder="Se autogenera si lo dejas vacio" /></label>
          <label>Cliente<select name="customerId" required>${ui.snapshot.customers.map((customer) => `<option value="${customer.id}" ${editingInvoice?.customerId === customer.id ? 'selected' : ''}>${customer.fullName}</option>`).join('')}</select></label>
          <label>Clase<select name="kind"><option ${editingInvoice?.kind === 'Factura' || !editingInvoice ? 'selected' : ''}>Factura</option><option ${editingInvoice?.kind === 'Ticket' ? 'selected' : ''}>Ticket</option><option ${editingInvoice?.kind === 'Presupuesto' ? 'selected' : ''}>Presupuesto</option><option ${editingInvoice?.kind === 'Remito' ? 'selected' : ''}>Remito</option><option ${editingInvoice?.kind === 'Nota de credito' ? 'selected' : ''}>Nota de credito</option></select></label>
          <label>Total<input type="number" min="1" name="totalAmount" value="${editingInvoice?.totalAmount || ''}" required /></label>
          <label>Tipo<select name="type"><option ${editingInvoice?.type === 'A' ? 'selected' : ''}>A</option><option ${editingInvoice?.type === 'B' || !editingInvoice ? 'selected' : ''}>B</option><option ${editingInvoice?.type === 'C' ? 'selected' : ''}>C</option></select></label>
          <label>Vencimiento<input type="date" name="dueDate" value="${editingInvoice?.dueDate || today}" required /></label>
          <label>Estado<select name="status"><option ${editingInvoice?.status === 'Emitida' || !editingInvoice ? 'selected' : ''}>Emitida</option><option ${editingInvoice?.status === 'En revision' ? 'selected' : ''}>En revision</option><option ${editingInvoice?.status === 'Cobrada' ? 'selected' : ''}>Cobrada</option></select></label>
          <label>Estado fiscal<select name="fiscalStatus"><option ${editingInvoice?.fiscalStatus === 'Pendiente' || !editingInvoice ? 'selected' : ''}>Pendiente</option><option ${editingInvoice?.fiscalStatus === 'Listo para enviar' ? 'selected' : ''}>Listo para enviar</option><option ${editingInvoice?.fiscalStatus === 'Aprobado' ? 'selected' : ''}>Aprobado</option><option ${editingInvoice?.fiscalStatus === 'Rechazado' ? 'selected' : ''}>Rechazado</option><option ${editingInvoice?.fiscalStatus === 'Anulado' ? 'selected' : ''}>Anulado</option></select></label>
          <button type="submit">${editingInvoice ? 'Guardar cambios' : 'Guardar factura'}</button>
          ${editingInvoice ? '<button type="button" class="danger-action" data-action="cancel-invoice-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <div class="module-main">
        <article class="panel">
          <div class="panel-head"><div><h3>Estado fiscal</h3><p>Seguimiento comercial y numeracion</p></div></div>
          <div class="priority-list sales-kpis">
            <div class="priority-item"><strong>Sucursal</strong><p>${ui.currentBranch?.name || '-'}</p></div>
            <div class="priority-item"><strong>Ultimo estado</strong><p>${ui.enrichedInvoices[0]?.fiscalStatus || 'Sin comprobantes'}</p></div>
            <div class="priority-item"><strong>Tipo mas usado</strong><p>${ui.enrichedInvoices[0]?.type || 'B'}</p></div>
          </div>
        </article>
        <article class="panel"><div class="panel-head"><div><h3>Comprobantes</h3><p>Seguimiento comercial y fiscal</p></div></div>
          ${dataTable(['Numero', 'Cliente', 'Sucursal', 'Total', 'Accion'], ui.enrichedInvoices.map((invoice) => `<div class="data-row"><span>${invoice.number}</span><span>${invoice.customerName}<br /><small>${invoice.kind || 'Factura'} Â· ${invoice.fiscalStatus || 'Pendiente'}</small></span><span>${invoice.branchName}<br /><small>${invoice.status}</small></span><span>${money(invoice.totalAmount)}</span><span>${invoiceActionButtons(invoice)}</span></div>`))}
        </article>
      </div>
    </section>
  </section>
`})()}
`

const ticketsView = (ui) => `
  ${(() => {
    const editingTicket = ui.snapshot.tickets.find((ticket) => ticket.id === ticketEditingId)
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Tickets</p><h2>Seguimiento operativo</h2></div></div>
    <section class="content-grid single-focus">
      <article class="panel"><div class="panel-head"><div><h3>${editingTicket ? 'Editar ticket' : 'Nuevo ticket'}</h3><p>Numeracion y seguimiento por sucursal</p></div></div>
        <form class="form-grid" data-form="ticket">
          <input type="hidden" name="ticketId" value="${editingTicket?.id || ''}" />
          <label>Numero<input type="text" name="number" value="${editingTicket?.number || ''}" placeholder="Se autogenera si lo dejÃ¡s vacÃ­o" /></label>
          <label>Cliente<select name="customerId" required>${ui.snapshot.customers.map((customer) => `<option value="${customer.id}" ${editingTicket?.customerId === customer.id ? 'selected' : ''}>${customer.fullName}</option>`).join('')}</select></label>
          <label>Equipo<input type="text" name="device" value="${editingTicket?.device || ''}" required /></label>
          <label>Estado<select name="status"><option ${editingTicket?.status === 'Recibido' || !editingTicket ? 'selected' : ''}>Recibido</option><option ${editingTicket?.status === 'En curso' ? 'selected' : ''}>En curso</option><option ${editingTicket?.status === 'Esperando aprobacion' ? 'selected' : ''}>Esperando aprobacion</option><option ${editingTicket?.status === 'Listo para entregar' ? 'selected' : ''}>Listo para entregar</option></select></label>
          <label class="full-span">Detalle<input type="text" name="issue" value="${editingTicket?.issue || ''}" required /></label>
          <button type="submit">${editingTicket ? 'Guardar cambios' : 'Guardar ticket'}</button>
          ${editingTicket ? '<button type="button" class="danger-action" data-action="cancel-ticket-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Tickets activos</h3><p>Historial rapido</p></div></div>
        ${dataTable(['Ticket', 'Cliente', 'Sucursal', 'Actualizado', 'Accion'], ui.enrichedTickets.map((ticket) => `<div class="data-row"><span>${ticket.number}</span><span>${ticket.customerName}</span><span>${ticket.branchName}</span><span>${ticket.updatedAt}</span><span>${ticketActionButtons(ticket)}</span></div>`))}
      </article>
    </section>
  </section>
`})()}
`

const ticketsViewV2 = (ui) => `
  ${(() => {
    const editingTicket = ui.snapshot.tickets.find((ticket) => ticket.id === ticketEditingId)
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Tickets</p><h2>Seguimiento operativo</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="module-summary-grid">
      <article class="metric-card compact"><span>Tickets activos</span><strong>${ui.enrichedTickets.length}</strong><p>Casos visibles de la sucursal</p></article>
      <article class="metric-card compact"><span>En curso</span><strong>${ui.enrichedTickets.filter((ticket) => ticket.status === 'En curso').length}</strong><p>Equipos en trabajo</p></article>
      <article class="metric-card compact"><span>Listos</span><strong>${ui.enrichedTickets.filter((ticket) => ticket.status === 'Listo para entregar').length}</strong><p>Entregas pendientes</p></article>
    </section>
    <section class="module-board tickets-board">
      <article class="panel module-side"><div class="panel-head"><div><h3>${editingTicket ? 'Editar ticket' : 'Nuevo ticket'}</h3><p>Numeracion y seguimiento por sucursal</p></div></div>
        <form class="form-grid" data-form="ticket">
          <input type="hidden" name="ticketId" value="${editingTicket?.id || ''}" />
          <label>Numero<input type="text" name="number" value="${editingTicket?.number || ''}" placeholder="Se autogenera si lo dejas vacio" /></label>
          <label>Cliente<select name="customerId" required>${ui.snapshot.customers.map((customer) => `<option value="${customer.id}" ${editingTicket?.customerId === customer.id ? 'selected' : ''}>${customer.fullName}</option>`).join('')}</select></label>
          <label>Equipo<input type="text" name="device" value="${editingTicket?.device || ''}" required /></label>
          <label>Estado<select name="status"><option ${editingTicket?.status === 'Recibido' || !editingTicket ? 'selected' : ''}>Recibido</option><option ${editingTicket?.status === 'En curso' ? 'selected' : ''}>En curso</option><option ${editingTicket?.status === 'Esperando aprobacion' ? 'selected' : ''}>Esperando aprobacion</option><option ${editingTicket?.status === 'Listo para entregar' ? 'selected' : ''}>Listo para entregar</option></select></label>
          <label class="full-span">Detalle<input type="text" name="issue" value="${editingTicket?.issue || ''}" required /></label>
          <button type="submit">${editingTicket ? 'Guardar cambios' : 'Guardar ticket'}</button>
          ${editingTicket ? '<button type="button" class="danger-action" data-action="cancel-ticket-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <div class="module-main">
        <article class="panel">
          <div class="panel-head"><div><h3>Estado del taller</h3><p>Vista rÃ¡pida del flujo operativo</p></div></div>
          <div class="priority-list sales-kpis">
            <div class="priority-item"><strong>Sucursal</strong><p>${ui.currentBranch?.name || '-'}</p></div>
            <div class="priority-item"><strong>Ultimo ticket</strong><p>${ui.enrichedTickets[0]?.number || 'Sin tickets'}</p></div>
            <div class="priority-item"><strong>Cliente reciente</strong><p>${ui.enrichedTickets[0]?.customerName || 'Sin actividad'}</p></div>
          </div>
        </article>
        <article class="panel"><div class="panel-head"><div><h3>Tickets activos</h3><p>Historial rapido</p></div></div>
          ${dataTable(['Ticket', 'Cliente', 'Sucursal', 'Actualizado', 'Accion'], ui.enrichedTickets.map((ticket) => `<div class="data-row"><span>${ticket.number}<br /><small>${ticket.device}</small></span><span>${ticket.customerName}<br /><small>${ticket.status}</small></span><span>${ticket.branchName}</span><span>${ticket.updatedAt}</span><span>${ticketActionButtons(ticket)}</span></div>`))}
        </article>
      </div>
    </section>
  </section>
`})()}
`

const branchesView = (ui) => `
  ${(() => {
    const editingBranch = ui.snapshot.branches.find((branch) => branch.id === branchEditingId)
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Sucursales</p><h2>Locales y numeracion</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="content-grid single-focus">
      <article class="panel"><div class="panel-head"><div><h3>${editingBranch ? 'Editar sucursal' : 'Nueva sucursal'}</h3><p>La sucursal actual define la numeracion</p></div></div>
        <form class="form-grid" data-form="branch">
          <input type="hidden" name="branchId" value="${editingBranch?.id || ''}" />
          <label>Nombre<input type="text" name="name" value="${editingBranch?.name || ''}" required /></label>
          <label>Codigo<input type="text" name="code" value="${editingBranch?.code || ''}" required /></label>
          <label class="full-span">Direccion<input type="text" name="address" value="${editingBranch?.address || ''}" required /></label>
          <button type="submit">${editingBranch ? 'Guardar cambios' : 'Guardar sucursal'}</button>
          ${editingBranch ? '<button type="button" class="danger-action" data-action="cancel-branch-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Sucursales</h3><p>Actual: ${ui.currentBranch?.name || '-'}</p></div></div>
        ${dataTable(['Nombre', 'Codigo', 'Direccion', 'Actual', 'Accion'], ui.snapshot.branches.map((branch) => `<div class="data-row"><span>${branch.name}</span><span>${branch.code}</span><span>${branch.address}</span><span>${ui.currentBranch?.id === branch.id ? 'Si' : 'No'}</span><span>${branchActionButtons(branch)}</span></div>`))}
      </article>
    </section>
  </section>
`})()}
`

const branchesViewV2 = (ui) => `
  ${(() => {
    const editingBranch = ui.snapshot.branches.find((branch) => branch.id === branchEditingId)
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Sucursales</p><h2>Locales y numeracion</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="module-summary-grid">
      <article class="metric-card compact"><span>Sucursales</span><strong>${ui.snapshot.branches.length}</strong><p>Estructura comercial disponible</p></article>
      <article class="metric-card compact"><span>Caja actual</span><strong>${ui.currentRegister?.name || 'Sin caja'}</strong><p>Ligada a ${ui.currentBranch?.name || 'sin sucursal'}</p></article>
      <article class="metric-card compact"><span>Sucursal activa</span><strong>${ui.currentBranch?.name || '-'}</strong><p>Define numeracion y reportes</p></article>
    </section>
    <section class="module-board branches-board">
      <article class="panel module-side"><div class="panel-head"><div><h3>${editingBranch ? 'Editar sucursal' : 'Nueva sucursal'}</h3><p>La sucursal actual define la numeracion</p></div></div>
        <form class="form-grid" data-form="branch">
          <input type="hidden" name="branchId" value="${editingBranch?.id || ''}" />
          <label>Nombre<input type="text" name="name" value="${editingBranch?.name || ''}" required /></label>
          <label>Codigo<input type="text" name="code" value="${editingBranch?.code || ''}" required /></label>
          <label class="full-span">Direccion<input type="text" name="address" value="${editingBranch?.address || ''}" required /></label>
          <button type="submit">${editingBranch ? 'Guardar cambios' : 'Guardar sucursal'}</button>
          ${editingBranch ? '<button type="button" class="danger-action" data-action="cancel-branch-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <div class="module-main">
        <article class="panel">
          <div class="panel-head"><div><h3>Operacion por sucursal</h3><p>Contexto actual del comercio</p></div></div>
          <div class="priority-list sales-kpis">
            <div class="priority-item"><strong>Actual</strong><p>${ui.currentBranch?.name || '-'}</p></div>
            <div class="priority-item"><strong>Cajas ligadas</strong><p>${ui.branchRegisters.length}</p></div>
            <div class="priority-item"><strong>Direccion</strong><p>${ui.currentBranch?.address || 'Sin direccion'}</p></div>
          </div>
        </article>
        <article class="panel"><div class="panel-head"><div><h3>Sucursales</h3><p>Actual: ${ui.currentBranch?.name || '-'}</p></div></div>
          ${dataTable(['Nombre', 'Codigo', 'Direccion', 'Actual', 'Accion'], ui.snapshot.branches.map((branch) => `<div class="data-row"><span>${branch.name}</span><span>${branch.code}</span><span>${branch.address}</span><span>${ui.currentBranch?.id === branch.id ? 'Si' : 'No'}</span><span>${branchActionButtons(branch)}</span></div>`))}
        </article>
      </div>
    </section>
  </section>
`})()}
`

const registersView = (ui) => `
  ${(() => {
    const editingRegister = ui.snapshot.registers.find((register) => register.id === registerEditingId)
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Cajas</p><h2>Cajeros y puestos de cobro</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="content-grid single-focus">
      <article class="panel"><div class="panel-head"><div><h3>${editingRegister ? 'Editar caja' : 'Nueva caja'}</h3><p>Asignacion por sucursal y cajero</p></div></div>
        <form class="form-grid" data-form="register">
          <input type="hidden" name="registerId" value="${editingRegister?.id || ''}" />
          <label>Sucursal<select name="branchId" required>${ui.snapshot.branches.map((branch) => `<option value="${branch.id}" ${editingRegister?.branchId === branch.id ? 'selected' : ''}>${branch.name}</option>`).join('')}</select></label>
          <label>Nombre<input type="text" name="name" value="${editingRegister?.name || ''}" required /></label>
          <label>Codigo<input type="text" name="code" value="${editingRegister?.code || ''}" required /></label>
          <label>Cajero<select name="cashierUserId">${ui.snapshot.users.map((user) => `<option value="${user.id}" ${editingRegister?.cashierUserId === user.id ? 'selected' : ''}>${user.fullName}</option>`).join('')}</select></label>
          <button type="submit">${editingRegister ? 'Guardar cambios' : 'Guardar caja'}</button>
          ${editingRegister ? '<button type="button" class="danger-action" data-action="cancel-register-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Cajas</h3><p>Preparado para varias cajas por sucursal</p></div></div>
        ${dataTable(['Caja', 'Codigo', 'Sucursal', 'Cajero', 'Accion'], ui.enrichedRegisters.map((register) => `<div class="data-row"><span>${register.name}</span><span>${register.code}</span><span>${register.branchName}</span><span>${register.cashierName}</span><span class="inline-action-group"><button type="button" class="inline-action" data-register-action="select" data-id="${register.id}">Usar</button>${registerActionButtons(register)}</span></div>`))}
      </article>
    </section>
  </section>
`})()}
`

const registersViewV2 = (ui) => `
  ${(() => {
    const editingRegister = ui.snapshot.registers.find((register) => register.id === registerEditingId)
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Cajas</p><h2>Cajeros y puestos de cobro</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="module-summary-grid">
      <article class="metric-card compact"><span>Cajas</span><strong>${ui.enrichedRegisters.length}</strong><p>Puestos de cobro configurados</p></article>
      <article class="metric-card compact"><span>Caja activa</span><strong>${ui.currentRegister?.name || '-'}</strong><p>${ui.currentBranch?.name || 'Sin sucursal'}</p></article>
      <article class="metric-card compact"><span>Cajeros</span><strong>${new Set(ui.enrichedRegisters.map((register) => register.cashierName)).size}</strong><p>Usuarios vinculados a cajas</p></article>
    </section>
    <section class="module-board registers-board">
      <article class="panel module-side"><div class="panel-head"><div><h3>${editingRegister ? 'Editar caja' : 'Nueva caja'}</h3><p>Asignacion por sucursal y cajero</p></div></div>
        <form class="form-grid" data-form="register">
          <input type="hidden" name="registerId" value="${editingRegister?.id || ''}" />
          <label>Sucursal<select name="branchId" required>${ui.snapshot.branches.map((branch) => `<option value="${branch.id}" ${editingRegister?.branchId === branch.id ? 'selected' : ''}>${branch.name}</option>`).join('')}</select></label>
          <label>Nombre<input type="text" name="name" value="${editingRegister?.name || ''}" required /></label>
          <label>Codigo<input type="text" name="code" value="${editingRegister?.code || ''}" required /></label>
          <label>Cajero<select name="cashierUserId">${ui.snapshot.users.map((user) => `<option value="${user.id}" ${editingRegister?.cashierUserId === user.id ? 'selected' : ''}>${user.fullName}</option>`).join('')}</select></label>
          <button type="submit">${editingRegister ? 'Guardar cambios' : 'Guardar caja'}</button>
          ${editingRegister ? '<button type="button" class="danger-action" data-action="cancel-register-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <div class="module-main">
        <article class="panel">
          <div class="panel-head"><div><h3>Uso operativo</h3><p>Control de puestos de cobro</p></div></div>
          <div class="priority-list sales-kpis">
            <div class="priority-item"><strong>Sucursal</strong><p>${ui.currentBranch?.name || '-'}</p></div>
            <div class="priority-item"><strong>Sesion abierta</strong><p>${ui.openCashSession ? 'Si' : 'No'}</p></div>
            <div class="priority-item"><strong>Caja actual</strong><p>${ui.currentRegister?.name || 'Sin asignar'}</p></div>
          </div>
        </article>
        <article class="panel"><div class="panel-head"><div><h3>Cajas</h3><p>Preparado para varias cajas por sucursal</p></div></div>
          ${dataTable(['Caja', 'Codigo', 'Sucursal', 'Cajero', 'Accion'], ui.enrichedRegisters.map((register) => `<div class="data-row"><span>${register.name}</span><span>${register.code}</span><span>${register.branchName}</span><span>${register.cashierName}</span><span class="inline-action-group"><button type="button" class="inline-action" data-register-action="select" data-id="${register.id}">Usar</button>${registerActionButtons(register)}</span></div>`))}
        </article>
      </div>
    </section>
  </section>
`})()}
`

const reportsView = (ui) => `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Reportes</p><h2>Indicadores y movimientos</h2></div></div>
    <section class="content-grid single-focus">
      <article class="panel"><div class="panel-head"><div><h3>Filtro operativo</h3><p>Separado por sucursal y caja</p></div></div>
        <form class="form-grid" data-form="report-filter">
          <label>Sucursal actual<input type="text" value="${ui.currentBranch?.name || '-'}" disabled /></label>
          <label>Caja<select name="registerFilter"><option value="all">Todas</option>${ui.branchRegisters.map((register) => `<option value="${register.id}" ${reportRegisterFilter === register.id ? 'selected' : ''}>${register.name}</option>`).join('')}</select></label>
          <label>Desde<input type="date" name="dateFrom" value="${ui.reportDateFrom}" /></label>
          <label>Hasta<input type="date" name="dateTo" value="${ui.reportDateTo}" /></label>
          <button type="submit">Aplicar filtro</button>
        </form>
      </article>
    </section>
    <section class="dashboard-grid reports-layout">
      <article class="panel"><div class="panel-head"><div><h3>Top productos</h3><p>Movimiento comercial filtrado</p></div></div><div class="top-list">${[...ui.reportScopedSales.reduce((map, sale) => { for (const item of sale.items) { const current = map.get(item.productId) || { name: ui.snapshot.products.find((product) => product.id === item.productId)?.name || 'Articulo', qty: 0 }; current.qty += item.quantity; map.set(item.productId, current) } return map }, new Map()).values()].sort((a, b) => b.qty - a.qty).slice(0, 5).map((item, index) => `<div class="top-row"><span>${index + 1}</span><div><strong>${item.name}</strong><p>${item.qty} unidades vendidas</p></div></div>`).join('') || '<p class="empty-state">Sin ventas en este rango.</p>'}</div></article>
      <article class="panel"><div class="panel-head"><div><h3>Balance rapido</h3><p>${ui.currentBranch?.name || 'Sucursal'}${reportRegisterFilter === 'all' ? '' : ` / ${ui.enrichedRegisters.find((register) => register.id === reportRegisterFilter)?.name || 'Caja'}`}</p></div></div><div class="priority-list"><div class="priority-item"><strong>Ventas filtradas</strong><p>${money(ui.reportScopedSales.reduce((sum, sale) => sum + sale.totalAmount, 0))}</p></div><div class="priority-item"><strong>Facturas filtradas</strong><p>${money(ui.reportScopedInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0))}</p></div><div class="priority-item"><strong>Mov. caja</strong><p>${money(ui.reportScopedCashMovements.reduce((sum, movement) => sum + movement.signedAmount, 0))}</p></div></div><div class="settings-actions"><button type="button" class="primary-action" data-action="export-report">Exportar CSV</button></div></article>
      <article class="panel"><div class="panel-head"><div><h3>Movimientos de stock</h3><p>Ingresos y egresos</p></div></div><div class="timeline-list">${byRecentDate(ui.reportScopedStockMovements, 'createdAt').slice(0, 6).map((movement) => `<div class="timeline-item"><strong>${movement.type}</strong><p>${movement.quantity} unidades</p><span>${movement.createdAt.slice(0, 16).replace('T', ' ')}</span></div>`).join('') || '<p class="empty-state">Sin movimientos de stock en este rango.</p>'}</div></article>
      <article class="panel"><div class="panel-head"><div><h3>Movimientos de caja</h3><p>Ingresos y egresos manuales</p></div></div><div class="timeline-list">${byRecentDate(ui.reportScopedCashMovements, 'createdAt').slice(0, 6).map((movement) => `<div class="timeline-item"><strong>${movement.kind}</strong><p>${movement.note}</p><span>${money(movement.signedAmount)} Â· ${movement.createdAt.slice(0, 16).replace('T', ' ')}</span></div>`).join('') || '<p class="empty-state">Sin movimientos de caja en este rango.</p>'}</div></article>
    </section>
  </section>
`

const ownerAdminView = (ui) => {
  const currentPlanKey = ui.snapshot.business.activePlan || 'custom'
  const currentPlanName = planLabels[currentPlanKey] || currentPlanKey
  const activeModules = Object.values(ui.moduleCatalog).filter((module) => ui.snapshot.business.enabledModules.includes(module.key))
  const activeUsers = ui.snapshot.users.filter((user) => user.isActive).length
  return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Mi admin</p><h2>Panel PCLAF</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="metrics-grid">
      <article class="metric-card"><span>Comercio actual</span><strong>${ui.commerceContext?.commerce_name || ui.snapshot.business.name || 'Sin nombre'}</strong><p>${ui.currentBranch?.name || 'Sucursal'} activa</p></article>
      <article class="metric-card"><span>Pack aplicado</span><strong>${currentPlanName}</strong><p>${activeModules.length} modulos visibles</p></article>
      <article class="metric-card"><span>Usuarios activos</span><strong>${activeUsers}</strong><p>${ui.snapshot.users.length} cuentas cargadas</p></article>
      <article class="metric-card"><span>Estructura</span><strong>${ui.snapshot.branches.length} / ${ui.snapshot.registers.length}</strong><p>Sucursales y cajas configuradas</p></article>
    </section>
    <section class="dashboard-grid">
      <article class="panel"><div class="panel-head"><div><h3>Flujo del cliente</h3><p>Como conviene entregarlo para no abrumar</p></div></div>
        <div class="timeline-list">
          <div class="timeline-item"><strong>1. Vos armas la base</strong><p>Creas comercio, sucursal inicial, caja y primer usuario administrador.</p><span>El cliente no deberia tocar configuracion tecnica al inicio.</span></div>
          <div class="timeline-item"><strong>2. Elegis el pack</strong><p>Mostras solo los modulos que ese negocio necesita hoy.</p><span>Si despues crece, le habilitas mas sin rehacer el sistema.</span></div>
          <div class="timeline-item"><strong>3. Alta de equipo</strong><p>Vos o el admin del comercio crean usuarios, roles y permisos.</p><span>No hace falta que cualquiera se autocree cuenta.</span></div>
          <div class="timeline-item"><strong>4. Operacion diaria</strong><p>El cliente entra y ve un menu corto, claro y util para su rubro.</p><span>Menos botones, menos errores, mejor adopcion.</span></div>
        </div>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Vista actual del cliente</h3><p>Esto es lo que hoy le queda habilitado</p></div></div>
        <div class="chip-grid">${activeModules.map((module) => `<span class="module-chip is-active">${module.name}</span>`).join('') || '<p class="empty-state">No hay modulos activos.</p>'}</div>
        <div class="panel-note"><span>Si el negocio tiene una sola caja, evita mostrar Sucursales, Cajas multiples y Tickets.</span><span>Si no usa proveedores, tambien conviene ocultar Compras hasta que lo necesite.</span></div>
      </article>
    </section>
    <section class="content-grid single-focus">
      <article class="panel"><div class="panel-head"><div><h3>Packs por necesidad</h3><p>No por precio: cada comercio ve solo lo justo</p></div></div>
        <div class="preset-grid">
          ${Object.entries(planCatalog).map(([key, plan]) => {
            const isCurrent = currentPlanKey === key
            const modules = plan.modules.map((moduleKey) => ui.moduleCatalog[moduleKey]?.name || moduleKey).filter(Boolean)
            return `<div class="preset-card ${isCurrent ? 'is-active' : ''}">
              <div class="preset-card-head"><strong>${plan.name}</strong><span>${isCurrent ? 'Actual' : 'Disponible'}</span></div>
              <p>${plan.description}</p>
              <small>${plan.idealFor}</small>
              <div class="chip-grid">${modules.map((module) => `<span class="module-chip">${module}</span>`).join('')}</div>
              <div class="settings-actions"><button type="button" class="${isCurrent ? 'inline-action' : 'primary-action'}" data-plan-apply="${key}">${isCurrent ? 'Ya activo' : 'Aplicar pack'}</button></div>
            </div>`
          }).join('')}
        </div>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Que revisar despues</h3><p>Proximos pasos para venderlo mejor</p></div></div>
        <div class="timeline-list">
          <div class="timeline-item"><strong>Onboarding por rubro</strong><p>Crear asistentes iniciales para kiosco, servicio tecnico, ferreteria o local general.</p><span>Cada uno deberia arrancar con un pack distinto.</span></div>
          <div class="timeline-item"><strong>Limites por plan</strong><p>No por precio bruto, sino por complejidad: 1 caja, varias cajas, varias sucursales, tickets, reportes avanzados.</p><span>Eso hace mas facil venderlo y explicarlo.</span></div>
          <div class="timeline-item"><strong>Invitaciones y aprobacion</strong><p>Agregar alta guiada de usuarios con invitacion o PIN temporal.</p><span>Asi el cliente suma gente sin tocar configuraciones delicadas.</span></div>
          <div class="timeline-item"><strong>Panel central tuyo</strong><p>Mas adelante conviene un superadmin global para ver todos tus clientes, planes activos y modulos habilitados.</p><span>Eso ya seria tu consola de revendedor.</span></div>
        </div>
      </article>
    </section>
  </section>
`
}

const ownerAdminViewV2 = (ui) => {
  const currentPlanKey = ui.snapshot.business.activePlan || 'custom'
  const currentPlanName = planLabels[currentPlanKey] || currentPlanKey
  const activeModules = Object.values(ui.moduleCatalog).filter((module) => ui.snapshot.business.enabledModules.includes(module.key))
  const activeUsers = ui.snapshot.users.filter((user) => user.isActive).length
  const syncLabel = ui.snapshot.meta.syncStatus === 'online'
    ? 'Cloud operativa'
    : ui.snapshot.meta.syncStatus === 'syncing'
      ? 'Sincronizando'
      : ui.snapshot.meta.syncStatus === 'pending'
        ? 'Pendiente'
        : ui.snapshot.meta.syncStatus || 'offline'
  return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Mi admin</p><h2>Panel PCLAF</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="module-summary-grid">
      <article class="metric-card compact"><span>Comercio actual</span><strong>${ui.commerceContext?.commerce_name || ui.snapshot.business.name || 'Sin nombre'}</strong><p>${ui.currentBranch?.name || 'Sucursal'} activa</p></article>
      <article class="metric-card compact"><span>Pack aplicado</span><strong>${currentPlanName}</strong><p>${activeModules.length} modulos visibles</p></article>
      <article class="metric-card compact"><span>Usuarios activos</span><strong>${activeUsers}</strong><p>Acceso del equipo listo</p></article>
    </section>
    <section class="module-board admin-board">
      <article class="panel module-side"><div class="panel-head"><div><h3>Estado general</h3><p>Resumen corto de la cuenta actual</p></div></div>
        <div class="priority-list">
          <div class="priority-item"><strong>Propietario</strong><p>${ui.user.fullName}<br /><small>${maskEmail(ui.user.email) || 'Sin email'}</small></p></div>
          <div class="priority-item"><strong>Comercio</strong><p>${ui.commerceContext?.commerce_name || 'Sin comercio activo'}<br /><small>${ui.snapshot.business.organization || 'Sin razon social'}</small></p></div>
          <div class="priority-item"><strong>Acceso</strong><p>${currentPlanName}<br /><small>${activeModules.length} modulos activos</small></p></div>
          <div class="priority-item"><strong>Respaldo</strong><p>${syncLabel}<br /><small>${ui.snapshot.meta.lastSyncedAt ? ui.snapshot.meta.lastSyncedAt.slice(0, 16).replace('T', ' ') : 'Aun sin sincronizar'}</small></p></div>
        </div>
        <div class="settings-actions"><button type="button" class="primary-action" data-action="open-support">Soporte por WhatsApp</button><button type="button" class="danger-action" data-action="sign-out">Cerrar sesion</button></div>
      </article>
      <div class="module-main">
        <div class="compact-form-grid">
          <article class="panel"><div class="panel-head"><div><h3>Comercio y propietario</h3><p>Datos base del negocio</p></div></div>
            <form class="form-grid compact-form" data-form="commerce-profile">
              <label>Nombre comercial<input type="text" name="name" value="${ui.commerceContext?.commerce_name || ''}" required /></label>
              <label>Email propietario<input type="email" name="ownerEmail" value="${ui.commerceContext?.owner_email || ''}" required /></label>
              <label>Razon social<input type="text" name="legalName" value="${ui.snapshot.business.organization || ''}" /></label>
              <button type="submit">Guardar comercio</button>
            </form>
            <div class="panel-note"><span>Este correo queda como acceso principal del comercio.</span><span>La configuracion tecnica se mantiene fuera de esta vista.</span></div>
          </article>
          <article class="panel"><div class="panel-head"><div><h3>Cuenta y respaldo</h3><p>Control rapido del estado general</p></div></div>
            <div class="timeline-list">
              <div class="timeline-item"><strong>Estado del servicio</strong><p>${syncLabel}</p><span>La informacion del negocio queda respaldada en la nube.</span></div>
              <div class="timeline-item"><strong>Ultima sincronizacion</strong><p>${ui.snapshot.meta.lastSyncedAt ? ui.snapshot.meta.lastSyncedAt.slice(0, 16).replace('T', ' ') : 'Pendiente'}</p><span>Podes forzar un guardado manual cuando lo necesites.</span></div>
            </div>
            <div class="settings-actions"><button type="button" class="primary-action" data-action="sync-cloud" ${cloudSyncBusy ? 'disabled' : ''}>${cloudSyncBusy ? 'Sincronizando...' : 'Sincronizar ahora'}</button><button type="button" class="primary-action" data-action="export-data">Exportar JSON</button><label class="file-action">Importar JSON<input type="file" accept="application/json" data-action="import-data" /></label></div>
          </article>
        </div>
        <article class="panel"><div class="panel-head"><div><h3>Modulos activos</h3><p>Esto es lo que hoy ve el cliente</p></div></div>
          <div class="chip-grid">${activeModules.map((module) => `<span class="module-chip is-active">${module.name}</span>`).join('') || '<p class="empty-state">No hay modulos activos.</p>'}</div>
          <div class="panel-note"><span>Mientras mas simple sea el panel, mas facil es que el cliente lo adopte.</span><span>Si no necesita una funcion, conviene esconderla.</span></div>
        </article>
        <article class="panel"><div class="panel-head"><div><h3>Packs por necesidad</h3><p>Cada comercio ve solo lo justo</p></div></div>
          <div class="preset-grid">
            ${Object.entries(planCatalog).map(([key, plan]) => {
              const isCurrent = currentPlanKey === key
              const modules = plan.modules.map((moduleKey) => ui.moduleCatalog[moduleKey]?.name || moduleKey).filter(Boolean)
              return `<div class="preset-card ${isCurrent ? 'is-active' : ''}">
                <div class="preset-card-head"><strong>${plan.name}</strong><span>${isCurrent ? 'Actual' : 'Disponible'}</span></div>
                <p>${plan.description}</p>
                <small>${plan.idealFor}</small>
                <div class="chip-grid">${modules.map((module) => `<span class="module-chip">${module}</span>`).join('')}</div>
                <div class="settings-actions"><button type="button" class="${isCurrent ? 'inline-action' : 'primary-action'}" data-plan-apply="${key}">${isCurrent ? 'Ya activo' : 'Aplicar pack'}</button></div>
              </div>`
            }).join('')}
          </div>
        </article>
        <article class="panel"><div class="panel-head"><div><h3>Cuentas y permisos</h3><p>Quien entra y que puede usar</p></div></div>
          ${dataTable(['Usuario', 'Perfil', 'Estado', 'Acceso', 'Gestion'], ui.enrichedUsers.map((entry) => `<div class="data-row"><span>${entry.fullName}${entry.isOwner ? ' <small>? Propietario</small>' : ''}<br /><small>${maskEmail(entry.email) || 'Sin email'}</small></span><span>${entry.roleName}</span><span>${entry.status === 'active' ? 'Activo' : entry.status === 'pending' ? 'Pendiente' : 'Deshabilitado'}</span><span>${entry.id === ui.user.id ? 'Sesion actual' : entry.isOwner ? 'Control total' : 'Limitado por rol'}</span><span>${userActionButtons(entry)}</span></div>`))}
        </article>
        <article class="panel"><div class="panel-head"><div><h3>Actividad reciente</h3><p>Movimientos y cambios del sistema</p></div></div>
          <div class="timeline-list">${ui.enrichedAudit.map((log) => `<div class="timeline-item"><strong>${log.action}</strong><p>${log.actorName} - ${log.entityType}${log.entityId ? ` #${String(log.entityId).slice(0, 8)}` : ''}</p><span>${log.createdAt.slice(0, 16).replace('T', ' ')}</span></div>`).join('')}</div>
        </article>
      </div>
    </section>
  </section>
`
}

const settingsView = (ui) => `
  ${(() => {
    const editingUser = ui.snapshot.users.find((entry) => entry.id === userEditingId)
    const canManageUsers = Boolean(ui.user?.isOwner)
    const syncLabel = ui.snapshot.meta.syncStatus === 'online'
      ? 'Cloud operativa'
      : ui.snapshot.meta.syncStatus === 'syncing'
        ? 'Sincronizando'
        : ui.snapshot.meta.syncStatus === 'pending'
          ? 'Pendiente'
          : ui.snapshot.meta.syncStatus || 'offline'
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Ajustes</p><h2>Seguridad y backup</h2></div></div>
    <section class="dashboard-grid reports-layout">
      <article class="panel"><div class="panel-head"><div><h3>Cuenta activa</h3><p>Sesion, rol y alcance de trabajo</p></div></div><div class="priority-list"><div class="priority-item"><strong>Usuario</strong><p>${ui.user.fullName}<br /><small>${ui.user.email || 'Sin email'}</small></p></div><div class="priority-item"><strong>Perfil</strong><p>${ui.role.name}${ui.user.isOwner ? '<br /><small>Propietario de la instancia</small>' : `<br /><small>Plan ${ui.commerceContext?.active_plan ? (planLabels[ui.commerceContext.active_plan] || ui.commerceContext.active_plan) : (planLabels[ui.snapshot.business.activePlan] || 'Full')}</small>`}</p></div><div class="priority-item"><strong>Comercio</strong><p>${ui.commerceContext?.commerce_name || 'Sin comercio activo'}<br /><small>${ui.commerceContext?.owner_email || ui.cloudConnection.instanceKey}</small></p></div><div class="priority-item"><strong>Estado</strong><p>${syncLabel}${ui.snapshot.meta.lastSyncedAt ? `<br /><small>${ui.snapshot.meta.lastSyncedAt.slice(0, 16).replace('T', ' ')}</small>` : ''}</p></div></div><div class="settings-actions"><button type="button" class="danger-action" data-action="sign-out">Cerrar sesion</button></div></article>
      <article class="panel"><div class="panel-head"><div><h3>Comercio y propietario</h3><p>Configura el negocio, el mail dueÃ±o y la migracion a tablas reales</p></div></div>
        <form class="form-grid" data-form="commerce-profile">
          <label>Nombre comercial<input type="text" name="name" value="${ui.commerceContext?.commerce_name || ''}" ${canManageUsers ? 'required' : 'disabled'} /></label>
          <label>Email propietario<input type="email" name="ownerEmail" value="${ui.commerceContext?.owner_email || ''}" ${canManageUsers ? 'required' : 'disabled'} /></label>
          <label>Razon social<input type="text" name="legalName" value="${ui.snapshot.business.organization || ''}" ${canManageUsers ? '' : 'disabled'} /></label>
          <label>Pack<select name="activePlan" ${canManageUsers ? '' : 'disabled'}><option value="basic" ${(ui.commerceContext?.active_plan || ui.snapshot.business.activePlan) === 'basic' ? 'selected' : ''}>Gestion base</option><option value="retail" ${(ui.commerceContext?.active_plan || ui.snapshot.business.activePlan) === 'retail' ? 'selected' : ''}>Mostrador</option><option value="full" ${(!(ui.commerceContext?.active_plan || ui.snapshot.business.activePlan) || (ui.commerceContext?.active_plan || ui.snapshot.business.activePlan) === 'full') ? 'selected' : ''}>Operacion</option><option value="multi" ${(ui.commerceContext?.active_plan || ui.snapshot.business.activePlan) === 'multi' ? 'selected' : ''}>Multi sucursal</option><option value="custom" ${(ui.commerceContext?.active_plan || ui.snapshot.business.activePlan) === 'custom' ? 'selected' : ''}>Personalizado</option></select></label>
          <button type="submit" ${canManageUsers ? '' : 'disabled'}>Guardar comercio</button>
        </form>
        <div class="panel-note"><span>El mail dueÃ±o ahora se puede cambiar desde aca sin tocar SQL.</span><span>Elegi un pack para que el cliente no vea herramientas que todavia no necesita.</span></div>
        <div class="settings-actions"><button type="button" class="primary-action" data-action="import-core" ${canManageUsers ? '' : 'disabled'}>Migrar snapshot a tablas reales</button></div>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>${editingUser ? 'Editar cuenta' : 'Cuentas y permisos'}</h3><p>Las cuentas nuevas se registran desde acceso y vos decidis que puede usar cada una</p></div></div>
        ${!canManageUsers ? '<div class="info-strip"><strong>Solo lectura</strong><span>Necesitas entrar con la cuenta propietaria para editar permisos.</span></div>' : ''}
        <form class="form-grid" data-form="user">
          <input type="hidden" name="userId" value="${editingUser?.id || ''}" />
          <label>Nombre completo<input type="text" name="fullName" value="${editingUser?.fullName || ''}" ${canManageUsers ? 'required' : 'disabled'} /></label>
          <label>Email<input type="email" name="email" value="${editingUser?.email || ''}" placeholder="usuario@negocio.com" disabled /></label>
          <label>Rol<select name="roleId" ${canManageUsers ? 'required' : 'disabled'}>${ui.snapshot.roles.map((role) => `<option value="${role.id}" ${editingUser?.roleId === role.id ? 'selected' : ''}>${role.name}</option>`).join('')}</select></label>
            <label class="field-check full-span"><input type="checkbox" name="isActive" ${editingUser ? (editingUser.isActive ? 'checked' : '') : 'checked'} ${canManageUsers ? '' : 'disabled'} /><span class="field-check-box" aria-hidden="true"></span><span>Cuenta habilitada</span></label>
          <button type="submit" ${canManageUsers ? '' : 'disabled'}>${editingUser ? 'Guardar permisos' : 'Selecciona una cuenta para editar'}</button>
          ${editingUser ? '<button type="button" class="danger-action" data-action="cancel-user-edit">Cancelar edicion</button>' : ''}
        </form>
        <div class="panel-note"><span>Las cuentas las crea el dueÃ±o o el administrador desde este panel.</span><span>Despues definis rol, caja y nivel de acceso para cada persona.</span></div>
        ${dataTable(['Usuario', 'Perfil', 'Estado', 'Acceso', 'Gestion'], ui.enrichedUsers.map((entry) => `<div class="data-row"><span>${entry.fullName}${entry.isOwner ? ' <small>Â· Propietario</small>' : ''}<br /><small>${entry.email || 'Sin email'}</small></span><span>${entry.roleName}</span><span>${entry.status === 'active' ? 'Activo' : entry.status === 'pending' ? 'Pendiente' : 'Deshabilitado'}</span><span>${entry.id === ui.user.id ? 'Sesion actual' : entry.isOwner ? 'Control total' : 'Limitado por rol'}</span><span>${userActionButtons(entry)}</span></div>`))}
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Plan y modulos</h3><p>Activa solo lo que el cliente necesita</p></div></div>
        <form class="form-grid" data-form="module-preset">
          <label>Pack<select name="presetKey"><option value="basic" ${ui.snapshot.business.activePlan === 'basic' ? 'selected' : ''}>Gestion base</option><option value="retail" ${ui.snapshot.business.activePlan === 'retail' ? 'selected' : ''}>Mostrador</option><option value="full" ${ui.snapshot.business.activePlan === 'full' ? 'selected' : ''}>Operacion</option><option value="multi" ${ui.snapshot.business.activePlan === 'multi' ? 'selected' : ''}>Multi sucursal</option></select></label>
          <button type="submit">Aplicar preset</button>
        </form>
        <div class="timeline-list">
          ${Object.values(ui.moduleCatalog).map((module) => `
            <div class="timeline-item">
              <strong>${module.name}</strong>
              <p>${module.description}</p>
              <span>${ui.snapshot.business.enabledModules.includes(module.key) ? 'Habilitado' : 'Oculto para este cliente'}</span>
              <div class="settings-actions"><button type="button" class="inline-action" data-module-toggle="${module.key}" data-enabled="${ui.snapshot.business.enabledModules.includes(module.key) ? 'true' : 'false'}">${ui.snapshot.business.enabledModules.includes(module.key) ? 'Deshabilitar' : 'Habilitar'}</button></div>
            </div>
          `).join('')}
        </div>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Conexion cloud</h3><p>Instancia real donde se guardan usuarios, ventas y comprobantes</p></div></div>
        <div class="info-strip"><strong>Proyecto activo</strong><span>${ui.cloudConnection.instanceKey} Â· ${syncLabel}</span></div>
        <form class="form-grid" data-form="cloud-connection">
          <label>URL Supabase<input type="url" name="url" value="${ui.cloudConnection.url || defaultSupabaseUrl}" placeholder="https://xxxx.supabase.co" required /></label>
          <label>Clave publica<input type="text" name="anonKey" value="${ui.cloudConnection.anonKey || ''}" placeholder="sb_publishable_xxx o anon key" required /></label>
          <label>Instancia<input type="text" name="instanceKey" value="${ui.cloudConnection.instanceKey || 'pclaf-dev'}" placeholder="pclaf-dev" required /></label>
          <button type="submit">${ui.cloudConnection.enabled ? 'Guardar conexion' : 'Conectar Supabase'}</button>
        </form>
        <div class="panel-note"><span>La app ya no trabaja en demo local cuando esta en web.</span><span>Todo lo que se use aca debe terminar guardado en Supabase.</span></div>
        <div class="settings-actions">
          <button type="button" class="primary-action" data-action="sync-cloud" ${cloudSyncBusy ? 'disabled' : ''}>${cloudSyncBusy ? 'Sincronizando...' : 'Sincronizar ahora'}</button>
        </div>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Backup operativo</h3><p>Exporta e importa respaldo manual de esta instancia</p></div></div><div class="settings-actions"><button type="button" class="primary-action" data-action="export-data">Exportar JSON</button><label class="file-action">Importar JSON<input type="file" accept="application/json" data-action="import-data" /></label></div></article>
      <article class="panel"><div class="panel-head"><div><h3>Auditoria</h3><p>Ultimos eventos</p></div></div><div class="timeline-list">${ui.enrichedAudit.map((log) => `<div class="timeline-item"><strong>${log.action}</strong><p>${log.actorName} - ${log.entityType}${log.entityId ? ` #${String(log.entityId).slice(0, 8)}` : ''}</p><span>${log.createdAt.slice(0, 16).replace('T', ' ')}</span></div>`).join('')}</div></article>
    </section>
  </section>
`})()}
`

const settingsViewV2 = (ui) => `
  ${(() => {
    const editingUser = ui.snapshot.users.find((entry) => entry.id === userEditingId)
    const canManageUsers = Boolean(ui.user?.isOwner)
    const syncLabel = ui.snapshot.meta.syncStatus === 'online'
      ? 'Cloud operativa'
      : ui.snapshot.meta.syncStatus === 'syncing'
        ? 'Sincronizando'
        : ui.snapshot.meta.syncStatus === 'pending'
          ? 'Pendiente'
          : ui.snapshot.meta.syncStatus || 'offline'
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Ajustes</p><h2>Seguridad y backup</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="module-summary-grid">
      <article class="metric-card compact"><span>Sesion</span><strong>${ui.user.fullName}</strong><p>${ui.role.name}</p></article>
      <article class="metric-card compact"><span>Cloud</span><strong>${syncLabel}</strong><p>Base protegida para este comercio</p></article>
      <article class="metric-card compact"><span>Modulos</span><strong>${ui.snapshot.business.enabledModules.length}</strong><p>Visibles para este cliente</p></article>
    </section>
    <section class="module-board settings-board">
      <article class="panel module-side"><div class="panel-head"><div><h3>Cuenta activa</h3><p>Sesion, rol y alcance de trabajo</p></div></div>
        <div class="priority-list">
          <div class="priority-item"><strong>Usuario</strong><p>${ui.user.fullName}<br /><small>${maskEmail(ui.user.email) || 'Sin email'}</small></p></div>
          <div class="priority-item"><strong>Perfil</strong><p>${ui.role.name}</p></div>
          <div class="priority-item"><strong>Comercio</strong><p>${ui.commerceContext?.commerce_name || 'Sin comercio activo'}</p></div>
          <div class="priority-item"><strong>Estado</strong><p>${syncLabel}${ui.snapshot.meta.lastSyncedAt ? `<br /><small>${ui.snapshot.meta.lastSyncedAt.slice(0, 16).replace('T', ' ')}</small>` : ''}</p></div>
        </div>
        <div class="settings-actions"><button type="button" class="primary-action" data-action="open-support">Soporte por WhatsApp</button><button type="button" class="danger-action" data-action="sign-out">Cerrar sesion</button></div>
      </article>
      <div class="module-main">
        <div class="compact-form-grid">
          <article class="panel"><div class="panel-head"><div><h3>Comercio y propietario</h3><p>Datos base del negocio y cuenta principal</p></div></div>
            <form class="form-grid compact-form" data-form="commerce-profile">
              <label>Nombre comercial<input type="text" name="name" value="${ui.commerceContext?.commerce_name || ''}" ${canManageUsers ? 'required' : 'disabled'} /></label>
              <label>Email propietario<input type="email" name="ownerEmail" value="${ui.commerceContext?.owner_email || ''}" ${canManageUsers ? 'required' : 'disabled'} /></label>
              <label>Razon social<input type="text" name="legalName" value="${ui.snapshot.business.organization || ''}" ${canManageUsers ? '' : 'disabled'} /></label>
              <button type="submit" ${canManageUsers ? '' : 'disabled'}>Guardar comercio</button>
            </form>
            <div class="panel-note"><span>La cuenta principal del comercio queda asociada a este correo.</span><span>Los packs y modulos se administran aparte para no mezclar configuracion con operacion.</span></div>
          </article>
          <article class="panel"><div class="panel-head"><div><h3>Cuenta web</h3><p>Estado del acceso online y de la prueba</p></div></div>
            <div class="info-strip"><strong>Estado</strong><span>${syncLabel}</span></div>
            <div class="timeline-list">
              <div class="timeline-item"><strong>Comercio activo</strong><p>${ui.commerceContext?.commerce_name || 'Comercio configurado'}</p><span>La sesion y los datos quedan ligados a este negocio.</span></div>
              <div class="timeline-item"><strong>Pack actual</strong><p>${planLabels[ui.commerceContext?.active_plan || ui.snapshot.business.activePlan] || 'Operacion'}</p><span>Se usan solo los modulos habilitados para esta cuenta.</span></div>
              <div class="timeline-item"><strong>Acceso comercial</strong><p>${maskEmail(ui.commerceContext?.owner_email || ui.snapshot.business.ownerEmail) || 'Sin correo principal'}</p><span>La configuracion tecnica queda fuera de la vista del cliente.</span></div>
            </div>
            <div class="settings-actions"><button type="button" class="primary-action" data-action="sync-cloud" ${cloudSyncBusy ? 'disabled' : ''}>${cloudSyncBusy ? 'Sincronizando...' : 'Sincronizar ahora'}</button></div>
          </article>
        </div>
        <article class="panel"><div class="panel-head"><div><h3>${editingUser ? 'Editar cuenta' : 'Cuentas y permisos'}</h3><p>Las cuentas nuevas se registran desde acceso y vos decidis que puede usar cada una</p></div></div>
          ${!canManageUsers ? '<div class="info-strip"><strong>Solo lectura</strong><span>Necesitas entrar con la cuenta propietaria para editar permisos.</span></div>' : ''}
          <form class="form-grid" data-form="user">
            <input type="hidden" name="userId" value="${editingUser?.id || ''}" />
            <label>Nombre completo<input type="text" name="fullName" value="${editingUser?.fullName || ''}" ${canManageUsers ? 'required' : 'disabled'} /></label>
            <label>Email<input type="email" name="email" value="${editingUser?.email || ''}" placeholder="usuario@negocio.com" ${canManageUsers ? 'required' : 'disabled'} /></label>
            <label>Clave${editingUser ? ' nueva' : ''}<input type="password" name="pin" placeholder="${editingUser ? 'Solo si queres cambiarla' : 'Minimo 6 caracteres'}" ${editingUser ? (canManageUsers ? '' : 'disabled') : (canManageUsers ? 'required' : 'disabled')} /></label>
            <label>Rol<select name="roleId" ${canManageUsers ? 'required' : 'disabled'}>${ui.snapshot.roles.map((role) => `<option value="${role.id}" ${editingUser?.roleId === role.id ? 'selected' : ''}>${role.name}</option>`).join('')}</select></label>
            <label class="field-check full-span"><input type="checkbox" name="isActive" ${editingUser ? (editingUser.isActive ? 'checked' : '') : 'checked'} ${canManageUsers ? '' : 'disabled'} /><span class="field-check-box" aria-hidden="true"></span><span>Cuenta habilitada</span></label>
            <button type="submit" ${canManageUsers ? '' : 'disabled'}>${editingUser ? 'Guardar permisos' : 'Selecciona una cuenta para editar'}</button>
            ${editingUser ? '<button type="button" class="danger-action" data-action="cancel-user-edit">Cancelar edicion</button>' : ''}
          </form>
          ${dataTable(['Usuario', 'Perfil', 'Estado', 'Acceso', 'Gestion'], ui.enrichedUsers.map((entry) => `<div class="data-row"><span>${entry.fullName}${entry.isOwner ? ' <small>Â· Propietario</small>' : ''}<br /><small>${entry.email || 'Sin email'}</small></span><span>${entry.roleName}</span><span>${entry.status === 'active' ? 'Activo' : entry.status === 'pending' ? 'Pendiente' : 'Deshabilitado'}</span><span>${entry.id === ui.user.id ? 'Sesion actual' : entry.isOwner ? 'Control total' : 'Limitado por rol'}</span><span>${userActionButtons(entry)}</span></div>`))}
        </article>
        <div class="compact-form-grid">
          <article class="panel"><div class="panel-head"><div><h3>Plan y modulos</h3><p>Activa solo lo que el cliente necesita</p></div></div>
            <form class="form-grid compact-form" data-form="module-preset">
              <label>Pack<select name="presetKey"><option value="basic" ${ui.snapshot.business.activePlan === 'basic' ? 'selected' : ''}>Gestion base</option><option value="retail" ${ui.snapshot.business.activePlan === 'retail' ? 'selected' : ''}>Mostrador</option><option value="full" ${ui.snapshot.business.activePlan === 'full' ? 'selected' : ''}>Operacion</option><option value="multi" ${ui.snapshot.business.activePlan === 'multi' ? 'selected' : ''}>Multi sucursal</option></select></label>
              <button type="submit">Aplicar preset</button>
            </form>
            <div class="timeline-list">
              ${Object.values(ui.moduleCatalog).map((module) => `
                <div class="timeline-item">
                  <strong>${module.name}</strong>
                  <p>${module.description}</p>
                  <span>${ui.snapshot.business.enabledModules.includes(module.key) ? 'Habilitado' : 'Oculto para este cliente'}</span>
                  <div class="settings-actions"><button type="button" class="inline-action" data-module-toggle="${module.key}" data-enabled="${ui.snapshot.business.enabledModules.includes(module.key) ? 'true' : 'false'}">${ui.snapshot.business.enabledModules.includes(module.key) ? 'Deshabilitar' : 'Habilitar'}</button></div>
                </div>
              `).join('')}
            </div>
          </article>
          <article class="panel"><div class="panel-head"><div><h3>Backup y auditoria</h3><p>Respaldo manual y eventos recientes</p></div></div>
            <div class="settings-actions"><button type="button" class="primary-action" data-action="export-data">Exportar JSON</button><label class="file-action">Importar JSON<input type="file" accept="application/json" data-action="import-data" /></label></div>
            <div class="timeline-list">${ui.enrichedAudit.map((log) => `<div class="timeline-item"><strong>${log.action}</strong><p>${log.actorName} - ${log.entityType}${log.entityId ? ` #${String(log.entityId).slice(0, 8)}` : ''}</p><span>${log.createdAt.slice(0, 16).replace('T', ' ')}</span></div>`).join('')}</div>
          </article>
        </div>
      </div>
    </section>
  </section>
`})()}
`

const basicSettingsView = (ui) => `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Ajustes</p><h2>Mi sesion</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="module-summary-grid">
      <article class="metric-card compact"><span>Sesion</span><strong>${ui.user.fullName}</strong><p>${ui.role.name}</p></article>
      <article class="metric-card compact"><span>Cloud</span><strong>${ui.snapshot.meta.syncStatus === 'online' ? 'Operativa' : (ui.snapshot.meta.syncStatus || 'offline')}</strong><p>Conexion protegida</p></article>
      <article class="metric-card compact"><span>Modulos</span><strong>${ui.snapshot.business.enabledModules.length}</strong><p>Disponibles en tu cuenta</p></article>
    </section>
    <section class="dashboard-grid reports-layout">
      <article class="panel"><div class="panel-head"><div><h3>Cuenta activa</h3><p>Informacion segura de tu sesion</p></div></div>
        <div class="priority-list">
          <div class="priority-item"><strong>Usuario</strong><p>${ui.user.fullName}<br /><small>${maskEmail(ui.user.email) || 'Sin email'}</small></p></div>
          <div class="priority-item"><strong>Perfil</strong><p>${ui.role.name}</p></div>
          <div class="priority-item"><strong>Comercio</strong><p>${ui.commerceContext?.commerce_name || 'Sin comercio activo'}</p></div>
          <div class="priority-item"><strong>Estado</strong><p>${ui.snapshot.meta.syncStatus === 'online' ? 'Cloud operativa' : (ui.snapshot.meta.syncStatus || 'offline')}</p></div>
        </div>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Seguridad</h3><p>Acceso simple y controlado para cada cuenta</p></div></div>
        <div class="timeline-list">
          <div class="timeline-item"><strong>Acceso seguro</strong><p>Cada usuario entra con su cuenta y ve solo lo necesario para trabajar.</p><span>La informacion del negocio queda ordenada y protegida.</span></div>
          <div class="timeline-item"><strong>Permisos por usuario</strong><p>El administrador decide que puede usar cada persona dentro del sistema.</p><span>Asi cada cuenta opera solo sobre sus tareas.</span></div>
          <div class="timeline-item"><strong>Soporte directo</strong><p>Si algo falla o necesitas ayuda, te llevamos al WhatsApp oficial.</p><span>Sin pasar por menus tecnicos.</span></div>
        </div>
        <div class="settings-actions"><button type="button" class="primary-action" data-action="open-support">Hablar con soporte</button><button type="button" class="danger-action" data-action="sign-out">Cerrar sesion</button></div>
      </article>
    </section>
  </section>
`

const renderCurrentView = (ui) => {
  switch (activeSection) {
    case 'clientes': return customersViewV2(ui)
    case 'ventas': return salesViewV2(ui)
    case 'caja': return cashViewV2(ui)
    case 'sucursales': return branchesViewV2(ui)
    case 'cajeros': return registersViewV2(ui)
    case 'productos': return productsView(ui)
    case 'compras': return purchasesViewV2(ui)
    case 'facturacion': return invoicesViewV2(ui)
    case 'tickets': return ticketsViewV2(ui)
    case 'reportes': return reportsView(ui)
    case 'mi-admin': return ui.user?.isOwner ? ownerAdminViewV2(ui) : settingsViewV2(ui)
    case 'ajustes': return ui.user?.isOwner ? settingsViewV2(ui) : basicSettingsView(ui)
    default: return dashboardView(ui)
  }
}

const renderApp = (ui) => {
  const allowedNav = getAllowedNav(ui)
  if (!allowedNav.some((item) => item.id === activeSection)) activeSection = allowedNav[0]?.id || 'dashboard'
  saveSection()
  const branchName = ui.currentBranch?.name || ui.snapshot.business.branch || 'Sucursal'
  const registerName = ui.currentRegister?.name || 'Sin caja asignada'
  const edition = String(ui.snapshot.meta?.edition || '').toLowerCase()
  const isLocalMode = edition.includes('local')
  const isDevEnvironment = ui.cloudConnection.environment === 'development'
  const environmentLabel = ui.cloudConnection.environmentLabel || 'Sandbox'
  const statusTitle = ui.openCashSession ? 'Caja abierta' : 'Caja cerrada'
  const statusHint = ui.branchRegisters.length > 1 ? registerName : ''
  const searchOptions = buildQuickSearchTargets(ui).slice(0, 40).map((item) => `<option value="${item.label}"></option>`).join('')
  const userName = ui.user?.fullName || 'Usuario'
  const userInitials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((chunk) => chunk[0]?.toUpperCase()).join('') || 'PC'
  const lowStockCount = ui.lowStock.length
  const pendingInvoiceCount = ui.enrichedInvoices.filter((invoice) => invoice.status !== 'Cobrada').length
  const notificationCount = lowStockCount + pendingInvoiceCount + (ui.openCashSession ? 0 : 1)

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <img class="brand-logo" src="/pclaf-logo.png" alt="PCLAF" />
        </div>
        <nav class="sidebar-nav">${allowedNav.map((item) => `<button class="nav-square ${activeSection === item.id ? 'is-active' : ''}" type="button" data-section="${item.id}" title="${item.label}" aria-label="${item.label}"><span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span></button>`).join('')}</nav>
        <div class="sidebar-support"><button class="nav-square support-square" type="button" data-action="open-support" title="Soporte" aria-label="Soporte"><span class="nav-icon">${icon('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8.5 9h7"/><path d="M8.5 13h4"/>')}</span><span class="nav-label">Soporte</span></button></div>
      </aside>
      <div class="workspace">
        <header class="topbar">
          <div class="topbar-left"><p class="kicker">Panel de control</p><h1>${ui.commerceContext?.commerce_name || productName}</h1><span>${branchName}</span></div>
          <div class="topbar-center">
            <form class="quick-search" data-form="topbar-jump">
              <span class="quick-search-icon" aria-hidden="true">${icon('<circle cx="11" cy="11" r="6"/><path d="m20 20-3.5-3.5"/>')}</span>
              <input type="search" name="query" value="${topbarSearch}" list="nav-search-options" placeholder="Buscar ventas, clientes, productos, stock, facturas o cajas" />
              <datalist id="nav-search-options">${searchOptions}</datalist>
            </form>
          </div>
          <div class="topbar-right">
            <button type="button" class="status-card status-chip ${ui.openCashSession ? 'is-open' : 'is-closed'}" data-section="caja" aria-label="${statusTitle}">
              <span class="status-led" aria-hidden="true"></span>
              <div class="status-copy"><strong>${statusTitle}</strong>${statusHint ? `<span>${statusHint}</span>` : ''}</div>
            </button>
            ${isDevEnvironment ? `<span class="topbar-runtime is-dev">${environmentLabel}</span>` : ''}
            <button class="account-card compact-meta" type="button" data-section="${ui.user?.isOwner ? 'mi-admin' : 'ajustes'}" aria-label="Abrir perfil">
              <span class="account-avatar">${userInitials}</span>
              <span class="account-copy"><strong>${userName}</strong><span>${ui.role?.name || 'Usuario'}${notificationCount ? ` · ${notificationCount} alertas` : ''}</span></span>
            </button>
            <button class="theme-switch ${theme === 'dark' ? 'is-dark' : 'is-light'}" type="button" data-action="toggle-theme" aria-label="Cambiar tema">
              <span class="theme-switch-track"><span class="theme-switch-thumb"></span></span>
              <span class="theme-switch-label">${theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
            </button>
            ${isLocalMode ? '<span class="topbar-runtime">Local</span>' : ''}
            <button class="inline-action danger topbar-logout" type="button" data-action="sign-out">Salir</button>
          </div>
        </header>
        <main class="page">${renderCurrentView(ui)}</main>
      </div>
    </div>
  `
}

const render = () => {
  const ui = getUiState()
  app.innerHTML = ui.cloudConnection.required && !ui.cloudConnection.enabled
    ? cloudActivationView(ui)
    : (ui.isAuthenticated ? renderApp(ui) : loginView(ui))
  markBootComplete()
  bindEvents()
}

const readSiteCloudConfig = async () => {
  try {
    const response = await fetch('/cloud-config.json', { cache: 'no-store' })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

const bootstrap = async () => {
  const initialCloudConfig = await readSiteCloudConfig()
  authInstanceKey = normalizeInstanceKey(
    safeStorage.getItem(instanceStorageKey, '')
    || initialCloudConfig?.instanceKey
    || 'pclaf-dev'
  )
  const storeOptions = {
    initialCloudConfig,
    requireCloud: !window.pclafDesktop,
  }
  store = createBrowserDataStore(storeOptions)
  authManager = initialCloudConfig?.url && initialCloudConfig?.anonKey
    ? createCloudAuthManager({ url: initialCloudConfig.url, anonKey: initialCloudConfig.anonKey, instanceKey: initialCloudConfig.instanceKey })
    : null
  try {
    if (authManager) {
      recoveryState = await authManager.consumeRecoverySession()
      if (recoveryState) {
        authViewMode = 'login'
        loginMessage = ''
        signupMessage = ''
      }
    }
    if (store.getCloudConnection().enabled && authManager) {
      setupStatus = await authManager.getSetupStatus({ instanceKey: authInstanceKey })
    }
    if (store.getCloudConnection().enabled && authManager && setupStatus?.initialized) {
      const restoredSession = await authManager.restoreSession()
      if (restoredSession?.sessionToken) {
        authInstanceKey = normalizeInstanceKey(restoredSession.commerceContext?.instance_key || authInstanceKey)
        safeStorage.setItem(instanceStorageKey, authInstanceKey)
        store.setCloudAccessToken(restoredSession.sessionToken)
      }
    }
    if (store.getCloudConnection().enabled && authManager?.getSession()?.sessionToken) {
      cloudSyncBusy = true
      await loadCloudAccess()
      if (!feedbackMessage) feedbackMessage = 'Sesion cloud restaurada correctamente.'
    }
  } catch (error) {
    loginMessage = error.message || 'No se pudo iniciar la sesion cloud.'
    feedbackMessage = ''
    commerceContext = null
    store.clearCloudAuthSession()
  } finally {
    cloudSyncBusy = false
    try {
      render()
    } catch (error) {
      resetBrokenBrowserState()
      store = createBrowserDataStore(storeOptions)
      authManager = initialCloudConfig?.url && initialCloudConfig?.anonKey
        ? createCloudAuthManager({ url: initialCloudConfig.url, anonKey: initialCloudConfig.anonKey, instanceKey: initialCloudConfig.instanceKey })
        : null
      loginMessage = 'La aplicacion se recupero y reinicio la sesion.'
      render()
    }
  }
}

const getReceiptDocument = (saleId) => {
  const ui = getUiState()
  const sale = ui.snapshot.sales.find((entry) => entry.id === saleId)
  if (!sale) return null
  const customer = ui.snapshot.customers.find((entry) => entry.id === sale.customerId)
  const branch = ui.snapshot.branches.find((entry) => entry.id === sale.branchId) || ui.currentBranch
  const register = ui.snapshot.registers.find((entry) => entry.id === sale.registerId)
  const lines = sale.items.map((item) => {
    const product = ui.snapshot.products.find((entry) => entry.id === item.productId)
    return `<tr><td>${product?.name || 'Articulo'}</td><td>${item.quantity}</td><td>${money(item.unitPrice)}</td><td>${money(item.lineTotal)}</td></tr>`
  }).join('')

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" /><title>Comprobante ${sale.id}</title><style>
  body{font-family:'Courier New',monospace;background:#fff;color:#111;margin:0;padding:0}
  .ticket{width:320px;margin:0 auto;padding:18px 18px 28px}
  .brand{text-align:center;border-bottom:1px dashed #333;padding-bottom:12px;margin-bottom:12px}
  .brand h1{font-size:24px;margin:0}
  .brand p,.meta,.footer{font-size:12px;line-height:1.45}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th,td{font-size:12px;padding:6px 0;text-align:left;border-bottom:1px dashed #bbb}
  .total{font-size:18px;font-weight:700;text-align:right;margin-top:14px}
  .meta strong{display:inline-block;width:72px}
  @media print { body{margin:0} .ticket{width:auto} }
  </style></head><body><div class="ticket"><div class="brand"><h1>PCLAF</h1><p>${branch?.name || 'Sucursal'}<br />${branch?.address || ''}</p></div><div class="meta"><div><strong>Cliente:</strong> ${customer?.fullName || 'Mostrador'}</div><div><strong>Fecha:</strong> ${sale.soldAt.slice(0, 16).replace('T', ' ')}</div><div><strong>Canal:</strong> ${sale.channel}</div><div><strong>Pago:</strong> ${sale.paymentMethod}</div><div><strong>Caja:</strong> ${register?.name || 'Sin caja'}</div><div><strong>Venta:</strong> ${sale.id.slice(0, 8)}</div></div><table><thead><tr><th>Item</th><th>Cant.</th><th>Total</th></tr></thead><tbody>${sale.items.map((item) => { const product = ui.snapshot.products.find((entry) => entry.id === item.productId); return `<tr><td>${product?.name || 'Articulo'}</td><td>${item.quantity}</td><td>${money(item.lineTotal)}</td></tr>` }).join('')}</tbody></table><p class="total">TOTAL ${money(sale.totalAmount)}</p><p class="footer">Comprobante interno generado por PCLAF Control.</p></div></body></html>`
  return { html, filename: `comprobante-${sale.id}.pdf`, fallbackFilename: `comprobante-${sale.id}.html` }
}

const printReceipt = (saleId) => {
  const doc = getReceiptDocument(saleId)
  if (!doc) return
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(doc.html)
  win.document.close()
  win.focus()
  win.print()
}

const exportReceipt = async (saleId) => {
  const doc = getReceiptDocument(saleId)
  if (!doc) return
  if (window.pclafDesktop?.exportPdf) {
    const result = await window.pclafDesktop.exportPdf({ html: doc.html, filename: doc.filename, pageSize: 'A4' })
    feedbackMessage = result.ok ? `PDF exportado en ${result.path}` : (result.message || 'No se pudo exportar el PDF.')
    render()
    return
  }
  const blob = new Blob([doc.html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = doc.fallbackFilename
  link.click()
  URL.revokeObjectURL(url)
}

const buildThermalReceiptDocument = (saleId, paperWidth = '80') => {
  const ui = getUiState()
  const sale = ui.snapshot.sales.find((entry) => entry.id === saleId)
  if (!sale) return null
  const customer = ui.snapshot.customers.find((entry) => entry.id === sale.customerId)
  const branch = ui.snapshot.branches.find((entry) => entry.id === sale.branchId) || ui.currentBranch
  const register = ui.snapshot.registers.find((entry) => entry.id === sale.registerId)
  const ticketWidth = paperWidth === '58' ? 220 : 300
  const pageSize = paperWidth === '58' ? '58mm' : '80mm'
  const lines = sale.items.map((item) => {
    const product = ui.snapshot.products.find((entry) => entry.id === item.productId)
    return `
      <tr>
        <td class="item-name">${escapeHtml(product?.name || 'Articulo')}</td>
        <td class="item-qty">${item.quantity}</td>
        <td class="item-unit">${money(item.unitPrice)}</td>
        <td class="item-total">${money(item.lineTotal)}</td>
      </tr>
    `
  }).join('')
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" /><title>Ticket ${sale.id}</title><style>
    *{box-sizing:border-box}
    body{font-family:'Courier New',monospace;background:#fff;color:#111;margin:0;padding:0}
    .ticket{width:${ticketWidth}px;margin:0 auto;padding:10px 12px 16px}
    .brand,.footer{text-align:center}
    .brand{border-bottom:1px dashed #222;padding-bottom:10px;margin-bottom:10px}
    .brand h1{font-size:20px;margin:0 0 4px}
    .brand p,.meta,.footer,.totals,.items th,.items td{font-size:11px;line-height:1.4}
    .meta-row{display:flex;justify-content:space-between;gap:12px;padding:2px 0}
    .items{width:100%;border-collapse:collapse;margin-top:10px}
    .items thead th{border-top:1px dashed #222;border-bottom:1px dashed #222;padding:5px 0;text-align:left}
    .items tbody td{padding:6px 0;border-bottom:1px dashed #d1d5db;vertical-align:top}
    .item-name{width:44%}
    .item-qty,.item-unit,.item-total{text-align:right;white-space:nowrap}
    .totals{margin-top:10px;border-top:1px dashed #222;padding-top:8px}
    .totals-row{display:flex;justify-content:space-between;gap:12px;padding:2px 0}
    .totals-row.grand{font-size:16px;font-weight:700;padding-top:6px}
    .footer{margin-top:10px;border-top:1px dashed #222;padding-top:8px}
    @page{size:${pageSize} auto;margin:4mm}
    @media print{body{margin:0}.ticket{width:auto;padding:0 0 8px}}
  </style></head><body><div class="ticket"><div class="brand"><h1>PCLAF Control</h1><p>${escapeHtml(branch?.name || 'Sucursal')}<br />${escapeHtml(branch?.address || '')}</p></div><div class="meta"><div class="meta-row"><span>Cliente</span><span>${escapeHtml(customer?.fullName || 'Mostrador')}</span></div><div class="meta-row"><span>Fecha</span><span>${escapeHtml(sale.soldAt.slice(0, 16).replace('T', ' '))}</span></div><div class="meta-row"><span>Canal</span><span>${escapeHtml(sale.channel)}</span></div><div class="meta-row"><span>Pago</span><span>${escapeHtml(sale.paymentMethod)}</span></div><div class="meta-row"><span>Caja</span><span>${escapeHtml(register?.name || 'Sin caja')}</span></div><div class="meta-row"><span>Operacion</span><span>${escapeHtml(sale.id.slice(0, 8).toUpperCase())}</span></div></div><table class="items"><thead><tr><th>Item</th><th>Cant</th><th>Unit</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table><div class="totals"><div class="totals-row"><span>Subtotal</span><span>${money(sale.subtotalAmount || sale.totalAmount)}</span></div>${sale.discountAmount ? `<div class="totals-row"><span>Descuento</span><span>- ${money(sale.discountAmount)}</span></div>` : ''}<div class="totals-row"><span>Cobrado</span><span>${money(sale.amountPaid || 0)}</span></div><div class="totals-row grand"><span>TOTAL</span><span>${money(sale.totalAmount)}</span></div></div><div class="footer"><p>Comprobante interno ${pageSize}<br />Generado por PCLAF Control</p></div></div></body></html>`
  return {
    html,
    filename: `ticket-${pageSize}-${sale.id}.pdf`,
    fallbackFilename: `ticket-${pageSize}-${sale.id}.html`,
    pageSize,
  }
}

const printThermalReceipt = (saleId, paperWidth = '80') => {
  const doc = buildThermalReceiptDocument(saleId, paperWidth)
  if (!doc) return
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(doc.html)
  win.document.close()
  win.focus()
  window.setTimeout(() => {
    win.print()
  }, 250)
}

const exportThermalReceipt = async (saleId, paperWidth = '80') => {
  const doc = buildThermalReceiptDocument(saleId, paperWidth)
  if (!doc) return
  if (window.pclafDesktop?.exportPdf) {
    const result = await window.pclafDesktop.exportPdf({ html: doc.html, filename: doc.filename, pageSize: 'A4' })
    feedbackMessage = result.ok ? `PDF exportado en ${result.path}` : (result.message || 'No se pudo exportar el PDF.')
    render()
    return
  }
  const blob = new Blob([doc.html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = doc.fallbackFilename
  link.click()
  URL.revokeObjectURL(url)
}

const exportData = () => {
  const blob = new Blob([JSON.stringify(store.exportData(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pclaf-control-backup-${today}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const exportReport = () => {
  const ui = getUiState()
  const rows = [
    ['Tipo', 'Fecha', 'Sucursal', 'Caja', 'Detalle', 'Importe'],
    ...ui.reportScopedSales.map((sale) => ['Venta', sale.soldAt.slice(0, 16).replace('T', ' '), sale.branchName, sale.registerName, sale.itemSummary, sale.totalAmount]),
    ...ui.reportScopedInvoices.map((invoice) => ['Factura', invoice.dueDate, invoice.branchName, '-', invoice.number, invoice.totalAmount]),
    ...ui.reportScopedCashMovements.map((movement) => ['Caja', String(movement.createdAt).slice(0, 16).replace('T', ' '), ui.currentBranch?.name || 'Sucursal', ui.enrichedRegisters.find((register) => register.id === movement.registerId)?.name || 'Caja', `${movement.kind}: ${movement.note}`, movement.signedAmount]),
  ]
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reporte-${(ui.currentBranch?.code || 'GEN').toLowerCase()}-${today}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const importData = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    store.importData(JSON.parse(await file.text()))
    render()
  } catch {
    alert('No se pudo importar el archivo.')
  } finally {
    event.target.value = ''
  }
}

const handleSubmit = async (event) => {
  event.preventDefault()
  const form = event.currentTarget
  const formData = new FormData(form)
  const kind = form.dataset.form

  if (kind === 'login') {
    loginMessage = ''
    signupMessage = ''
    feedbackMessage = ''
    try {
      const requestedInstanceKey = String(formData.get('instanceKey') || '').trim()
      const identifier = String(formData.get('identifier') || '').trim()
      const pin = String(formData.get('pin') || '')
      if (!authManager) throw new Error('La conexion cloud no esta lista.')
      const sessionPayload = await authManager.signIn({ instanceKey: requestedInstanceKey || null, identifier, pin })
      persistInstanceKey(sessionPayload?.commerceContext?.instance_key || requestedInstanceKey || authInstanceKey)
      setupStatus = await authManager.getSetupStatus({ instanceKey: authInstanceKey })
      await loadCloudAccess(sessionPayload)
      feedbackMessage = 'Sesion iniciada correctamente.'
    } catch (error) {
      loginMessage = mapPublicAuthError(error.message, 'login')
    }
    render()
    return
  }
  if (kind === 'password-recovery') {
    loginMessage = ''
    feedbackMessage = ''
    try {
      const password = String(formData.get('password') || '')
      const passwordConfirm = String(formData.get('passwordConfirm') || '')
      if (password !== passwordConfirm) throw new Error('password_confirmation_mismatch')
      if (!authManager) throw new Error('La conexion cloud no esta lista.')
      const result = await authManager.completeRecovery({ password })
      await authManager.clearRecoveryState()
      recoveryState = null
      authViewMode = 'login'
      feedbackMessage = result.message || 'Clave actualizada correctamente.'
      loginMessage = ''
    } catch (error) {
      loginMessage = mapPublicAuthError(error.message, 'login')
    }
    render()
    return
  }
  if (kind === 'instance-setup') {
    loginMessage = ''
    signupMessage = ''
    feedbackMessage = ''
    try {
      const commerceName = String(formData.get('commerceName') || '').trim()
      const ownerEmail = String(formData.get('ownerEmail') || '').trim()
      const instanceKey = persistInstanceKey(formData.get('instanceKey') || createCommerceKey(commerceName))
      const ownerLogin = String(formData.get('ownerLogin') || '').trim() || ownerEmail.split('@')[0] || 'admin'
      if (!authManager) throw new Error('La conexion cloud no esta lista.')
      const sessionPayload = await authManager.setupInstance({
        instanceKey,
        commerceName,
        ownerName: String(formData.get('ownerName') || '').trim(),
        ownerLogin,
        ownerEmail,
        ownerPin: String(formData.get('ownerPin') || ''),
        branchName: String(formData.get('branchName') || '').trim(),
        branchCode: String(formData.get('branchCode') || '').trim(),
        registerName: String(formData.get('registerName') || '').trim(),
        registerCode: String(formData.get('registerCode') || '').trim(),
      })
      setupStatus = await authManager.getSetupStatus({ instanceKey })
      await loadCloudAccess(sessionPayload)
      feedbackMessage = 'Cuenta creada y lista para operar.'
    } catch (error) {
      signupMessage = mapPublicAuthError(error.message, 'signup')
    }
    render()
    return
  }

  if (kind === 'customer') {
    const result = await store.createCustomer({ fullName: formData.get('fullName'), phone: formData.get('phone'), email: formData.get('email'), balance: formData.get('balance'), tag: formData.get('tag') })
    feedbackMessage = result.message || ''
    customerFormOpen = false
  }
  if (kind === 'branch') {
    const result = formData.get('branchId')
      ? await store.updateBranch(formData.get('branchId'), { name: formData.get('name'), code: formData.get('code'), address: formData.get('address') })
      : await store.createBranch({ name: formData.get('name'), code: formData.get('code'), address: formData.get('address') })
    feedbackMessage = result.message || ''
    branchEditingId = ''
  }
  if (kind === 'register') {
    const result = formData.get('registerId')
      ? await store.updateRegister(formData.get('registerId'), { branchId: formData.get('branchId'), name: formData.get('name'), code: formData.get('code'), cashierUserId: formData.get('cashierUserId') })
      : await store.createRegister({ branchId: formData.get('branchId'), name: formData.get('name'), code: formData.get('code'), cashierUserId: formData.get('cashierUserId') })
    feedbackMessage = result.message || ''
    registerEditingId = ''
  }
  if (kind === 'user') {
    const result = formData.get('userId')
      ? await store.updateUser(formData.get('userId'), {
        fullName: String(formData.get('fullName') || '').trim(),
        roleId: formData.get('roleId'),
        email: String(formData.get('email') || '').trim(),
        pin: String(formData.get('pin') || ''),
        isActive: formData.get('isActive') === 'on',
      })
      : await store.createUser({
        fullName: String(formData.get('fullName') || '').trim(),
        roleId: formData.get('roleId'),
        email: String(formData.get('email') || '').trim(),
        pin: String(formData.get('pin') || ''),
        isActive: formData.get('isActive') === 'on',
      })
    feedbackMessage = result.message || ''
    userEditingId = ''
  }
  if (kind === 'report-filter') {
    reportRegisterFilter = formData.get('registerFilter') || 'all'
    reportDateFrom = formData.get('dateFrom') || ''
    reportDateTo = formData.get('dateTo') || ''
    feedbackMessage = 'Filtro de reportes actualizado.'
  }
  if (kind === 'topbar-jump') {
    topbarSearch = String(formData.get('query') || '').trim()
    if (!topbarSearch) return
    const normalized = topbarSearch.toLowerCase()
    const ui = getUiState()
    const match = buildQuickSearchTargets(ui).find((item) => item.search.includes(normalized))
    if (match) {
      activeSection = match.section
      topbarSearch = ''
      saveSection()
      feedbackMessage = `Mostrando ${match.label}.`
      render()
      return
    }
    feedbackMessage = 'No encontre nada con ese termino en esta sesion.'
  }
  if (kind === 'module-preset') {
    const result = await store.applyModulePreset(formData.get('presetKey'))
    commerceContext = {
      ...(commerceContext || {}),
      active_plan: String(formData.get('presetKey') || '').trim() || commerceContext?.active_plan || 'custom',
    }
    feedbackMessage = result.message || ''
  }
  if (kind === 'commerce-profile') {
    const result = await store.updateBusinessProfile({
      name: String(formData.get('name') || '').trim(),
      ownerEmail: String(formData.get('ownerEmail') || '').trim().toLowerCase(),
      legalName: String(formData.get('legalName') || '').trim(),
    })
    commerceContext = {
      ...(commerceContext || {}),
      commerce_name: String(formData.get('name') || commerceContext?.commerce_name || '').trim(),
      owner_email: String(formData.get('ownerEmail') || commerceContext?.owner_email || '').trim().toLowerCase(),
    }
    feedbackMessage = result.message || ''
  }
  if (kind === 'cloud-connection') {
    cloudSyncBusy = true
    try {
      const result = await store.setCloudConnection({ url: formData.get('url'), anonKey: formData.get('anonKey'), instanceKey: formData.get('instanceKey') })
      authManager = createCloudAuthManager({ url: formData.get('url'), anonKey: formData.get('anonKey') })
      feedbackMessage = result.message || (result.ok ? 'Conexion cloud actualizada.' : '')
    } catch (error) {
      feedbackMessage = `No se pudo conectar con Supabase. ${error.message || ''}`.trim()
    } finally {
      cloudSyncBusy = false
    }
  }
  if (kind === 'product') {
    const result = await store.createProduct({ name: formData.get('name'), sku: formData.get('sku'), barcode: formData.get('barcode'), stock: formData.get('stock'), salePrice: formData.get('salePrice'), costPrice: formData.get('costPrice'), minStock: formData.get('minStock'), category: formData.get('category'), trackStock: formData.get('trackStock') === 'on' })
    feedbackMessage = result.message || ''
    productFormOpen = false
  }
  if (kind === 'stock-adjustment') {
    const result = store.createStockAdjustment({ productId: formData.get('productId'), quantity: formData.get('quantity'), note: formData.get('note') })
    feedbackMessage = result.message || ''
  }
  if (kind === 'stock-transfer') {
    const result = store.transferStock({ productId: formData.get('productId'), quantity: formData.get('quantity'), fromBranchId: formData.get('fromBranchId'), toBranchId: formData.get('toBranchId'), note: formData.get('note') })
    feedbackMessage = result.message || ''
  }
  if (kind === 'supplier') {
    const result = await store.createSupplier({ name: formData.get('name'), contact: formData.get('contact'), phone: formData.get('phone'), balance: formData.get('balance'), lastDelivery: formData.get('lastDelivery'), category: formData.get('category') })
    feedbackMessage = result.message || ''
    supplierFormOpen = false
  }
  if (kind === 'invoice') {
    const currentBranchId = getUiState().currentBranch?.id
    const result = formData.get('invoiceId')
      ? await store.updateInvoice(formData.get('invoiceId'), { number: formData.get('number'), customerId: formData.get('customerId'), totalAmount: formData.get('totalAmount'), kind: formData.get('kind'), type: formData.get('type'), dueDate: formData.get('dueDate'), status: formData.get('status'), fiscalStatus: formData.get('fiscalStatus'), branchId: currentBranchId })
      : await store.createInvoice({ number: formData.get('number'), customerId: formData.get('customerId'), totalAmount: formData.get('totalAmount'), kind: formData.get('kind'), type: formData.get('type'), dueDate: formData.get('dueDate'), status: formData.get('status'), fiscalStatus: formData.get('fiscalStatus'), branchId: currentBranchId })
    feedbackMessage = result.message || ''
    invoiceEditingId = ''
  }
  if (kind === 'ticket') {
    const currentBranchId = getUiState().currentBranch?.id
    const result = formData.get('ticketId')
      ? await store.updateTicket(formData.get('ticketId'), { number: formData.get('number'), customerId: formData.get('customerId'), device: formData.get('device'), issue: formData.get('issue'), status: formData.get('status'), branchId: currentBranchId })
      : await store.createTicket({ number: formData.get('number'), customerId: formData.get('customerId'), device: formData.get('device'), issue: formData.get('issue'), status: formData.get('status'), branchId: currentBranchId })
    feedbackMessage = result.message || ''
    ticketEditingId = ''
  }
  if (kind === 'open-cash') {
    const result = await store.openCashSession({ registerId: formData.get('registerId'), openingAmount: formData.get('openingAmount') })
    feedbackMessage = result.message || ''
  }
  if (kind === 'close-cash') {
    const result = await store.closeCashSession({ cashSessionId: getUiState().openCashSession?.id || null, countedAmount: formData.get('countedAmount') })
    feedbackMessage = result.message || ''
  }
  if (kind === 'cash-movement') {
    const result = await store.createCashMovement({ cashSessionId: getUiState().openCashSession?.id || null, kind: formData.get('kind'), amount: formData.get('amount'), note: formData.get('note') })
    feedbackMessage = result.message || ''
  }
  if (kind === 'purchase-receipt') {
    const result = formData.get('receiptId')
      ? await store.updatePurchaseReceipt(formData.get('receiptId'), { supplierId: formData.get('supplierId'), productId: formData.get('productId'), documentNumber: formData.get('documentNumber'), quantity: formData.get('quantity'), unitCost: formData.get('unitCost'), note: formData.get('note') })
      : await store.createPurchaseReceipt({ supplierId: formData.get('supplierId'), productId: formData.get('productId'), documentNumber: formData.get('documentNumber'), quantity: formData.get('quantity'), unitCost: formData.get('unitCost'), note: formData.get('note') })
    feedbackMessage = result.message || (result.ok ? 'Recepcion registrada y stock actualizado.' : '')
    purchaseEditingId = ''
  }
  if (kind === 'sale') {
    const items = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('qty_') && Number(value) > 0) items.push({ productId: key.replace('qty_', ''), quantity: Number(value) })
    }
    const payload = { customerId: formData.get('customerId'), channel: formData.get('channel'), paymentMethod: formData.get('paymentMethod'), isPaid: formData.get('isPaid') === 'on', autoInvoice: formData.get('autoInvoice') === 'on', discountAmount: formData.get('discountAmount'), amountPaid: formData.get('amountPaid'), cashAmount: formData.get('cashAmount'), transferAmount: formData.get('transferAmount'), mercadoPagoAmount: formData.get('mercadoPagoAmount'), accountAmount: formData.get('accountAmount'), note: formData.get('note'), items }
    const result = formData.get('saleId')
      ? await store.updateSale(formData.get('saleId'), payload)
      : await store.createSale(payload)
    feedbackMessage = result.message || ''
    saleEditingId = ''
    saleDraftQuantities = {}
    saleQuickAddCode = ''
  }

  form.reset()
  render()
}

const bindEvents = () => {
  const scrollToAuthBlock = (selector) => {
    const element = document.querySelector(selector)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  bindHardwareScanner()
  for (const form of document.querySelectorAll('form[data-form]')) form.addEventListener('submit', handleSubmit)
  for (const input of document.querySelectorAll('input[name^="qty_"]')) {
    input.addEventListener('input', () => {
      const productId = input.name.replace('qty_', '')
      const quantity = Number(input.value || 0)
      if (quantity > 0) saleDraftQuantities[productId] = quantity
      else delete saleDraftQuantities[productId]
    })
  }
  const quickAddInput = document.querySelector('input[name="quickAddCode"]')
  const runQuickAdd = () => {
    const currentCode = String(quickAddInput?.value || '').trim()
    const product = store.findProductByCode(currentCode)
    if (!product) {
      feedbackMessage = 'No encontre un producto con ese codigo.'
      render()
      return
    }
    saleDraftQuantities = { ...readCurrentSaleQuantities(), [product.id]: Number(readCurrentSaleQuantities()[product.id] || 0) + 1 }
    saleQuickAddCode = ''
    feedbackMessage = `${product.name} agregado a la venta.`
    render()
  }
  if (quickAddInput) {
    quickAddInput.addEventListener('input', () => { saleQuickAddCode = quickAddInput.value })
    quickAddInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        runQuickAdd()
      }
    })
  }
  for (const button of document.querySelectorAll('[data-section]')) button.addEventListener('click', () => { activeSection = button.dataset.section; saveSection(); render() })
  for (const button of document.querySelectorAll('[data-action="show-login"]')) button.addEventListener('click', () => {
    authViewMode = 'login'
    loginMessage = ''
    signupMessage = ''
    render()
    scrollToAuthBlock('#acceso-login')
  })
  for (const button of document.querySelectorAll('[data-action="show-signup"]')) button.addEventListener('click', () => {
    authViewMode = 'signup'
    loginMessage = ''
    signupMessage = ''
    render()
    scrollToAuthBlock('#acceso-signup')
  })
  for (const button of document.querySelectorAll('[data-action="back-landing"]')) button.addEventListener('click', () => {
    authViewMode = 'landing'
    loginMessage = ''
    signupMessage = ''
    render()
  })
  for (const button of document.querySelectorAll('[data-action="open-customer-form"]')) button.addEventListener('click', () => {
    customerFormOpen = true
    render()
  })
  for (const button of document.querySelectorAll('[data-action="close-customer-form"]')) button.addEventListener('click', () => {
    customerFormOpen = false
    render()
  })
  for (const button of document.querySelectorAll('[data-action="open-product-form"]')) button.addEventListener('click', () => {
    productFormOpen = true
    render()
  })
  for (const button of document.querySelectorAll('[data-action="close-product-form"]')) button.addEventListener('click', () => {
    productFormOpen = false
    render()
  })
  for (const button of document.querySelectorAll('[data-action="open-supplier-form"]')) button.addEventListener('click', () => {
    supplierFormOpen = true
    render()
  })
  for (const button of document.querySelectorAll('[data-action="close-supplier-form"]')) button.addEventListener('click', () => {
    supplierFormOpen = false
    render()
  })
  for (const button of document.querySelectorAll('[data-delete]')) button.addEventListener('click', () => { store.removeEntity(button.dataset.delete, button.dataset.id); feedbackMessage = 'Registro eliminado y movimientos revertidos cuando correspondia.'; render() })
  const quickAddButton = document.querySelector('[data-action="quick-add-sale"]')
  if (quickAddButton) quickAddButton.addEventListener('click', runQuickAdd)
  const focusSaleScannerButton = document.querySelector('[data-action="focus-sale-scanner"]')
  if (focusSaleScannerButton) focusSaleScannerButton.addEventListener('click', () => {
    focusScannerInput('sales')
  })
  const focusProductBarcodeButton = document.querySelector('[data-action="focus-product-barcode"]')
  if (focusProductBarcodeButton) focusProductBarcodeButton.addEventListener('click', () => {
    focusScannerInput('products')
  })
  for (const button of document.querySelectorAll('[data-module-toggle]')) {
    button.addEventListener('click', async () => {
      const result = await store.setModuleEnabled(button.dataset.moduleToggle, button.dataset.enabled !== 'true')
      feedbackMessage = result.message || ''
      render()
    })
  }
  for (const button of document.querySelectorAll('[data-plan-apply]')) {
    button.addEventListener('click', async () => {
      const result = await store.applyModulePreset(button.dataset.planApply)
      commerceContext = {
        ...(commerceContext || {}),
        active_plan: String(button.dataset.planApply || '').trim() || commerceContext?.active_plan || 'custom',
      }
      feedbackMessage = result.message || ''
      render()
    })
  }
  const syncCloudButton = document.querySelector('[data-action="sync-cloud"]')
  if (syncCloudButton) {
    syncCloudButton.addEventListener('click', async () => {
      cloudSyncBusy = true
      render()
      try {
        const result = await store.syncToCloud()
        feedbackMessage = result.message || ''
      } catch (error) {
        feedbackMessage = `No se pudo sincronizar. ${error.message || ''}`.trim()
      } finally {
        cloudSyncBusy = false
        render()
      }
    })
  }
  const importCoreButton = document.querySelector('[data-action="import-core"]')
  if (importCoreButton) {
    importCoreButton.addEventListener('click', () => {
      feedbackMessage = 'La app ya esta operando sobre tablas core de Supabase.'
      render()
    })
  }
  const disconnectCloudButton = document.querySelector('[data-action="disconnect-cloud"]')
  if (disconnectCloudButton) {
    disconnectCloudButton.addEventListener('click', async () => {
      if (authManager) await authManager.signOut()
      const result = await store.clearCloudConnection()
      feedbackMessage = result.message || ''
      render()
    })
  }
  for (const button of document.querySelectorAll('[data-sale-action]')) {
    button.addEventListener('click', async () => {
      if (button.dataset.saleAction === 'edit') {
        saleEditingId = button.dataset.id
        const sale = store.getSnapshot().sales.find((entry) => entry.id === button.dataset.id)
        saleDraftQuantities = Object.fromEntries((sale?.items || []).map((item) => [item.productId, item.quantity]))
        saleQuickAddCode = ''
        feedbackMessage = 'Venta cargada para edicion.'
        render()
        return
      }
      if (button.dataset.saleAction === 'receipt') {
        printReceipt(button.dataset.id)
        feedbackMessage = 'Comprobante listo para imprimir.'
        render()
        return
      }
      if (button.dataset.saleAction === 'receipt-80') {
        printThermalReceipt(button.dataset.id, '80')
        feedbackMessage = 'Ticket 80 mm listo para imprimir.'
        render()
        return
      }
      if (button.dataset.saleAction === 'receipt-58') {
        printThermalReceipt(button.dataset.id, '58')
        feedbackMessage = 'Ticket 58 mm listo para imprimir.'
        render()
        return
      }
      if (button.dataset.saleAction === 'export') {
        exportThermalReceipt(button.dataset.id, '80')
        return
      }
      const result = button.dataset.saleAction === 'invoice'
        ? await store.createInvoiceFromSale(button.dataset.id)
        : button.dataset.saleAction === 'ticket'
          ? await store.createTicketFromSale(button.dataset.id)
          : button.dataset.saleAction === 'cancel'
            ? store.cancelSale(button.dataset.id)
            : store.createReturnFromSale(button.dataset.id)
      feedbackMessage = result.message || ''
      render()
    })
  }
  for (const button of document.querySelectorAll('[data-purchase-action]')) {
    button.addEventListener('click', () => {
      if (button.dataset.purchaseAction === 'edit') {
        purchaseEditingId = button.dataset.id
        feedbackMessage = 'Recepcion cargada para edicion.'
        render()
      }
    })
  }
  for (const button of document.querySelectorAll('[data-invoice-action]')) {
    button.addEventListener('click', () => {
      if (button.dataset.invoiceAction === 'edit') {
        invoiceEditingId = button.dataset.id
        feedbackMessage = 'Factura cargada para edicion.'
        render()
      }
    })
  }
  for (const button of document.querySelectorAll('[data-ticket-action]')) {
    button.addEventListener('click', () => {
      if (button.dataset.ticketAction === 'edit') {
        ticketEditingId = button.dataset.id
        feedbackMessage = 'Ticket cargado para edicion.'
        render()
      }
    })
  }
  for (const button of document.querySelectorAll('[data-branch-action]')) {
    button.addEventListener('click', () => {
      if (button.dataset.branchAction === 'edit') {
        branchEditingId = button.dataset.id
        feedbackMessage = 'Sucursal cargada para edicion.'
        render()
        return
      }
      const result = store.selectBranch(button.dataset.id)
      feedbackMessage = result.ok ? 'Sucursal actual cambiada.' : (result.message || '')
      render()
    })
  }
  for (const button of document.querySelectorAll('[data-register-action]')) {
    button.addEventListener('click', () => {
      if (button.dataset.registerAction === 'select') {
        const result = store.selectRegister(button.dataset.id)
        feedbackMessage = result.message || ''
        render()
        return
      }
      if (button.dataset.registerAction === 'edit') {
        registerEditingId = button.dataset.id
        feedbackMessage = 'Caja cargada para edicion.'
        render()
      }
    })
  }
  for (const button of document.querySelectorAll('[data-user-action]')) {
    button.addEventListener('click', async () => {
      if (button.dataset.userAction === 'edit') {
        userEditingId = button.dataset.id
        feedbackMessage = 'Usuario cargado para edicion.'
        render()
        return
      }
      const nextActive = button.dataset.active !== 'true'
      const result = await store.toggleUserActive(button.dataset.id, nextActive)
      feedbackMessage = result.message || ''
      render()
    })
  }

  const themeToggle = document.querySelector('[data-action="toggle-theme"]')
  if (themeToggle) themeToggle.addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; safeStorage.setItem(themeStorageKey, theme); applyTheme(); render() })
  const exportButton = document.querySelector('[data-action="export-data"]')
  if (exportButton) exportButton.addEventListener('click', exportData)
  const exportReportButton = document.querySelector('[data-action="export-report"]')
  if (exportReportButton) exportReportButton.addEventListener('click', exportReport)
  const importInput = document.querySelector('[data-action="import-data"]')
  if (importInput) importInput.addEventListener('change', importData)
  const resetButton = document.querySelector('[data-action="reset-data"]')
  if (resetButton) resetButton.addEventListener('click', () => { store.resetData(); feedbackMessage = 'Demo restaurada.'; render() })
  const signOutButton = document.querySelector('[data-action="sign-out"]')
  if (signOutButton) signOutButton.addEventListener('click', async () => {
    if (authManager) await authManager.signOut()
    store.signOut()
    store.clearCloudAuthSession()
    commerceContext = null
    authViewMode = 'landing'
    loginMessage = ''
    signupMessage = ''
    feedbackMessage = ''
    render()
  })
  for (const recoveryButton of document.querySelectorAll('[data-action="recover-password"]')) {
    recoveryButton.addEventListener('click', async () => {
      const loginForm = document.querySelector('form[data-form="login"]')
      const emailInput = loginForm?.querySelector('input[name="identifier"]')
      const email = String(emailInput?.value || '').trim().toLowerCase()
      if (!email) {
        loginMessage = 'Escribe tu correo y luego toca "Recuperar clave".'
        render()
        return
      }
      try {
        if (!authManager) throw new Error('La conexion cloud no esta lista.')
        const result = await authManager.sendRecoveryMagicLink({
          email,
          redirectTo: `${getPublicAppBaseUrl()}${window.location.pathname}?auth_action=recover`,
        })
        loginMessage = result?.message || 'Te enviamos un enlace para recuperar el acceso.'
      } catch (error) {
        loginMessage = mapPublicAuthError(error.message, 'login')
      }
      render()
    })
  }
  for (const cancelRecoveryButton of document.querySelectorAll('[data-action="cancel-recovery"]')) {
    cancelRecoveryButton.addEventListener('click', async () => {
      recoveryState = null
      loginMessage = ''
      if (authManager) await authManager.clearRecoveryState()
      render()
    })
  }
  for (const supportButton of document.querySelectorAll('[data-action="open-support"]')) {
    supportButton.addEventListener('click', () => {
      window.open(supportUrl, '_blank', 'noopener,noreferrer')
    })
  }
  const cancelSaleEdit = document.querySelector('[data-action="cancel-sale-edit"]')
  if (cancelSaleEdit) cancelSaleEdit.addEventListener('click', () => { saleEditingId = ''; saleDraftQuantities = {}; saleQuickAddCode = ''; feedbackMessage = 'Edicion de venta cancelada.'; render() })
  const cancelPurchaseEdit = document.querySelector('[data-action="cancel-purchase-edit"]')
  if (cancelPurchaseEdit) cancelPurchaseEdit.addEventListener('click', () => { purchaseEditingId = ''; feedbackMessage = 'Edicion de compra cancelada.'; render() })
  const cancelInvoiceEdit = document.querySelector('[data-action="cancel-invoice-edit"]')
  if (cancelInvoiceEdit) cancelInvoiceEdit.addEventListener('click', () => { invoiceEditingId = ''; feedbackMessage = 'Edicion de factura cancelada.'; render() })
  const cancelTicketEdit = document.querySelector('[data-action="cancel-ticket-edit"]')
  if (cancelTicketEdit) cancelTicketEdit.addEventListener('click', () => { ticketEditingId = ''; feedbackMessage = 'Edicion de ticket cancelada.'; render() })
  const cancelBranchEdit = document.querySelector('[data-action="cancel-branch-edit"]')
  if (cancelBranchEdit) cancelBranchEdit.addEventListener('click', () => { branchEditingId = ''; feedbackMessage = 'Edicion de sucursal cancelada.'; render() })
  const cancelRegisterEdit = document.querySelector('[data-action="cancel-register-edit"]')
  if (cancelRegisterEdit) cancelRegisterEdit.addEventListener('click', () => { registerEditingId = ''; feedbackMessage = 'Edicion de caja cancelada.'; render() })
  const cancelUserEdit = document.querySelector('[data-action="cancel-user-edit"]')
  if (cancelUserEdit) cancelUserEdit.addEventListener('click', () => { userEditingId = ''; feedbackMessage = 'Edicion de usuario cancelada.'; render() })
}

applyTheme()
bootstrap()


