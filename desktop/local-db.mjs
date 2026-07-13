import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const schemaVersion = 4

const parseJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const boolInt = (value) => (value ? 1 : 0)
const fromBoolInt = (value) => Boolean(value)
const ensureColumn = (db, tableName, columnName, definition) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all()
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`)
  }
}

const createDatabase = (dbPath) => {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, key TEXT NOT NULL, name TEXT NOT NULL, permissions_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, full_name TEXT NOT NULL, role_id TEXT NOT NULL, email TEXT, pin TEXT, is_active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, full_name TEXT NOT NULL, phone TEXT, email TEXT, balance REAL NOT NULL DEFAULT 0, tag TEXT);
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT NOT NULL, stock REAL NOT NULL DEFAULT 0, sale_price REAL NOT NULL DEFAULT 0, cost_price REAL NOT NULL DEFAULT 0, min_stock REAL NOT NULL DEFAULT 0, category TEXT, track_stock INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, name TEXT NOT NULL, contact TEXT, phone TEXT, balance REAL NOT NULL DEFAULT 0, last_delivery TEXT, category TEXT);
    CREATE TABLE IF NOT EXISTS cash_sessions (id TEXT PRIMARY KEY, opened_by TEXT, opening_amount REAL NOT NULL DEFAULT 0, status TEXT NOT NULL, opened_at TEXT NOT NULL, closed_at TEXT, counted_amount REAL, difference_amount REAL);
    CREATE TABLE IF NOT EXISTS purchase_receipts (id TEXT PRIMARY KEY, supplier_id TEXT, product_id TEXT, quantity REAL NOT NULL DEFAULT 0, unit_cost REAL NOT NULL DEFAULT 0, total_cost REAL NOT NULL DEFAULT 0, received_at TEXT NOT NULL, received_by TEXT);
    CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, customer_id TEXT, seller_user_id TEXT, items_json TEXT NOT NULL, total_quantity REAL NOT NULL DEFAULT 0, total_amount REAL NOT NULL DEFAULT 0, amount_paid REAL NOT NULL DEFAULT 0, channel TEXT, payment_method TEXT, status TEXT, sold_at TEXT NOT NULL, cash_session_id TEXT);
    CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, number TEXT NOT NULL, customer_id TEXT, total_amount REAL NOT NULL DEFAULT 0, status TEXT, due_date TEXT, type TEXT, sale_id TEXT);
    CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, number TEXT NOT NULL, customer_id TEXT, device TEXT, issue TEXT, status TEXT, updated_at TEXT);
    CREATE TABLE IF NOT EXISTS stock_movements (id TEXT PRIMARY KEY, product_id TEXT, type TEXT, quantity REAL NOT NULL, reference_id TEXT, notes TEXT, created_at TEXT NOT NULL, created_by TEXT);
    CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, actor_user_id TEXT, entity_type TEXT NOT NULL, entity_id TEXT, action TEXT NOT NULL, before_data_json TEXT, after_data_json TEXT, created_at TEXT NOT NULL);
  `)
  ensureColumn(db, 'cash_sessions', 'branch_id', 'TEXT')
  ensureColumn(db, 'cash_sessions', 'register_id', 'TEXT')
  ensureColumn(db, 'sales', 'branch_id', 'TEXT')
  ensureColumn(db, 'sales', 'register_id', 'TEXT')
  ensureColumn(db, 'invoices', 'branch_id', 'TEXT')
  ensureColumn(db, 'tickets', 'branch_id', 'TEXT')
  ensureColumn(db, 'purchase_receipts', 'branch_id', 'TEXT')
  ensureColumn(db, 'stock_movements', 'branch_id', 'TEXT')
  ensureColumn(db, 'stock_movements', 'register_id', 'TEXT')
  return db
}

