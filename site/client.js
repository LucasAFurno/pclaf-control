import { createBrowserDataStore } from './data-store.js'

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const today = new Date().toISOString().slice(0, 10)
const productName = 'Control'
const themeStorageKey = 'pclaf-control-theme'
const sectionStorageKey = 'pclaf-control-section'

const store = createBrowserDataStore()

const icon = (path) => `
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    ${path}
  </svg>
`

const navItems = [
  { id: 'dashboard', label: 'Inicio', permission: 'dashboard:view', icon: icon('<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/>') },
  { id: 'clientes', label: 'Clientes', permission: 'customers:view', icon: icon('<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3"/><path d="M20 8v6"/><path d="M17 11h6"/>') },
  { id: 'ventas', label: 'Ventas', permission: 'sales:view', icon: icon('<path d="M4 17h16"/><path d="M7 17V9"/><path d="M12 17V5"/><path d="M17 17v-6"/>') },
  { id: 'caja', label: 'Caja', permission: 'cash:view', icon: icon('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16"/><path d="M16 14h2"/>') },
  { id: 'sucursales', label: 'Sucursales', permission: 'branches:view', icon: icon('<path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-6h6v6"/><path d="M4 10h16"/>') },
  { id: 'cajeros', label: 'Cajas', permission: 'registers:view', icon: icon('<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8"/><path d="M9 12h1"/><path d="M12 12h1"/><path d="M15 12h1"/><path d="M9 15h1"/><path d="M12 15h4"/>') },
  { id: 'productos', label: 'Productos', permission: 'products:view', icon: icon('<path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z"/><path d="M3 7.5V16.5L12 21l9-4.5V7.5"/>') },
  { id: 'compras', label: 'Compras', permission: 'purchases:view', icon: icon('<circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/><path d="M3 4h2l2.4 10.5h10.8L21 8H8"/>') },
  { id: 'facturacion', label: 'Facturas', permission: 'invoices:view', icon: icon('<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M10 12h6"/><path d="M10 16h6"/>') },
  { id: 'tickets', label: 'Tickets', permission: 'tickets:view', icon: icon('<rect x="4" y="5" width="16" height="10" rx="2"/><path d="M8 19h8"/><path d="M10 15v4"/><path d="M14 15v4"/>') },
  { id: 'reportes', label: 'Reportes', permission: 'reports:view', icon: icon('<path d="M5 19V9"/><path d="M12 19V5"/><path d="M19 19v-8"/><path d="M3 19h18"/>') },
  { id: 'ajustes', label: 'Ajustes', permission: 'settings:view', icon: icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8a1.65 1.65 0 0 0 .6 1 1.65 1.65 0 0 0 1 .33H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1 .33 1.65 1.65 0 0 0-.51 1.34Z"/>') },
]

const app = document.querySelector('#app')
let theme = localStorage.getItem(themeStorageKey) || 'dark'
let activeSection = localStorage.getItem(sectionStorageKey) || 'dashboard'
let loginMessage = ''
let feedbackMessage = ''
let saleEditingId = ''
let purchaseEditingId = ''
let invoiceEditingId = ''
let ticketEditingId = ''
let branchEditingId = ''
let registerEditingId = ''
let reportRegisterFilter = 'all'
let reportDateFrom = ''
let reportDateTo = ''

const money = (value) => currency.format(Number(value) || 0)
const applyTheme = () => { document.documentElement.dataset.theme = theme }
const saveSection = () => localStorage.setItem(sectionStorageKey, activeSection)
const byRecentDate = (items, key) => items.slice().sort((a, b) => String(b[key]).localeCompare(String(a[key])))
const isWithinDateRange = (value, from, to) => {
  const normalized = String(value || '').slice(0, 10)
  if (!normalized) return false
  if (from && normalized < from) return false
  if (to && normalized > to) return false
  return true
}
const csvEscape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`

const dataTable = (headers, rows) => `
  <div class="data-table">
    <div class="data-head">${headers.map((header) => `<span>${header}</span>`).join('')}</div>
    ${rows.length ? rows.join('') : '<div class="data-empty">No hay registros todavia.</div>'}
  </div>
`

const actionButton = (entity, id) => `<button type="button" class="inline-action" data-delete="${entity}" data-id="${id}">Eliminar</button>`
const saleActionButtons = (sale) => `
  <div class="inline-action-group">
    <button type="button" class="inline-action" data-sale-action="edit" data-id="${sale.id}">Editar</button>
    <button type="button" class="inline-action" data-sale-action="invoice" data-id="${sale.id}">Facturar</button>
    <button type="button" class="inline-action" data-sale-action="ticket" data-id="${sale.id}">Ticket</button>
    <button type="button" class="inline-action" data-sale-action="receipt" data-id="${sale.id}">Imprimir</button>
    <button type="button" class="inline-action" data-sale-action="export" data-id="${sale.id}">Exportar</button>
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

const getUiState = () => {
  const snapshot = store.getSnapshot()
  const user = snapshot.users.find((entry) => entry.id === snapshot.session.userId) || snapshot.users[0]
  const role = snapshot.roles.find((entry) => entry.id === user?.roleId) || snapshot.roles[0]
  const customerMap = new Map(snapshot.customers.map((item) => [item.id, item]))
  const productMap = new Map(snapshot.products.map((item) => [item.id, item]))
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
    user,
    role,
    isAuthenticated: store.isAuthenticated(),
    openCashSession,
    cashSalesTotal,
    sessionCashMovementTotal,
    expectedCash: openCashSession ? Number(openCashSession.openingAmount) + cashSalesTotal + sessionCashMovementTotal : 0,
    unpaidSales: scopedSales.filter((sale) => sale.status !== 'completed').reduce((sum, sale) => sum + sale.totalAmount, 0),
    totalSales: scopedSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
    pendingInvoices: scopedInvoices.filter((invoice) => invoice.status !== 'Cobrada').reduce((sum, invoice) => sum + invoice.totalAmount, 0),
    lowStock: snapshot.products.filter((product) => product.trackStock && product.stock <= product.minStock),
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

const loginView = (ui) => `
  <div class="login-shell">
    <div class="login-card">
      <img class="login-logo" src="/pclaf-logo.png" alt="PCLAF" />
      <p class="kicker">Edicion local</p>
      <h1>${productName}</h1>
      <p class="login-copy">Ingresá con usuario y PIN para operar ventas, caja, compras y control.</p>
      <form class="login-form" data-form="login">
        <label>Usuario<select name="userId" required>${ui.snapshot.users.filter((user) => user.isActive).map((user) => `<option value="${user.id}">${user.fullName}</option>`).join('')}</select></label>
        <label>PIN<input type="password" name="pin" placeholder="0000" required /></label>
        ${loginMessage ? `<p class="login-error">${loginMessage}</p>` : ''}
        <button type="submit">Ingresar</button>
      </form>
      <div class="login-hints">
        <span>Admin: 0000</span>
        <span>Caja: 1111</span>
        <span>Deposito: 2222</span>
      </div>
    </div>
  </div>
`

const dashboardView = (ui) => `
  <section class="view-section">
    <div class="section-header"><div><p class="kicker">Resumen diario</p><h2>Operacion del local</h2></div><div class="user-pill"><strong>${ui.user.fullName}</strong><span>${ui.role.name}</span></div></div>
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
        ${ui.lowStock.length ? ui.lowStock.map((product) => `<div class="alert-card"><strong>${product.name}</strong><p>Stock ${product.stock} / minimo ${product.minStock}</p></div>`).join('') : '<div class="alert-card ok"><strong>Sin alertas</strong><p>Inventario estable.</p></div>'}
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

const salesView = (ui) => `
  ${(() => {
    const editingSale = ui.snapshot.sales.find((sale) => sale.id === saleEditingId)
    const quantities = new Map((editingSale?.items || []).map((item) => [item.productId, item.quantity]))
    return `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Ventas</p><h2>Venta multi-item</h2></div></div>
    ${feedbackMessage ? `<div class="feedback-banner">${feedbackMessage}</div>` : ''}
    <section class="content-grid single-focus">
      <article class="panel">
        <div class="panel-head"><div><h3>${editingSale ? 'Editar venta' : 'Ticket de venta'}</h3><p>${editingSale ? 'Recalcula stock y saldos al guardar' : 'Elegí cantidades y el sistema calcula el total'}</p></div></div>
        <form class="form-grid" data-form="sale">
          <input type="hidden" name="saleId" value="${editingSale?.id || ''}" />
          <label>Cliente<select name="customerId"><option value="">Mostrador</option>${ui.snapshot.customers.map((customer) => `<option value="${customer.id}" ${editingSale?.customerId === customer.id ? 'selected' : ''}>${customer.fullName}</option>`).join('')}</select></label>
          <label>Canal<select name="channel"><option ${editingSale?.channel === 'Mostrador' ? 'selected' : ''}>Mostrador</option><option ${editingSale?.channel === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option><option ${editingSale?.channel === 'Transferencia' ? 'selected' : ''}>Transferencia</option><option ${editingSale?.channel === 'Mercado Libre' ? 'selected' : ''}>Mercado Libre</option></select></label>
          <label>Pago<select name="paymentMethod"><option value="cash" ${editingSale?.paymentMethod === 'cash' ? 'selected' : ''}>Efectivo</option><option value="transfer" ${editingSale?.paymentMethod === 'transfer' ? 'selected' : ''}>Transferencia</option><option value="mercado_pago" ${editingSale?.paymentMethod === 'mercado_pago' ? 'selected' : ''}>Mercado Pago</option><option value="account" ${editingSale?.paymentMethod === 'account' ? 'selected' : ''}>Cuenta corriente</option></select></label>
          <label class="checkbox-row"><input type="checkbox" name="isPaid" ${editingSale ? (editingSale.status === 'completed' ? 'checked' : '') : 'checked'} />Cobrado</label>
          <label class="checkbox-row"><input type="checkbox" name="autoInvoice" />Generar factura si corresponde</label>
          <div class="priority-list compact-list full-span">
            <div class="priority-item"><strong>Sucursal</strong><p>${ui.currentBranch?.name || '-'}</p></div>
            <div class="priority-item"><strong>Caja</strong><p>${ui.openCashSession?.registerId ? (ui.enrichedRegisters.find((register) => register.id === ui.openCashSession.registerId)?.name || 'Caja activa') : (ui.currentRegister?.name || 'Sin caja seleccionada')}</p></div>
            <div class="priority-item"><strong>Modo</strong><p>${ui.openCashSession ? 'Venta ligada a caja abierta' : 'Transferencia o cuenta sin caja'}</p></div>
          </div>
          <p class="form-note full-span">Las ventas en efectivo solo se pueden registrar con una caja abierta. Los reportes toman sucursal y caja actual.</p>
          <div class="full-span cart-builder">
            ${ui.snapshot.products.map((product) => `
              <div class="cart-line">
                <div><strong>${product.name}</strong><p>${money(product.salePrice)} - stock ${product.stock}</p></div>
                <input type="number" min="0" value="${quantities.get(product.id) || 0}" name="qty_${product.id}" />
              </div>`).join('')}
          </div>
          <button type="submit">${editingSale ? 'Guardar cambios' : 'Registrar venta'}</button>
          ${editingSale ? '<button type="button" class="danger-action" data-action="cancel-sale-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Historial</h3><p>Tickets, factura y ticket postventa</p></div></div>
        ${dataTable(['Cliente', 'Items', 'Caja', 'Total', 'Accion'], ui.enrichedSales.map((sale) => `<div class="data-row"><span>${sale.customerName}</span><span>${sale.itemSummary}</span><span>${sale.branchName} / ${sale.registerName}</span><span>${money(sale.totalAmount)}</span><span>${saleActionButtons(sale)}</span></div>`))}
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
        <div class="panel-head"><div><h3>${ui.openCashSession ? 'Cerrar caja' : 'Abrir caja'}</h3><p>${ui.openCashSession ? 'Informá el efectivo contado' : 'Definí el fondo inicial'}</p></div></div>
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
        ${ui.enrichedCashMovements.slice(0, 6).map((movement) => `<div class="timeline-item"><strong>${movement.kind}</strong><p>${movement.note}</p><span>${movement.registerName} · ${money(movement.signedAmount)} · ${movement.createdAt.slice(0, 16).replace('T', ' ')}</span></div>`).join('') || '<p class="empty-state">Todavia no hay movimientos manuales.</p>'}
      </div></article>
    </section>
  </section>
`

const productsView = (ui) => `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Productos</p><h2>Catalogo y stock</h2></div></div>
    <section class="content-grid single-focus">
      <article class="panel"><div class="panel-head"><div><h3>Alta de producto</h3><p>Precio, costo y stock inicial</p></div></div>
        <form class="form-grid" data-form="product">
          <label>Nombre<input type="text" name="name" required /></label>
          <label>SKU<input type="text" name="sku" required /></label>
          <label>Stock<input type="number" name="stock" min="0" required /></label>
          <label>Precio venta<input type="number" name="salePrice" min="0" required /></label>
          <label>Costo<input type="number" name="costPrice" min="0" required /></label>
          <label>Minimo<input type="number" name="minStock" min="0" required /></label>
          <label>Categoria<input type="text" name="category" required /></label>
          <label class="checkbox-row"><input type="checkbox" name="trackStock" checked />Controlar stock</label>
          <button type="submit">Guardar producto</button>
        </form>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Inventario</h3><p>Con stock actual</p></div></div>
        ${dataTable(['Producto', 'SKU', 'Stock', 'Precio', 'Accion'], ui.snapshot.products.map((product) => `<div class="data-row"><span>${product.name}</span><span>${product.sku}</span><span>${product.stock}</span><span>${money(product.salePrice)}</span><span>${actionButton('product', product.id)}</span></div>`))}
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
          <label>Cantidad<input type="number" min="1" name="quantity" value="${editingReceipt?.quantity || ''}" required /></label>
          <label>Costo unitario<input type="number" min="0" name="unitCost" value="${editingReceipt?.unitCost || ''}" required /></label>
          <button type="submit">${editingReceipt ? 'Guardar cambios' : 'Registrar recepcion'}</button>
          ${editingReceipt ? '<button type="button" class="danger-action" data-action="cancel-purchase-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Recepciones recientes</h3><p>Con impacto en stock</p></div></div>
        ${dataTable(['Proveedor', 'Producto', 'Cantidad', 'Costo', 'Accion'], ui.enrichedReceipts.map((receipt) => `<div class="data-row"><span>${receipt.supplierName}</span><span>${receipt.productName}</span><span>${receipt.quantity}</span><span>${money(receipt.totalCost)}</span><span>${purchaseActionButtons(receipt)}</span></div>`))}
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Proveedores</h3><p>Saldos y categorias</p></div></div>
        ${dataTable(['Proveedor', 'Categoria', 'Saldo', 'Ultima', 'Accion'], ui.snapshot.suppliers.map((supplier) => `<div class="data-row"><span>${supplier.name}</span><span>${supplier.category}</span><span>${money(supplier.balance)}</span><span>${supplier.lastDelivery}</span><span>${actionButton('supplier', supplier.id)}</span></div>`))}
      </article>
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
          <label>Numero<input type="text" name="number" value="${editingInvoice?.number || ''}" placeholder="Se autogenera si lo dejás vacío" /></label>
          <label>Cliente<select name="customerId" required>${ui.snapshot.customers.map((customer) => `<option value="${customer.id}" ${editingInvoice?.customerId === customer.id ? 'selected' : ''}>${customer.fullName}</option>`).join('')}</select></label>
          <label>Total<input type="number" min="1" name="totalAmount" value="${editingInvoice?.totalAmount || ''}" required /></label>
          <label>Tipo<select name="type"><option ${editingInvoice?.type === 'A' ? 'selected' : ''}>A</option><option ${editingInvoice?.type === 'B' || !editingInvoice ? 'selected' : ''}>B</option><option ${editingInvoice?.type === 'C' ? 'selected' : ''}>C</option></select></label>
          <label>Vencimiento<input type="date" name="dueDate" value="${editingInvoice?.dueDate || today}" required /></label>
          <label>Estado<select name="status"><option ${editingInvoice?.status === 'Emitida' || !editingInvoice ? 'selected' : ''}>Emitida</option><option ${editingInvoice?.status === 'En revision' ? 'selected' : ''}>En revision</option><option ${editingInvoice?.status === 'Cobrada' ? 'selected' : ''}>Cobrada</option></select></label>
          <button type="submit">${editingInvoice ? 'Guardar cambios' : 'Guardar factura'}</button>
          ${editingInvoice ? '<button type="button" class="danger-action" data-action="cancel-invoice-edit">Cancelar edicion</button>' : ''}
        </form>
      </article>
      <article class="panel"><div class="panel-head"><div><h3>Facturas</h3><p>Seguimiento de cobro</p></div></div>
        ${dataTable(['Numero', 'Cliente', 'Sucursal', 'Total', 'Accion'], ui.enrichedInvoices.map((invoice) => `<div class="data-row"><span>${invoice.number}</span><span>${invoice.customerName}</span><span>${invoice.branchName}</span><span>${money(invoice.totalAmount)}</span><span>${invoiceActionButtons(invoice)}</span></div>`))}
      </article>
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
          <label>Numero<input type="text" name="number" value="${editingTicket?.number || ''}" placeholder="Se autogenera si lo dejás vacío" /></label>
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
      <article class="panel"><div class="panel-head"><div><h3>Movimientos de caja</h3><p>Ingresos y egresos manuales</p></div></div><div class="timeline-list">${byRecentDate(ui.reportScopedCashMovements, 'createdAt').slice(0, 6).map((movement) => `<div class="timeline-item"><strong>${movement.kind}</strong><p>${movement.note}</p><span>${money(movement.signedAmount)} · ${movement.createdAt.slice(0, 16).replace('T', ' ')}</span></div>`).join('') || '<p class="empty-state">Sin movimientos de caja en este rango.</p>'}</div></article>
    </section>
  </section>
`

const settingsView = (ui) => `
  <section class="view-section"><div class="section-header"><div><p class="kicker">Ajustes</p><h2>Seguridad y backup</h2></div></div>
    <section class="dashboard-grid reports-layout">
      <article class="panel"><div class="panel-head"><div><h3>Sesion actual</h3><p>Usuario autenticado</p></div></div><div class="priority-list"><div class="priority-item"><strong>Usuario</strong><p>${ui.user.fullName}</p></div><div class="priority-item"><strong>Rol</strong><p>${ui.role.name}</p></div><div class="priority-item"><strong>Persistencia</strong><p>${ui.snapshot.meta.adapter}</p></div></div><div class="settings-actions"><button type="button" class="danger-action" data-action="sign-out">Cerrar sesion</button></div></article>
      <article class="panel"><div class="panel-head"><div><h3>Backup local</h3><p>Exporta o restaura los datos</p></div></div><div class="settings-actions"><button type="button" class="primary-action" data-action="export-data">Exportar JSON</button><label class="file-action">Importar JSON<input type="file" accept="application/json" data-action="import-data" /></label><button type="button" class="danger-action" data-action="reset-data">Restaurar demo</button></div></article>
      <article class="panel"><div class="panel-head"><div><h3>Auditoria</h3><p>Ultimos eventos</p></div></div><div class="timeline-list">${ui.enrichedAudit.map((log) => `<div class="timeline-item"><strong>${log.action}</strong><p>${log.actorName} - ${log.entityType}</p><span>${log.createdAt.slice(0, 16).replace('T', ' ')}</span></div>`).join('')}</div></article>
    </section>
  </section>
`

const renderCurrentView = (ui) => {
  switch (activeSection) {
    case 'clientes': return customersView(ui)
    case 'ventas': return salesView(ui)
    case 'caja': return cashView(ui)
    case 'sucursales': return branchesView(ui)
    case 'cajeros': return registersView(ui)
    case 'productos': return productsView(ui)
    case 'compras': return purchasesView(ui)
    case 'facturacion': return invoicesView(ui)
    case 'tickets': return ticketsView(ui)
    case 'reportes': return reportsView(ui)
    case 'ajustes': return settingsView(ui)
    default: return dashboardView(ui)
  }
}

const renderApp = (ui) => {
  const allowedNav = navItems.filter((item) => store.hasPermission(item.permission))
  if (!allowedNav.some((item) => item.id === activeSection)) activeSection = allowedNav[0]?.id || 'dashboard'
  saveSection()

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand"><img class="brand-logo" src="/pclaf-logo.png" alt="PCLAF" /></div>
        <nav class="sidebar-nav">${allowedNav.map((item) => `<button class="nav-square ${activeSection === item.id ? 'is-active' : ''}" type="button" data-section="${item.id}" title="${item.label}" aria-label="${item.label}"><span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span></button>`).join('')}</nav>
      </aside>
      <div class="workspace">
        <header class="topbar">
          <div class="topbar-left"><p class="kicker">Panel de control</p><h1>${productName}</h1><span>${ui.currentBranch?.name || ui.snapshot.business.branch || 'Sucursal'}</span></div>
          <div class="topbar-center"><div class="searchbar"><span>Estado</span><input type="text" value="${ui.openCashSession ? 'Caja abierta y lista para operar' : 'Sin caja abierta'}" disabled /></div></div>
          <div class="topbar-right"><div class="user-pill compact"><strong>${ui.user.fullName}</strong><span>${ui.role.name}</span></div><button class="theme-toggle" type="button" data-action="toggle-theme">${theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</button><span class="badge">Local</span></div>
        </header>
        <main class="page">${renderCurrentView(ui)}</main>
      </div>
    </div>
  `
}

const render = () => {
  const ui = getUiState()
  app.innerHTML = ui.isAuthenticated ? renderApp(ui) : loginView(ui)
  bindEvents()
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

const handleSubmit = (event) => {
  event.preventDefault()
  const form = event.currentTarget
  const formData = new FormData(form)
  const kind = form.dataset.form

  if (kind === 'login') {
    const result = store.authenticateUser(formData.get('userId'), formData.get('pin'))
    loginMessage = result.ok ? '' : result.message
    feedbackMessage = ''
    render()
    return
  }

  if (kind === 'customer') store.createCustomer({ fullName: formData.get('fullName'), phone: formData.get('phone'), email: formData.get('email'), balance: formData.get('balance'), tag: formData.get('tag') })
  if (kind === 'branch') {
    const result = formData.get('branchId')
      ? store.updateBranch(formData.get('branchId'), { name: formData.get('name'), code: formData.get('code'), address: formData.get('address') })
      : store.createBranch({ name: formData.get('name'), code: formData.get('code'), address: formData.get('address') })
    feedbackMessage = result.message || ''
    branchEditingId = ''
  }
  if (kind === 'register') {
    const result = formData.get('registerId')
      ? store.updateRegister(formData.get('registerId'), { branchId: formData.get('branchId'), name: formData.get('name'), code: formData.get('code'), cashierUserId: formData.get('cashierUserId') })
      : store.createRegister({ branchId: formData.get('branchId'), name: formData.get('name'), code: formData.get('code'), cashierUserId: formData.get('cashierUserId') })
    feedbackMessage = result.message || ''
    registerEditingId = ''
  }
  if (kind === 'report-filter') {
    reportRegisterFilter = formData.get('registerFilter') || 'all'
    reportDateFrom = formData.get('dateFrom') || ''
    reportDateTo = formData.get('dateTo') || ''
    feedbackMessage = 'Filtro de reportes actualizado.'
  }
  if (kind === 'product') store.createProduct({ name: formData.get('name'), sku: formData.get('sku'), stock: formData.get('stock'), salePrice: formData.get('salePrice'), costPrice: formData.get('costPrice'), minStock: formData.get('minStock'), category: formData.get('category'), trackStock: formData.get('trackStock') === 'on' })
  if (kind === 'supplier') store.createSupplier({ name: formData.get('name'), contact: formData.get('contact'), phone: formData.get('phone'), balance: formData.get('balance'), lastDelivery: formData.get('lastDelivery'), category: formData.get('category') })
  if (kind === 'invoice') {
    const currentBranchId = getUiState().currentBranch?.id
    const result = formData.get('invoiceId')
      ? store.updateInvoice(formData.get('invoiceId'), { number: formData.get('number'), customerId: formData.get('customerId'), totalAmount: formData.get('totalAmount'), type: formData.get('type'), dueDate: formData.get('dueDate'), status: formData.get('status'), branchId: currentBranchId })
      : (store.createInvoice({ number: formData.get('number'), customerId: formData.get('customerId'), totalAmount: formData.get('totalAmount'), type: formData.get('type'), dueDate: formData.get('dueDate'), status: formData.get('status'), branchId: currentBranchId }), { ok: true, message: 'Factura guardada.' })
    feedbackMessage = result.message || ''
    invoiceEditingId = ''
  }
  if (kind === 'ticket') {
    const currentBranchId = getUiState().currentBranch?.id
    const result = formData.get('ticketId')
      ? store.updateTicket(formData.get('ticketId'), { number: formData.get('number'), customerId: formData.get('customerId'), device: formData.get('device'), issue: formData.get('issue'), status: formData.get('status'), branchId: currentBranchId })
      : (store.createTicket({ number: formData.get('number'), customerId: formData.get('customerId'), device: formData.get('device'), issue: formData.get('issue'), status: formData.get('status'), branchId: currentBranchId }), { ok: true, message: 'Ticket guardado.' })
    feedbackMessage = result.message || ''
    ticketEditingId = ''
  }
  if (kind === 'open-cash') {
    const registerResult = store.selectRegister(formData.get('registerId'))
    const result = registerResult.ok ? store.openCashSession({ openingAmount: formData.get('openingAmount') }) : registerResult
    feedbackMessage = result.message || (result.ok ? 'Caja abierta correctamente.' : '')
  }
  if (kind === 'close-cash') {
    const result = store.closeCashSession({ countedAmount: formData.get('countedAmount') })
    feedbackMessage = result.message || (result.ok ? 'Caja cerrada correctamente.' : '')
  }
  if (kind === 'cash-movement') {
    const result = store.createCashMovement({ kind: formData.get('kind'), amount: formData.get('amount'), note: formData.get('note') })
    feedbackMessage = result.message || ''
  }
  if (kind === 'purchase-receipt') {
    const result = formData.get('receiptId')
      ? store.updatePurchaseReceipt(formData.get('receiptId'), { supplierId: formData.get('supplierId'), productId: formData.get('productId'), quantity: formData.get('quantity'), unitCost: formData.get('unitCost') })
      : store.createPurchaseReceipt({ supplierId: formData.get('supplierId'), productId: formData.get('productId'), quantity: formData.get('quantity'), unitCost: formData.get('unitCost') })
    feedbackMessage = result.message || (result.ok ? 'Recepcion registrada y stock actualizado.' : '')
    purchaseEditingId = ''
  }
  if (kind === 'sale') {
    const items = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('qty_') && Number(value) > 0) items.push({ productId: key.replace('qty_', ''), quantity: Number(value) })
    }
    const payload = { customerId: formData.get('customerId'), channel: formData.get('channel'), paymentMethod: formData.get('paymentMethod'), isPaid: formData.get('isPaid') === 'on', autoInvoice: formData.get('autoInvoice') === 'on', items }
    const result = formData.get('saleId')
      ? store.updateSale(formData.get('saleId'), payload)
      : store.createSale(payload)
    feedbackMessage = result.message || (result.ok ? 'Venta registrada.' : '')
    saleEditingId = ''
  }

  form.reset()
  render()
}

const bindEvents = () => {
  for (const form of document.querySelectorAll('form[data-form]')) form.addEventListener('submit', handleSubmit)
  for (const button of document.querySelectorAll('[data-section]')) button.addEventListener('click', () => { activeSection = button.dataset.section; saveSection(); render() })
  for (const button of document.querySelectorAll('[data-delete]')) button.addEventListener('click', () => { store.removeEntity(button.dataset.delete, button.dataset.id); feedbackMessage = 'Registro eliminado y movimientos revertidos cuando correspondia.'; render() })
  for (const button of document.querySelectorAll('[data-sale-action]')) {
    button.addEventListener('click', () => {
      if (button.dataset.saleAction === 'edit') {
        saleEditingId = button.dataset.id
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
      if (button.dataset.saleAction === 'export') {
        exportReceipt(button.dataset.id)
        return
      }
      const result = button.dataset.saleAction === 'invoice'
        ? store.createInvoiceFromSale(button.dataset.id)
        : store.createTicketFromSale(button.dataset.id)
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

  const themeToggle = document.querySelector('[data-action="toggle-theme"]')
  if (themeToggle) themeToggle.addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; localStorage.setItem(themeStorageKey, theme); applyTheme(); render() })
  const exportButton = document.querySelector('[data-action="export-data"]')
  if (exportButton) exportButton.addEventListener('click', exportData)
  const exportReportButton = document.querySelector('[data-action="export-report"]')
  if (exportReportButton) exportReportButton.addEventListener('click', exportReport)
  const importInput = document.querySelector('[data-action="import-data"]')
  if (importInput) importInput.addEventListener('change', importData)
  const resetButton = document.querySelector('[data-action="reset-data"]')
  if (resetButton) resetButton.addEventListener('click', () => { store.resetData(); feedbackMessage = 'Demo restaurada.'; render() })
  const signOutButton = document.querySelector('[data-action="sign-out"]')
  if (signOutButton) signOutButton.addEventListener('click', () => { store.signOut(); loginMessage = ''; feedbackMessage = ''; render() })
  const cancelSaleEdit = document.querySelector('[data-action="cancel-sale-edit"]')
  if (cancelSaleEdit) cancelSaleEdit.addEventListener('click', () => { saleEditingId = ''; feedbackMessage = 'Edicion de venta cancelada.'; render() })
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
}

applyTheme()
render()
