const dataStorageKey = 'pclaf-control-data'

const makeId = () => crypto.randomUUID()
const todayIso = () => new Date().toISOString()
const todayDate = () => todayIso().slice(0, 10)
const clone = (value) => structuredClone(value)

const permissionCatalog = {
  dashboard: 'dashboard:view',
  customers: 'customers:view',
  sales: 'sales:view',
  cash: 'cash:view',
  branches: 'branches:view',
  registers: 'registers:view',
  products: 'products:view',
  purchases: 'purchases:view',
  invoices: 'invoices:view',
  tickets: 'tickets:view',
  reports: 'reports:view',
  settings: 'settings:view',
}

const moduleCatalog = {
  dashboard: { key: 'dashboard', name: 'Inicio', description: 'Resumen operativo principal' },
  customers: { key: 'customers', name: 'Clientes', description: 'Base de clientes y cuentas corrientes' },
  sales: { key: 'sales', name: 'Ventas', description: 'Ventas y cobros comerciales' },
  cash: { key: 'cash', name: 'Caja', description: 'Apertura, cierre y arqueo' },
  branches: { key: 'branches', name: 'Sucursales', description: 'Locales y numeracion' },
  registers: { key: 'registers', name: 'Cajas', description: 'Puestos de cobro y cajeros' },
  products: { key: 'products', name: 'Productos', description: 'Catalogo y stock' },
  purchases: { key: 'purchases', name: 'Compras', description: 'Proveedores y reposicion' },
  invoices: { key: 'invoices', name: 'Facturacion', description: 'Comprobantes y numeracion' },
  tickets: { key: 'tickets', name: 'Tickets', description: 'Seguimiento postventa o tecnico' },
  reports: { key: 'reports', name: 'Reportes', description: 'Reportes y exportes' },
  settings: { key: 'settings', name: 'Ajustes', description: 'Configuracion del sistema' },
}

const modulePresets = {
  basic: ['dashboard', 'customers', 'sales', 'cash', 'products', 'reports', 'settings'],
  retail: ['dashboard', 'customers', 'sales', 'cash', 'branches', 'registers', 'products', 'purchases', 'invoices', 'reports', 'settings'],
  full: Object.keys(moduleCatalog),
}

const roles = [
  { id: makeId(), key: 'admin', name: 'Administrador', permissions: Object.values(permissionCatalog) },
  {
    id: makeId(),
    key: 'cashier',
    name: 'Caja',
    permissions: [
      permissionCatalog.dashboard,
      permissionCatalog.customers,
      permissionCatalog.sales,
      permissionCatalog.cash,
      permissionCatalog.invoices,
      permissionCatalog.reports,
    ],
  },
  {
    id: makeId(),
    key: 'warehouse',
    name: 'Deposito',
    permissions: [
      permissionCatalog.dashboard,
      permissionCatalog.products,
      permissionCatalog.purchases,
      permissionCatalog.tickets,
      permissionCatalog.reports,
    ],
  },
]

const roleIds = Object.fromEntries(roles.map((role) => [role.key, role.id]))

const seedData = {
  meta: {
    schemaVersion: 3,
    edition: 'local-demo',
    adapter: 'browser-localstorage',
  },
  business: {
    name: 'Panel comercial',
    organization: 'PCLAF',
    currentBranchId: '',
    currentRegisterId: '',
    enabledModules: modulePresets.full,
    activePlan: 'full',
    documentCounters: {
      invoiceB: 184,
      ticket: 1002,
    },
  },
  branches: [
    { id: makeId(), name: 'Floresta', code: 'FLO', address: 'Campana 51, CABA', isActive: true },
    { id: makeId(), name: 'Caballito', code: 'CAB', address: 'Sucursal demo', isActive: true },
  ],
  registers: [],
  roles,
  users: [
    { id: makeId(), fullName: 'Pablo Laf', roleId: roleIds.admin, email: 'admin@pclaf.local', pin: '1234', isActive: true },
    { id: makeId(), fullName: 'Mica Caja', roleId: roleIds.cashier, email: 'caja@pclaf.local', pin: '1111', isActive: true },
    { id: makeId(), fullName: 'Leo Deposito', roleId: roleIds.warehouse, email: 'deposito@pclaf.local', pin: '2222', isActive: true },
  ],
  session: {
    userId: '',
    authenticated: false,
  },
  customers: [
    { id: makeId(), fullName: 'Juan Lopez', phone: '11 4012 2231', email: 'juan@mail.com', balance: 47000, tag: 'Frecuente' },
    { id: makeId(), fullName: 'Empresa Delta', phone: '11 5555 3300', email: 'compras@delta.com', balance: 128000, tag: 'Cuenta corriente' },
    { id: makeId(), fullName: 'Marina Diaz', phone: '11 4120 8899', email: 'marina@mail.com', balance: 0, tag: 'Mostrador' },
  ],
  products: [
    { id: makeId(), name: 'SSD Kingston 480GB', sku: 'SSD-480', barcode: '7790010010011', stock: 12, salePrice: 64000, costPrice: 47000, minStock: 4, category: 'Hardware', trackStock: true },
    { id: makeId(), name: 'Pasta termica MX-4', sku: 'PT-MX4', barcode: '7790010010012', stock: 18, salePrice: 12500, costPrice: 7800, minStock: 6, category: 'Insumos', trackStock: true },
    { id: makeId(), name: 'Fuente 500W generica', sku: 'FU-500', barcode: '7790010010013', stock: 3, salePrice: 47000, costPrice: 32100, minStock: 5, category: 'Hardware', trackStock: true },
    { id: makeId(), name: 'Limpieza completa notebook', sku: 'SERV-LIM', barcode: '7790010010014', stock: 99, salePrice: 38000, costPrice: 0, minStock: 0, category: 'Servicio', trackStock: false },
  ],
  suppliers: [
    { id: makeId(), name: 'Mayorista Microglobal', contact: 'Daniel Perez', phone: '11 5011 4010', balance: 218000, lastDelivery: '2026-07-10', category: 'Hardware' },
    { id: makeId(), name: 'Tecnoinsumos BA', contact: 'Marina Lopez', phone: '11 4321 9988', balance: 46000, lastDelivery: '2026-07-11', category: 'Insumos' },
  ],
  cashSessions: [],
  purchaseReceipts: [],
  sales: [],
  invoices: [],
  tickets: [],
  cashMovements: [],
  stockMovements: [],
  auditLogs: [],
}

seedData.business.currentBranchId = seedData.branches[0].id
seedData.registers = [
  { id: makeId(), branchId: seedData.branches[0].id, name: 'Caja 1', code: 'CAJA-01', cashierUserId: seedData.users[1].id, isActive: true },
  { id: makeId(), branchId: seedData.branches[0].id, name: 'Caja 2', code: 'CAJA-02', cashierUserId: seedData.users[0].id, isActive: true },
]
seedData.business.currentRegisterId = seedData.registers[0].id

