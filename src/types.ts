export type Radius = 100 | 200 | 300

export type SignalStatus = 'yes' | 'no' | 'unknown'

export type Signal = {
  status: SignalStatus
  quote: string | null
}

export type Word = {
  text: string
  count: number
}

export type Restaurant = {
  id: string
  name: string
  address: string
  distanceM: number
  rating: number | null
  reviewCount: number | null
  priceLabel: string | null
  pricePerPerson: string | null
  priceReports: number | null
  cuisine: string | null
  openNow: boolean | null
  todayHours: string | null
  mapsUrl: string
  summary: string | null
  summaryFromReviews: boolean
  photos: string[]
  terrace: Signal
  pets: Signal
  menu: Signal
  words: Word[]
  takeaway: boolean
  tripAdvisor: {
    rating: number | null
    reviewCount: number | null
    priceLevel: string | null
  } | null
}

export type SearchResponse = {
  resolvedAddress: string
  country: 'ES' | 'PT' | null
  /** Zona horaria del sitio buscado: Europe/Madrid, Europe/Lisbon, Atlantic/Canary… */
  timeZone: string
  radius: Radius
  center: { lat: number; lng: number }
  restaurants: Restaurant[]
}
