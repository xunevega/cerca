import type { Radius, SearchResponse } from './types'

// ——— Reutilizar búsquedas de esta misma página (ver CONTRATO.md) ———
// No se guarda nada en el servidor ni en el navegador: solo se vuelve a enseñar lo que la
// página ya ha recibido, durante unos minutos y siempre el mismo día en la hora del sitio buscado.
const REUSE_MS = 10 * 60 * 1000
export type Origin = { address: string } | { lat: number; lng: number }
export type Kept = { at: number; day: string; zone: string; data: SearchResponse }

export function localDay(zone = 'Europe/Madrid', now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function originKey(origin: Origin) {
  if ('address' in origin) {
    return `a:${origin.address.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()}`
  }
  return `p:${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}`
}

function fresh(kept: Kept | undefined, now: number) {
  return kept && now - kept.at < REUSE_MS && kept.day === localDay(kept.zone) ? kept : null
}

/**
 * Devuelve un resultado ya recibido para ese mismo origen y radio. Un radio distinto
 * siempre se pide: la lista son los mejor valorados del radio y cambia con él.
 */
export function reuse(kept: Map<string, Kept>, origin: Origin, radius: Radius): SearchResponse | null {
  const entry = fresh(kept.get(`${originKey(origin)}|${radius}`), Date.now())
  return entry ? entry.data : null
}

export function keep(kept: Map<string, Kept>, origin: Origin, data: SearchResponse) {
  const key = `${originKey(origin)}|${data.radius}`
  kept.delete(key)
  const zone = data.timeZone || 'Europe/Madrid'
  kept.set(key, { at: Date.now(), day: localDay(zone), zone, data })
  while (kept.size > 30) kept.delete(kept.keys().next().value as string)
}
