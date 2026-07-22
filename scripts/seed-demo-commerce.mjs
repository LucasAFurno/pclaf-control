import { randomUUID } from 'node:crypto'

const baseUrl = String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '')
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
const ownerEmail = String(process.env.TARGET_OWNER_EMAIL || '').trim().toLowerCase()
const customersCount = Number.parseInt(process.env.SEED_CUSTOMERS || '100', 10)
const productsCount = Number.parseInt(process.env.SEED_PRODUCTS || '1000', 10)
const suppliersCount = Number.parseInt(process.env.SEED_SUPPLIERS || '40', 10)

if (!baseUrl) throw new Error('Missing SUPABASE_URL')
if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
if (!ownerEmail) throw new Error('Missing TARGET_OWNER_EMAIL')

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

const api = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${text}`)
  }

  const text = await response.text()
  if (!text) return null
  return JSON.parse(text)
}

const chunk = (items, size) => {
  const groups = []
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size))
  }
  return groups
}

const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const categories = [
  'Hardware',
  'Perifericos',
  'Accesorios',
  'Redes',
  'Audio',
  'Almacenamiento',
  'Energia',
  'Gaming',
]

const supplierCategories = [
  'Distribuidor',
  'Mayorista',
  'Importador',
  'Insumos',
  'Tecnologia',
  'Accesorios',
]

const firstNames = [
  'Lucas', 'Julian', 'Noelia', 'Leonel', 'Carla', 'Matias', 'Sofia', 'Bruno', 'Camila', 'Valentin',
  'Paula', 'Nicolas', 'Micaela', 'Facundo', 'Agustina', 'Franco', 'Lucia', 'Thiago', 'Rocio', 'Lautaro',
]

const lastNames = [
  'Furno', 'Escapista', 'Alvarez', 'Messi', 'Lopez', 'Gonzalez', 'Martinez', 'Diaz', 'Sanchez', 'Romero',
  'Torres', 'Benitez', 'Suarez', 'Acosta', 'Paz', 'Navarro', 'Molina', 'Ruiz', 'Silva', 'Castro',
]

const productNames = [
  'Mouse gamer', 'Teclado mecanico', 'SSD Kingston', 'Disco NVMe', 'Monitor IPS', 'Auriculares USB',
  'Router dual band', 'Pasta termica', 'Fuente 650W', 'Gabinete ATX', 'Webcam HD', 'Memoria DDR4',
  'Hub USB', 'Cable HDMI', 'Placa WiFi', 'Parlante Bluetooth', 'Microfono condensador', 'Disipador torre',
  'Notebook bag', 'Pad mouse XL',
]

const supplierNames = [
  'Delta', 'Andes', 'Nova', 'A7G', 'Vertex', 'Central Tech', 'Sur Components', 'Pampa Digital',
  'Norte Mayorista', 'Red Link', 'Quantum', 'Bit Supply', 'Litoral Tech', 'Buenos Aires Parts',
]

const randomFrom = (items) => items[Math.floor(Math.random() * items.length)]
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randomMoney = (min, max) => randomInt(min, max)

const phoneNumber = (index) => `11${String(10000000 + index).slice(-8)}`

const fetchCommerceContext = async () => {
  const users = await api(`control_users?select=id,full_name,email,active_commerce_id,active_branch_id,assigned_register_id&email=eq.${encodeURIComponent(ownerEmail)}`)
  if (!Array.isArray(users) || users.length === 0) {
    throw new Error(`No encontre un usuario con el correo ${ownerEmail}`)
  }

  const user = users[0]
  let commerceId = user.active_commerce_id

  if (!commerceId) {
    const memberships = await api(`commerce_memberships?select=commerce_id,status,is_owner,created_at&user_id=eq.${user.id}&order=is_owner.desc,created_at.asc&limit=1`)
    commerceId = memberships?.[0]?.commerce_id || null
  }

  if (!commerceId) {
    const commerces = await api(`commerce_accounts?select=id,name,owner_email&owner_email=eq.${encodeURIComponent(ownerEmail)}&limit=1`)
    commerceId = commerces?.[0]?.id || null
  }

  if (!commerceId) {
    throw new Error(`No encontre un comercio activo para ${ownerEmail}`)
  }

  let branchId = user.active_branch_id
  if (!branchId) {
    const branches = await api(`branches?select=id,name,code&commerce_id=eq.${commerceId}&order=created_at.asc&limit=1`)
    branchId = branches?.[0]?.id || null
  }

  if (!branchId) {
    throw new Error(`No encontre una sucursal para el comercio ${commerceId}`)
  }

  return { userId: user.id, commerceId, branchId }
}

const buildCustomers = (commerceId, startIndex, count) =>
  Array.from({ length: count }, (_, index) => {
    const rowNumber = startIndex + index + 1
    const firstName = randomFrom(firstNames)
    const lastName = randomFrom(lastNames)
    const fullName = `${firstName} ${lastName} ${rowNumber}`
    return {
      id: randomUUID(),
      commerce_id: commerceId,
      full_name: fullName,
      phone: Math.random() < 0.8 ? phoneNumber(rowNumber) : '',
      email: Math.random() < 0.65 ? `${slugify(fullName).replace(/-/g, '.')}@demo-cliente.test` : '',
      balance: Math.random() < 0.2 ? randomMoney(5000, 50000) : 0,
      tag: randomFrom(['Mostrador', 'Mayorista', 'Taller', 'Revendedor', 'Frecuente', '']),
      notes: '',
      is_active: true,
    }
  })

const buildSuppliers = (commerceId, startIndex, count) =>
  Array.from({ length: count }, (_, index) => {
    const rowNumber = startIndex + index + 1
    const name = `${randomFrom(supplierNames)} ${rowNumber}`
    return {
      id: randomUUID(),
      commerce_id: commerceId,
      name,
      contact: `${randomFrom(firstNames)} ${randomFrom(lastNames)}`,
      phone: phoneNumber(500 + rowNumber),
      email: `${slugify(name)}@demo-proveedor.test`,
      category: randomFrom(supplierCategories),
      balance: Math.random() < 0.25 ? randomMoney(10000, 150000) : 0,
      last_delivery: `2026-07-${String(randomInt(1, 20)).padStart(2, '0')}`,
      notes: '',
      is_active: true,
    }
  })

const buildProducts = (commerceId, branchId, startIndex, count) =>
  Array.from({ length: count }, (_, index) => {
    const rowNumber = startIndex + index + 1
    const baseName = randomFrom(productNames)
    const sku = `TEST-${String(rowNumber).padStart(4, '0')}`
    const id = randomUUID()
    const stock = randomInt(3, 120)
    const salePrice = randomMoney(2500, 350000)
    const costPrice = Math.max(500, Math.round(salePrice * (0.55 + Math.random() * 0.2)))
    return {
      product: {
        id,
        commerce_id: commerceId,
        sku,
        barcode: `779${String(100000000 + rowNumber).slice(-9)}`,
        name: `${baseName} ${rowNumber}`,
        category: randomFrom(categories),
        sale_price: salePrice,
        cost_price: costPrice,
        min_stock: randomInt(1, 10),
        track_stock: true,
        is_active: true,
      },
      branchStock: {
        id: randomUUID(),
        commerce_id: commerceId,
        product_id: id,
        branch_id: branchId,
        quantity: stock,
      },
    }
  })

const insertRows = async (table, rows, batchSize = 200) => {
  let inserted = 0
  for (const group of chunk(rows, batchSize)) {
    await api(table, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(group),
    })
    inserted += group.length
  }
  return inserted
}

const fetchSeededCounts = async (commerceId) => {
  const [customers, suppliers, products] = await Promise.all([
    api(`customers?select=id,full_name,email&commerce_id=eq.${commerceId}&email=like.*demo-cliente.test`),
    api(`suppliers?select=id,name,email&commerce_id=eq.${commerceId}&email=like.*demo-proveedor.test`),
    api(`products?select=id,sku&commerce_id=eq.${commerceId}&sku=like.TEST-*`),
  ])

  return {
    customers: Array.isArray(customers) ? customers.length : 0,
    suppliers: Array.isArray(suppliers) ? suppliers.length : 0,
    products: Array.isArray(products) ? products.length : 0,
  }
}

const main = async () => {
  const context = await fetchCommerceContext()
  const existing = await fetchSeededCounts(context.commerceId)

  const customers = buildCustomers(
    context.commerceId,
    existing.customers,
    Math.max(customersCount - existing.customers, 0),
  )
  const suppliers = buildSuppliers(
    context.commerceId,
    existing.suppliers,
    Math.max(suppliersCount - existing.suppliers, 0),
  )
  const products = buildProducts(
    context.commerceId,
    context.branchId,
    existing.products,
    Math.max(productsCount - existing.products, 0),
  )

  const productsRows = products.map((entry) => entry.product)
  const stockRows = products.map((entry) => entry.branchStock)

  const insertedCustomers = await insertRows('customers', customers, 100)
  const insertedSuppliers = await insertRows('suppliers', suppliers, 100)
  const insertedProducts = await insertRows('products', productsRows, 100)
  const insertedStocks = await insertRows('product_branch_stock', stockRows, 100)

  console.log(
    JSON.stringify(
      {
        ok: true,
        ownerEmail,
        commerceId: context.commerceId,
        branchId: context.branchId,
        existingBefore: existing,
        insertedCustomers,
        insertedSuppliers,
        insertedProducts,
        insertedStocks,
        finalTarget: {
          customers: existing.customers + insertedCustomers,
          suppliers: existing.suppliers + insertedSuppliers,
          products: existing.products + insertedProducts,
        },
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})
