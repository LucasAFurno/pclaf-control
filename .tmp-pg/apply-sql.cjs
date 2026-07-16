const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const filePath = process.argv[2]

if (!filePath) {
  console.error('Usage: node .tmp-pg/apply-sql.cjs <sql-file>')
  process.exit(1)
}

const absolutePath = path.resolve(filePath)
const sql = fs.readFileSync(absolutePath, 'utf8')

const client = new Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 6543),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'postgres',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  await client.connect()
  try {
    await client.query(sql)
    console.log(JSON.stringify({ ok: true, file: absolutePath }))
  } finally {
    await client.end()
  }
}

run().catch((error) => {
  console.error(error.stack || String(error))
  process.exit(1)
})
