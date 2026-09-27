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

export type Excerpt = {
  rating: number | null
  text: string
}

export type Restaurant = {
  id: string
  name: string
  address: string
  distanceM: number
  rating: number | null
  reviewCount: number | null
  priceLabel: string | null
  cuisine: string | null
  openNow: boolean | null
  mapsUrl: string | null
  summary: string | null
  summaryFromReviews: boolean
  photos: string[]
  terrace: Signal
  pets: Signal
  menu: Signal
  words: Word[]
  excerpts: Excerpt[]
}

export type SearchResponse = {
  resolvedAddress: string
  radius: Radius
  center: { lat: number; lng: number }
  restaurants: Restaurant[]
}
