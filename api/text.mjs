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
have had there their what when your all been she his her its
da do das dos uns umas aos na nas num numa com sem ate sao foi tem tinha
isto essa esse isso ali muito muita muitos muitas mais todo toda tambem
outro outra mas quando onde pouco pouca pessoas vezes sempre pode podem fazer
boa bom bons boas melhor melhores nao sim voce estava estavam estamos
recomendo recomendavel pra ainda sitio espaco comer fomos tudo uma`
    .split(/\s+/)
    .filter(Boolean),
)

// Se buscan sobre el texto sin tildes ni mayúsculas (fold). Español, portugués e inglés.
const SIGNALS = {
  terrace:
    /terrazas?|\bterraco\b|terraces?|esplanadas?|al aire libre|ao ar livre|mesas?\s+(?:en\s+)?(?:la\s+)?(?:calle|fuera)|mesas?\s+(?:na\s+rua|la fora|ca fora)|jardin|jardim|patio/,
  pets: /mascotas?|\bperros?\b(?!\s+calientes?)|\bcaes\b|\bcao\b|\bcachorros?\b(?![\s-]+quentes?)|pet[\s-]?friendly|dog friendly|animales?\s+de\s+compania|animais\s+de\s+estimacao|admiten\s+(?:perros|mascotas)|aceitam\s+(?:caes|animais)/,
  takeaway: /para llevar|para levar|take[\s-]?away|takeout|para recoger/,
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

const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export function localToday(now = new Date(), zone = 'Europe/Madrid') {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const dayLabel = new Intl.DateTimeFormat('es-ES', { timeZone: zone, weekday: 'long' }).format(now)
  const dayIndex = WEEKDAYS_ES.indexOf(dayLabel.toLowerCase())
  return {
    date,
    dayIndex,
    dayLabel: dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1),
  }
}

// Dos zonas dan la misma hora ahora (p. ej. Europe/Madrid y Africa/Ceuta).
function sameClock(a, b, now) {
  try {
    const fmt = (zone) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(now)
    return fmt(a) === fmt(b)
  } catch {
    return false
  }
}

function clock(value) {
  const digits = String(value || '').padStart(4, '0')
  if (!/^\d{4}$/.test(digits)) return null
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function rangesFromPeriods(periods) {
  const ranges = periods
    .map((period) => {
      const open = clock(period.open?.time)
      const close = clock(period.close?.time)
      if (open && close) return `${open}–${close}`
      if (open) return `desde ${open}`
      return null
    })
    .filter(Boolean)
  return ranges.length ? ranges.join(', ') : 'Cerrado'
}

function hoursFromText(lines, dayIndex) {
  const names = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const line = (lines || []).find((item) => fold(item).startsWith(names[dayIndex]))
  if (!line) return null
  const hours = line.slice(line.indexOf(':') + 1).trim()
  return hours || null
}

export function todaySchedule(openingHours, currentOpeningHours, now = new Date(), zone = 'Europe/Madrid') {
  const today = localToday(now, zone)
  if (today.dayIndex < 0) return null
  const currentPeriods = currentOpeningHours?.periods
  if (Array.isArray(currentPeriods) && currentPeriods.some((period) => period.open?.date)) {
    // Un tramo «truncated» que empieza hoy a las 00:00 es la cola de la noche anterior
    // (p. ej. un bar abierto el domingo hasta las 02:30): no cuenta como que abra hoy.
    const todays = currentPeriods.filter(
      (period) => period.open?.date === today.date && !period.open?.truncated,
    )
    return `${today.dayLabel} · ${rangesFromPeriods(todays)}`
  }
  const regular = (openingHours?.periods || []).filter((period) => period.open?.day === today.dayIndex)
  if (regular.length) return `${today.dayLabel} · ${rangesFromPeriods(regular)}`
  const fromText = hoursFromText(openingHours?.weekday_text, today.dayIndex)
  if (fromText) return `${today.dayLabel} · ${fromText}`
  return null
}

export function todayFromTripAdvisor(hours, now = new Date(), zone = 'Europe/Madrid') {
  if (typeof hours?.timezone !== 'string') return null
  if (hours.timezone !== zone && !sameClock(hours.timezone, zone, now)) return null
  const today = localToday(now, zone)
  if (today.dayIndex < 0) return null
  const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.dayIndex]
  const periods = (hours.periods || []).filter((period) => fold(period.day_of_week) === day)
  if (!periods.length) return `${today.dayLabel} · Cerrado`
  const ranges = periods
    .map((period) => {
      const open = String(period.opens || '').slice(0, 5)
      const close = String(period.closes || '').slice(0, 5)
      return /^\d{2}:\d{2}$/.test(open) && /^\d{2}:\d{2}$/.test(close) ? `${open}–${close}` : null
    })
    .filter(Boolean)
  return `${today.dayLabel} · ${ranges.length ? ranges.join(', ') : 'Cerrado'}`
}

export function closedOnSearchDay(schedule) {
  if (!schedule) return false
  return fold(schedule).includes('cerrado')
}

export function queryAddress(input) {
  return String(input || '').trim().replace(/\s+/g, ' ')
}

// Ciudad escrita en la dirección: lo que va tras la última coma, si no es un número ni un
// código postal ni el país.
export function cityFromAddress(address) {
  const parts = String(address || '').split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length < 2) return null
  const last = parts[parts.length - 1].replace(/^\d{4,5}(-\d{3})?\s*/, '').trim()
  if (!last || /^\d+$/.test(last)) return null
  if (/^(espa(n|ñ)a|spain|portugal)$/i.test(last)) {
    return parts.length > 2 ? cityFromAddress(parts.slice(0, -1).join(', ')) : null
  }
  return last
}

// La dirección sin la ciudad, el código postal ni el país: «Calle Santa Clara 10».
export function streetFromAddress(address) {
  const parts = String(address || '').split(',').map((part) => part.trim()).filter(Boolean)
  const city = cityFromAddress(address)
  const cityKey = city ? fold(city) : null
  while (parts.length > 1) {
    const last = parts[parts.length - 1]
    const bare = last.replace(/^\d{4,5}(-\d{3})?\s*/, '').trim()
    const isCountry = /^(espa(n|ñ)a|spain|portugal)$/i.test(bare)
    const isPostal = /^\d{4,5}(-\d{3})?$/.test(last)
    const isCity = cityKey && fold(bare) === cityKey
    if (isCountry || isPostal || isCity) parts.pop()
    else break
  }
  return parts.join(', ')
}

// ¿El resultado de Google está en esa localidad (o municipio)?
export function localityMatches(result, city) {
  const want = fold(city).replace(/[^a-z0-9]+/g, ' ').trim()
  if (!want) return false
  return (result?.address_components || []).some((component) => {
    const types = component.types || []
    if (!types.includes('locality') && !types.includes('administrative_area_level_4') && !types.includes('postal_town')) {
      return false
    }
    return [component.long_name, component.short_name].some(
      (name) => fold(name || '').replace(/[^a-z0-9]+/g, ' ').trim() === want,
    )
  })
}

export const COUNTRIES = { ES: 'España', PT: 'Portugal' }

export function countryOf(result) {
  const part = (result?.address_components || []).find((c) => (c.types || []).includes('country'))
  const code = part?.short_name?.toUpperCase()
  return code && COUNTRIES[code] ? code : null
}

// Canarias, Azores y Madeira van una hora por detrás de su capital; Ceuta y Melilla, como Madrid.
export function zoneFor(lat, lng, country) {
  if (country === 'PT') {
    if (lat >= 36.5 && lat <= 40 && lng >= -31.6 && lng <= -24.5) return 'Atlantic/Azores'
    if (lat >= 29.9 && lat <= 33.3 && lng >= -17.6 && lng <= -15.7) return 'Atlantic/Madeira'
    return 'Europe/Lisbon'
  }
  if (lat >= 27.4 && lat <= 29.6 && lng >= -18.4 && lng <= -13.2) return 'Atlantic/Canary'
  if (lat >= 35.2 && lat <= 35.95 && lng >= -5.45 && lng <= -2.85) return 'Africa/Ceuta'
  return 'Europe/Madrid'
}

// Una dirección que Google solo sitúa como ciudad, provincia o código postal no sirve para 100 m.
const COARSE = new Set([
  'country',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
  'administrative_area_level_4',
  'locality',
  'postal_code',
  'colloquial_area',
  'political',
])

export function preciseEnough(result) {
  const types = result?.types || []
  return types.length > 0 && types.some((type) => !COARSE.has(type))
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

// Puntuación para ordenar (contrato 4): nota de Google más media estrella cada vez que las
// reseñas se multiplican por 10. Un 4,1 con 1.242 reseñas (5,65) va por delante de un 4,5
// con 195 (5,64): las reseñas cuentan de verdad, no solo la nota.
export const REVIEWS_WEIGHT = 0.5
// Menos reseñas que esto en Google y el sitio no entra (contrato 4).
export const MIN_REVIEWS = 100

export function placeScore(rating, count) {
  if (typeof rating !== 'number' || typeof count !== 'number' || count <= 0) return -Infinity
  return rating + REVIEWS_WEIGHT * Math.log10(count)
}

// ¿Se puede comer ahí? (contrato 4). El desayuno no cuenta como comida.
// Dulce: fuera siempre, aunque Google diga que sirven comidas (pastelerías, heladerías…).
const SWEET_TYPES = new Set([
  'bakery',
  'cake_shop',
  'pastry_shop',
  'dessert_shop',
  'dessert_restaurant',
  'confectionery',
  'candy_store',
  'chocolate_shop',
  'ice_cream_shop',
  'juice_shop',
  'tea_house',
  'donut_shop',
])
// Cafés y desayunos: solo entran si Google dice que sirven comida o cena.
const NO_MEAL_TYPES = new Set([
  ...SWEET_TYPES,
  'cafe',
  'coffee_shop',
  'breakfast_restaurant',
  'bagel_shop',
  'food_store',
  'store',
])
// Bares: solo entran si Google dice que sirven comida o cena (fuera los de copas).
const BAR_TYPES = new Set([
  'bar',
  'pub',
  'wine_bar',
  'gastropub',
  'cocktail_bar',
  'sports_bar',
  'irish_pub',
  'beer_hall',
  'beer_garden',
  'lounge_bar',
  'night_club',
  'hookah_bar',
])
const MEAL_TYPES = /restaurant$|^restaurant$|^bar$|^pub$|^bar_and_grill$|^wine_bar$|^gastropub$|^meal_takeaway$|^meal_delivery$|^food_court$|^cafeteria$/

export function eatsHere({ dineIn, servesLunch, servesDinner, primaryType, types } = {}) {
  // Solo para llevar: no se come ahí.
  if (dineIn === false) return false
  if (primaryType && SWEET_TYPES.has(primaryType)) return false
  if (servesLunch === true || servesDinner === true) return true
  // Algún tipo de dulce y sin comidas ni cenas: fuera, aunque el tipo principal diga otra cosa.
  if ((types || []).some((type) => SWEET_TYPES.has(type))) return false
  if (servesLunch === false && servesDinner === false) return false
  const main = primaryType || null
  if (main) return !NO_MEAL_TYPES.has(main) && !BAR_TYPES.has(main)
  // Sin tipo principal: vale si alguno de sus tipos es de comida (un bar solo no basta).
  return (types || []).some(
    (type) => MEAL_TYPES.test(type) && !NO_MEAL_TYPES.has(type) && !BAR_TYPES.has(type),
  )
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

function moneyAmount(money) {
  if (!money || typeof money !== 'object') return null
  if (money.units == null && money.nanos == null) return null
  const units = Number(money.units ?? 0)
  const nanos = Number(money.nanos ?? 0)
  if (!Number.isFinite(units) || !Number.isFinite(nanos)) return null
  const value = units + nanos / 1e9
  if (value < 0) return null
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString('es-ES', { maximumFractionDigits: 2 })
}

export function pricePerPerson(range) {
  if (!range || typeof range !== 'object') return null
  const start = moneyAmount(range.startPrice)
  const end = moneyAmount(range.endPrice)
  if (start == null && end == null) return null
  const money = range.startPrice || range.endPrice
  // En castellano el símbolo va detrás y separado: «20-60 €». Con espacio duro para que
  // no quede el € solo en otra línea.
  const unit = !money?.currencyCode || money.currencyCode === 'EUR' ? '€' : money.currencyCode
  const tail = `\u00a0${unit}`
  if (start != null && end != null) return `${start}-${end}${tail}`
  if (start != null) return `Más de ${start}${tail}`
  return `Menos de ${end}${tail}`
}

export function isPhotoRef(ref) {
  return typeof ref === 'string' && /^[A-Za-z0-9_-]{20,900}$/.test(ref)
}

function splitSentences(text) {
  const parts = text.split(/\n+|(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean)
  return parts.length ? parts : [text]
}

// Giros que llevan una negación pero no niegan lo que sigue.
const NOT_NEGATION = {
  es: /\b(?:sin duda|sin lugar a dudas?|sin embargo|sin ninguna duda|no solo|no solamente|no obstante|ni que decir)\b/g,
  pt: /\b(?:sem duvidas?|sem qualquer duvida|nao so|nao apenas|nao somente|no entanto|nao obstante|nem por isso)\b/g,
}
// En portugués «no» es «en el» («no terraço»): solo niegan «não», «sem», «nem» y «nunca».
const NEGATION_BEFORE = { es: /\b(no|sin|ni|nunca)\b/, pt: /\b(nao|sem|nem|nunca)\b/ }
const NEGATION_AFTER = { es: /^(no|sin|ni)\b/, pt: /^(nao|sem|nem)\b/ }

const PORTUGUESE_HINT = /\b(nao|muito|tambem|voce|esplanada|obrigad[oa]|entao|otimo|comida boa|fomos|estava|atendimento)\b|\b\p{L}+(?:cao|coes)\b/u

// Idioma de un texto: el que diga la fuente o, si no lo dice, una pista rápida.
export function textLanguage(text, declared) {
  const lang = String(declared || '').toLowerCase()
  if (lang.startsWith('pt')) return 'pt'
  if (lang.startsWith('es')) return 'es'
  // Otro idioma declarado (inglés, francés…): se lee con las reglas del español, pero no es ni es ni pt.
  if (/^[a-z]{2}/.test(lang)) return lang.slice(0, 2)
  return PORTUGUESE_HINT.test(fold(text)) ? 'pt' : 'es'
}

function negated(folded, index, language) {
  const lang = language === 'pt' ? 'pt' : 'es'
  const before = folded
    .slice(0, index)
    .trim()
    .split(/\s+/)
    .slice(-6)
    .join(' ')
    .replace(NOT_NEGATION[lang], ' ')
    .trim()
    .split(/\s+/)
    .slice(-3)
    .join(' ')
  if (NEGATION_BEFORE[lang].test(before)) return true
  const after = folded.slice(index).trim().split(/\s+/).slice(1, 3).join(' ')
  return NEGATION_AFTER[lang].test(after)
}

// Acepta textos sueltos o { text, lang }.
function asItem(entry) {
  if (typeof entry === 'string') return { text: entry, lang: textLanguage(entry) }
  const text = String(entry?.text || '')
  return { text, lang: textLanguage(text, entry?.lang) }
}

function classify(entries, pattern) {
  let negativeQuote = null
  for (const { text, lang } of entries) {
    for (const part of splitSentences(text)) {
      const folded = fold(part)
      const index = folded.search(pattern)
      if (index < 0) continue
      const quote = clip(part, 200)
      if (!negated(folded, index, lang)) return { status: 'yes', quote }
      if (!negativeQuote) negativeQuote = quote
    }
  }
  if (negativeQuote) return { status: 'no', quote: negativeQuote }
  return { status: 'unknown', quote: null }
}

export function signalsFrom(texts) {
  const entries = (texts || []).map(asItem).filter((item) => item.text)
  return {
    terrace: classify(entries, SIGNALS.terrace),
    pets: classify(entries, SIGNALS.pets),
    menu: classify(entries, SIGNALS.menu),
    takeaway: classify(entries, SIGNALS.takeaway),
  }
}

export function mergeStatus(current, extra) {
  if (current === 'yes' || extra === 'yes') return 'yes'
  if (current === 'no' || extra === 'no') return 'no'
  return 'unknown'
}

export function wordsFrom(texts, name = '') {
  const counts = new Map()
  const display = new Map()
  const nameKeys = new Set((String(name).match(/\p{L}{3,}/gu) || []).map(fold))
  for (const entry of texts) {
    const text = typeof entry === 'string' ? entry : entry?.text || ''
    const tokens = String(text).match(/\p{L}{3,}/gu) || []
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
  return ranked.slice(0, 12).map(([key, count]) => ({ text: display.get(key), count }))
}

export function mergeWords(groups) {
  const counts = new Map()
  const display = new Map()
  for (const group of groups) {
    for (const word of group || []) {
      const key = fold(word.text)
      if (!key) continue
      counts.set(key, (counts.get(key) || 0) + word.count)
      if (!display.has(key)) display.set(key, word.text)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, 12)
    .map(([key, count]) => ({ text: display.get(key), count }))
}
