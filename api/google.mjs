import { apiKey, fail, publicMessage } from './env.mjs'
import { tripAdvisorSession } from './tripadvisor.mjs'
import {
  closedOnSearchDay,
  distanceMeters,
  eatsHere,
  MIN_REVIEWS,
  placeScore,
  todaySchedule,
  COUNTRIES,
  cityFromAddress,
  streetFromAddress,
  countryOf,
  localityMatches,
  preciseEnough,
  zoneFor,
  isPhotoRef,
  priceLabel,
  mergeStatus,
  pricePerPerson,
  queryAddress,
  signalsFrom,
  textLanguage,
  wordsFrom,
} from './text.mjs'

const TYPE_LABELS = {
  restaurant: 'Restaurante',
  cafe: 'Cafetería',
  bar: 'Bar',
  bakery: 'Panadería',
  meal_takeaway: 'Para llevar',
  meal_delivery: 'A domicilio',
}

async function googleFetch(url, options) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(12000) })
}

function placesError(data, fallback) {
  if (data.status === 'REQUEST_DENIED') {
    return fail(502, 'Google ha rechazado Places API. Activa Places API en la misma clave.')
  }
  return fail(502, publicMessage(data.error_message || data.status || fallback))
}

const OUTSIDE = 'Cerca busca en España y Portugal. Esa dirección queda fuera.'

function geocodeStatus(data) {
  if (data.status === 'REQUEST_DENIED') {
    return fail(502, 'Google ha rechazado la clave. Activa Geocoding API en Google Cloud y revisa la clave.')
  }
  return fail(502, publicMessage(data.error_message || data.status || 'La geolocalización ha fallado'))
}

function originFrom(match, lat, lng, fallbackAddress) {
  const country = countryOf(match)
  return {
    address: match?.formatted_address || fallbackAddress,
    lat,
    lng,
    country,
    timeZone: zoneFor(lat, lng, country),
  }
}

async function reverseGeocode(lat, lng, key) {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('latlng', `${lat},${lng}`)
  url.searchParams.set('language', 'es')
  url.searchParams.set('key', key)

  const response = await googleFetch(url)
  const data = await response.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') throw geocodeStatus(data)
  const results = data.results || []
  const country = results.map(countryOf).find(Boolean)
  if (!country) {
    throw fail(404, 'Esa ubicación no está en España ni en Portugal. Cerca solo busca allí.')
  }
  const match = results.find((result) => countryOf(result) === country && preciseEnough(result)) ||
    results.find((result) => countryOf(result) === country)
  return originFrom(match, lat, lng, `Tu ubicación en ${COUNTRIES[country]}`)
}

async function geocodeRequest(address, key, locality, country = 'ES') {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', queryAddress(address))
  url.searchParams.set('region', 'es')
  url.searchParams.set('language', 'es')
  // Google solo respeta la localidad si va junto al país.
  if (locality) url.searchParams.set('components', `locality:${locality}|country:${country}`)
  url.searchParams.set('key', key)
  const response = await googleFetch(url)
  const data = await response.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') throw geocodeStatus(data)
  return data.results || []
}

async function geocode(address, key) {
  // Si la dirección trae ciudad (lo que va tras la última coma), primero se busca la calle
  // dentro de esa localidad: «Santa Clara 10, Zamora» es la ciudad de Zamora, no un pueblo de
  // la provincia. Solo si ahí no aparece se busca sin restricción (contrato 4).
  const city = cityFromAddress(address)
  if (city) {
    // La ciudad va solo como filtro: si también va en el texto, Google la lee como provincia.
    const street = streetFromAddress(address)
    for (const country of ['ES', 'PT']) {
      const scoped = (await geocodeRequest(street || address, key, city, country)).filter(
        (result) => countryOf(result) && preciseEnough(result) && localityMatches(result, city),
      )
      if (scoped.length) {
        const { lat, lng } = scoped[0].geometry.location
        return originFrom(scoped[0], lat, lng, scoped[0].formatted_address)
      }
    }
  }
  const results = await geocodeRequest(address, key)
  if (!results.length) {
    throw fail(404, 'No encuentro esa dirección. Revisa la calle, el número y la ciudad.')
  }
  const inside = results.filter((result) => countryOf(result))
  if (!inside.length) throw fail(404, OUTSIDE)
  const match = inside.find(preciseEnough)
  if (!match) {
    throw fail(404, 'Google solo encuentra la ciudad o la zona. Escribe la calle, el número y la ciudad.')
  }
  const { lat, lng } = match.geometry.location
  return originFrom(match, lat, lng, match.formatted_address)
}

