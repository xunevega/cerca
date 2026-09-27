import { apiKey, fail, publicMessage } from './env.mjs'
import {
  clip,
  distanceMeters,
  inGijon,
  isPhotoRef,
  priceLabel,
  queryAddress,
  signalsFrom,
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

async function geocode(address, key) {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', queryAddress(address))
  url.searchParams.set('components', 'country:ES')
  url.searchParams.set('region', 'es')
  url.searchParams.set('language', 'es')
  url.searchParams.set('bounds', '43.48,-5.78|43.585,-5.55')
  url.searchParams.set('key', key)

  const response = await googleFetch(url)
  const data = await response.json()
  if (data.status === 'ZERO_RESULTS') {
    throw fail(404, 'No encuentro esa dirección. Prueba con la calle y el número.')
  }
  if (data.status === 'REQUEST_DENIED') {
    throw fail(502, 'Google ha rechazado la clave. Activa Geocoding API en Google Cloud y revisa la clave.')
  }
  if (data.status !== 'OK') {
    throw fail(502, publicMessage(data.error_message || data.status || 'La geolocalización ha fallado'))
  }
  const match = (data.results || []).find(inGijon)
  if (!match) {
    throw fail(404, 'Esa dirección no está en Gijón. De momento solo buscamos aquí.')
  }
  return {
    address: match.formatted_address,
    lat: match.geometry.location.lat,
    lng: match.geometry.location.lng,
  }
}

async function nearby(center, key) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${center.lat},${center.lng}`)
  url.searchParams.set('rankby', 'distance')
  url.searchParams.set('type', 'restaurant')
  url.searchParams.set('language', 'es')
  url.searchParams.set('key', key)

  const response = await googleFetch(url)
  const data = await response.json()
  if (data.status === 'ZERO_RESULTS') return []
  if (data.status !== 'OK') throw placesError(data, 'Places no ha respondido')
  return data.results || []
}

async function placeDetails(placeId, key) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set(
    'fields',
    'reviews,editorial_summary,url,formatted_address,photos,opening_hours,business_status',
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
  const specific = list.find((type) => TYPE_LABELS[type] && type !== 'restaurant')
  if (specific) return TYPE_LABELS[specific]
  if (list.includes('restaurant')) return 'Restaurante'
  return null
}

function photoPath(photo) {
  const ref = photo?.photo_reference
  if (!isPhotoRef(ref)) return null
  return `/api/photo?ref=${encodeURIComponent(ref)}`
}

function toRestaurant(place, details, center) {
  const closed =
    place.business_status === 'CLOSED_PERMANENTLY' ||
    details?.business_status === 'CLOSED_PERMANENTLY' ||
    place.permanently_closed
  if (closed) return null
  const lat = place.geometry?.location?.lat
  const lng = place.geometry?.location?.lng
  if (typeof lat !== 'number' || typeof lng !== 'number') return null

  const reviews = (details?.reviews || [])
    .map((review) => ({
      rating: typeof review.rating === 'number' ? review.rating : null,
      text: typeof review.text === 'string' ? review.text.trim() : '',
    }))
    .filter((review) => review.text)
  const texts = reviews.map((review) => review.text)
  const editorial = details?.editorial_summary?.overview?.trim() || ''
  const name = place.name?.trim() || 'Restaurante'
  const joined = texts.slice(0, 2).join(' ')
  const photos = (details?.photos || place.photos || []).map(photoPath).filter(Boolean).slice(0, 3)
  const openNow = details?.opening_hours?.open_now ?? place.opening_hours?.open_now

  return {
    id: place.place_id || name,
    name,
    address: details?.formatted_address || place.vicinity || '',
    distanceM: distanceMeters(center, { lat, lng }),
    rating: typeof place.rating === 'number' ? place.rating : null,
    reviewCount: typeof place.user_ratings_total === 'number' ? place.user_ratings_total : null,
    priceLabel: priceLabel(place.price_level),
    cuisine: cuisineLabel(place.types),
    openNow: typeof openNow === 'boolean' ? openNow : null,
    mapsUrl: details?.url || null,
    summary: editorial || (joined ? clip(joined, 320) : null),
    summaryFromReviews: !editorial && Boolean(joined),
    photos,
    ...signalsFrom(texts),
    words: wordsFrom(texts, name),
    excerpts: reviews.slice(0, 3).map((review) => ({
      rating: review.rating,
      text: clip(review.text, 200),
    })),
  }
}

export async function searchRestaurants(body) {
  const address = String(body?.address || '').trim()
  const radius = Number(body?.radius)
  if (address.length < 3) throw fail(400, 'Escribe una calle o un sitio de Gijón.')
  if (address.length > 180) throw fail(400, 'La dirección es demasiado larga.')
  if (![100, 200, 300].includes(radius)) throw fail(400, 'Elige 100, 200 o 300 metros.')

  const key = apiKey()
  const origin = await geocode(address, key)
  const places = (await nearby(origin, key))
    .map((place) => {
      const lat = place.geometry?.location?.lat
      const lng = place.geometry?.location?.lng
      if (typeof lat !== 'number' || typeof lng !== 'number') return null
      return { place, distanceM: distanceMeters(origin, { lat, lng }) }
    })
    .filter((item) => item && item.distanceM <= radius)
    .sort((a, b) => a.distanceM - b.distanceM || (b.place.rating ?? 0) - (a.place.rating ?? 0))
    .slice(0, 10)

  const details = await Promise.all(places.map((item) => placeDetails(item.place.place_id, key)))
  const restaurants = places
    .map((item, index) => toRestaurant(item.place, details[index], origin))
    .filter(Boolean)

  return {
    resolvedAddress: origin.address,
    radius,
    center: { lat: origin.lat, lng: origin.lng },
    restaurants,
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
