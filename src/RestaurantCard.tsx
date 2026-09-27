import { useState } from 'react'
import type { Restaurant, Signal, SignalStatus } from './types'

const countFmt = new Intl.NumberFormat('es-ES')

const SIGNAL_COPY: Record<SignalStatus, string> = {
  yes: 'Sale en las reseñas',
  no: 'Dicen que no',
  unknown: 'No se menciona',
}

function ratingLabel(rating: number) {
  return rating.toLocaleString('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function Photos({ name, photos }: { name: string; photos: string[] }) {
  const [failed, setFailed] = useState<string[]>([])
  const visible = photos.filter((photo) => !failed.includes(photo)).slice(0, 3)
  if (!visible.length) {
    return (
      <div className="photo-fallback" aria-hidden>
        {name.slice(0, 1)}
      </div>
    )
  }
  return (
    <div className={visible.length > 1 ? 'photos many' : 'photos'}>
      {visible.map((src, index) => (
        <img
          key={src}
          src={src}
          alt={index === 0 ? `Foto de ${name}` : ''}
          onError={() => setFailed((current) => [...current, src])}
        />
      ))}
    </div>
  )
}

function SignalRow({ label, signal }: { label: string; signal: Signal }) {
  return (
    <div className="signal">
      <div className="signal-head">
        <span>{label}</span>
        <em className={signal.status}>{SIGNAL_COPY[signal.status]}</em>
      </div>
      <p>{signal.quote ?? 'En las reseñas de Google que podemos leer no aparece.'}</p>
    </div>
  )
}

export function RestaurantCard({
  restaurant,
  index,
}: {
  restaurant: Restaurant
  index: number
}) {
  const many = (restaurant.reviewCount ?? 0) >= 200
  const few = restaurant.reviewCount != null && restaurant.reviewCount < 40
  const high = (restaurant.rating ?? 0) >= 4.3
  const low = restaurant.rating != null && restaurant.rating < 3.8
  const maxWord = Math.max(1, ...restaurant.words.map((word) => word.count))

  return (
    <article
      className="card"
      aria-label={`${restaurant.name}, a ${restaurant.distanceM} metros`}
    >
      <Photos name={restaurant.name} photos={restaurant.photos} />
      <div className="card-body">
        <header className="card-top">
          <p className="rank">{String(index + 1).padStart(2, '0')}</p>
          <div>
            <h3>{restaurant.name}</h3>
            <p className="address">{restaurant.address}</p>
          </div>
          <p className="distance">
            {restaurant.distanceM}
            <span> m</span>
          </p>
        </header>

        <div className="meta">
          <span className="score">
            {restaurant.rating == null ? 'Sin nota' : ratingLabel(restaurant.rating)}
          </span>
          <span>
            {restaurant.reviewCount == null
              ? 'Sin reseñas'
              : `${countFmt.format(restaurant.reviewCount)} reseñas`}
          </span>
          {high ? <em className="badge good">Nota alta</em> : null}
          {low ? <em className="badge warn">Nota justa</em> : null}
          {many ? <em className="badge good">Mucha gente</em> : null}
          {few ? <em className="badge warn">Poca gente</em> : null}
          {restaurant.priceLabel ? <span>{restaurant.priceLabel}</span> : null}
          {restaurant.cuisine ? <span>{restaurant.cuisine}</span> : null}
          {restaurant.openNow != null ? (
            <span className={restaurant.openNow ? 'open' : 'closed'}>
              {restaurant.openNow ? 'Abierto ahora' : 'Cerrado ahora'}
            </span>
          ) : null}
        </div>

        {restaurant.summary ? (
          <p className="summary">
            <span>{restaurant.summaryFromReviews ? 'De las reseñas' : 'Descripción'}</span>
            {restaurant.summary}
          </p>
        ) : (
          <p className="summary muted">Google no trae texto de este sitio.</p>
        )}

        <div className="signals">
          <SignalRow label="Terraza" signal={restaurant.terrace} />
          <SignalRow label="Animales" signal={restaurant.pets} />
          <SignalRow label="Carta y precios" signal={restaurant.menu} />
        </div>

        {restaurant.excerpts.length ? (
          <div className="excerpts">
            <h4>Comentarios</h4>
            <ul>
              {restaurant.excerpts.map((excerpt, excerptIndex) => (
                <li key={`${excerptIndex}-${excerpt.text}`}>
                  {excerpt.rating != null ? <strong>{ratingLabel(excerpt.rating)}</strong> : null}
                  {excerpt.text}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="cloud-block">
          <h4>Nube de palabras</h4>
          {restaurant.words.length ? (
            <div className="cloud" aria-label="Palabras que más se repiten en las reseñas">
              {restaurant.words.map((word) => (
                <span
                  key={word.text}
                  style={{ fontSize: `${0.9 + (word.count / maxWord) * 1.2}rem` }}
                >
                  {word.text}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">Con las reseñas que devuelve Google no hay palabras que repetir.</p>
          )}
          <p className="caption">Hecha con las reseñas de texto que devuelve Google, hasta cinco.</p>
        </div>

        {restaurant.mapsUrl ? (
          <a className="maps" href={restaurant.mapsUrl} target="_blank" rel="noreferrer">
            Ver en Google Maps
          </a>
        ) : null}
      </div>
    </article>
  )
}