const FOOD_TYPES = ['restaurant', 'bar', 'cafe', 'meal_takeaway', 'bakery']

// Con `radius` Google devuelve los 20 sitios más destacados de cada tipo dentro del radio,
// no los 20 más cercanos: así a 300 m también llegan los buenos que están lejos.
async function nearbyType(center, key, type, radius) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${center.lat},${center.lng}`)
  url.searchParams.set('radius', String(radius))
  url.searchParams.set('type', type)
  url.searchParams.set('language', 'es')
  url.searchParams.set('key', key)

  const response = await googleFetch(url)
  const data = await response.json()
  if (data.status === 'ZERO_RESULTS') return []
  if (data.status !== 'OK') throw placesError(data, 'Places no ha respondido')
  return data.results || []
}

async function nearby(center, key, radius) {
  const batches = await Promise.all(FOOD_TYPES.map((type) => nearbyType(center, key, type, radius)))
  const byId = new Map()
  for (const place of batches.flat()) {
    if (place.place_id && !byId.has(place.place_id)) byId.set(place.place_id, place)
  }
  return [...byId.values()]
}

async function placeDetails(placeId, key) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set(
    'fields',
    [
      'reviews',
      'editorial_summary',
      'url',
      'formatted_address',
      'photos',
      'opening_hours',
      'current_opening_hours',
      'business_status',
      'price_level',
      'takeout',
      'dine_in',
      'serves_lunch',
      'serves_dinner',
    ].join(','),
  )
  url.searchParams.set('language', 'es')
  url.searchParams.set('reviews_no_translations', 'true')
  url.searchParams.set('key', key)

  try {
    const response = await googleFetch(url)
    const data = await response.json()
    if (data.status !== 'OK') return null
    return data.result || null
  } catch {
    return null
  }
}

function cuisineLabel(types) {
  const list = types || []
  // «Para llevar» y «A domicilio» no son un tipo de sitio: el para llevar va aparte en la ficha.
  const specific = list.find(
    (type) => TYPE_LABELS[type] && !['restaurant', 'meal_takeaway', 'meal_delivery'].includes(type),
  )
  if (!specific && (list.includes('meal_takeaway') || list.includes('meal_delivery'))) return 'Restaurante'
  if (specific) return TYPE_LABELS[specific]
  if (list.includes('restaurant')) return 'Restaurante'
  return null
}

function mapsLink(placeId, name, detailsUrl) {
  if (typeof detailsUrl === 'string' && detailsUrl.startsWith('http')) return detailsUrl
  const url = new URL('https://www.google.com/maps/search/')
  url.searchParams.set('api', '1')
  url.searchParams.set('query', name || 'restaurante')
  if (placeId) url.searchParams.set('query_place_id', placeId)
  return url.toString()
}

function photoPath(photo) {
  const ref = photo?.photo_reference
  if (!isPhotoRef(ref)) return null
  return `/api/photo?ref=${encodeURIComponent(ref)}`
}

// Places API (New) puede no estar activa en la clave. Si Google dice 403, se deja de
// preguntar un rato, pero se vuelve a probar: si alguien la activa, no hace falta reiniciar.
const PLACES_NEW_RETRY_MS = 10 * 60 * 1000
let placesNew = 'unknown'
let placesNewOffAt = 0

// Places API (New): rango en euros y tipo principal («cake_shop», «bar»…).
async function readPriceRange(placeId, key) {
  if (placesNew === 'off' && Date.now() - placesNewOffAt > PLACES_NEW_RETRY_MS) placesNew = 'unknown'
  if (placesNew === 'off' || !placeId) return null
  try {
    const response = await googleFetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es`,
      {
        headers: {
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'priceRange,primaryType,types',
        },
      },
    )
    if (response.status === 403) {
      placesNew = 'off'
      placesNewOffAt = Date.now()
      return null
    }
    if (!response.ok) return null
    placesNew = 'on'
    const data = await response.json()
    return {
      perPerson: pricePerPerson(data.priceRange),
      primaryType: typeof data.primaryType === 'string' ? data.primaryType : null,
      types: Array.isArray(data.types) ? data.types : [],
    }
  } catch {
    return null
  }
}