const pushAudit = (state, actorUserId, entityType, entityId, action, afterData, beforeData = null) => {
  state.auditLogs.unshift({
    id: makeId(),
    actorUserId,
    entityType,
    entityId,
    action,
    beforeData,
    afterData,
    createdAt: todayIso(),
  })
}

const currentUserFromState = (state) => state.users.find((user) => user.id === state.session.userId) || state.users[0]
const getCustomer = (state, customerId) => state.customers.find((customer) => customer.id === customerId)
const getProduct = (state, productId) => state.products.find((product) => product.id === productId)
const findProductByCode = (state, code) => {
  const normalized = String(code || '').trim().toLowerCase()
  if (!normalized) return null
  return state.products.find((product) => (
    String(product.barcode || '').trim().toLowerCase() === normalized
    || String(product.sku || '').trim().toLowerCase() === normalized
    || String(product.name || '').trim().toLowerCase() === normalized
  )) || null
}
const getOpenCashSession = (state) => state.cashSessions.find((session) => session.status === 'open') || null
const getInvoiceBySaleId = (state, saleId) => state.invoices.find((invoice) => invoice.saleId === saleId) || null
const getBranch = (state, branchId) => state.branches.find((branch) => branch.id === branchId)
const getRegister = (state, registerId) => state.registers.find((register) => register.id === registerId)
const getCurrentBranch = (state) => getBranch(state, state.business.currentBranchId) || state.branches[0]
const getCurrentRegister = (state) => {
  const register = getRegister(state, state.business.currentRegisterId)
  if (register?.branchId === getCurrentBranch(state)?.id) return register
  return state.registers.find((entry) => entry.branchId === getCurrentBranch(state)?.id) || null
}
const isModuleEnabled = (state, moduleKey) => {
  const enabled = Array.isArray(state.business.enabledModules) ? state.business.enabledModules : modulePresets.full
  return enabled.includes(moduleKey)
}
const nextNumber = (state, key) => {
  state.business.documentCounters[key] = Number(state.business.documentCounters[key] || 0) + 1
  return state.business.documentCounters[key]
}
const generateInvoiceNumber = (state, type = 'B', branchId = state.business.currentBranchId) => {
  const branch = getBranch(state, branchId) || getCurrentBranch(state)
  const seq = nextNumber(state, `invoice${type}`)
  return `${type}-${branch?.code || 'GEN'}-0001-${String(seq).padStart(6, '0')}`
}
const generateTicketNumber = (state, prefix = 'POST', branchId = state.business.currentBranchId) => {
  const branch = getBranch(state, branchId) || getCurrentBranch(state)
  const seq = nextNumber(state, 'ticket')
  return `${prefix}-${branch?.code || 'GEN'}-${String(seq).padStart(6, '0')}`
}
const getScopedRegister = (state, registerId, branchId) => {
  const register = getRegister(state, registerId)
  if (register?.branchId === branchId) return register
  return state.registers.find((entry) => entry.branchId === branchId) || null
}
const getCashMovementDelta = (state, sessionId) => state.cashMovements
  .filter((movement) => movement.cashSessionId === sessionId)
  .reduce((sum, movement) => sum + Number(movement.signedAmount || 0), 0)
const getSaleBalanceDue = (sale) => Math.max(0, Number(sale.totalAmount || 0) - Number(sale.amountPaid || 0))
const getSaleStatus = (totalAmount, amountPaid) => {
  const total = Number(totalAmount || 0)
  const paid = Number(amountPaid || 0)
  if (paid <= 0) return 'pending'
  if (paid >= total) return 'completed'
  return 'partial'
}

const buildSaleItem = (productId, quantity, state, unitPriceOverride) => {
  const product = getProduct(state, productId)
  if (!product) return null
  const qty = Number(quantity)
  if (!qty) return null
  const unitPrice = Number(unitPriceOverride ?? product.salePrice)
  return {
    id: makeId(),
    productId: product.id,
    quantity: qty,
    unitPrice,
    lineTotal: qty * unitPrice,
  }
}

const ensureSaleStock = (state, items, ignoreSaleId = null) => {
  const available = new Map(state.products.map((product) => [product.id, Number(product.stock || 0)]))

  if (ignoreSaleId) {
    const previousSale = state.sales.find((sale) => sale.id === ignoreSaleId)
    for (const item of previousSale?.items || []) {
      const product = getProduct(state, item.productId)
      if (product?.trackStock) available.set(item.productId, (available.get(item.productId) || 0) + Number(item.quantity || 0))
    }
  }

  for (const item of items) {
    const product = getProduct(state, item.productId)
    if (!product?.trackStock) continue
    const current = available.get(item.productId) || 0
    if (current < Number(item.quantity || 0)) {
      return { ok: false, message: `Stock insuficiente para ${product.name}. Disponible: ${current}.` }
    }
    available.set(item.productId, current - Number(item.quantity || 0))
  }

  return { ok: true }
}

const applySaleEffects = (state, sale) => {
  for (const item of sale.items || []) {
    const product = getProduct(state, item.productId)
    if (product?.trackStock) {
      product.stock = Math.max(0, Number(product.stock || 0) - Number(item.quantity || 0))
      state.stockMovements.unshift({
        id: makeId(),
        productId: item.productId,
        type: 'sale',
        quantity: Number(item.quantity || 0) * -1,
        referenceId: sale.id,
        notes: `Venta ${sale.channel}`,
        createdAt: sale.soldAt,
        createdBy: sale.sellerUserId,
        branchId: sale.branchId || null,
        registerId: sale.registerId || null,
      })
    }
  }

  if (sale.customerId) {
    const customer = getCustomer(state, sale.customerId)
    if (customer) customer.balance += getSaleBalanceDue(sale)
  }
}

const revertSaleEffects = (state, sale) => {
  for (const item of sale.items || []) {
    const product = getProduct(state, item.productId)
    if (product?.trackStock) product.stock += Number(item.quantity || 0)
  }

  if (sale.customerId) {
    const customer = getCustomer(state, sale.customerId)
    if (customer) customer.balance = Math.max(0, Number(customer.balance || 0) - getSaleBalanceDue(sale))
  }

  state.stockMovements = state.stockMovements.filter((movement) => movement.referenceId !== sale.id)
}

const applyPurchaseEffects = (state, receipt) => {
  const product = getProduct(state, receipt.productId)
  const supplier = state.suppliers.find((entry) => entry.id === receipt.supplierId)
  if (product) {
    product.stock += Number(receipt.quantity || 0)
    product.costPrice = Number(receipt.unitCost || 0)
  }
  if (supplier) {
    supplier.balance += Number(receipt.totalCost || 0)
    supplier.lastDelivery = todayDate()
  }
  state.stockMovements.unshift({
    id: makeId(),
    productId: receipt.productId,
    type: 'purchase',
    quantity: Number(receipt.quantity || 0),
    referenceId: receipt.id,
    notes: `Recepcion de compra de ${supplier?.name || 'Proveedor'}`,
    createdAt: receipt.receivedAt,
    createdBy: receipt.receivedBy,
    branchId: receipt.branchId || null,
    registerId: null,
  })
}

