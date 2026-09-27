import type { Radius, SearchResponse } from './types'

// ——— Reutilizar búsquedas de esta misma página (ver CONTRATO.md) ———
// No se guarda nada en el servidor ni en el navegador: solo se vuelve a enseñar lo que la
// página ya ha recibido, durante unos minutos y siempre el mismo día en la hora del sitio buscado.
const RADII: Radius[] = [100, 200, 300]
const REUSE_MS = 10 * 60 * 1000
const MAX_RESULTS = 10
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
 * Busca un resultado ya recibido para ese origen y radio. Si solo hay uno de radio mayor,
 * vale cuando cubre seguro el menor: o trae menos de diez sitios (estaban todos) o el
 * último queda más lejos que el radio pedido (todos los que caben están antes que él).
 */
export function reuse(kept: Map<string, Kept>, origin: Origin, radius: Radius): SearchResponse | null {
  const now = Date.now()
  const key = originKey(origin)
  const exact = fresh(kept.get(`${key}|${radius}`), now)
  if (exact) return exact.data
  for (const bigger of RADII) {
    if (bigger <= radius) continue
    const entry = fresh(kept.get(`${key}|${bigger}`), now)
    if (!entry) continue
    const list = entry.data.restaurants
    const last = list[list.length - 1]
    if (list.length < MAX_RESULTS || (last && last.distanceM > radius)) {
      return { ...entry.data, radius, restaurants: list.filter((item) => item.distanceM <= radius) }
    }
  }
  return null
}

export function keep(kept: Map<string, Kept>, origin: Origin, data: SearchResponse) {
  const key = `${originKey(origin)}|${data.radius}`
  kept.delete(key)
  const zone = data.timeZone || 'Europe/Madrid'
  kept.set(key, { at: Date.now(), day: localDay(zone), zone, data })
  while (kept.size > 30) kept.delete(kept.keys().next().value as string)
}