function toRestaurant(place, details, center, fromNew) {
  const perPerson = fromNew?.perPerson ?? null
  const closed =
    place.business_status === 'CLOSED_PERMANENTLY' ||
    details?.business_status === 'CLOSED_PERMANENTLY' ||
    place.permanently_closed
  if (closed) return null
  const lat = place.geometry?.location?.lat
  const lng = place.geometry?.location?.lng
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  // Fuera lo que es solo para llevar y lo que no sirve comida ni cena (pastelerías, cafés…).
  const eats = eatsHere({
    dineIn: details?.dine_in,
    servesLunch: details?.serves_lunch,
    servesDinner: details?.serves_dinner,
    primaryType: fromNew?.primaryType,
    types: [...(fromNew?.types || []), ...(place.types || [])],
  })
  if (!eats) return null

  const reviews = (details?.reviews || [])
    .map((review) => ({
      rating: typeof review.rating === 'number' ? review.rating : null,
      text: typeof review.text === 'string' ? review.text.trim() : '',
      // Con reviews_no_translations, el texto va en su idioma original.
      lang: review.original_language || review.language || '',
    }))
    .filter((review) => review.text)
  const texts = reviews.map((review) => ({ text: review.text, lang: review.lang }))
  const editorial = details?.editorial_summary?.overview?.trim() || ''
  const name = place.name?.trim() || 'Restaurante'
  const photos = (details?.photos || place.photos || []).map(photoPath).filter(Boolean).slice(0, 3)
  const openNow = details?.opening_hours?.open_now ?? place.opening_hours?.open_now
  const price = priceLabel(details?.price_level ?? place.price_level)
  const fromReviews = signalsFrom(texts)
  const fromPlace = signalsFrom(editorial ? [editorial] : [])
  const priceText = perPerson || price

  return {
    id: place.place_id || name,
    name,
    address: details?.formatted_address || place.vicinity || '',
    distanceM: distanceMeters(center, { lat, lng }),
    rating: typeof place.rating === 'number' ? place.rating : null,
    reviewCount: typeof place.user_ratings_total === 'number' ? place.user_ratings_total : null,
    priceLabel: price,
    pricePerPerson: perPerson,
    priceReports: null,
    cuisine: cuisineLabel(place.types),
    openNow: typeof openNow === 'boolean' ? openNow : null,
    todayHours: todaySchedule(details?.opening_hours, details?.current_opening_hours, new Date(), center.timeZone),
    mapsUrl: mapsLink(place.place_id, name, details?.url),
    summary: editorial || null,
    summaryFromReviews: false,
    photos,
    terrace: { status: mergeStatus(fromReviews.terrace.status, fromPlace.terrace.status), quote: null },
    pets: { status: mergeStatus(fromReviews.pets.status, fromPlace.pets.status), quote: null },
    menu: {
      status: 'yes',
      quote: `Google marca el precio como ${priceText}.`,
    },
    // La nube solo usa reseñas en español y portugués: en otros idiomas salen «die», «ein», «est»…
    words: wordsFrom(texts.filter((item) => ['es', 'pt'].includes(textLanguage(item.text, item.lang))), name),
    takeaway: details?.takeout === true || fromReviews.takeaway.status === 'yes' || fromPlace.takeaway.status === 'yes',
    tripAdvisor: null,
    lat,
    lng,
  }
}

const MAX_RESULTS = 6
const BATCH = 8

async function readPriceRanges(batch, key) {
  const out = batch.map(() => null)
  if (!batch.length) return out
  let from = 0
  // La primera llamada comprueba si Places API (New) responde antes de lanzar el resto.
  if (placesNew !== 'on') {
    out[0] = await readPriceRange(batch[0].place.place_id, key)
    from = 1
    if (placesNew !== 'on') return out
  }
  const rest = await Promise.all(batch.slice(from).map((item) => readPriceRange(item.place.place_id, key)))
  rest.forEach((value, index) => {
    out[index + from] = value
  })
  return out
}

