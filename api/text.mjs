const STOP = new Set(
  `de la el los las un una unos unas al del en con por para sin sobre entre
desde hasta como que se su sus es son ser fue eran era han hay ha he hemos
esta este esto esa ese eso aqui alli muy mas menos todo toda todos todas
bien mal tambien solo cada otro otra otros otras nos les pero porque cuando
donde poco poca pocos pocas mucho mucha muchos muchas restaurante
restaurantes sitio lugar comida gente veces siempre nunca puede pueden hacer
tiene tienen tenia habia fueron estaba estaban estamos recomendable recomiendo
buena bueno buenos buenas mejor mejores bastante algo nada dia dias the and
for with this that very really just our was were they you are not but from
have had there their what when your all been she his her its`
    .split(/\s+/)
    .filter(Boolean),
)

const SIGNALS = {
  terrace: /terrazas?|al aire libre|mesas?\s+(?:en\s+)?(?:la\s+)?(?:calle|fuera)|jardin|patio/,
  pets: /mascotas?|perros?(?!\s+caliente)|pet[\s-]?friendly|dog friendly|animales?\s+de\s+compania|admiten\s+(?:perros|mascotas)/,
  menu: /cartas?|menus?|raciones|precios?|€|\d+(?:[.,]\d+)?\s*euros?/,
}

export function fold(value) {
  return String(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

export function clip(value, max) {
  const clean = String(value).replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trim()}…`
}

export function queryAddress(input) {
  const q = String(input).trim().replace(/\s+/g, ' ')
  if (/gij[oó]n|xix[oó]n/i.test(q)) return q
  return `${q}, Gijón, España`
}

export function inGijon(result) {
  const lat = result?.geometry?.location?.lat
  const lng = result?.geometry?.location?.lng
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  const inside = lat >= 43.48 && lat <= 43.585 && lng >= -5.78 && lng <= -5.55
  if (!inside) return false
  const blob = fold(
    [result.formatted_address || '', ...(result.address_components || []).map((c) => c.long_name || '')].join(
      ' ',
    ),
  )
  return blob.includes('gijon') || blob.includes('xixon')
}

export function distanceMeters(a, b) {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))))
}

export function priceLabel(level) {
  if (level == null || level === 'PRICE_LEVEL_UNSPECIFIED') return null
  if (typeof level === 'number') return ['Gratis', '€', '€€', '€€€', '€€€€'][level] ?? null
  const labels = {
    PRICE_LEVEL_FREE: 'Gratis',
    PRICE_LEVEL_INEXPENSIVE: '€',
    PRICE_LEVEL_MODERATE: '€€',
    PRICE_LEVEL_EXPENSIVE: '€€€',
    PRICE_LEVEL_VERY_EXPENSIVE: '€€€€',
  }
  return labels[level] ?? null
}

export function isPhotoRef(ref) {
  return typeof ref === 'string' && /^[A-Za-z0-9_-]{20,900}$/.test(ref)
}

function splitSentences(text) {
  const parts = text.split(/\n+|(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean)
  return parts.length ? parts : [text]
}

function negated(folded, index) {
  const before = folded.slice(0, index).trim().split(/\s+/).slice(-3).join(' ')
  if (/\b(no|sin|ni|nunca)\b/.test(before)) return true
  const after = folded.slice(index).trim().split(/\s+/).slice(1, 3).join(' ')
  return /^(no|sin|ni)\b/.test(after)
}

function classify(texts, pattern) {
  let negativeQuote = null
  for (const text of texts) {
    for (const part of splitSentences(text)) {
      const folded = fold(part)
      const index = folded.search(pattern)
      if (index < 0) continue
      const quote = clip(part, 200)
      if (!negated(folded, index)) return { status: 'yes', quote }
      if (!negativeQuote) negativeQuote = quote
    }
  }
  if (negativeQuote) return { status: 'no', quote: negativeQuote }
  return { status: 'unknown', quote: null }
}

export function signalsFrom(texts) {
  return {
    terrace: classify(texts, SIGNALS.terrace),
    pets: classify(texts, SIGNALS.pets),
    menu: classify(texts, SIGNALS.menu),
  }
}

export function wordsFrom(texts, name = '') {
  const counts = new Map()
  const display = new Map()
  const nameKeys = new Set((String(name).match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/g) || []).map(fold))
  for (const text of texts) {
    const tokens = String(text).match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/g) || []
    for (const token of tokens) {
      const key = fold(token)
      if (STOP.has(key) || nameKeys.has(key)) continue
      counts.set(key, (counts.get(key) || 0) + 1)
      if (!display.has(key)) display.set(key, token.toLowerCase())
    }
  }
  const ranked = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'),
  )
  const repeated = ranked.filter(([, n]) => n > 1)
  const pool = repeated.length >= 5 ? repeated : ranked
  return pool.slice(0, 12).map(([key, count]) => ({ text: display.get(key), count }))
}
