import { fail, publicMessage } from './env.mjs'
import { proxyPhoto, searchRestaurants } from './google.mjs'

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 8000) throw fail(413, 'Petición demasiado grande')
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw fail(400, 'El cuerpo no es JSON')
  }
}

// Cada búsqueda llama a Google y a TripAdvisor, y eso cuesta dinero.
// Un tope por IP evita que un bucle o un abuso vacíe la cuenta.
const LIMITS = {
  search: { max: 20, windowMs: 60_000 },
  photo: { max: 150, windowMs: 60_000 },
}
const hits = new Map()

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded || '').split(',')[0].trim()
  return first || req.socket?.remoteAddress || 'desconocida'
}

function allow(req, bucket) {
  const { max, windowMs } = LIMITS[bucket]
  const now = Date.now()
  const key = `${bucket}:${clientIp(req)}`
  const entry = hits.get(key)
  if (!entry || now - entry.start >= windowMs) {
    hits.set(key, { start: now, count: 1 })
    return true
  }
  entry.count += 1
  return entry.count <= max
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of hits) {
    if (now - entry.start >= 60_000) hits.delete(key)
  }
}, 60_000).unref()

function tooMany() {
  return fail(429, 'Demasiadas peticiones seguidas. Espera un minuto y prueba otra vez.')
}

function publicError(error) {
  if (error?.status) return { status: error.status, message: publicMessage(error.message) }
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
    return { status: 504, message: 'Google tarda demasiado en responder. Prueba otra vez.' }
  }
  console.error('[cerca api]', error)
  return { status: 502, message: 'No se ha podido hablar con Google. Prueba otra vez en un momento.' }
}

export async function handleApi(req, res) {
  const url = new URL(req.url || '/', 'http://localhost')
  if (!url.pathname.startsWith('/api/')) return false
  try {
    if (req.method === 'POST' && url.pathname === '/api/search') {
      if (!allow(req, 'search')) throw tooMany()
      const data = await searchRestaurants(await readJson(req))
      sendJson(res, 200, data)
      return true
    }
    if (req.method === 'GET' && url.pathname === '/api/photo') {
      if (!allow(req, 'photo')) throw tooMany()
      await proxyPhoto(url.searchParams.get('ref') || '', res, sendJson)
      return true
    }
    sendJson(res, 404, { error: 'No existe' })
    return true
  } catch (error) {
    const { status, message } = publicError(error)
    if (res.headersSent) res.destroy()
    else sendJson(res, status, { error: message })
    return true
  }
}
