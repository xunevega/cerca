import { createReadStream, existsSync } from 'node:fs'
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
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
}

function filePath(pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '')
  const full = resolve(root, rel)
  if (full !== root && !full.startsWith(root + sep)) return null
  return full
}

createServer(async (req, res) => {
  if (await handleApi(req, res)) return
  const url = new URL(req.url || '/', 'http://localhost')
  let path = filePath(url.pathname)
  if (!path || !existsSync(path)) path = filePath('/index.html')
  if (!path || !existsSync(path)) {
    res.statusCode = 404
    res.end('No está construida. Ejecuta npm run build.')
    return
  }
  res.statusCode = 200
  res.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream')
  createReadStream(path).pipe(res)
}).listen(port, () => {
  console.log(`Cerca en http://localhost:${port}`)
})
