import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let loaded = false

function applyFile(name) {
  const file = resolve(process.cwd(), name)
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] == null || process.env[key] === '') process.env[key] = value
  }
}

export function loadEnv() {
  if (loaded) return
  loaded = true
  applyFile('clave.env')
  applyFile('.env')
}

export function fail(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

export function apiKey() {
  loadEnv()
  let key = process.env.GOOGLE_MAPS_API_KEY?.trim()
  if (!key) {
    loaded = false
    loadEnv()
    key = process.env.GOOGLE_MAPS_API_KEY?.trim()
  }
  if (!key) {
    throw fail(
      503,
      'Falta GOOGLE_MAPS_API_KEY en clave.env.',
    )
  }
  return key
}

export function publicMessage(value) {
  return String(value || 'Google no ha respondido')
    .replace(/key=[^&\s]+/gi, 'key=…')
    .slice(0, 280)
}
