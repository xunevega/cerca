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
          loading="lazy"
          decoding="async"
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
      {signal.quote ? <p>{signal.quote}</p> : null}
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
  const reports = restaurant.priceReports
  const terraceClear = restaurant.terrace.status === 'yes' || restaurant.terrace.status === 'no'

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
          {restaurant.rating != null ? (
            <span className="score">
              {ratingLabel(restaurant.rating)}
              {restaurant.tripAdvisor ? ' Google' : ''}
            </span>
          ) : null}
          <span>
            {restaurant.reviewCount == null
              ? 'Sin reseñas'
              : `${countFmt.format(restaurant.reviewCount)} ${restaurant.tripAdvisor ? 'en Google' : 'reseñas'}`}
          </span>
          {restaurant.tripAdvisor?.rating != null ? (
            <span className="score">TripAdvisor {ratingLabel(restaurant.tripAdvisor.rating)}</span>
          ) : null}
          {restaurant.tripAdvisor?.reviewCount != null ? (
            <span>{countFmt.format(restaurant.tripAdvisor.reviewCount)} en TripAdvisor</span>
          ) : null}
          {many ? <em className="badge good">Mucha gente</em> : null}
          {few ? <em className="badge warn">Poca gente</em> : null}
          {restaurant.pricePerPerson ? <span>{restaurant.pricePerPerson}</span> : null}
          {restaurant.cuisine ? <span>{restaurant.cuisine}</span> : null}
        </div>

        {reports != null ? (
          <p className="price-band">
            <span>
              Informado por {countFmt.format(reports)} {reports === 1 ? 'persona' : 'personas'}
            </span>
          </p>
        ) : null}

        {restaurant.todayHours ? (
          <p className="hours">
            <span>Horario de hoy</span>
            {restaurant.todayHours}
          </p>
        ) : null}

        {restaurant.summary ? (
          <p className="summary">
            <span>{restaurant.summaryFromReviews ? 'De las reseñas' : 'Descripción'}</span>
            {restaurant.summary}
          </p>
        ) : null}

        {restaurant.takeaway || terraceClear ? (
          <ul className="chips">
            {restaurant.takeaway ? <li>Para llevar</li> : null}
            {restaurant.terrace.status === 'yes' ? <li>Tiene terraza</li> : null}
            {restaurant.terrace.status === 'no' ? <li className="off">Sin terraza</li> : null}
          </ul>
        ) : null}

        {restaurant.pets.status === 'yes' ? (
          <div className="signals">
            <SignalRow label="Animales" signal={restaurant.pets} />
          </div>
        ) : null}

        {restaurant.words.length ? (
          <div className="cloud-block">
            <h4>Nube de palabras</h4>
            <div className="topics" aria-label="Temas de las reseñas">
              <span className="topic selected">Todas</span>
              {restaurant.words.map((word) => (
                <span key={word.text} className="topic">
                  {word.text} {countFmt.format(word.count)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <a className="maps" href={restaurant.mapsUrl} target="_blank" rel="noreferrer">
          Ver en Google Maps
        </a>
      </div>
    </article>
  )
}
