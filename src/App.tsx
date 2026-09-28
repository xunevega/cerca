import { useRef, useState } from 'react'
import { RestaurantCard } from './RestaurantCard'
import { keep, reuse, type Kept, type Origin } from './reuse'
import type { Radius, SearchResponse } from './types'

const RADII: Radius[] = [100, 200, 300]
// Solo atajos para probar: se puede buscar cualquier dirección de España o Portugal.
const EXAMPLES = ['Gran Vía 28, Madrid', 'Rua Augusta 100, Lisboa', 'Calle Corrida 20, Gijón']

type Fix = { lat: number; lng: number; accuracy?: number | null }

const USEFUL_M = 500

function asFix(position: GeolocationPosition): Fix {
  const accuracy = position.coords.accuracy
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
  }
}

function watchDevice(): Promise<Fix | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    let best: Fix | null = null
    let settled = false
    let quiet = 0
    let watchId = 0
    const finish = () => {
      if (settled) return
      settled = true
      if (watchId) navigator.geolocation.clearWatch(watchId)
      window.clearTimeout(limit)
      window.clearTimeout(quiet)
      resolve(best)
    }
    const arm = (ms: number) => {
      window.clearTimeout(quiet)
      quiet = window.setTimeout(finish, ms)
    }
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next = asFix(position)
        const nextAccuracy = next.accuracy ?? 1e9
        if (!best || nextAccuracy < (best.accuracy ?? 1e9)) best = next
        const accuracy = best.accuracy ?? 1e9
        if (accuracy <= 50) {
          finish()
          return
        }
        if (accuracy <= 100) arm(2000)
        else if (accuracy <= 250) arm(4000)
        else arm(6000)
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED || best) finish()
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 18000 },
    )
    const limit = window.setTimeout(finish, 18000)
  })
}

// Solo cuenta el GPS y la red del propio dispositivo. La ubicación por IP del servidor
// daba la del centro de datos una vez desplegada (ver CONTRATO.md).
function locateHere() {
  return watchDevice()
}

// Si un proxy o el propio servidor responde con HTML (502, 504…), response.json() lanza un
// error en inglés que acabaría en pantalla. Aquí se convierte en un mensaje en español.
async function readJson<T>(response: Response): Promise<T & { error?: string }> {
  try {
    return (await response.json()) as T & { error?: string }
  } catch {
    return { error: response.ok ? 'La respuesta no se entiende.' : 'El servidor no responde. Prueba otra vez.' } as T & {
      error?: string
    }
  }
}

function countLabel(count: number) {
  return count === 1 ? '1 sitio' : `${count} sitios`
}

