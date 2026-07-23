export const escapeXml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')

export const unescapeXml = (value) => String(value ?? '').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&amp;', '&')

export const readXmlTag = (xml, tag) => {
  const match = String(xml || '').match(new RegExp(`<(?:[A-Za-z0-9_-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[A-Za-z0-9_-]+:)?${tag}>`, 'i'))
  return match ? match[1].trim() : ''
}

export const soapEnvelope = (namespace, action, payload) => `<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><${action} xmlns="${namespace}">${payload}</${action}></soap:Body></soap:Envelope>`

export const soapFault = (xml) => readXmlTag(xml, 'faultstring') || readXmlTag(xml, 'faultcode') || ''
