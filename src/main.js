import './style.css'

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const today = new Date().toISOString().slice(0, 10)

const seedData = {
  business: {
    name: 'Mercado Central Demo',
    owner: 'Lucia Torres',
    shift: 'Turno tarde',
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

const storageKey = 'comercio360-data'

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

  return {
    totalSales,
    unpaidSales,
    payables,
    pendingInvoices,
    lowStock,
  }
}

const getTopProducts = () => {
  const sold = new Map()

  for (const sale of state.sales) {
    sold.set(sale.item, (sold.get(sale.item) || 0) + sale.quantity)
  }

  return [...sold.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
}

const app = document.querySelector('#app')

const render = () => {
  const metrics = getMetrics()
  const topProducts = getTopProducts()

  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div>
          <p class="eyebrow">Comercio 360</p>
          <h1>${state.business.name}</h1>
          <p class="muted">${state.business.owner} · ${state.business.shift}</p>
        </div>
        <nav class="menu">
          <a href="#resumen">Resumen</a>
          <a href="#ventas">Ventas</a>
          <a href="#inventario">Inventario</a>
          <a href="#proveedores">Proveedores</a>
          <a href="#facturacion">Facturacion</a>
        </nav>
        <div class="sidebar-card">
          <p class="label">Caja del dia</p>
          <strong>${money(metrics.totalSales - metrics.unpaidSales)}</strong>
          <span>${state.sales.filter((sale) => sale.date === today).length} movimientos registrados hoy</span>
        </div>
      </aside>

      <main class="content">
        <section class="hero-panel" id="resumen">
          <div>
            <p class="eyebrow">Operacion diaria</p>
            <h2>Controla ventas, compras y facturas desde un solo tablero.</h2>
            <p class="lead">La app guarda informacion en este navegador para que el equipo pueda trabajar con una base simple, rapida y sin configuraciones extra.</p>
          </div>
          <div class="hero-stats">
            <div>
              <span>Ventas acumuladas</span>
              <strong>${money(metrics.totalSales)}</strong>
            </div>
            <div>
              <span>Cuentas a pagar</span>
              <strong>${money(metrics.payables)}</strong>
            </div>
          </div>
        </section>

        <section class="kpis">
          <article class="kpi-card accent">
            <span>Facturacion pendiente</span>
            <strong>${money(metrics.pendingInvoices)}</strong>
            <p>${state.invoices.filter((invoice) => invoice.status !== 'Cobrada').length} comprobantes por seguir</p>
          </article>
          <article class="kpi-card">
            <span>Ventas sin cobrar</span>
            <strong>${money(metrics.unpaidSales)}</strong>
            <p>${state.sales.filter((sale) => !sale.paid).length} operaciones abiertas</p>
          </article>
          <article class="kpi-card">
            <span>Alertas de stock</span>
            <strong>${metrics.lowStock.length}</strong>
            <p>${metrics.lowStock[0] ? metrics.lowStock[0].name : 'Sin alertas criticas'}</p>
          </article>
          <article class="kpi-card">
            <span>Proveedores activos</span>
            <strong>${state.providers.length}</strong>
            <p>Ultimo ingreso ${state.providers[0]?.lastDelivery ?? '-'}</p>
          </article>
        </section>

        <section class="grid-two">
          <article class="panel">
            <div class="panel-head">
              <h3>Productos mas vendidos</h3>
              <span>Ranking rapido</span>
            </div>
            <div class="top-list">
              ${topProducts.length
                ? topProducts
                    .map(
                      ([item, quantity], index) => `
                        <div class="top-row">
                          <span class="rank">0${index + 1}</span>
                          <div>
                            <strong>${item}</strong>
                            <p>${quantity} unidades vendidas</p>
                          </div>
                        </div>`,
                    )
                    .join('')
                : '<p class="empty">Todavia no hay ventas cargadas.</p>'}
            </div>
          </article>

          <article class="panel">
            <div class="panel-head">
              <h3>Alertas operativas</h3>
              <span>Lo que conviene resolver hoy</span>
            </div>
            <div class="alerts">
              ${
                metrics.lowStock.length
                  ? metrics.lowStock
                      .map(
                        (product) => `
                          <div class="alert warning">
                            <strong>${product.name}</strong>
                            <p>Stock ${product.stock} / minimo ${product.minStock}</p>
                          </div>`,
                      )
                      .join('')
                  : '<div class="alert success"><strong>Inventario estable</strong><p>No hay productos debajo del minimo.</p></div>'
              }
              ${
                state.invoices.some((invoice) => invoice.status === 'Emitida')
                  ? '<div class="alert info"><strong>Seguimiento comercial</strong><p>Hay facturas emitidas que todavia no figuran como cobradas.</p></div>'
                  : ''
              }
            </div>
          </article>
        </section>

        <section class="workspace" id="ventas">
          <article class="panel">
            <div class="panel-head">
              <h3>Cargar venta</h3>
              <span>Descuenta stock y actualiza caja</span>
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
              <label class="checkbox">
                <input type="checkbox" name="paid" checked />
                Cobrado
              </label>
              <button type="submit">Registrar venta</button>
            </form>
          </article>

          <article class="panel">
            <div class="panel-head">
              <h3>Ultimas ventas</h3>
              <span>Historial reciente</span>
            </div>
            <div class="table-list">
              ${state.sales
                .slice()
                .reverse()
                .slice(0, 6)
                .map(
                  (sale) => `
                    <div class="table-row">
                      <div>
                        <strong>${sale.item}</strong>
                        <p>${sale.date} · ${sale.channel}</p>
                      </div>
                      <div>
                        <strong>${money(sale.amount)}</strong>
                        <p>${sale.quantity} un. · ${sale.paid ? 'Cobrado' : 'Pendiente'}</p>
                      </div>
                    </div>`,
                )
                .join('')}
            </div>
          </article>
        </section>

        <section class="workspace" id="inventario">
          <article class="panel">
            <div class="panel-head">
              <h3>Agregar producto</h3>
              <span>Control de stock minimo</span>
            </div>
            <form class="form-grid" data-form="product">
              <label>
                Nombre
                <input type="text" name="name" placeholder="Cafe molido 500g" required />
              </label>
              <label>
                SKU
                <input type="text" name="sku" placeholder="CF-500" required />
              </label>
              <label>
                Stock inicial
                <input type="number" name="stock" min="0" required />
              </label>
              <label>
                Precio
                <input type="number" name="price" min="0" required />
              </label>
              <label>
                Stock minimo
                <input type="number" name="minStock" min="0" required />
              </label>
              <label>
                Categoria
                <input type="text" name="category" placeholder="Almacen" required />
              </label>
              <button type="submit">Guardar producto</button>
            </form>
          </article>

          <article class="panel">
            <div class="panel-head">
              <h3>Inventario actual</h3>
              <span>${state.products.length} productos</span>
            </div>
            <div class="table-list">
              ${state.products
                .map(
                  (product) => `
                    <div class="table-row">
                      <div>
                        <strong>${product.name}</strong>
                        <p>${product.sku} · ${product.category}</p>
                      </div>
                      <div>
                        <strong>${product.stock} un.</strong>
                        <p>${money(product.price)} · minimo ${product.minStock}</p>
                      </div>
                    </div>`,
                )
                .join('')}
            </div>
          </article>
        </section>

        <section class="workspace" id="proveedores">
          <article class="panel">
            <div class="panel-head">
              <h3>Nuevo proveedor</h3>
              <span>Compras y cuentas a pagar</span>
            </div>
            <form class="form-grid" data-form="provider">
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
          </article>

          <article class="panel">
            <div class="panel-head">
              <h3>Proveedores</h3>
              <span>Seguimiento de compras</span>
            </div>
            <div class="table-list">
              ${state.providers
                .map(
                  (provider) => `
                    <div class="table-row">
                      <div>
                        <strong>${provider.name}</strong>
                        <p>${provider.contact} · ${provider.phone}</p>
                      </div>
                      <div>
                        <strong>${money(provider.balance)}</strong>
                        <p>${provider.category} · ultima entrega ${provider.lastDelivery}</p>
                      </div>
                    </div>`,
                )
                .join('')}
            </div>
          </article>
        </section>

        <section class="workspace" id="facturacion">
          <article class="panel">
            <div class="panel-head">
              <h3>Emitir factura</h3>
              <span>Comprobantes basicos</span>
            </div>
            <form class="form-grid" data-form="invoice">
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
          </article>

          <article class="panel">
            <div class="panel-head">
              <h3>Facturas recientes</h3>
              <span>Control de cobro</span>
            </div>
            <div class="table-list">
              ${state.invoices
                .slice()
                .reverse()
                .map(
                  (invoice) => `
                    <div class="table-row">
                      <div>
                        <strong>${invoice.number}</strong>
                        <p>${invoice.client} · tipo ${invoice.type}</p>
                      </div>
                      <div>
                        <strong>${money(invoice.total)}</strong>
                        <p>${invoice.status} · vence ${invoice.dueDate}</p>
                      </div>
                    </div>`,
                )
                .join('')}
            </div>
          </article>
        </section>
      </main>
    </div>
  `

  bindEvents()
}

const bindEvents = () => {
  for (const form of document.querySelectorAll('form[data-form]')) {
    form.addEventListener('submit', handleSubmit)
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

    if (product) {
      product.stock = Math.max(0, product.stock - quantity)
    }

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
