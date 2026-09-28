// Comprueba el contrato contra la app publicada, en cualquier dirección.
// Uso: node scripts/verificar-contrato.mjs [URL] ["dirección" ...]
// Sin direcciones, usa una lista repartida por España y Portugal.
// Mide solo lo que se ve desde fuera: el resto (tipo de sitio, comidas, para llevar) lo
// cubren los tests de api/text.test.mjs.

const BASE = (process.argv[2] || 'https://cerca-production-f07a.up.railway.app').replace(/\/$/, '')
const DEFAULT = [
  'Calle Carretería 20, Cuenca',
  'Calle Santa Clara 10, Zamora',
  'Plaza Mayor 5, Almagro',
  'Calle Mayor 10, Madrid',
  'Calle Sierpes 30, Sevilla',
  'Calle Corrida 20, Gijón',
  'Rua Augusta 100, Lisboa',
  'Rua de Santa Catarina 150, Porto',
  'Calle Triana 50, Las Palmas de Gran Canaria',
  'Avenida Arriaga 30, Funchal',
]
const addresses = process.argv.slice(3).length ? process.argv.slice(3) : DEFAULT
const RADII = [100, 200, 300]
const score = (x) => x.rating + 0.5 * Math.log10(x.reviewCount)

export function checkResult(data, radius) {
  const errors = []
  const list = data.restaurants || []
  if (list.length > 6) errors.push(`${list.length} sitios (máximo 6)`)
  list.forEach((x, i) => {
    const tag = `#${i + 1} ${x.name}`
    if (x.distanceM > radius) errors.push(`${tag}: a ${x.distanceM} m, fuera del radio`)
    if (!(x.reviewCount >= 100)) errors.push(`${tag}: ${x.reviewCount} reseñas (mínimo 100)`)
    if (!(x.priceLabel || x.pricePerPerson || x.tripAdvisor?.priceLevel)) errors.push(`${tag}: sin precio`)
    if (x.todayHours && /cerrado/i.test(x.todayHours)) errors.push(`${tag}: cerrado hoy (${x.todayHours})`)
    if (i > 0) {
      const prev = list[i - 1]
      if (score(x) > score(prev) + 1e-9) errors.push(`${tag}: puntúa más que el anterior (orden roto)`)
    }
  })
  return errors
}

async function main() {
  let failures = 0
  for (const address of addresses) {
    for (const radius of RADII) {
      const response = await fetch(`${BASE}/api/search`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, radius }),
      })
      const data = await response.json()
      if (!response.ok) {
        console.log(`—  ${address} · ${radius} m: ${data.error}`)
        continue
      }
      const errors = checkResult(data, radius)
      failures += errors.length
      const names = data.restaurants.map((x) => x.name).join(', ') || '(ninguno)'
      console.log(`${errors.length ? '✗' : '✓'}  ${address} · ${radius} m · ${data.timeZone} · ${data.restaurants.length}: ${names}`)
      for (const error of errors) console.log(`     ${error}`)
    }
  }
  console.log(failures ? `\n${failures} incumplimientos del contrato.` : '\nTodo cumple el contrato.')
  process.exitCode = failures ? 1 : 0
}

if (import.meta.url === `file://${process.argv[1]}`) main()
