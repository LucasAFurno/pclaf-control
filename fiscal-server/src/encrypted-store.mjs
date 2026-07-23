import { createCipheriv, createDecipheriv, randomBytes, generateKeyPairSync } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

const safeTenantId = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!/^[a-z0-9][a-z0-9_-]{2,80}$/.test(normalized)) throw new Error('Invalid tenant id')
  return normalized
}

export class EncryptedFiscalStore {
  constructor({ dataDir, masterKey }) {
    this.dataDir = dataDir
    this.masterKey = masterKey
  }

  filePath(tenantId) {
    return path.join(this.dataDir, `${safeTenantId(tenantId)}.json.enc`)
  }

  safeTenantId(tenantId) {
    return safeTenantId(tenantId)
  }

  encrypt(value) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.masterKey, iv)
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
    return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') })
  }

  decrypt(payload) {
    const encoded = JSON.parse(payload)
    const decipher = createDecipheriv('aes-256-gcm', this.masterKey, Buffer.from(encoded.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(encoded.tag, 'base64'))
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(encoded.ciphertext, 'base64')), decipher.final()]).toString('utf8'))
  }

  async read(tenantId) {
    try {
      return this.decrypt(await readFile(this.filePath(tenantId), 'utf8'))
    } catch (error) {
      if (error?.code === 'ENOENT') return null
      throw error
    }
  }

  async write(tenantId, value) {
    await mkdir(this.dataDir, { recursive: true, mode: 0o700 })
    const target = this.filePath(tenantId)
    const temp = `${target}.${randomBytes(8).toString('hex')}.tmp`
    await writeFile(temp, this.encrypt(value), { encoding: 'utf8', mode: 0o600 })
    await rename(temp, target)
  }

  async emergencyStop() { return false }

  async createKeyPair(tenantId, subject, commerceId = null) {
    const existing = await this.read(tenantId)
    if (existing?.privateKeyPem) throw new Error('A key pair already exists for this tenant')
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 3072, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } })
    const record = { version: 1, subject, publicKeyPem: publicKey, privateKeyPem: privateKey, certificatePem: '', status: 'certificate_requested', ...(commerceId ? { commerceId } : {}), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    await this.write(tenantId, record)
    return record
  }

  async update(tenantId, mutate) {
    const current = await this.read(tenantId)
    if (!current) throw new Error('Fiscal tenant not found')
    const updated = { ...mutate(current), updatedAt: new Date().toISOString() }
    await this.write(tenantId, updated)
    return updated
  }
}
