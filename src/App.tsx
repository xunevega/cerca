import { useRef, useState } from 'react'
import { RestaurantCard } from './RestaurantCard'
import type { Radius, SearchResponse } from './types'

const RADII: Radius[] = [100, 200, 300]
const EXAMPLES = ['Calle Corrida', 'Cimadevilla', 'Playa de San Lorenzo']

function countLabel(count: number) {
  return count === 1 ? '1 restaurante' : `${count} restaurantes`
}

export function App() {
  const [address, setAddress] = useState('')
  const [radius, setRadius] = useState<Radius>(200)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResponse | null>(null)
  const request = useRef(0)
  const searched = useRef(false)

  async function search(nextAddress: string, nextRadius: Radius) {
    const query = nextAddress.trim()
    if (query.length < 3) {
      setError('Escribe una calle o un sitio de Gijón.')
      setResult(null)
      return
    }
    const id = ++request.current
    searched.current = true
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: query, radius: nextRadius }),
      })
      const data = (await response.json()) as SearchResponse & { error?: string }
      if (id !== request.current) return
      if (!response.ok) throw new Error(data.error || 'No se pudo buscar')
      setResult(data)
    } catch (err) {
      if (id !== request.current) return
      setResult(null)
      setError(err instanceof Error ? err.message : 'No se pudo buscar')
    } finally {
      if (id === request.current) setLoading(false)
    }
  }

  function onRadius(next: Radius) {
    setRadius(next)
    if (searched.current) void search(address, next)
  }

  return (
    <div className="app">
      <header className="intro">
        <p className="kicker">Gijón</p>
        <h1>Cerca</h1>
        <p className="lede">
          Escribe una dirección y te enseño hasta diez restaurantes, del más cercano al más
          lejano.
        </p>
      </header>
      <div className="dock">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void search(address, radius)
          }}
        >
          <label className="address">
            Dirección
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Calle Corrida 20"
              autoComplete="off"
              enterKeyHint="search"
            />
          </label>
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
                setAddress(example)
                void search(example, radius)
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
              </p>
            </div>
            {result.restaurants.length === 0 ? (
              <p className="empty">
                No hay restaurantes en ese radio. Prueba con 200 o 300 metros.
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
        Primer paso, solo Gijón. La dirección sale de Google Maps y la ficha, de las reseñas de
        Google. TripAdvisor entra en el siguiente.
      </footer>
    </div>
  )
}
