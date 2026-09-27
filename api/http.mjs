import { fail, publicMessage } from './env.mjs'
import { proxyPhoto, searchRestaurants } from './google.mjs'

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
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

export async function handleApi(req, res) {
  const url = new URL(req.url || '/', 'http://localhost')
  if (!url.pathname.startsWith('/api/')) return false
  try {
    if (req.method === 'POST' && url.pathname === '/api/search') {
      const data = await searchRestaurants(await readJson(req))
      sendJson(res, 200, data)
      return true
    }
    if (req.method === 'GET' && url.pathname === '/api/photo') {
      await proxyPhoto(url.searchParams.get('ref') || '', res, sendJson)
      return true
    }
    sendJson(res, 404, { error: 'No existe' })
    return true
  } catch (error) {
    const status = error.status || 500
    sendJson(res, status, { error: publicMessage(error.message || 'Error interno') })
    return true
  }
}