const revertPurchaseEffects = (state, receipt) => {
  const product = getProduct(state, receipt.productId)
  const supplier = state.suppliers.find((entry) => entry.id === receipt.supplierId)
  if (product) product.stock = Math.max(0, Number(product.stock || 0) - Number(receipt.quantity || 0))
  if (supplier) supplier.balance = Math.max(0, Number(supplier.balance || 0) - Number(receipt.totalCost || 0))
  state.stockMovements = state.stockMovements.filter((movement) => movement.referenceId !== receipt.id)
}

  const buildInvoiceForSale = (state, saleId) => {
  const sale = state.sales.find((entry) => entry.id === saleId)
  if (!sale) return { ok: false, message: 'Venta no encontrada.' }
  if (!sale.customerId) return { ok: false, message: 'La venta necesita cliente para facturar.' }
  if (getInvoiceBySaleId(state, saleId)) return { ok: false, message: 'Esa venta ya tiene una factura.' }

  const invoice = {
    id: makeId(),
    number: generateInvoiceNumber(state, 'B', sale.branchId),
    customerId: sale.customerId,
    totalAmount: sale.totalAmount,
    status: sale.status === 'completed' ? 'Cobrada' : 'Emitida',
    dueDate: todayDate(),
    type: 'B',
    saleId,
    branchId: sale.branchId || getCurrentBranch(state)?.id || null,
  }
  state.invoices.unshift(invoice)
  pushAudit(state, currentUserFromState(state).id, 'invoice', invoice.id, 'created_from_sale', invoice)
  return { ok: true, message: 'Factura creada desde la venta.' }
}

  const buildSeedTransactions = () => {
  const state = clone(seedData)
  const adminId = state.users[0].id
  const cashSessionId = makeId()
  state.cashSessions.push({
    id: cashSessionId,
    openedBy: adminId,
    openingAmount: 50000,
    status: 'open',
    openedAt: '2026-07-12T09:00:00.000Z',
    closedAt: null,
    countedAmount: null,
    differenceAmount: null,
    branchId: state.branches[0].id,
    registerId: state.registers[0].id,
  })

  const customerByName = Object.fromEntries(state.customers.map((customer) => [customer.fullName, customer.id]))
  const productByName = Object.fromEntries(state.products.map((product) => [product.name, product.id]))

  const seedSales = [
    {
      customerId: customerByName['Juan Lopez'],
      items: [buildSaleItem(productByName['Limpieza completa notebook'], 1, state)],
      channel: 'Mostrador',
      paymentMethod: 'cash',
      isPaid: true,
      soldAt: '2026-07-12T10:30:00.000Z',
    },
    {
      customerId: customerByName['Empresa Delta'],
      items: [buildSaleItem(productByName['SSD Kingston 480GB'], 2, state)],
      channel: 'WhatsApp',
      paymentMethod: 'transfer',
      isPaid: true,
      soldAt: '2026-07-12T12:15:00.000Z',
    },
    {
      customerId: customerByName['Marina Diaz'],
      items: [buildSaleItem(productByName['Fuente 500W generica'], 1, state)],
      channel: 'Mostrador',
      paymentMethod: 'account',
      isPaid: false,
      soldAt: '2026-07-11T16:45:00.000Z',
    },
  ]

  for (const saleSeed of seedSales) {
    const totalAmount = saleSeed.items.reduce((sum, item) => sum + item.lineTotal, 0)
    const saleId = makeId()
    state.sales.unshift({
      id: saleId,
      items: saleSeed.items,
      customerId: saleSeed.customerId,
      sellerUserId: adminId,
      totalQuantity: saleSeed.items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount,
      amountPaid: saleSeed.isPaid ? totalAmount : 0,
      channel: saleSeed.channel,
      paymentMethod: saleSeed.paymentMethod,
      status: saleSeed.isPaid ? 'completed' : 'pending',
      soldAt: saleSeed.soldAt,
      cashSessionId,
      branchId: state.branches[0].id,
      registerId: state.registers[0].id,
    })

    for (const item of saleSeed.items) {
      const product = getProduct(state, item.productId)
      if (product?.trackStock) {
        product.stock = Math.max(0, product.stock - item.quantity)
        state.stockMovements.unshift({
          id: makeId(),
          productId: item.productId,
          type: 'sale',
          quantity: item.quantity * -1,
          referenceId: saleId,
          notes: `Venta por ${saleSeed.channel}`,
          createdAt: saleSeed.soldAt,
          createdBy: adminId,
          branchId: state.branches[0].id,
          registerId: state.registers[0].id,
        })
      }
    }
  }

  state.cashMovements = [
    {
      id: makeId(),
      cashSessionId,
      branchId: state.branches[0].id,
      registerId: state.registers[0].id,
      createdBy: adminId,
      kind: 'expense',
      signedAmount: -8500,
      note: 'Pago de mensajeria',
      createdAt: '2026-07-12T13:20:00.000Z',
    },
  ]

  state.invoices = [
    { id: makeId(), number: 'B-FLO-0001-000185', customerId: customerByName['Juan Lopez'], totalAmount: 38000, status: 'Cobrada', dueDate: '2026-07-12', type: 'B', saleId: state.sales[2].id, branchId: state.branches[0].id },
    { id: makeId(), number: 'A-FLO-0001-000001', customerId: customerByName['Empresa Delta'], totalAmount: 128000, status: 'Emitida', dueDate: '2026-07-20', type: 'A', saleId: state.sales[1].id, branchId: state.branches[0].id },
  ]

  state.tickets = [
    { id: makeId(), number: 'TEC-FLO-001001', customerId: customerByName['Juan Lopez'], device: 'Notebook Lenovo', issue: 'Cambio de SSD', status: 'En curso', updatedAt: '2026-07-12', branchId: state.branches[0].id },
    { id: makeId(), number: 'TEC-FLO-001002', customerId: customerByName['Marina Diaz'], device: 'PC Gamer', issue: 'No da video', status: 'Esperando aprobacion', updatedAt: '2026-07-11', branchId: state.branches[0].id },
  ]

  state.purchaseReceipts = [
    {
      id: makeId(),
      supplierId: state.suppliers[0].id,
      productId: productByName['Pasta termica MX-4'],
      quantity: 12,
      unitCost: 7500,
      totalCost: 90000,
      receivedAt: '2026-07-10T11:00:00.000Z',
      receivedBy: adminId,
    },
  ]

  pushAudit(state, adminId, 'system', null, 'seed_initialized', { message: 'Demo inicial cargada' })
  return state
}

const defaultState = buildSeedTransactions()