export function App() {
  const [address, setAddress] = useState('')
  const [radius, setRadius] = useState<Radius>(200)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [precision, setPrecision] = useState<number | null>(null)
  const request = useRef(0)
  const kept = useRef(new Map<string, Kept>())
  const here = useRef<{ lat: number; lng: number } | null>(null)
  // Lectura de GPS en curso (0 si no hay ninguna).
  const locating = useRef(0)
  // El radio vigente: la lectura de GPS puede tardar hasta 18 s y el radio cambiar entretanto.
  const radiusNow = useRef<Radius>(200)

  function forgetHere() {
    here.current = null
    setPrecision(null)
    if (locating.current) {
      locating.current = 0
      setLoading(false)
    }
  }

  async function search(next: Origin, nextRadius: Radius) {
    if ('address' in next && next.address.trim().length < 3) {
      setError('Escribe una dirección o usa tu ubicación.')
      setResult(null)
      return
    }
    const id = ++request.current
    const reused = reuse(kept.current, next, nextRadius)
    if (reused) {
      setError(null)
      setLoading(false)
      setResult(reused)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...next, radius: nextRadius }),
      })
      const data = await readJson<SearchResponse>(response)
      if (id !== request.current) return
      if (!response.ok || data.error) throw new Error(data.error || 'No se pudo buscar')
      keep(kept.current, next, data)
      setResult(data)
    } catch (err) {
      if (id !== request.current) return
      setResult(null)
      // fetch() solo lanza TypeError cuando no hay red: su texto viene en inglés.
      setError(
        err instanceof TypeError
          ? 'No hay conexión. Revisa la red y prueba otra vez.'
          : err instanceof Error
            ? err.message
            : 'No se pudo buscar',
      )
    } finally {
      if (id === request.current) setLoading(false)
    }
  }

  function onRadius(next: Radius) {
    setRadius(next)
    radiusNow.current = next
    if (here.current) void search(here.current, next)
    else if (address.trim().length >= 3) void search({ address }, next)
  }

  function useHere() {
    // Si mientras se lee el GPS se escribe otra dirección o se lanza otra búsqueda,
    // la lectura que llegue tarde no debe pisarla.
    const token = ++locating.current
    setLoading(true)
    setError(null)
    setPrecision(null)
    void locateHere().then((point) => {
      if (token !== locating.current) return
      locating.current = 0
      const accuracy = point?.accuracy
      if (!point || (accuracy != null && accuracy > USEFUL_M)) {
        setLoading(false)
        setError(
          accuracy != null
            ? `La ubicación solo llega a unos ${Math.round(accuracy)} m. Para este radio, escribe la calle.`
            : 'No se pudo leer la ubicación. Prueba otra vez o escribe una dirección.',
        )
        return
      }
      here.current = { lat: point.lat, lng: point.lng }
      setPrecision(accuracy ?? null)
      setAddress('Ubicación actual')
      void search(here.current, radiusNow.current)
    })
  }

  return (
    <div className="app">
      <header className="intro">
        <p className="kicker">España y Portugal</p>
        <h1>Cerca</h1>
        <p className="lede">
          Los seis sitios para comer mejor valorados del radio, en cualquier punto de España
          o Portugal. Escribe una dirección o usa tu ubicación. Restaurantes, bares, cafeterías,
          tapas o bocadillos.
        </p>
      </header>
      <div className="dock">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void search(here.current ?? { address }, radius)
          }}
        >
          <div className="address">
            <span className="address-head">
              <label htmlFor="address">Dirección</label>
              <button type="button" className="here" onClick={useHere} disabled={loading}>
                Ubicación actual
              </button>
            </span>
            <input
              id="address"
              value={address}
              onChange={(event) => {
                forgetHere()
                setAddress(event.target.value)
              }}
              placeholder="Calle, número y ciudad"
              autoComplete="off"
              enterKeyHint="search"
              maxLength={180}
            />
          </div>
          <div className="radius" role="radiogroup" aria-label="Radio de búsqueda">
            {RADII.map((meters) => (
              <button
                key={meters}
                type="button"
                role="radio"
                aria-checked={radius === meters}
                className={radius === meters ? 'pill on' : 'pill'}
                onClick={() => onRadius(meters)}
              >
                {meters} m
              </button>
            ))}
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </form>
        {!result && !loading ? (
          <div className="examples">
            {EXAMPLES.map((example) => (
              <button key={example} type="button" onClick={() => {
                forgetHere()
                setAddress(example)
                void search({ address: example }, radius)
              }}>
                {example}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <main>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        {loading && !result ? (
          <div className="skeletons" aria-hidden>
            <div />
            <div />
            <div />
          </div>
        ) : null}

        {result ? (
          <section className="results" aria-busy={loading}>
            <div className="results-head">
              <h2>
                {countLabel(result.restaurants.length)} a {result.radius} m
              </h2>
              <p>
                Alrededor de <strong>{result.resolvedAddress}</strong>
                {precision != null ? ` · precisión de unos ${Math.round(precision)} m` : ''}
              </p>
            </div>
            {result.restaurants.length === 0 ? (
              <p className="empty">
                Ningún sitio de comidas en ese radio cumple todo: abierto hoy, con precio y con al menos 100 reseñas en Google. Prueba con un radio mayor.
              </p>
            ) : (
              <ol>
                {result.restaurants.map((restaurant, index) => (
                  <li key={restaurant.id}>
                    <RestaurantCard restaurant={restaurant} index={index} />
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : null}
      </main>

      <footer>
        España y Portugal, con el horario en la hora de cada sitio. La dirección sale de Google Maps
        y la ficha junta Google y TripAdvisor.
      </footer>
    </div>
  )
}