export const createLocalDatabase = (dbPath) => {
  const db = createDatabase(dbPath)
  const getMeta = db.prepare('SELECT value FROM meta WHERE key = ?')
  const setMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')

  const clearAll = () => {
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM stock_movements;
      DELETE FROM tickets;
      DELETE FROM invoices;
      DELETE FROM sales;
      DELETE FROM purchase_receipts;
      DELETE FROM cash_sessions;
      DELETE FROM suppliers;
      DELETE FROM products;
      DELETE FROM customers;
      DELETE FROM users;
      DELETE FROM roles;
      DELETE FROM meta;
    `)
  }

  const writeState = (state) => {
    const insertRole = db.prepare('INSERT INTO roles (id, key, name, permissions_json) VALUES (?, ?, ?, ?)')
    const insertUser = db.prepare('INSERT INTO users (id, full_name, role_id, email, pin, is_active) VALUES (?, ?, ?, ?, ?, ?)')
    const insertCustomer = db.prepare('INSERT INTO customers (id, full_name, phone, email, balance, tag) VALUES (?, ?, ?, ?, ?, ?)')
    const insertProduct = db.prepare('INSERT INTO products (id, name, sku, stock, sale_price, cost_price, min_stock, category, track_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const insertSupplier = db.prepare('INSERT INTO suppliers (id, name, contact, phone, balance, last_delivery, category) VALUES (?, ?, ?, ?, ?, ?, ?)')
    const insertCash = db.prepare('INSERT INTO cash_sessions (id, opened_by, opening_amount, status, opened_at, closed_at, counted_amount, difference_amount, branch_id, register_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const insertReceipt = db.prepare('INSERT INTO purchase_receipts (id, supplier_id, product_id, quantity, unit_cost, total_cost, received_at, received_by, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const insertSale = db.prepare('INSERT INTO sales (id, customer_id, seller_user_id, items_json, total_quantity, total_amount, amount_paid, channel, payment_method, status, sold_at, cash_session_id, branch_id, register_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const insertInvoice = db.prepare('INSERT INTO invoices (id, number, customer_id, total_amount, status, due_date, type, sale_id, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const insertTicket = db.prepare('INSERT INTO tickets (id, number, customer_id, device, issue, status, updated_at, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    const insertMovement = db.prepare('INSERT INTO stock_movements (id, product_id, type, quantity, reference_id, notes, created_at, created_by, branch_id, register_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const insertAudit = db.prepare('INSERT INTO audit_logs (id, actor_user_id, entity_type, entity_id, action, before_data_json, after_data_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')

    db.exec('BEGIN')
    try {
      clearAll()
      setMeta.run('schema_version', String(schemaVersion))
      setMeta.run('meta_json', JSON.stringify(state.meta))
      setMeta.run('business_json', JSON.stringify(state.business))
      setMeta.run('branches_json', JSON.stringify(state.branches || []))
      setMeta.run('registers_json', JSON.stringify(state.registers || []))
      setMeta.run('cash_movements_json', JSON.stringify(state.cashMovements || []))
      setMeta.run('session_json', JSON.stringify(state.session))

      for (const item of state.roles) insertRole.run(item.id, item.key, item.name, JSON.stringify(item.permissions))
      for (const item of state.users) insertUser.run(item.id, item.fullName, item.roleId, item.email || '', item.pin || '', boolInt(item.isActive))
      for (const item of state.customers) insertCustomer.run(item.id, item.fullName, item.phone || '', item.email || '', item.balance || 0, item.tag || '')
      for (const item of state.products) insertProduct.run(item.id, item.name, item.sku, item.stock || 0, item.salePrice || 0, item.costPrice || 0, item.minStock || 0, item.category || '', boolInt(item.trackStock))
      for (const item of state.suppliers) insertSupplier.run(item.id, item.name, item.contact || '', item.phone || '', item.balance || 0, item.lastDelivery || '', item.category || '')
      for (const item of state.cashSessions) insertCash.run(item.id, item.openedBy || '', item.openingAmount || 0, item.status, item.openedAt, item.closedAt || '', item.countedAmount, item.differenceAmount, item.branchId || '', item.registerId || '')
      for (const item of state.purchaseReceipts) insertReceipt.run(item.id, item.supplierId || '', item.productId || '', item.quantity || 0, item.unitCost || 0, item.totalCost || 0, item.receivedAt, item.receivedBy || '', item.branchId || '')
      for (const item of state.sales) insertSale.run(item.id, item.customerId || '', item.sellerUserId || '', JSON.stringify(item.items || []), item.totalQuantity || 0, item.totalAmount || 0, item.amountPaid || 0, item.channel || '', item.paymentMethod || '', item.status || '', item.soldAt, item.cashSessionId || '', item.branchId || '', item.registerId || '')
      for (const item of state.invoices) insertInvoice.run(item.id, item.number, item.customerId || '', item.totalAmount || 0, item.status || '', item.dueDate || '', item.type || '', item.saleId || '', item.branchId || '')
      for (const item of state.tickets) insertTicket.run(item.id, item.number, item.customerId || '', item.device || '', item.issue || '', item.status || '', item.updatedAt || '', item.branchId || '')
      for (const item of state.stockMovements) insertMovement.run(item.id, item.productId || '', item.type || '', item.quantity || 0, item.referenceId || '', item.notes || '', item.createdAt, item.createdBy || '', item.branchId || '', item.registerId || '')
      for (const item of state.auditLogs) insertAudit.run(item.id, item.actorUserId || '', item.entityType, item.entityId || '', item.action, item.beforeData ? JSON.stringify(item.beforeData) : '', item.afterData ? JSON.stringify(item.afterData) : '', item.createdAt)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  const loadState = () => ({
    meta: parseJson(getMeta.get('meta_json')?.value, {}),
    business: parseJson(getMeta.get('business_json')?.value, {}),
    branches: parseJson(getMeta.get('branches_json')?.value, []),
    registers: parseJson(getMeta.get('registers_json')?.value, []),
    cashMovements: parseJson(getMeta.get('cash_movements_json')?.value, []),
    roles: db.prepare('SELECT * FROM roles').all().map((row) => ({ id: row.id, key: row.key, name: row.name, permissions: parseJson(row.permissions_json, []) })),
    users: db.prepare('SELECT * FROM users').all().map((row) => ({ id: row.id, fullName: row.full_name, roleId: row.role_id, email: row.email, pin: row.pin, isActive: fromBoolInt(row.is_active) })),
    session: parseJson(getMeta.get('session_json')?.value, { userId: '', authenticated: false }),
    customers: db.prepare('SELECT * FROM customers').all().map((row) => ({ id: row.id, fullName: row.full_name, phone: row.phone, email: row.email, balance: row.balance, tag: row.tag })),
    products: db.prepare('SELECT * FROM products').all().map((row) => ({ id: row.id, name: row.name, sku: row.sku, stock: row.stock, salePrice: row.sale_price, costPrice: row.cost_price, minStock: row.min_stock, category: row.category, trackStock: fromBoolInt(row.track_stock) })),
    suppliers: db.prepare('SELECT * FROM suppliers').all().map((row) => ({ id: row.id, name: row.name, contact: row.contact, phone: row.phone, balance: row.balance, lastDelivery: row.last_delivery, category: row.category })),
    cashSessions: db.prepare('SELECT * FROM cash_sessions').all().map((row) => ({ id: row.id, openedBy: row.opened_by || null, openingAmount: row.opening_amount, status: row.status, openedAt: row.opened_at, closedAt: row.closed_at || null, countedAmount: row.counted_amount, differenceAmount: row.difference_amount, branchId: row.branch_id || null, registerId: row.register_id || null })),
    purchaseReceipts: db.prepare('SELECT * FROM purchase_receipts').all().map((row) => ({ id: row.id, supplierId: row.supplier_id || null, productId: row.product_id || null, quantity: row.quantity, unitCost: row.unit_cost, totalCost: row.total_cost, receivedAt: row.received_at, receivedBy: row.received_by || null, branchId: row.branch_id || null })),
    sales: db.prepare('SELECT * FROM sales').all().map((row) => ({ id: row.id, customerId: row.customer_id || null, sellerUserId: row.seller_user_id || null, items: parseJson(row.items_json, []), totalQuantity: row.total_quantity, totalAmount: row.total_amount, amountPaid: row.amount_paid, channel: row.channel, paymentMethod: row.payment_method, status: row.status, soldAt: row.sold_at, cashSessionId: row.cash_session_id || null, branchId: row.branch_id || null, registerId: row.register_id || null })),
    invoices: db.prepare('SELECT * FROM invoices').all().map((row) => ({ id: row.id, number: row.number, customerId: row.customer_id || null, totalAmount: row.total_amount, status: row.status, dueDate: row.due_date, type: row.type, saleId: row.sale_id || null, branchId: row.branch_id || null })),
    tickets: db.prepare('SELECT * FROM tickets').all().map((row) => ({ id: row.id, number: row.number, customerId: row.customer_id || null, device: row.device, issue: row.issue, status: row.status, updatedAt: row.updated_at, branchId: row.branch_id || null })),
    stockMovements: db.prepare('SELECT * FROM stock_movements').all().map((row) => ({ id: row.id, productId: row.product_id || null, type: row.type, quantity: row.quantity, referenceId: row.reference_id || null, notes: row.notes, createdAt: row.created_at, createdBy: row.created_by || null, branchId: row.branch_id || null, registerId: row.register_id || null })),
    auditLogs: db.prepare('SELECT * FROM audit_logs').all().map((row) => ({ id: row.id, actorUserId: row.actor_user_id || null, entityType: row.entity_type, entityId: row.entity_id || null, action: row.action, beforeData: parseJson(row.before_data_json, null), afterData: parseJson(row.after_data_json, null), createdAt: row.created_at })),
  })

  const initialize = (seedState) => {
    const savedSchema = Number(getMeta.get('schema_version')?.value || 0)
    if (getMeta.get('business_json')?.value) {
      if (savedSchema !== schemaVersion) setMeta.run('schema_version', String(schemaVersion))
      return loadState()
    }
    writeState(seedState)
    return loadState()
  }

  return {
    initialize,
    loadState,
    saveSnapshot: (state) => {
      writeState(state)
      return loadState()
    },
  }
}