function finiteCoord(value, limit) {
  const number = Number(value)
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null
}

export async function searchRestaurants(body) {
  const address = String(body?.address || '').trim().replace(/\s+/g, ' ')
  const radius = Number(body?.radius)
  const lat = finiteCoord(body?.lat, 90)
  const lng = finiteCoord(body?.lng, 180)
  const hasPoint = lat != null && lng != null
  if (!hasPoint && address.length < 3) throw fail(400, 'Escribe una dirección o usa tu ubicación.')
  if (address.length > 180) throw fail(400, 'La dirección es demasiado larga.')
  if (![100, 200, 300].includes(radius)) throw fail(400, 'Elige 100, 200 o 300 metros.')

  const key = apiKey()
  const origin = hasPoint ? await reverseGeocode(lat, lng, key) : await geocode(address, key)
  // La lista cercana de TripAdvisor se pide ya, en paralelo con la de Google.
  const tripAdvisor = tripAdvisorSession(origin, radius)
  const inRadius = (await nearby(origin, key, radius))
    .map((place) => {
      const lat = place.geometry?.location?.lat
      const lng = place.geometry?.location?.lng
      if (typeof lat !== 'number' || typeof lng !== 'number') return null
      return { place, distanceM: distanceMeters(origin, { lat, lng }) }
    })
    .filter((item) => item && item.distanceM <= radius)
    // Con menos de 100 reseñas en Google no hay base para fiarse de la nota.
    .filter((item) => (item.place.user_ratings_total || 0) >= MIN_REVIEWS)
  // Todos los del radio, por puntuación: nota + reseñas (a igualdad, el más cercano).
  // La nota y las reseñas llegan con la lista cercana: ordenar no cuesta llamadas.
  const places = inRadius
    .map((item) => ({ ...item, score: placeScore(item.place.rating, item.place.user_ratings_total) }))
    .sort((a, b) => b.score - a.score || a.distanceM - b.distanceM)
    .slice(0, 30)

  // Se revisan en tandas, de mejor a peor nota, y se para al tener seis. El resultado es el
  // mismo que pedir las treinta fichas (los seis mejores que cumplen), pero casi nunca hace
  // falta más de una tanda, y cada ficha de Google o TripAdvisor cuesta.
  const accepted = []
  for (let start = 0; start < places.length && accepted.length < MAX_RESULTS; start += BATCH) {
    const batch = places.slice(start, start + BATCH)
    const [details, priceRanges] = await Promise.all([
      Promise.all(batch.map((item) => placeDetails(item.place.place_id, key))),
      readPriceRanges(batch, key),
    ])
    const candidates = batch
      .map((item, index) => toRestaurant(item.place, details[index], origin, priceRanges[index]))
      .filter(Boolean)
    for (const restaurant of await tripAdvisor.enrich(candidates)) {
      const priced =
        restaurant.priceLabel || restaurant.pricePerPerson || restaurant.tripAdvisor?.priceLevel
      if (priced && !closedOnSearchDay(restaurant.todayHours)) accepted.push(restaurant)
    }
  }

  return {
    resolvedAddress: origin.address,
    country: origin.country,
    timeZone: origin.timeZone,
    radius,
    center: { lat: origin.lat, lng: origin.lng },
    restaurants: accepted.slice(0, MAX_RESULTS),
  }
}

export async function proxyPhoto(ref, res, sendJson) {
  if (!isPhotoRef(ref)) {
    sendJson(res, 400, { error: 'Foto no válida' })
    return
  }
  const key = apiKey()
  const url = new URL('https://maps.googleapis.com/maps/api/place/photo')
  url.searchParams.set('maxwidth', '960')
  url.searchParams.set('photo_reference', ref)
  url.searchParams.set('key', key)
  const upstream = await googleFetch(url)
  if (!upstream.ok) {
    sendJson(res, 502, { error: 'No se pudo cargar la foto' })
    return
  }
  const type = upstream.headers.get('content-type') || ''
  if (!type.startsWith('image/')) {
    sendJson(res, 502, { error: 'La foto no ha llegado como imagen' })
    return
  }
  res.statusCode = 200
  res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.end(Buffer.from(await upstream.arrayBuffer()))
}
