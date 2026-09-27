import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { handleApi } from './api/http.mjs'

function cercaApi() {
  return {
    name: 'cerca-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const handled = await handleApi(req, res)
          if (!handled) next()
        } catch {
          if (res.headersSent) return
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Error interno' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), cercaApi()],
  server: { port: 5173 },
})
