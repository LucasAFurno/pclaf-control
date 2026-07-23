import { arcaUrls, config } from './config.mjs'
import { signCms } from './openssl.mjs'
import { escapeXml, readXmlTag, soapEnvelope, soapFault, unescapeXml } from './xml.mjs'
import { CircuitBreaker } from './resilience.mjs'

const WSAA_NS = 'http://wsaa.view.sua.dvadac.desein.afip.gov'
const WSFE_NS = 'http://ar.gov.afip.dif.FEV1/'

const retryable = (error) => error?.retryable === true || error?.name === 'TimeoutError' || error?.name === 'AbortError' || error?.name === 'TypeError'

export const requestWithRetry = async (url, options, { maxAttempts = config.arcaMaxAttempts } = {}) => {
  let lastError
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(config.arcaAttemptTimeoutMs) })
      const text = await response.text()
      if (!response.ok) {
        const error = new Error(`ARCA HTTP ${response.status}`)
        error.retryable = response.status === 408 || response.status === 429 || response.status >= 500
        throw error
      }
      const fault = soapFault(text)
      if (fault) throw new Error(`ARCA SOAP fault: ${fault}`)
      return text
    } catch (error) {
      lastError = error
      if (!retryable(error) || attempt === maxAttempts) break
      await new Promise((resolve) => setTimeout(resolve, 400 * (2 ** (attempt - 1))))
    }
  }
  throw lastError
}

const loginTicketRequest = () => {
  const generation = new Date(Date.now() - 60_000).toISOString()
  const expiration = new Date(Date.now() + 10 * 60_000).toISOString()
  return `<?xml version="1.0" encoding="UTF-8"?><loginTicketRequest version="1.0"><header><uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId><generationTime>${generation}</generationTime><expirationTime>${expiration}</expirationTime></header><service>wsfe</service></loginTicketRequest>`
}

export class ArcaClient {
  constructor({ store }) {
    this.store = store
    this.authCache = new Map()
    this.wsaaCircuit = new CircuitBreaker({ name: 'ARCA WSAA', failureThreshold: config.circuitFailureThreshold, cooldownMs: config.circuitCooldownMs })
    this.wsfeCircuit = new CircuitBreaker({ name: 'ARCA WSFEv1', failureThreshold: config.circuitFailureThreshold, cooldownMs: config.circuitCooldownMs })
  }

  async getAuth(tenantId) {
    const cached = this.authCache.get(tenantId)
    if (cached && cached.expiresAt && Date.parse(cached.expiresAt) > Date.now() + 60_000) return cached
    const tenant = await this.store.read(tenantId)
    if (!tenant?.certificatePem || !tenant?.privateKeyPem) throw new Error('Certificate has not been configured')
    const tra = loginTicketRequest()
    const cms = await signCms({ openSslBin: config.openSslBin, privateKeyPem: tenant.privateKeyPem, certificatePem: tenant.certificatePem, loginTicketRequestXml: tra })
    const xml = await this.wsaaCircuit.execute(() => requestWithRetry(arcaUrls.wsaa, {
      method: 'POST',
      headers: { 'content-type': 'text/xml; charset=utf-8', SOAPAction: 'loginCms' },
      body: soapEnvelope(WSAA_NS, 'loginCms', `<in0>${escapeXml(cms)}</in0>`),
    }))
    const loginTicket = unescapeXml(readXmlTag(xml, 'loginCmsReturn'))
    const token = readXmlTag(loginTicket, 'token')
    const sign = readXmlTag(loginTicket, 'sign')
    if (!token || !sign) throw new Error('WSAA returned an invalid access ticket')
    const auth = { token, sign, expiresAt: readXmlTag(loginTicket, 'expirationTime') }
    this.authCache.set(tenantId, auth)
    return auth
  }

  authXml(auth, cuit) {
    return `<Auth><Token>${escapeXml(auth.token)}</Token><Sign>${escapeXml(auth.sign)}</Sign><Cuit>${escapeXml(cuit)}</Cuit></Auth>`
  }

  async wsfe(action, payload, requestOptions) {
    return this.wsfeCircuit.execute(() => requestWithRetry(arcaUrls.wsfe, {
      method: 'POST',
      headers: { 'content-type': 'text/xml; charset=utf-8', SOAPAction: `http://ar.gov.afip.dif.FEV1/${action}` },
      body: soapEnvelope(WSFE_NS, action, payload),
    }, requestOptions))
  }

  async verify({ tenantId, cuit, pointOfSale }) {
    const auth = await this.getAuth(tenantId)
    const dummyXml = await this.wsfe('FEDummy', '')
    const appServer = readXmlTag(dummyXml, 'AppServer')
    const dbServer = readXmlTag(dummyXml, 'DbServer')
    const authServer = readXmlTag(dummyXml, 'AuthServer')
    if (![appServer, dbServer, authServer].every((value) => value.toUpperCase() === 'OK')) throw new Error('WSFEv1 is not fully available')
    const pointsXml = await this.wsfe('FEParamGetPtosVenta', `${this.authXml(auth, cuit)}`)
    const requested = String(Number(pointOfSale))
    const pointFound = new RegExp(`<PtoVenta>${requested}</PtoVenta>`, 'i').test(pointsXml)
    if (!pointFound) throw new Error('The configured ARCA point of sale was not found or is not enabled for WSFE')
    return { authExpiresAt: auth.expiresAt, wsaa: 'OK', wsfe: 'OK', pointOfSale: Number(pointOfSale) }
  }

  async getLastAuthorized({ tenantId, cuit, pointOfSale, receiptType }) {
    const auth = await this.getAuth(tenantId)
    const xml = await this.wsfe('FECompUltimoAutorizado', `${this.authXml(auth, cuit)}<PtoVta>${Number(pointOfSale)}</PtoVta><CbteTipo>${Number(receiptType)}</CbteTipo>`)
    return Number(readXmlTag(xml, 'CbteNro') || 0)
  }

  async reconcileAuthorization({ tenantId, cuit, pointOfSale, receiptType, receiptNumber }) {
    const lastNumber = await this.getLastAuthorized({ tenantId, cuit, pointOfSale, receiptType })
    if (lastNumber !== Number(receiptNumber)) return { status: 'unknown', lastNumber }
    const auth = await this.getAuth(tenantId)
    const responseXml = await this.wsfe('FECompConsultar', `${this.authXml(auth, cuit)}<FeCompConsReq><CbteTipo>${Number(receiptType)}</CbteTipo><CbteNro>${Number(receiptNumber)}</CbteNro><PtoVta>${Number(pointOfSale)}</PtoVta></FeCompConsReq>`)
    const result = String(readXmlTag(responseXml, 'Resultado') || '').toUpperCase()
    if (result === 'R') return { status: 'rejected', lastNumber, responseXml }
    if (result !== 'A') return { status: 'unknown', lastNumber, responseXml }
    return { status: 'authorized', lastNumber, responseXml }
  }

  async requestCae({ tenantId, cuit, requestXml }) {
    const auth = await this.getAuth(tenantId)
    if (!requestXml || !String(requestXml).includes('<FeCAEReq>')) throw new Error('A valid FeCAEReq XML payload is required')
    // Once FECAESolicitar has been sent, a timeout is ambiguous: retrying could
    // authorize the same fiscal document twice. The caller must reconcile first.
    return this.wsfe('FECAESolicitar', `${this.authXml(auth, cuit)}${requestXml}`, { maxAttempts: 1 })
  }
}