const migrateState = (source) => {
  const migrated = clone(defaultState)
  if (!source || typeof source !== 'object') return migrated

  migrated.meta = { ...migrated.meta, ...(source.meta || {}) }
  migrated.business = { ...migrated.business, ...(source.business || {}) }
  migrated.business.enabledModules = Array.isArray(source.business?.enabledModules) && source.business.enabledModules.length
    ? source.business.enabledModules.filter((key) => moduleCatalog[key])
    : [...modulePresets.full]
  migrated.business.activePlan = source.business?.activePlan || 'full'
  migrated.branches = Array.isArray(source.branches) && source.branches.length ? source.branches : migrated.branches
  migrated.registers = Array.isArray(source.registers) && source.registers.length ? source.registers : migrated.registers
  if (!migrated.business.currentBranchId) migrated.business.currentBranchId = migrated.branches[0]?.id || ''
  if (!migrated.business.currentRegisterId) migrated.business.currentRegisterId = migrated.registers.find((entry) => entry.branchId === migrated.business.currentBranchId)?.id || migrated.registers[0]?.id || ''
  migrated.roles = Array.isArray(source.roles) && source.roles.length ? source.roles : migrated.roles
  migrated.users = Array.isArray(source.users) && source.users.length ? source.users : migrated.users
  migrated.session = {
    userId: source.session?.userId || '',
    authenticated: Boolean(source.session?.authenticated),
  }

  if (Array.isArray(source.customers)) migrated.customers = source.customers.map((customer) => ({
    id: customer.id || makeId(),
    fullName: customer.fullName || customer.name || 'Cliente sin nombre',
    phone: customer.phone || '',
    email: customer.email || '',
    balance: Number(customer.balance || 0),
    tag: customer.tag || 'Cliente',
  }))

  if (Array.isArray(source.products)) migrated.products = source.products.map((product) => ({
    id: product.id || makeId(),
    name: product.name,
    sku: product.sku,
    barcode: product.barcode || '',
    stock: Number(product.stock || 0),
    salePrice: Number(product.salePrice || product.price || 0),
    costPrice: Number(product.costPrice || 0),
    minStock: Number(product.minStock || 0),
    category: product.category || 'General',
    trackStock: product.trackStock ?? product.category !== 'Servicio',
  }))

  const rawSuppliers = source.suppliers || source.providers
  if (Array.isArray(rawSuppliers)) migrated.suppliers = rawSuppliers.map((supplier) => ({
    id: supplier.id || makeId(),
    name: supplier.name,
    contact: supplier.contact || '',
    phone: supplier.phone || '',
    balance: Number(supplier.balance || 0),
    lastDelivery: supplier.lastDelivery || todayDate(),
    category: supplier.category || 'General',
  }))

  if (Array.isArray(source.cashSessions)) migrated.cashSessions = source.cashSessions.map((session) => ({
    ...session,
    branchId: session.branchId || migrated.business.currentBranchId || migrated.branches[0]?.id || null,
    registerId: session.registerId || migrated.business.currentRegisterId || migrated.registers.find((entry) => entry.branchId === (session.branchId || migrated.business.currentBranchId))?.id || null,
  }))
  if (Array.isArray(source.purchaseReceipts)) migrated.purchaseReceipts = source.purchaseReceipts.map((receipt) => ({
    ...receipt,
    documentNumber: receipt.documentNumber || '',
    note: receipt.note || '',
    branchId: receipt.branchId || migrated.business.currentBranchId || migrated.branches[0]?.id || null,
  }))

  if (Array.isArray(source.sales)) migrated.sales = source.sales.map((sale) => {
    const items = Array.isArray(sale.items) && sale.items.length
      ? sale.items.map((item) => ({
          id: item.id || makeId(),
          productId: item.productId,
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0),
          lineTotal: Number(item.lineTotal || Number(item.quantity || 0) * Number(item.unitPrice || 0)),
        }))
      : [buildSaleItem(sale.productId, sale.quantity || 1, migrated, (sale.totalAmount || sale.amount || 0) / Number(sale.quantity || 1))].filter(Boolean)

    return {
      id: sale.id || makeId(),
      items,
      customerId: sale.customerId || null,
      sellerUserId: sale.sellerUserId || migrated.users[0]?.id || '',
      totalQuantity: Number(sale.totalQuantity || items.reduce((sum, item) => sum + item.quantity, 0)),
      subtotalAmount: Number(sale.subtotalAmount || items.reduce((sum, item) => sum + item.lineTotal, 0)),
      discountAmount: Number(sale.discountAmount || 0),
      totalAmount: Number(sale.totalAmount || sale.amount || items.reduce((sum, item) => sum + item.lineTotal, 0) - Number(sale.discountAmount || 0)),
      amountPaid: Number(sale.amountPaid ?? (sale.paid ? Number(sale.totalAmount || sale.amount || 0) : 0)),
      channel: sale.channel || 'Mostrador',
      paymentMethod: sale.paymentMethod || 'cash',
      status: sale.status || getSaleStatus(Number(sale.totalAmount || sale.amount || items.reduce((sum, item) => sum + item.lineTotal, 0)), Number(sale.amountPaid ?? (sale.paid ? Number(sale.totalAmount || sale.amount || 0) : 0))),
      note: sale.note || '',
      soldAt: sale.soldAt || `${sale.date || todayDate()}T12:00:00.000Z`,
      cashSessionId: sale.cashSessionId || null,
      branchId: sale.branchId || migrated.business.currentBranchId || migrated.branches[0]?.id || null,
      registerId: sale.registerId || migrated.business.currentRegisterId || null,
    }
  })

  if (Array.isArray(source.invoices)) migrated.invoices = source.invoices.map((invoice) => ({
    id: invoice.id || makeId(),
    number: invoice.number,
    customerId: invoice.customerId || null,
    totalAmount: Number(invoice.totalAmount || invoice.total || 0),
    status: invoice.status || 'Emitida',
    dueDate: invoice.dueDate || todayDate(),
    type: invoice.type || 'B',
    saleId: invoice.saleId || null,
    branchId: invoice.branchId || migrated.business.currentBranchId || migrated.branches[0]?.id || null,
  }))

  if (Array.isArray(source.tickets)) migrated.tickets = source.tickets.map((ticket) => ({
    id: ticket.id || makeId(),
    number: ticket.number,
    customerId: ticket.customerId || null,
    device: ticket.device || '',
    issue: ticket.issue || '',
    status: ticket.status || 'Recibido',
    updatedAt: ticket.updatedAt || todayDate(),
    branchId: ticket.branchId || migrated.business.currentBranchId || migrated.branches[0]?.id || null,
  }))

  if (Array.isArray(source.cashMovements)) migrated.cashMovements = source.cashMovements.map((movement) => ({
    ...movement,
    branchId: movement.branchId || migrated.business.currentBranchId || migrated.branches[0]?.id || null,
    registerId: movement.registerId || migrated.business.currentRegisterId || null,
    signedAmount: Number(movement.signedAmount || 0),
  }))

  migrated.stockMovements = Array.isArray(source.stockMovements) ? source.stockMovements.map((movement) => ({
    ...movement,
    branchId: movement.branchId || migrated.business.currentBranchId || migrated.branches[0]?.id || null,
    registerId: movement.registerId || null,
  })) : migrated.stockMovements
  migrated.auditLogs = Array.isArray(source.auditLogs) ? source.auditLogs : migrated.auditLogs
  return migrated
}

