const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const today = new Date().toISOString().slice(0, 10)
const productName = 'Control'
const themeStorageKey = 'pclaf-control-theme'
const sectionStorageKey = 'pclaf-control-section'
const dataStorageKey = 'pclaf-control-data'

const icon = (path) => `
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    ${path}
  </svg>
`

const makeId = () => crypto.randomUUID()

const seedData = {
  business: {
    name: 'Panel comercial',
    branch: 'Floresta, CABA',
  },
  products: [
    { id: makeId(), name: 'SSD Kingston 480GB', sku: 'SSD-480', stock: 12, price: 64000, minStock: 4, category: 'Hardware' },
    { id: makeId(), name: 'Pasta termica MX-4', sku: 'PT-MX4', stock: 18, price: 12500, minStock: 6, category: 'Insumos' },
    { id: makeId(), name: 'Fuente 500W generica', sku: 'FU-500', stock: 3, price: 47000, minStock: 5, category: 'Hardware' },
    { id: makeId(), name: 'Limpieza completa notebook', sku: 'SERV-LIM', stock: 99, price: 38000, minStock: 0, category: 'Servicio' },
  ],
  providers: [
    { id: makeId(), name: 'Mayorista Microglobal', contact: 'Daniel Perez', phone: '11 5011 4010', balance: 218000, lastDelivery: '2026-07-10', category: 'Hardware' },
    { id: makeId(), name: 'Tecnoinsumos BA', contact: 'Marina Lopez', phone: '11 4321 9988', balance: 46000, lastDelivery: '2026-07-11', category: 'Insumos' },
  ],
  sales: [
    { id: makeId(), item: 'Limpieza completa notebook', quantity: 1, amount: 38000, channel: 'Mostrador', paid: true, date: '2026-07-12' },
    { id: makeId(), item: 'SSD Kingston 480GB', quantity: 2, amount: 128000, channel: 'WhatsApp', paid: true, date: '2026-07-12' },
    { id: makeId(), item: 'Fuente 500W generica', quantity: 1, amount: 47000, channel: 'Mostrador', paid: false, date: '2026-07-11' },
  ],
  invoices: [
    { id: makeId(), number: 'B-0001-001245', client: 'Juan Lopez', total: 38000, status: 'Cobrada', dueDate: '2026-07-12', type: 'B' },
    { id: makeId(), number: 'A-0003-000184', client: 'Empresa Delta', total: 128000, status: 'Emitida', dueDate: '2026-07-20', type: 'A' },
  ],
  tickets: [
    { id: makeId(), number: 'TEC-1001', customer: 'Juan Lopez', device: 'Notebook Lenovo', issue: 'Cambio de SSD', status: 'En curso', updatedAt: '2026-07-12' },
    { id: makeId(), number: 'TEC-1002', customer: 'Marina Diaz', device: 'PC Gamer', issue: 'No da video', status: 'Esperando aprobacion', updatedAt: '2026-07-11' },
  ],
}

