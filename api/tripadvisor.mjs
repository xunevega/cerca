import { tripAdvisorKey } from './env.mjs'
import {
  distanceMeters,
  fold,
  mergeStatus,
  mergeWords,
  signalsFrom,
  textLanguage,
  todayFromTripAdvisor,
  wordsFrom,
} from './text.mjs'

function primaryName(location) {
  const names = location?.names || []
  return (names.find((item) => item.primary) || names[0])?.value || ''
}

function nameKey(value) {
  return fold(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(
      /\b(restaurante|restaurant|bar|cafeteria|cafe|pastelaria|padaria|tasca|taberna|marisqueira|churrasqueira|cerveceria|cervejaria|sidreria)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function namesClose(a, b) {
  if (!a || !b) return false
  if (a === b || a.includes(b) || b.includes(a)) return true
  const left = a.split(' ').filter((word) => word.length > 2)
  const right = new Set(b.split(' ').filter((word) => word.length > 2))
  if (!left.length || !right.size) return false
  const shared = left.filter((word) => right.has(word)).length
  return shared >= 1 && shared / Math.min(left.length, right.size) >= 0.5
}

function reviewLines(review) {
  const lines = []
  for (const part of review?.text || []) {
    const value = typeof part === 'string' ? part : part?.value
    if (!value) continue
    lines.push({ text: value, lang: textLanguage(value, part?.language) })
  }
  return lines
}

function mergeSignal(current, extra) {
  return { status: mergeStatus(current?.status || 'unknown', extra || 'unknown'), quote: null }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// TripAdvisor corta con 429 a partir de unas 5 peticiones seguidas (medido con la clave real
// el 28/09/2026). Todas las llamadas pasan por esta cola: como mucho una cada 250 ms en todo
// el servidor, y ante un 429 se espera y se reintenta.
const TA_GAP_MS = 250
let taNext = 0

function taSlot() {
  const now = Date.now()
  const at = Math.max(now, taNext)
  taNext = at + TA_GAP_MS
  return wait(at - now)
}

async function taJson(url, key, attempt = 0) {
  await taSlot()
  try {
    const response = await fetch(url, {
      headers: { 'X-API-KEY': key, accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) {
      if (attempt < 3 && (response.status === 429 || response.status >= 500)) {
        await wait(response.status === 429 ? 1000 * (attempt + 1) : 400 * (attempt + 1))
        return taJson(url, key, attempt + 1)
      }
      return null
    }
    return response.json()
  } catch {
    if (attempt < 2) {
      await wait(400 * (attempt + 1))
      return taJson(url, key, attempt + 1)
    }
    return null
  }
}

async function nearby(origin, radius, key) {
  const pages = await Promise.all([1, 2, 3].map((page) => nearbyPage(origin, radius, key, page)))
  const seen = new Set()
  const rows = []
  for (const row of pages.flat()) {
    const id = row.location?.id
    if (!id || seen.has(id)) continue
    if ((row.distance_kilometers || 0) * 1000 > radius + 40) continue
    seen.add(id)
    rows.push(row)
  }
  return rows
}

async function nearbyPage(origin, radius, key, page) {
  const url = new URL('https://terra.tripadvisor.com/api/catalog/locations/nearby')
  url.searchParams.set('lat', String(origin.lat))
  url.searchParams.set('lon', String(origin.lng))
  url.searchParams.set('radius', String(Math.min(1, Math.max(0.1, radius / 1000))))
  url.searchParams.set('unit', 'KM')
  url.searchParams.set('category', 'RESTAURANT')
  url.searchParams.set('locale', 'es-ES')
  url.searchParams.set('size', '20')
  url.searchParams.set('sort', 'distance')
  url.searchParams.set('page', String(page))
  const data = await taJson(url, key)
  return data?.data || []
}

async function placeBundle(id, key, name, origin) {
  const detailsUrl = new URL(`https://terra.tripadvisor.com/api/locations/${id}`)
  detailsUrl.searchParams.set('locale', 'es-ES')
  const reviewsUrl = new URL(`https://terra.tripadvisor.com/api/locations/${id}/reviews`)
  // En Portugal se piden las reseñas en portugués, que ahora también se leen.
  reviewsUrl.searchParams.set('locale', origin?.country === 'PT' ? 'pt-PT' : 'es-ES')
  reviewsUrl.searchParams.set('size', '5')
  // Sin llamada de fotos (contrato 4): solo servía para leer «terraza» en los pies de foto
  // y costaba un tercio de las peticiones a TripAdvisor.
  const [details, reviews] = await Promise.all([taJson(detailsUrl, key), taJson(reviewsUrl, key)])
  const lines = (reviews?.data || []).flatMap(reviewLines)
  const reviewTexts = lines.map((line) => ({ text: line.text, lang: line.lang }))
  const about = (details?.descriptions || []).map((item) => item?.value).filter(Boolean)
  const priceLevel = typeof details?.price_level === 'string' ? details.price_level.trim() : ''
  const fromReviews = signalsFrom(reviewTexts)
  const fromAbout = signalsFrom(about)
  return {
    // La nube usa las reseñas en español y en portugués.
    words: wordsFrom(lines.filter((line) => line.lang === 'es' || line.lang === 'pt').map((line) => line.text), name),
    terrace: mergeStatus(fromReviews.terrace.status, fromAbout.terrace.status),
    pets: mergeStatus(fromReviews.pets.status, fromAbout.pets.status),
    takeaway: signalsFrom([...reviewTexts, ...about]).takeaway.status === 'yes',
    priceLevel: priceLevel || null,
    todayHours: todayFromTripAdvisor(details?.opening_hours, new Date(), origin?.timeZone),
    rating: typeof details?.traveler_ratings?.overall?.rating === 'number' ? details.traveler_ratings.overall.rating : null,
    reviewCount: typeof details?.traveler_ratings?.overall?.count === 'number' ? details.traveler_ratings.overall.count : null,
  }
}

async function mapLimit(items, limit, task) {
  const out = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      out[index] = await task(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return out
}

function matchRows(restaurants, rows, used = new Set()) {
  return restaurants.map((restaurant) => {
    const wanted = nameKey(restaurant.name)
    let best = null
    let bestMeters = Infinity
    for (const row of rows) {
      const id = row.location?.id
      const point = row.location?.coordinates
      if (!id || used.has(id) || !point) continue
      if (!namesClose(wanted, nameKey(primaryName(row.location)))) continue
      const meters = distanceMeters(
        { lat: restaurant.lat, lng: restaurant.lng },
        { lat: point.latitude, lng: point.longitude },
      )
      if (meters > 100 || meters >= bestMeters) continue
      best = row
      bestMeters = meters
    }
    if (best) used.add(best.location.id)
    return best
  })
}

function publicRestaurant(restaurant, extra = {}) {
  const { lat, lng, ...rest } = restaurant
  return { ...rest, ...extra }
}

function merged(restaurant, row, bundle) {
  if (!row || !bundle) return publicRestaurant(restaurant, { tripAdvisor: null })
  const overall = row.location?.overall_rating || {}
  return publicRestaurant(restaurant, {
    tripAdvisor: {
      rating: bundle.rating ?? (typeof overall.rating === 'number' ? overall.rating : null),
      reviewCount: bundle.reviewCount ?? (typeof overall.count === 'number' ? overall.count : null),
      priceLevel: bundle.priceLevel,
    },
    terrace: mergeSignal(restaurant.terrace, bundle.terrace),
    pets: mergeSignal(restaurant.pets, bundle.pets),
    takeaway: restaurant.takeaway || bundle.takeaway,
    todayHours: restaurant.todayHours || bundle.todayHours,
    words: mergeWords([restaurant.words, bundle.words]),
  })
}

/**
 * Sesión de TripAdvisor para una búsqueda. Pide la lista de sitios cercanos una sola vez
 * (arranca en cuanto se crea, en paralelo con Google) y empareja por tandas, en orden de
 * distancia. El emparejamiento es voraz y en orden, así que ir por tandas da el mismo
 * resultado que emparejarlo todo de golpe, pero solo se piden fichas de los sitios que
 * de verdad hacen falta.
 */
export function tripAdvisorSession(origin, radius) {
  const key = tripAdvisorKey()
  const used = new Set()
  const rowsPromise = key ? nearby(origin, radius, key).catch(() => null) : Promise.resolve(null)
  return {
    async enrich(restaurants) {
      if (!restaurants.length) return []
      const rows = await rowsPromise
      if (!key || !rows) return restaurants.map((restaurant) => publicRestaurant(restaurant))
      try {
        const matched = matchRows(restaurants, rows, used)
        const bundles = await mapLimit(matched, 2, (row, index) =>
          row ? placeBundle(row.location.id, key, restaurants[index].name, origin) : null,
        )
        return restaurants.map((restaurant, index) => merged(restaurant, matched[index], bundles[index]))
      } catch {
        return restaurants.map((restaurant) => publicRestaurant(restaurant))
      }
    },
  }
}

export async function attachTripAdvisor(restaurants, origin, radius) {
  return tripAdvisorSession(origin, radius).enrich(restaurants)
}
