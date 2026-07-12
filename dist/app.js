const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const today = new Date().toISOString().slice(0, 10)

const seedData = {
  business: {
    name: 'codelector local',
    owner: 'Lucia Torres',
    shift: 'Sucursal Centro',
  },
  products: [
    { id: crypto.randomUUID(), name: 'Yerba Tradicional 1kg', sku: 'YT-100', stock: 22, price: 5400, minStock: 10, category: 'Almacen' },
    { id: crypto.randomUUID(), name: 'Galletitas de Avena', sku: 'GA-014', stock: 14, price: 1850, minStock: 8, category: 'Kiosco' },
    { id: crypto.randomUUID(), name: 'Lavandina 2L', sku: 'LV-210', stock: 7, price: 3200, minStock: 9, category: 'Limpieza' },
    { id: crypto.randomUUID(), name: 'Aceite de Girasol 900ml', sku: 'AG-900', stock: 18, price: 4100, minStock: 6, category: 'Almacen' },
  ],
  providers: [
    { id: crypto.randomUUID(), name: 'Distribuidora Norte', contact: 'Marina Lopez', phone: '11 4321 9988', balance: 128000, lastDelivery: '2026-07-09', category: 'Almacen' },
    { id: crypto.randomUUID(), name: 'Higiene Sur', contact: 'Jorge Benitez', phone: '11 5511 4010', balance: 42000, lastDelivery: '2026-07-11', category: 'Limpieza' },
  ],
  sales: [
    { id: crypto.randomUUID(), item: 'Yerba Tradicional 1kg', quantity: 3, amount: 16200, channel: 'Mostrador', paid: true, date: '2026-07-12' },
    { id: crypto.randomUUID(), item: 'Aceite de Girasol 900ml', quantity: 2, amount: 8200, channel: 'WhatsApp', paid: true, date: '2026-07-12' },
    { id: crypto.randomUUID(), item: 'Lavandina 2L', quantity: 1, amount: 3200, channel: 'Delivery', paid: false, date: '2026-07-11' },
  ],
  invoices: [
    { id: crypto.randomUUID(), number: 'A-0003-000184', client: 'Punto Verde', total: 48600, status: 'Emitida', dueDate: '2026-07-20', type: 'A' },
    { id: crypto.randomUUID(), number: 'B-0001-000992', client: 'Consumidor Final', total: 8200, status: 'Cobrada', dueDate: '2026-07-12', type: 'B' },
  ],
}

const modules = [
  { id: 'lector', icon: '◯', label: 'Lector', detail: 'Escaneo rapido' },
  { id: 'caja', icon: '⚙', label: 'Caja', detail: 'Cobros y cierres' },
  { id: 'productos', icon: '🏷', label: 'Productos', detail: 'Catalogo y precios' },
  { id: 'precios', icon: '$', label: 'Precios', detail: 'Margenes activos' },
  { id: 'compras', icon: '🛒', label: 'Compras', detail: 'Ordenes y recepcion' },
  { id: 'clientes', icon: '☀', label: 'Clientes', detail: 'Segmentos frecuentes' },
  { id: 'proveedores', icon: '⌖', label: 'Proveedores', detail: 'Cuentas a pagar' },
  { id: 'ventas', icon: '▣', label: 'Ventas', detail: 'Ultimos movimientos' },
  { id: 'cheques', icon: '≡', label: 'Cheques', detail: 'Calendario financiero' },
  { id: 'cajeros', icon: '◔', label: 'Cajeros', detail: 'Turnos y permisos' },
  { id: 'facturacion', icon: '▤', label: 'Facturacion', detail: 'Comprobantes' },
  { id: 'reportes', icon: '✦', label: 'Reportes', detail: 'Resumen del dia' },
]

const storageKey = 'comercio360-data'
const app = document.querySelector('#app')

const loadState = () => {
  const saved = localStorage.getItem(storageKey)
  if (!saved) return structuredClone(seedData)

  try {
    return { ...structuredClone(seedData), ...JSON.parse(saved) }
  } catch {
    return structuredClone(seedData)
  }
}

let state = loadState()