const navItems = [
  { id: 'dashboard', label: 'Inicio', icon: icon('<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/>') },
  { id: 'ventas', label: 'Ventas', icon: icon('<path d="M4 17h16"/><path d="M7 17V9"/><path d="M12 17V5"/><path d="M17 17v-6"/>') },
  { id: 'productos', label: 'Productos', icon: icon('<path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z"/><path d="M3 7.5V16.5L12 21l9-4.5V7.5"/>') },
  { id: 'compras', label: 'Compras', icon: icon('<circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/><path d="M3 4h2l2.4 10.5h10.8L21 8H8"/>') },
  { id: 'facturacion', label: 'Facturas', icon: icon('<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M10 12h6"/><path d="M10 16h6"/>') },
  { id: 'tickets', label: 'Tickets', icon: icon('<rect x="4" y="5" width="16" height="10" rx="2"/><path d="M8 19h8"/><path d="M10 15v4"/><path d="M14 15v4"/>') },
  { id: 'reportes', label: 'Reportes', icon: icon('<path d="M5 19V9"/><path d="M12 19V5"/><path d="M19 19v-8"/><path d="M3 19h18"/>') },
  { id: 'ajustes', label: 'Ajustes', icon: icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8a1.65 1.65 0 0 0 .6 1 1.65 1.65 0 0 0 1 .33H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1 .33 1.65 1.65 0 0 0-.51 1.34Z"/>') },
]

const app = document.querySelector('#app')

const loadState = () => {
  const saved = localStorage.getItem(dataStorageKey)
  if (!saved) return structuredClone(seedData)

  try {
    return { ...structuredClone(seedData), ...JSON.parse(saved) }
  } catch {
    return structuredClone(seedData)
  }
}

const loadTheme = () => localStorage.getItem(themeStorageKey) || 'light'
const loadSection = () => localStorage.getItem(sectionStorageKey) || 'dashboard'

let state = loadState()
let theme = loadTheme()
let activeSection = loadSection()

const saveState = () => localStorage.setItem(dataStorageKey, JSON.stringify(state))
const saveTheme = () => localStorage.setItem(themeStorageKey, theme)
const saveSection = () => localStorage.setItem(sectionStorageKey, activeSection)
const applyTheme = () => {
  document.documentElement.dataset.theme = theme
}

const money = (value) => currency.format(Number(value) || 0)

const getMetrics = () => {
  const totalSales = state.sales.reduce((sum, sale) => sum + sale.amount, 0)
  const unpaidSales = state.sales.filter((sale) => !sale.paid).reduce((sum, sale) => sum + sale.amount, 0)
  const payables = state.providers.reduce((sum, provider) => sum + provider.balance, 0)
  const pendingInvoices = state.invoices.filter((invoice) => invoice.status !== 'Cobrada').reduce((sum, invoice) => sum + invoice.total, 0)
  const lowStock = state.products.filter((product) => product.stock <= product.minStock)
  return { totalSales, unpaidSales, payables, pendingInvoices, lowStock }
}

const getTopProducts = () => {
  const sold = new Map()
  for (const sale of state.sales) sold.set(sale.item, (sold.get(sale.item) || 0) + sale.quantity)
  return [...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
}

const byRecentDate = (items, key = 'date') =>
  items.slice().sort((a, b) => String(b[key]).localeCompare(String(a[key])))

const actionButton = (entity, id, label = 'Eliminar') =>
  `<button type="button" class="inline-action" data-delete="${entity}" data-id="${id}">${label}</button>`

const recentSalesMarkup = () =>
  byRecentDate(state.sales)
    .slice(0, 6)
    .map(
      (sale) => `
        <div class="list-row">
          <div>
            <strong>${sale.item}</strong>
            <p>${sale.date} - ${sale.channel}</p>
          </div>
          <div class="right">
            <strong>${money(sale.amount)}</strong>
            <p>${sale.quantity} un. - ${sale.paid ? 'Cobrado' : 'Pendiente'}</p>
          </div>
        </div>`,
    )
    .join('')

const topProductsMarkup = (topProducts) =>
  topProducts.length
    ? topProducts
        .map(
          ([item, quantity], index) => `
            <div class="top-row">
              <span>${index + 1}</span>
              <div>
                <strong>${item}</strong>
                <p>${quantity} unidades vendidas</p>
              </div>
            </div>`,
        )
        .join('')
    : '<p class="empty-state">Todavia no hay ventas cargadas.</p>'

const alertsMarkup = (lowStock) =>
  lowStock.length
    ? lowStock
        .map(
          (product) => `
            <div class="alert-card">
              <strong>${product.name}</strong>
              <p>Stock ${product.stock} / minimo ${product.minStock}</p>
            </div>`,
        )
        .join('')
    : '<div class="alert-card ok"><strong>Sin alertas criticas</strong><p>El inventario esta estable.</p></div>'

const dataTable = (headers, rows) => `
  <div class="data-table">
    <div class="data-head">
      ${headers.map((header) => `<span>${header}</span>`).join('')}
    </div>
    ${rows.length ? rows.join('') : '<div class="data-empty">No hay registros todavia.</div>'}
  </div>
`

const dashboardView = (metrics, topProducts) => `
  <section class="view-section">
    <div class="section-header">
      <div>
        <p class="kicker">Resumen diario</p>
        <h2>Lo importante de hoy</h2>
      </div>
    </div>
    <section class="metrics-grid">
      <article class="metric-card"><span>Ventas registradas</span><strong>${money(metrics.totalSales)}</strong><p>${state.sales.length} operaciones</p></article>
      <article class="metric-card"><span>Por cobrar</span><strong>${money(metrics.unpaidSales)}</strong><p>${state.sales.filter((sale) => !sale.paid).length} pendientes</p></article>
      <article class="metric-card"><span>Facturas abiertas</span><strong>${money(metrics.pendingInvoices)}</strong><p>${state.invoices.filter((invoice) => invoice.status !== 'Cobrada').length} comprobantes</p></article>
      <article class="metric-card"><span>A pagar</span><strong>${money(metrics.payables)}</strong><p>${state.providers.length} proveedores activos</p></article>
    </section>
    <section class="dashboard-grid">
      <article class="panel"><div class="panel-head"><div><h3>Ventas recientes</h3><p>Lo ultimo que paso en caja</p></div></div><div class="list">${recentSalesMarkup()}</div></article>
      <article class="panel"><div class="panel-head"><div><h3>Articulos mas vendidos</h3><p>Ranking de movimiento</p></div></div><div class="top-list">${topProductsMarkup(topProducts)}</div></article>
      <article class="panel"><div class="panel-head"><div><h3>Alertas de stock</h3><p>Productos para reponer</p></div></div><div class="alert-list">${alertsMarkup(metrics.lowStock)}</div></article>
      <article class="panel"><div class="panel-head"><div><h3>Tickets recientes</h3><p>Seguimiento operativo</p></div></div><div class="list">
        ${byRecentDate(state.tickets, 'updatedAt').slice(0, 5).map((ticket) => `
          <div class="list-row">
            <div><strong>${ticket.number}</strong><p>${ticket.customer} - ${ticket.device}</p></div>
            <div class="right"><strong>${ticket.status}</strong><p>${ticket.updatedAt}</p></div>
          </div>`).join('')}
      </div></article>
    </section>
  </section>
`

const salesView = () => `
  <section class="view-section">
    <div class="section-header"><div><p class="kicker">Ventas</p><h2>Registrar venta</h2></div></div>
    <section class="content-grid single-focus">
      <article class="panel">
        <div class="panel-head"><div><h3>Carga rapida</h3><p>Operacion y cobro en una sola vista</p></div></div>
        <form class="form-grid" data-form="sale">
          <label>Producto<select name="item" required>${state.products.map((product) => `<option value="${product.name}">${product.name}</option>`).join('')}</select></label>
          <label>Cantidad<input type="number" name="quantity" min="1" value="1" required /></label>
          <label>Monto total<input type="number" name="amount" min="1" placeholder="38000" required /></label>
          <label>Canal<select name="channel"><option>Mostrador</option><option>WhatsApp</option><option>Transferencia</option><option>Mercado Pago</option></select></label>
          <label class="checkbox-row"><input type="checkbox" name="paid" checked />Cobrado</label>
          <button type="submit">Registrar venta</button>
        </form>
      </article>
      <article class="panel">
        <div class="panel-head"><div><h3>Historial</h3><p>Ventas guardadas localmente</p></div></div>
        ${dataTable(
          ['Producto', 'Fecha', 'Canal', 'Total', 'Accion'],
          byRecentDate(state.sales).map(
            (sale) => `
              <div class="data-row">
                <span>${sale.item}</span>
                <span>${sale.date}</span>
                <span>${sale.channel}</span>
                <span>${money(sale.amount)}</span>
                <span>${actionButton('sale', sale.id)}</span>
              </div>`,
          ),
        )}
      </article>
    </section>
  </section>
`

const productsView = () => `
  <section class="view-section">
    <div class="section-header"><div><p class="kicker">Productos</p><h2>Catalogo y stock</h2></div></div>
    <section class="content-grid single-focus">
      <article class="panel">
        <div class="panel-head"><div><h3>Alta de productos</h3><p>Stock, precios y categorias</p></div></div>
        <form class="form-grid" data-form="product">
          <label>Nombre<input type="text" name="name" placeholder="Mouse gamer USB" required /></label>
          <label>SKU<input type="text" name="sku" placeholder="MO-USB" required /></label>
          <label>Stock<input type="number" name="stock" min="0" required /></label>
          <label>Precio<input type="number" name="price" min="0" required /></label>
          <label>Minimo<input type="number" name="minStock" min="0" required /></label>
          <label>Categoria<input type="text" name="category" placeholder="Perifericos" required /></label>
          <button type="submit">Guardar producto</button>
        </form>
      </article>
      <article class="panel">
        <div class="panel-head"><div><h3>Inventario</h3><p>Control rapido de stock</p></div></div>
        ${dataTable(
          ['Producto', 'SKU', 'Stock', 'Precio', 'Accion'],
          state.products.map(
            (product) => `
              <div class="data-row">
                <span>${product.name}</span>
                <span>${product.sku}</span>
                <span>${product.stock}</span>
                <span>${money(product.price)}</span>
                <span>${actionButton('product', product.id)}</span>
              </div>`,
          ),
        )}
      </article>
    </section>
  </section>
`

const purchasesView = () => `
  <section class="view-section">
    <div class="section-header"><div><p class="kicker">Compras</p><h2>Proveedores y saldos</h2></div></div>
    <section class="content-grid single-focus">
      <article class="panel">
        <div class="panel-head"><div><h3>Alta de proveedor</h3><p>Ingresos y saldos pendientes</p></div></div>
        <form class="form-grid" data-form="provider">
          <label>Empresa<input type="text" name="name" required /></label>
          <label>Contacto<input type="text" name="contact" required /></label>
          <label>Telefono<input type="text" name="phone" required /></label>
          <label>Saldo pendiente<input type="number" name="balance" min="0" required /></label>
          <label>Ultima entrega<input type="date" name="lastDelivery" value="${today}" required /></label>
          <label>Categoria<input type="text" name="category" required /></label>
          <button type="submit">Guardar proveedor</button>
        </form>
      </article>
      <article class="panel">
        <div class="panel-head"><div><h3>Proveedores activos</h3><p>Resumen de deuda</p></div></div>
        ${dataTable(
          ['Proveedor', 'Categoria', 'Saldo', 'Ultima', 'Accion'],
          state.providers.map(
            (provider) => `
              <div class="data-row">
                <span>${provider.name}</span>
                <span>${provider.category}</span>
                <span>${money(provider.balance)}</span>
                <span>${provider.lastDelivery}</span>
                <span>${actionButton('provider', provider.id)}</span>
              </div>`,
          ),
        )}
      </article>
    </section>
  </section>
`

const invoicesView = () => `
  <section class="view-section">
    <div class="section-header"><div><p class="kicker">Facturacion</p><h2>Comprobantes</h2></div></div>
    <section class="content-grid single-focus">
      <article class="panel">
        <div class="panel-head"><div><h3>Nueva factura</h3><p>Comprobantes y seguimiento</p></div></div>
        <form class="form-grid" data-form="invoice">
          <label>Numero<input type="text" name="number" placeholder="B-0001-001555" required /></label>
          <label>Cliente<input type="text" name="client" required /></label>
          <label>Total<input type="number" name="total" min="1" required /></label>
          <label>Tipo<select name="type"><option>A</option><option>B</option><option>C</option></select></label>
          <label>Vencimiento<input type="date" name="dueDate" value="${today}" required /></label>
          <label>Estado<select name="status"><option>Emitida</option><option>En revision</option><option>Cobrada</option></select></label>
          <button type="submit">Guardar factura</button>
        </form>
      </article>
      <article class="panel">
        <div class="panel-head"><div><h3>Facturas cargadas</h3><p>Seguimiento local</p></div></div>
        ${dataTable(
          ['Numero', 'Cliente', 'Estado', 'Total', 'Accion'],
          byRecentDate(state.invoices, 'dueDate').map(
            (invoice) => `
              <div class="data-row">
                <span>${invoice.number}</span>
                <span>${invoice.client}</span>
                <span>${invoice.status}</span>
                <span>${money(invoice.total)}</span>
                <span>${actionButton('invoice', invoice.id)}</span>
              </div>`,
          ),
        )}
      </article>
    </section>
  </section>
`

const ticketsView = () => `
  <section class="view-section">
    <div class="section-header"><div><p class="kicker">Tickets</p><h2>Seguimiento operativo</h2></div></div>
    <section class="content-grid single-focus">
      <article class="panel">
        <div class="panel-head"><div><h3>Nuevo ticket</h3><p>Ingreso de equipo o proceso</p></div></div>
        <form class="form-grid" data-form="ticket">
          <label>Numero<input type="text" name="number" placeholder="TEC-1003" required /></label>
          <label>Cliente<input type="text" name="customer" required /></label>
          <label>Equipo / item<input type="text" name="device" required /></label>
          <label>Estado<select name="status"><option>Recibido</option><option>En curso</option><option>Esperando aprobacion</option><option>Listo para entregar</option></select></label>
          <label class="full-span">Detalle<input type="text" name="issue" placeholder="Cambio de pantalla" required /></label>
          <button type="submit">Guardar ticket</button>
        </form>
      </article>
      <article class="panel">
        <div class="panel-head"><div><h3>Tickets activos</h3><p>Estado actual del trabajo</p></div></div>
        ${dataTable(
          ['Ticket', 'Cliente', 'Estado', 'Actualizado', 'Accion'],
          byRecentDate(state.tickets, 'updatedAt').map(
            (ticket) => `
              <div class="data-row">
                <span>${ticket.number}</span>
                <span>${ticket.customer}</span>
                <span>${ticket.status}</span>
                <span>${ticket.updatedAt}</span>
                <span>${actionButton('ticket', ticket.id)}</span>
              </div>`,
          ),
        )}
      </article>
    </section>
  </section>
`

const reportsView = (metrics, topProducts) => `
  <section class="view-section">
    <div class="section-header"><div><p class="kicker">Reportes</p><h2>Indicadores y prioridades</h2></div></div>
    <section class="dashboard-grid reports-layout">
      <article class="panel"><div class="panel-head"><div><h3>Top productos</h3><p>Rendimiento comercial</p></div></div><div class="top-list">${topProductsMarkup(topProducts)}</div></article>
      <article class="panel"><div class="panel-head"><div><h3>Alertas</h3><p>Acciones inmediatas</p></div></div><div class="alert-list">${alertsMarkup(metrics.lowStock)}</div></article>
      <article class="panel"><div class="panel-head"><div><h3>Balance rapido</h3><p>Estado actual</p></div></div><div class="priority-list">
        <div class="priority-item"><strong>Por cobrar</strong><p>${money(metrics.unpaidSales)}</p></div>
        <div class="priority-item"><strong>Por pagar</strong><p>${money(metrics.payables)}</p></div>
        <div class="priority-item"><strong>Facturas abiertas</strong><p>${money(metrics.pendingInvoices)}</p></div>
      </div></article>
    </section>
  </section>
`

const settingsView = () => `
  <section class="view-section">
    <div class="section-header"><div><p class="kicker">Ajustes</p><h2>Datos locales</h2></div></div>
    <section class="dashboard-grid reports-layout">
      <article class="panel">
        <div class="panel-head"><div><h3>Backup local</h3><p>Exporta o restaura los datos del navegador</p></div></div>
        <div class="settings-actions">
          <button type="button" class="primary-action" data-action="export-data">Exportar JSON</button>
          <label class="file-action">Importar JSON<input type="file" accept="application/json" data-action="import-data" /></label>
          <button type="button" class="danger-action" data-action="reset-data">Restaurar demo</button>
        </div>
      </article>
      <article class="panel">
        <div class="panel-head"><div><h3>Estado actual</h3><p>Resumen del almacenamiento local</p></div></div>
        <div class="priority-list">
          <div class="priority-item"><strong>Productos</strong><p>${state.products.length} registros</p></div>
          <div class="priority-item"><strong>Ventas</strong><p>${state.sales.length} registros</p></div>
          <div class="priority-item"><strong>Tickets</strong><p>${state.tickets.length} registros</p></div>
        </div>
      </article>
    </section>
  </section>
`

const renderCurrentView = (metrics, topProducts) => {
  switch (activeSection) {
    case 'ventas': return salesView()
    case 'productos': return productsView()
    case 'compras': return purchasesView()
    case 'facturacion': return invoicesView()
    case 'tickets': return ticketsView()
    case 'reportes': return reportsView(metrics, topProducts)
    case 'ajustes': return settingsView()
    default: return dashboardView(metrics, topProducts)
  }
}

const render = () => {
  const metrics = getMetrics()
  const topProducts = getTopProducts()

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <img class="brand-logo" src="/pclaf-logo.png" alt="PCLAF" />
        </div>
        <nav class="sidebar-nav">
          ${navItems
            .map(
              (item) => `
                <button class="nav-square ${activeSection === item.id ? 'is-active' : ''}" type="button" data-section="${item.id}" title="${item.label}" aria-label="${item.label}">
                  <span class="nav-icon">${item.icon}</span>
                  <span class="nav-label">${item.label}</span>
                </button>`,
            )
            .join('')}
        </nav>
      </aside>

      <div class="workspace">
        <header class="topbar">
          <div class="topbar-left">
            <p class="kicker">Panel de control</p>
            <h1>${productName}</h1>
            <span>${state.business.branch}</span>
          </div>
          <div class="topbar-center">
            <div class="searchbar">
              <span>Buscar</span>
              <input type="text" placeholder="Base local de prueba" disabled />
            </div>
          </div>
          <div class="topbar-right">
            <button class="theme-toggle" type="button" data-action="toggle-theme" aria-label="Cambiar tema">
              ${theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            </button>
            <span class="badge">Local</span>
          </div>
        </header>

        <main class="page">
          ${renderCurrentView(metrics, topProducts)}
        </main>
      </div>
    </div>
  `

  bindEvents()
}

const bindEvents = () => {
  for (const form of document.querySelectorAll('form[data-form]')) {
    form.addEventListener('submit', handleSubmit)
  }

  for (const button of document.querySelectorAll('[data-section]')) {
    button.addEventListener('click', () => {
      activeSection = button.dataset.section
      saveSection()
      render()
    })
  }

  for (const button of document.querySelectorAll('[data-delete]')) {
    button.addEventListener('click', () => removeEntity(button.dataset.delete, button.dataset.id))
  }

  const toggle = document.querySelector('[data-action="toggle-theme"]')
  if (toggle) {
    toggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark'
      saveTheme()
      applyTheme()
      render()
    })
  }

  const exportButton = document.querySelector('[data-action="export-data"]')
  if (exportButton) exportButton.addEventListener('click', exportData)

  const importInput = document.querySelector('[data-action="import-data"]')
  if (importInput) importInput.addEventListener('change', importData)

  const resetButton = document.querySelector('[data-action="reset-data"]')
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      state = structuredClone(seedData)
      saveState()
      render()
    })
  }
}

const removeEntity = (entity, id) => {
  const map = {
    sale: 'sales',
    product: 'products',
    provider: 'providers',
    invoice: 'invoices',
    ticket: 'tickets',
  }

  const key = map[entity]
  if (!key) return
  state[key] = state[key].filter((item) => item.id !== id)
  saveState()
  render()
}

const exportData = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pclaf-control-backup-${today}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const importData = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    state = { ...structuredClone(seedData), ...parsed }
    saveState()
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

  if (kind === 'sale') {
    const item = formData.get('item')
    const quantity = Number(formData.get('quantity'))
    const amount = Number(formData.get('amount'))
    const paid = formData.get('paid') === 'on'
    const product = state.products.find((entry) => entry.name === item)

    if (product) product.stock = Math.max(0, product.stock - quantity)

    state.sales.unshift({
      id: makeId(),
      item,
      quantity,
      amount,
      channel: formData.get('channel'),
      paid,
      date: today,
    })
  }

  if (kind === 'product') {
    state.products.unshift({
      id: makeId(),
      name: formData.get('name'),
      sku: formData.get('sku'),
      stock: Number(formData.get('stock')),
      price: Number(formData.get('price')),
      minStock: Number(formData.get('minStock')),
      category: formData.get('category'),
    })
  }

  if (kind === 'provider') {
    state.providers.unshift({
      id: makeId(),
      name: formData.get('name'),
      contact: formData.get('contact'),
      phone: formData.get('phone'),
      balance: Number(formData.get('balance')),
      lastDelivery: formData.get('lastDelivery'),
      category: formData.get('category'),
    })
  }

  if (kind === 'invoice') {
    state.invoices.unshift({
      id: makeId(),
      number: formData.get('number'),
      client: formData.get('client'),
      total: Number(formData.get('total')),
      type: formData.get('type'),
      dueDate: formData.get('dueDate'),
      status: formData.get('status'),
    })
  }

  if (kind === 'ticket') {
    state.tickets.unshift({
      id: makeId(),
      number: formData.get('number'),
      customer: formData.get('customer'),
      device: formData.get('device'),
      issue: formData.get('issue'),
      status: formData.get('status'),
      updatedAt: today,
    })
  }

  saveState()
  form.reset()
  render()
}

applyTheme()
render()