export const createBrowserDataStore = () => {
  const desktopBridge = globalThis.window?.pclafDesktop
  const isDesktop = Boolean(desktopBridge?.isDesktop)

  const readState = () => {
    if (isDesktop) return migrateState(desktopBridge.initialize(defaultState))
    const saved = localStorage.getItem(dataStorageKey)
    if (!saved) return clone(defaultState)
    try {
      return migrateState(JSON.parse(saved))
    } catch {
      return clone(defaultState)
    }
  }

  let state = readState()

  const save = () => {
    if (isDesktop) {
      state = migrateState(desktopBridge.saveSnapshot(state))
      return
    }
    localStorage.setItem(dataStorageKey, JSON.stringify(state))
  }

  const getRole = (roleId) => state.roles.find((role) => role.id === roleId) || state.roles[0]
  const getUser = (userId) => state.users.find((user) => user.id === userId) || state.users[0]
  const currentUser = () => currentUserFromState(state)
  const currentRole = () => getRole(currentUser().roleId)
  const hasPermission = (permission) => currentRole().permissions.includes(permission)
  const canAccessModule = (moduleKey, permission) => isModuleEnabled(state, moduleKey) && hasPermission(permission)
  const isAuthenticated = () => Boolean(state.session.authenticated && state.session.userId)

  const authenticateUser = (identifier, pin) => {
    const normalized = String(identifier || '').trim().toLowerCase()
    const user = state.users.find((entry) => (
      entry.isActive
      && (
        entry.id === identifier
        || String(entry.email || '').trim().toLowerCase() === normalized
        || String(entry.email || '').trim().toLowerCase().split('@')[0] === normalized
        || String(entry.fullName || '').trim().toLowerCase() === normalized
      )
    ))
    if (!user) return { ok: false, message: 'Usuario no encontrado' }
    if (user.pin !== String(pin)) return { ok: false, message: 'PIN incorrecto' }
    state.session.userId = user.id
    state.session.authenticated = true
    pushAudit(state, user.id, 'session', user.id, 'sign_in', { userId: user.id })
    save()
    return { ok: true }
  }

  const signOut = () => {
    const user = currentUser()
    state.session.authenticated = false
    state.session.userId = ''
    pushAudit(state, user.id, 'session', user.id, 'sign_out', { userId: user.id })
    save()
  }

  const createCustomer = (payload) => {
    const customer = {
      id: makeId(),
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      balance: Number(payload.balance || 0),
      tag: payload.tag,
    }
    state.customers.unshift(customer)
    pushAudit(state, currentUser().id, 'customer', customer.id, 'created', customer)
    save()
  }

  const createBranch = (payload) => {
    const branch = {
      id: makeId(),
      name: payload.name,
      code: String(payload.code || '').toUpperCase(),
      address: payload.address,
      isActive: true,
    }
    state.branches.unshift(branch)
    if (!state.business.currentBranchId) state.business.currentBranchId = branch.id
    pushAudit(state, currentUser().id, 'branch', branch.id, 'created', branch)
    save()
    return { ok: true, message: 'Sucursal creada.' }
  }

  const updateBranch = (branchId, payload) => {
    const branch = state.branches.find((entry) => entry.id === branchId)
    if (!branch) return { ok: false, message: 'Sucursal no encontrada.' }
    const before = clone(branch)
    branch.name = payload.name
    branch.code = String(payload.code || '').toUpperCase()
    branch.address = payload.address
    pushAudit(state, currentUser().id, 'branch', branch.id, 'updated', branch, before)
    save()
    return { ok: true, message: 'Sucursal actualizada.' }
  }

  const selectBranch = (branchId) => {
    if (!state.branches.some((branch) => branch.id === branchId)) return { ok: false, message: 'Sucursal no encontrada.' }
    state.business.currentBranchId = branchId
    const currentRegister = getRegister(state, state.business.currentRegisterId)
    if (!currentRegister || currentRegister.branchId !== branchId) {
      state.business.currentRegisterId = state.registers.find((register) => register.branchId === branchId)?.id || ''
    }
    save()
    return { ok: true }
  }

  const selectRegister = (registerId) => {
    const register = getRegister(state, registerId)
    if (!register) return { ok: false, message: 'Caja no encontrada.' }
    state.business.currentBranchId = register.branchId
    state.business.currentRegisterId = register.id
    save()
    return { ok: true, message: 'Caja actual cambiada.' }
  }

  const createRegister = (payload) => {
    const register = {
      id: makeId(),
      branchId: payload.branchId,
      name: payload.name,
      code: String(payload.code || '').toUpperCase(),
      cashierUserId: payload.cashierUserId || null,
      isActive: true,
    }
    state.registers.unshift(register)
    if (!state.business.currentRegisterId) state.business.currentRegisterId = register.id
    pushAudit(state, currentUser().id, 'register', register.id, 'created', register)
    save()
    return { ok: true, message: 'Caja creada.' }
  }

  const updateRegister = (registerId, payload) => {
    const register = state.registers.find((entry) => entry.id === registerId)
    if (!register) return { ok: false, message: 'Caja no encontrada.' }
    const before = clone(register)
    register.branchId = payload.branchId
    register.name = payload.name
    register.code = String(payload.code || '').toUpperCase()
    register.cashierUserId = payload.cashierUserId || null
    if (state.business.currentRegisterId === register.id) state.business.currentBranchId = register.branchId
    pushAudit(state, currentUser().id, 'register', register.id, 'updated', register, before)
    save()
    return { ok: true, message: 'Caja actualizada.' }
  }

  const setModuleEnabled = (moduleKey, enabled) => {
    if (!moduleCatalog[moduleKey]) return { ok: false, message: 'Modulo no encontrado.' }
    const current = new Set(state.business.enabledModules || modulePresets.full)
    if (enabled) current.add(moduleKey)
    else current.delete(moduleKey)
    current.add('dashboard')
    current.add('settings')
    state.business.enabledModules = [...current]
    state.business.activePlan = 'custom'
    pushAudit(state, currentUser().id, 'business_module', moduleKey, enabled ? 'enabled' : 'disabled', { enabled })
    save()
    return { ok: true, message: `Modulo ${enabled ? 'habilitado' : 'deshabilitado'}.` }
  }

  const applyModulePreset = (presetKey) => {
    const preset = modulePresets[presetKey]
    if (!preset) return { ok: false, message: 'Preset no encontrado.' }
    state.business.enabledModules = [...preset]
    state.business.activePlan = presetKey
    pushAudit(state, currentUser().id, 'business_plan', presetKey, 'preset_applied', { presetKey, modules: preset })
    save()
    return { ok: true, message: `Plan ${presetKey} aplicado.` }
  }

  const createProduct = (payload) => {
    const product = {
      id: makeId(),
      name: payload.name,
      sku: payload.sku,
      barcode: String(payload.barcode || '').trim(),
      stock: Number(payload.stock),
      salePrice: Number(payload.salePrice),
      costPrice: Number(payload.costPrice),
      minStock: Number(payload.minStock),
      category: payload.category,
      trackStock: payload.trackStock,
    }
    state.products.unshift(product)
    if (product.trackStock && product.stock > 0) {
      state.stockMovements.unshift({
        id: makeId(),
        productId: product.id,
        type: 'opening',
        quantity: product.stock,
        referenceId: product.id,
        notes: 'Stock inicial',
        createdAt: todayIso(),
        createdBy: currentUser().id,
      })
    }
    pushAudit(state, currentUser().id, 'product', product.id, 'created', product)
    save()
  }

  const createSupplier = (payload) => {
    const supplier = {
      id: makeId(),
      name: payload.name,
      contact: payload.contact,
      phone: payload.phone,
      balance: Number(payload.balance),
      lastDelivery: payload.lastDelivery,
      category: payload.category,
    }
    state.suppliers.unshift(supplier)
    pushAudit(state, currentUser().id, 'supplier', supplier.id, 'created', supplier)
    save()
  }

  const createUser = (payload) => {
    const normalizedEmail = String(payload.email || '').trim().toLowerCase()
    if (!payload.fullName) return { ok: false, message: 'El usuario necesita un nombre.' }
    if (!payload.pin || String(payload.pin).length < 4) return { ok: false, message: 'El PIN debe tener al menos 4 digitos.' }
    if (normalizedEmail && state.users.some((user) => String(user.email || '').trim().toLowerCase() === normalizedEmail)) {
      return { ok: false, message: 'Ya existe un usuario con ese email.' }
    }
    if (!state.roles.some((role) => role.id === payload.roleId)) return { ok: false, message: 'Rol invalido.' }
    const user = {
      id: makeId(),
      fullName: payload.fullName,
      roleId: payload.roleId,
      email: normalizedEmail,
      pin: String(payload.pin),
      isActive: payload.isActive !== false,
    }
    state.users.unshift(user)
    pushAudit(state, currentUser().id, 'user', user.id, 'created', { ...user, pin: '****' })
    save()
    return { ok: true, message: 'Usuario creado.' }
  }

  const updateUser = (userId, payload) => {
    const user = state.users.find((entry) => entry.id === userId)
    if (!user) return { ok: false, message: 'Usuario no encontrado.' }
    const normalizedEmail = String(payload.email || '').trim().toLowerCase()
    if (!payload.fullName) return { ok: false, message: 'El usuario necesita un nombre.' }
    if (normalizedEmail && state.users.some((entry) => entry.id !== userId && String(entry.email || '').trim().toLowerCase() === normalizedEmail)) {
      return { ok: false, message: 'Ya existe otro usuario con ese email.' }
    }
    if (!state.roles.some((role) => role.id === payload.roleId)) return { ok: false, message: 'Rol invalido.' }
    if (state.session.userId === user.id && payload.isActive === false) return { ok: false, message: 'No podes desactivar la sesion actual.' }
    const adminRoleId = state.roles.find((role) => role.key === 'admin')?.id
    const wouldRemainAdmin = state.users.filter((entry) => entry.id !== userId && entry.isActive && entry.roleId === adminRoleId).length
    if ((payload.roleId !== adminRoleId || payload.isActive === false) && user.roleId === adminRoleId && wouldRemainAdmin < 1) {
      return { ok: false, message: 'Necesitas al menos un administrador activo.' }
    }
    const before = { ...clone(user), pin: '****' }
    user.fullName = payload.fullName
    user.roleId = payload.roleId
    user.email = normalizedEmail
    user.isActive = payload.isActive !== false
    if (payload.pin) {
      if (String(payload.pin).length < 4) return { ok: false, message: 'El PIN debe tener al menos 4 digitos.' }
      user.pin = String(payload.pin)
    }
    pushAudit(state, currentUser().id, 'user', user.id, 'updated', { ...clone(user), pin: '****' }, before)
    save()
    return { ok: true, message: 'Usuario actualizado.' }
  }

  const toggleUserActive = (userId, isActive) => {
    const user = state.users.find((entry) => entry.id === userId)
    if (!user) return { ok: false, message: 'Usuario no encontrado.' }
    if (state.session.userId === user.id && !isActive) return { ok: false, message: 'No podes desactivar la sesion actual.' }
    const adminRoleId = state.roles.find((role) => role.key === 'admin')?.id
    const activeAdmins = state.users.filter((entry) => entry.isActive && entry.roleId === adminRoleId)
    if (!isActive && user.roleId === adminRoleId && activeAdmins.length <= 1) return { ok: false, message: 'Necesitas al menos un administrador activo.' }
    const before = clone(user)
    user.isActive = Boolean(isActive)
    pushAudit(state, currentUser().id, 'user', user.id, user.isActive ? 'enabled' : 'disabled', { ...clone(user), pin: '****' }, { ...before, pin: '****' })
    save()
    return { ok: true, message: `Usuario ${user.isActive ? 'habilitado' : 'deshabilitado'}.` }
  }

  const openCashSession = ({ openingAmount }) => {
    if (getOpenCashSession(state)) return { ok: false, message: 'Ya hay una caja abierta.' }
    const branch = getCurrentBranch(state)
    const register = getScopedRegister(state, state.business.currentRegisterId, branch?.id)
    if (!register) return { ok: false, message: 'Elegi una caja activa para abrir la caja.' }
    const session = {
      id: makeId(),
      openedBy: currentUser().id,
      openingAmount: Number(openingAmount || 0),
      status: 'open',
      openedAt: todayIso(),
      closedAt: null,
      countedAmount: null,
      differenceAmount: null,
      branchId: branch?.id || null,
      registerId: register.id,
    }
    state.cashSessions.unshift(session)
    pushAudit(state, currentUser().id, 'cash_session', session.id, 'opened', session)
    save()
    return { ok: true }
  }

  const closeCashSession = ({ countedAmount }) => {
    const session = getOpenCashSession(state)
    if (!session) return { ok: false, message: 'No hay caja abierta.' }
    const cashSales = state.sales
      .filter((sale) => sale.cashSessionId === session.id && sale.paymentMethod === 'cash')
      .reduce((sum, sale) => sum + sale.amountPaid, 0)
    const manualDelta = getCashMovementDelta(state, session.id)
    session.countedAmount = Number(countedAmount || 0)
    session.closedAt = todayIso()
    session.status = 'closed'
    session.differenceAmount = session.countedAmount - (Number(session.openingAmount) + cashSales + manualDelta)
    pushAudit(state, currentUser().id, 'cash_session', session.id, 'closed', session)
    save()
    return { ok: true }
  }

  const createCashMovement = (payload) => {
    const session = getOpenCashSession(state)
    if (!session) return { ok: false, message: 'No hay caja abierta para registrar movimientos.' }
    const amount = Number(payload.amount || 0)
    if (amount <= 0) return { ok: false, message: 'El importe debe ser mayor a cero.' }
    const negativeKinds = new Set(['expense', 'withdrawal'])
    const movement = {
      id: makeId(),
      cashSessionId: session.id,
      branchId: session.branchId || getCurrentBranch(state)?.id || null,
      registerId: session.registerId || getCurrentRegister(state)?.id || null,
      createdBy: currentUser().id,
      kind: payload.kind || 'income',
      signedAmount: negativeKinds.has(payload.kind) ? amount * -1 : amount,
      note: payload.note || '',
      createdAt: todayIso(),
    }
    state.cashMovements.unshift(movement)
    pushAudit(state, currentUser().id, 'cash_movement', movement.id, 'created', movement)
    save()
    return { ok: true, message: 'Movimiento de caja registrado.' }
  }

  const createSale = (payload) => {
    const items = payload.items
      .map((item) => buildSaleItem(item.productId, item.quantity, state))
      .filter(Boolean)
    if (!items.length) return { ok: false, message: 'Cargá al menos un articulo.' }
    if (payload.paymentMethod === 'cash' && !getOpenCashSession(state)) {
      return { ok: false, message: 'No podes cobrar en efectivo sin una caja abierta.' }
    }
    const stockCheck = ensureSaleStock(state, items)
    if (!stockCheck.ok) return stockCheck

    const subtotalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const discountAmount = Math.max(0, Math.min(Number(payload.discountAmount || 0), subtotalAmount))
    const totalAmount = subtotalAmount - discountAmount
    const rawPaid = payload.isPaid ? totalAmount : Number(payload.amountPaid || 0)
    const amountPaid = Math.max(0, Math.min(rawPaid, totalAmount))
    if (rawPaid > totalAmount) return { ok: false, message: 'El monto cobrado no puede superar el total.' }
    const openSession = getOpenCashSession(state)
    const currentBranch = getCurrentBranch(state)
    const register = payload.paymentMethod === 'cash'
      ? getRegister(state, openSession?.registerId)
      : getScopedRegister(state, state.business.currentRegisterId, currentBranch?.id)
    const sale = {
      id: makeId(),
      items,
      customerId: payload.customerId || null,
      sellerUserId: currentUser().id,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalAmount,
      discountAmount,
      totalAmount,
      amountPaid,
      channel: payload.channel,
      paymentMethod: payload.paymentMethod,
      status: getSaleStatus(totalAmount, amountPaid),
      note: payload.note || '',
      soldAt: todayIso(),
      cashSessionId: openSession?.id || null,
      branchId: payload.paymentMethod === 'cash' ? (openSession?.branchId || currentBranch?.id || null) : (currentBranch?.id || null),
      registerId: register?.id || null,
    }

    state.sales.unshift(sale)
    applySaleEffects(state, sale)
    if (payload.autoInvoice && amountPaid > 0 && payload.customerId) buildInvoiceForSale(state, sale.id)
    pushAudit(state, currentUser().id, 'sale', sale.id, 'created', sale)
    save()
    return { ok: true }
  }

  const updateSale = (saleId, payload) => {
    const sale = state.sales.find((entry) => entry.id === saleId)
    if (!sale) return { ok: false, message: 'Venta no encontrada.' }

    const items = payload.items
      .map((item) => buildSaleItem(item.productId, item.quantity, state))
      .filter(Boolean)
    if (!items.length) return { ok: false, message: 'Cargá al menos un articulo.' }
    if (payload.paymentMethod === 'cash' && !getOpenCashSession(state)) return { ok: false, message: 'No podes cobrar en efectivo sin una caja abierta.' }

    const stockCheck = ensureSaleStock(state, items, saleId)
    if (!stockCheck.ok) return stockCheck

    const before = clone(sale)
    const openSession = getOpenCashSession(state)
    const currentBranch = getCurrentBranch(state)
    const register = payload.paymentMethod === 'cash'
      ? getRegister(state, openSession?.registerId)
      : getScopedRegister(state, state.business.currentRegisterId, currentBranch?.id)
    const subtotalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0)
    const discountAmount = Math.max(0, Math.min(Number(payload.discountAmount || 0), subtotalAmount))
    const totalAmount = subtotalAmount - discountAmount
    const rawPaid = payload.isPaid ? totalAmount : Number(payload.amountPaid || 0)
    const amountPaid = Math.max(0, Math.min(rawPaid, totalAmount))
    if (rawPaid > totalAmount) return { ok: false, message: 'El monto cobrado no puede superar el total.' }
    revertSaleEffects(state, sale)
    sale.items = items
    sale.customerId = payload.customerId || null
    sale.totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
    sale.subtotalAmount = subtotalAmount
    sale.discountAmount = discountAmount
    sale.totalAmount = totalAmount
    sale.amountPaid = amountPaid
    sale.channel = payload.channel
    sale.paymentMethod = payload.paymentMethod
    sale.status = getSaleStatus(totalAmount, amountPaid)
    sale.note = payload.note || ''
    sale.cashSessionId = payload.paymentMethod === 'cash' ? openSession?.id || null : null
    sale.branchId = payload.paymentMethod === 'cash' ? (openSession?.branchId || currentBranch?.id || null) : (currentBranch?.id || null)
    sale.registerId = register?.id || null
    applySaleEffects(state, sale)

    if (payload.autoInvoice && amountPaid > 0 && payload.customerId && !getInvoiceBySaleId(state, saleId)) {
      buildInvoiceForSale(state, saleId)
    }

    pushAudit(state, currentUser().id, 'sale', sale.id, 'updated', sale, before)
    save()
    return { ok: true, message: 'Venta actualizada.' }
  }

  const createInvoiceFromSale = (saleId) => {
    const sale = state.sales.find((entry) => entry.id === saleId)
    if (!sale) return { ok: false, message: 'Venta no encontrada.' }
    if (!sale.customerId) return { ok: false, message: 'La venta necesita cliente para facturar.' }
    const existing = state.invoices.find((invoice) => invoice.saleId === saleId)
    if (existing) return { ok: false, message: 'Esa venta ya tiene una factura.' }

    const result = buildInvoiceForSale(state, saleId)
    if (result.ok) save()
    return result
  }

  const createTicketFromSale = (saleId) => {
    const sale = state.sales.find((entry) => entry.id === saleId)
    if (!sale) return { ok: false, message: 'Venta no encontrada.' }
    if (!sale.customerId) return { ok: false, message: 'La venta necesita cliente para generar ticket.' }

    const summary = sale.items
      .map((item) => {
        const product = getProduct(state, item.productId)
        return `${product?.name || 'Articulo'} x${item.quantity}`
      })
      .join(', ')

    const ticket = {
      id: makeId(),
      number: generateTicketNumber(state, 'POST', sale.branchId),
      customerId: sale.customerId,
      device: 'Seguimiento postventa',
      issue: summary,
      status: 'Recibido',
      updatedAt: todayDate(),
      saleId,
      branchId: sale.branchId || getCurrentBranch(state)?.id || null,
    }
    state.tickets.unshift(ticket)
    pushAudit(state, currentUser().id, 'ticket', ticket.id, 'created_from_sale', ticket)
    save()
    return { ok: true, message: 'Ticket generado desde la venta.' }
  }

  const createPurchaseReceipt = (payload) => {
    const product = getProduct(state, payload.productId)
    const supplier = state.suppliers.find((entry) => entry.id === payload.supplierId)
    if (!product || !supplier) return { ok: false, message: 'Proveedor o producto invalido.' }
    const quantity = Number(payload.quantity)
    const unitCost = Number(payload.unitCost)
    const receipt = {
      id: makeId(),
      supplierId: supplier.id,
      productId: product.id,
      documentNumber: payload.documentNumber || '',
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      note: payload.note || '',
      receivedAt: todayIso(),
      receivedBy: currentUser().id,
      branchId: getCurrentBranch(state)?.id || null,
    }
    state.purchaseReceipts.unshift(receipt)
    applyPurchaseEffects(state, receipt)
    pushAudit(state, currentUser().id, 'purchase_receipt', receipt.id, 'created', receipt)
    save()
    return { ok: true, message: 'Recepcion registrada.' }
  }

  const updatePurchaseReceipt = (receiptId, payload) => {
    const receipt = state.purchaseReceipts.find((entry) => entry.id === receiptId)
    if (!receipt) return { ok: false, message: 'Recepcion no encontrada.' }
    const before = clone(receipt)
    revertPurchaseEffects(state, receipt)
    receipt.supplierId = payload.supplierId
    receipt.productId = payload.productId
    receipt.documentNumber = payload.documentNumber || ''
    receipt.quantity = Number(payload.quantity)
    receipt.unitCost = Number(payload.unitCost)
    receipt.totalCost = receipt.quantity * receipt.unitCost
    receipt.note = payload.note || ''
    receipt.branchId = payload.branchId || receipt.branchId || getCurrentBranch(state)?.id || null
    applyPurchaseEffects(state, receipt)
    pushAudit(state, currentUser().id, 'purchase_receipt', receipt.id, 'updated', receipt, before)
    save()
    return { ok: true, message: 'Recepcion actualizada.' }
  }

  const createInvoice = (payload) => {
    const invoice = {
      id: makeId(),
      number: payload.number || generateInvoiceNumber(state, payload.type || 'B'),
      branchId: payload.branchId || getCurrentBranch(state)?.id || null,
      customerId: payload.customerId || null,
      totalAmount: Number(payload.totalAmount),
      status: payload.status,
      dueDate: payload.dueDate,
      type: payload.type,
      saleId: payload.saleId || null,
    }
    state.invoices.unshift(invoice)
    pushAudit(state, currentUser().id, 'invoice', invoice.id, 'created', invoice)
    save()
  }

  const updateInvoice = (invoiceId, payload) => {
    const invoice = state.invoices.find((entry) => entry.id === invoiceId)
    if (!invoice) return { ok: false, message: 'Factura no encontrada.' }
    const before = clone(invoice)
    invoice.number = payload.number || invoice.number
    invoice.branchId = payload.branchId || invoice.branchId || getCurrentBranch(state)?.id || null
    invoice.customerId = payload.customerId || null
    invoice.totalAmount = Number(payload.totalAmount)
    invoice.status = payload.status
    invoice.dueDate = payload.dueDate
    invoice.type = payload.type
    pushAudit(state, currentUser().id, 'invoice', invoice.id, 'updated', invoice, before)
    save()
    return { ok: true, message: 'Factura actualizada.' }
  }

  const createTicket = (payload) => {
    const ticket = {
      id: makeId(),
      number: payload.number || generateTicketNumber(state, 'TEC', payload.branchId || getCurrentBranch(state)?.id),
      branchId: payload.branchId || getCurrentBranch(state)?.id || null,
      customerId: payload.customerId || null,
      device: payload.device,
      issue: payload.issue,
      status: payload.status,
      updatedAt: todayDate(),
    }
    state.tickets.unshift(ticket)
    pushAudit(state, currentUser().id, 'ticket', ticket.id, 'created', ticket)
    save()
  }

  const updateTicket = (ticketId, payload) => {
    const ticket = state.tickets.find((entry) => entry.id === ticketId)
    if (!ticket) return { ok: false, message: 'Ticket no encontrado.' }
    const before = clone(ticket)
    ticket.number = payload.number || ticket.number
    ticket.branchId = payload.branchId || ticket.branchId || getCurrentBranch(state)?.id || null
    ticket.customerId = payload.customerId || null
    ticket.device = payload.device
    ticket.issue = payload.issue
    ticket.status = payload.status
    ticket.updatedAt = todayDate()
    pushAudit(state, currentUser().id, 'ticket', ticket.id, 'updated', ticket, before)
    save()
    return { ok: true, message: 'Ticket actualizado.' }
  }

  const removeEntity = (entity, id) => {
    const map = {
      customer: 'customers',
      sale: 'sales',
      product: 'products',
      supplier: 'suppliers',
      invoice: 'invoices',
      ticket: 'tickets',
      cash_movement: 'cashMovements',
      branch: 'branches',
      register: 'registers',
      purchase_receipt: 'purchaseReceipts',
    }
    const key = map[entity]
    if (!key) return
    const before = state[key].find((item) => item.id === id) || null
    if (!before) return

    if (entity === 'sale') {
      revertSaleEffects(state, before)
      state.invoices = state.invoices.filter((invoice) => invoice.saleId !== before.id)
      state.tickets = state.tickets.filter((ticket) => ticket.saleId !== before.id)
    }

    if (entity === 'purchase_receipt') {
      revertPurchaseEffects(state, before)
    }

    state[key] = state[key].filter((item) => item.id !== id)
    pushAudit(state, currentUser().id, entity, id, 'deleted', null, before)
    save()
  }

  const exportData = () => clone(state)
  const importData = (payload) => {
    state = migrateState(payload)
    pushAudit(state, currentUser().id, 'system', null, 'imported', { importedAt: todayIso() })
    save()
  }
  const resetData = () => {
    state = clone(defaultState)
    pushAudit(state, currentUser().id, 'system', null, 'reset', { resetAt: todayIso() })
    save()
  }

  return {
    permissionCatalog,
    moduleCatalog,
    modulePresets,
    getSnapshot: () => clone(state),
    currentUser,
    currentRole,
    hasPermission,
    canAccessModule,
    isAuthenticated,
    authenticateUser,
    signOut,
    openCashSession,
    closeCashSession,
    createCashMovement,
    createCustomer,
    createBranch,
    updateBranch,
    selectBranch,
    selectRegister,
    createRegister,
    updateRegister,
    setModuleEnabled,
    applyModulePreset,
    createProduct,
    findProductByCode: (code) => findProductByCode(state, code),
    createSupplier,
    createUser,
    updateUser,
    toggleUserActive,
    createSale,
    updateSale,
    createInvoiceFromSale,
    createTicketFromSale,
    createPurchaseReceipt,
    updatePurchaseReceipt,
    createInvoice,
    updateInvoice,
    createTicket,
    updateTicket,
    removeEntity,
    exportData,
    importData,
    resetData,
  }
}
