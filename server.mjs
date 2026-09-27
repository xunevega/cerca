import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { handleApi } from './api/http.mjs'

const root = resolve('dist')
const port = Number(process.env.PORT || 4173)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=()',
}

function filePath(pathname) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null
  const rel = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '')
  const full = resolve(root, rel)
  if (full !== root && !full.startsWith(root + sep)) return null
  return full
}

async function isFile(path) {
  if (!path) return false
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

function sendText(res, status, text) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(text)
}

async function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    sendText(res, 405, 'Método no permitido')
    return
  }
  const url = new URL(req.url || '/', 'http://localhost')
  let path = filePath(url.pathname)
  if (!(await isFile(path))) {
    // Un fichero con extensión que no existe (p. ej. un JS viejo tras un despliegue) es un 404,
    // no la portada: si no, el navegador intenta ejecutar HTML como JavaScript.
    if (extname(url.pathname)) {
      sendText(res, 404, 'No existe')
      return
    }
    path = filePath('/index.html')
    if (!(await isFile(path))) {
      sendText(res, 404, 'No está construida. Ejecuta npm run build.')
      return
    }
  }
  const hashed = path.startsWith(resolve(root, 'assets') + sep)
  res.statusCode = 200
  res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream')
  res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache')
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  const stream = createReadStream(path)
  stream.on('error', () => {
    if (!res.headersSent) sendText(res, 500, 'Error interno')
    else res.destroy()
  })
  stream.pipe(res)
}

createServer(async (req, res) => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value)
  try {
    if (await handleApi(req, res)) return
    await serveStatic(req, res)
  } catch (error) {
    console.error('[cerca]', error)
    if (!res.headersSent) sendText(res, 500, 'Error interno')
    else res.destroy()
  }
}).listen(port, () => {
  console.log(`Cerca en http://localhost:${port}`)
})