const saveState = () => {
  localStorage.setItem(storageKey, JSON.stringify(state))
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

  for (const sale of state.sales) {
    sold.set(sale.item, (sold.get(sale.item) || 0) + sale.quantity)
  }

  return [...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
}

const render = () => {
  const metrics = getMetrics()
  const topProducts = getTopProducts()

  app.innerHTML = `
    <div class="app-shell">
      <aside class="nav-rail">
        <div class="brand-stack">
          <div class="brand-logo">c</div>
          <div class="rail-items">
            <a href="#dashboard">Inicio</a>
            <a href="#ventas">Ventas</a>
            <a href="#compras">Compras</a>
            <a href="#clientes">Clientes</a>
            <a href="#proveedores">Proveedores</a>
            <a href="#cajeros">Cajeros</a>
            <a href="#facturacion">Facturas</a>
          </div>
        </div>
        <div class="rail-foot">Soporte</div>
      </aside>

      <div class="workspace">
        <header class="topbar">
          <div class="topbar-left">
            <strong>${state.business.name}</strong>
            <span>${state.business.owner} - ${state.business.shift}</span>
          </div>
          <div class="searchbar">
            <span>⌕</span>
            <input type="text" value="" placeholder="Buscar productos, clientes y proveedores" />
          </div>
          <div class="topbar-right">
            <span class="status-pill">Online</span>
            <span class="avatar">${state.business.owner[0]}</span>
          </div>
        </header>

        <main class="page">
          <section class="dashboard-card" id="dashboard">
            <p class="section-label">Panel principal</p>
            <h1>¿Que quieres hacer?</h1>
            <div class="module-grid">
              ${modules
                .map(
                  (module) => `
                    <button class="module-card" data-jump="${module.id}" type="button">
                      <span class="module-icon">${module.icon}</span>
                      <strong>${module.label}</strong>
                      <small>${module.detail}</small>
                    </button>`,
                )
                .join('')}
            </div>
          </section>

          <section class="strip-metrics">
            <article class="metric-box">
              <span>Ventas del dia</span>
              <strong>${money(metrics.totalSales)}</strong>
              <small>${state.sales.length} operaciones</small>
            </article>
            <article class="metric-box">
              <span>Por cobrar</span>
              <strong>${money(metrics.unpaidSales)}</strong>
              <small>${state.sales.filter((sale) => !sale.paid).length} pendientes</small>
            </article>
            <article class="metric-box">
              <span>Stock critico</span>
              <strong>${metrics.lowStock.length}</strong>
              <small>${metrics.lowStock[0] ? metrics.lowStock[0].name : 'Sin alertas'}</small>
            </article>
            <article class="metric-box">
              <span>Facturas abiertas</span>
              <strong>${money(metrics.pendingInvoices)}</strong>
              <small>${state.invoices.filter((invoice) => invoice.status !== 'Cobrada').length} comprobantes</small>
            </article>
          </section>

          <section class="content-grid">
            <article class="panel large-panel" id="ventas">
              <div class="panel-head">
                <div>
                  <h2>Ventas</h2>
                  <p>Registra operaciones y descuenta stock automaticamente.</p>
                </div>
              </div>
              <form class="form-grid" data-form="sale">
                <label>
                  Producto
                  <select name="item" required>
                    ${state.products.map((product) => `<option value="${product.name}">${product.name}</option>`).join('')}
                  </select>
                </label>
                <label>
                  Cantidad
                  <input type="number" name="quantity" min="1" value="1" required />
                </label>
                <label>
                  Monto total
                  <input type="number" name="amount" min="1" placeholder="5400" required />
                </label>
                <label>
                  Canal
                  <select name="channel">
                    <option>Mostrador</option>
                    <option>WhatsApp</option>
                    <option>Delivery</option>
                    <option>Mayorista</option>
                  </select>
                </label>
                <label class="checkbox-row">
                  <input type="checkbox" name="paid" checked />
                  Cobrado
                </label>
                <button type="submit">Registrar venta</button>
              </form>
              <div class="mini-list">
                ${state.sales
                  .slice()
                  .reverse()
                  .slice(0, 4)
                  .map(
                    (sale) => `
                      <div class="mini-row">
                        <div>
                          <strong>${sale.item}</strong>
                          <p>${sale.date} - ${sale.channel}</p>
                        </div>
                        <div class="mini-value">
                          <strong>${money(sale.amount)}</strong>
                          <p>${sale.quantity} un. - ${sale.paid ? 'Cobrado' : 'Pendiente'}</p>
                        </div>
                      </div>`,
                  )
                  .join('')}
              </div>
            </article>

            <article class="panel side-panel" id="productos">
              <div class="panel-head">
                <div>
                  <h2>Productos</h2>
                  <p>Alta rapida para catalogo y stock.</p>
                </div>
              </div>
              <form class="form-grid compact" data-form="product">
                <label>
                  Nombre
                  <input type="text" name="name" placeholder="Cafe molido 500g" required />
                </label>
                <label>
                  SKU
                  <input type="text" name="sku" placeholder="CF-500" required />
                </label>
                <label>
                  Stock
                  <input type="number" name="stock" min="0" required />
                </label>
                <label>
                  Precio
                  <input type="number" name="price" min="0" required />
                </label>
                <label>
                  Minimo
                  <input type="number" name="minStock" min="0" required />
                </label>
                <label>
                  Categoria
                  <input type="text" name="category" placeholder="Almacen" required />
                </label>
                <button type="submit">Guardar producto</button>
              </form>
            </article>

            <article class="panel" id="compras">
              <div class="panel-head">
                <div>
                  <h2>Compras y proveedores</h2>
                  <p>Controla recepciones y cuentas a pagar.</p>
                </div>
              </div>
              <form class="form-grid compact" data-form="provider">
                <label>
                  Empresa
                  <input type="text" name="name" required />
                </label>
                <label>
                  Contacto
                  <input type="text" name="contact" required />
                </label>
                <label>
                  Telefono
                  <input type="text" name="phone" required />
                </label>
                <label>
                  Saldo pendiente
                  <input type="number" name="balance" min="0" required />
                </label>
                <label>
                  Ultima entrega
                  <input type="date" name="lastDelivery" value="${today}" required />
                </label>
                <label>
                  Categoria
                  <input type="text" name="category" required />
                </label>
                <button type="submit">Guardar proveedor</button>
              </form>
              <div class="mini-list">
                ${state.providers
                  .slice(0, 4)
                  .map(
                    (provider) => `
                      <div class="mini-row">
                        <div>
                          <strong>${provider.name}</strong>
                          <p>${provider.contact} - ${provider.phone}</p>
                        </div>
                        <div class="mini-value">
                          <strong>${money(provider.balance)}</strong>
                          <p>${provider.category}</p>
                        </div>
                      </div>`,
                  )
                  .join('')}
              </div>
            </article>

            <article class="panel" id="facturacion">
              <div class="panel-head">
                <div>
                  <h2>Facturacion</h2>
                  <p>Emite comprobantes y sigue el estado de cobro.</p>
                </div>
              </div>
              <form class="form-grid compact" data-form="invoice">
                <label>
                  Numero
                  <input type="text" name="number" placeholder="B-0001-001245" required />
                </label>
                <label>
                  Cliente
                  <input type="text" name="client" required />
                </label>
                <label>
                  Total
                  <input type="number" name="total" min="1" required />
                </label>
                <label>
                  Tipo
                  <select name="type">
                    <option>A</option>
                    <option>B</option>
                    <option>C</option>
                  </select>
                </label>
                <label>
                  Vencimiento
                  <input type="date" name="dueDate" value="${today}" required />
                </label>
                <label>
                  Estado
                  <select name="status">
                    <option>Emitida</option>
                    <option>En revision</option>
                    <option>Cobrada</option>
                  </select>
                </label>
                <button type="submit">Guardar factura</button>
              </form>
              <div class="mini-list">
                ${state.invoices
                  .slice()
                  .reverse()
                  .slice(0, 4)
                  .map(
                    (invoice) => `
                      <div class="mini-row">
                        <div>
                          <strong>${invoice.number}</strong>
                          <p>${invoice.client} - Tipo ${invoice.type}</p>
                        </div>
                        <div class="mini-value">
                          <strong>${money(invoice.total)}</strong>
                          <p>${invoice.status}</p>
                        </div>
                      </div>`,
                  )
                  .join('')}
              </div>
            </article>

            <article class="panel stats-panel" id="clientes">
              <div class="panel-head">
                <div>
                  <h2>Resumen rapido</h2>
                  <p>Accesos directos para caja, clientes y alertas.</p>
                </div>
              </div>
              <div class="top-products">
                ${topProducts.length
                  ? topProducts
                      .map(
                        ([item, quantity], index) => `
                          <div class="top-item">
                            <span>${index + 1}</span>
                            <div>
                              <strong>${item}</strong>
                              <p>${quantity} unidades vendidas</p>
                            </div>
                          </div>`,
                      )
                      .join('')
                  : '<p class="empty-state">Todavia no hay ventas cargadas.</p>'}
              </div>
              <div class="alert-list">
                ${
                  metrics.lowStock.length
                    ? metrics.lowStock
                        .map(
                          (product) => `
                            <div class="notice warning">
                              <strong>${product.name}</strong>
                              <p>Stock ${product.stock} / minimo ${product.minStock}</p>
                            </div>`,
                        )
                        .join('')
                    : '<div class="notice success"><strong>Inventario estable</strong><p>No hay productos debajo del minimo.</p></div>'
                }
              </div>
            </article>
          </section>
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

  for (const button of document.querySelectorAll('[data-jump]')) {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.jump)
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
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

    state.sales.push({
      id: crypto.randomUUID(),
      item,
      quantity,
      amount,
      channel: formData.get('channel'),
      paid,
      date: today,
    })
  }

  if (kind === 'product') {
    state.products.push({
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
      name: formData.get('name'),
      contact: formData.get('contact'),
      phone: formData.get('phone'),
      balance: Number(formData.get('balance')),
      lastDelivery: formData.get('lastDelivery'),
      category: formData.get('category'),
    })
  }

  if (kind === 'invoice') {
    state.invoices.push({
      id: crypto.randomUUID(),
      number: formData.get('number'),
      client: formData.get('client'),
      total: Number(formData.get('total')),
      type: formData.get('type'),
      dueDate: formData.get('dueDate'),
      status: formData.get('status'),
    })
  }

  saveState()
  form.reset()
  render()
}

render()
