// Prueba src/reuse.ts sin compilar el proyecto: se transpila al vuelo con TypeScript.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('./reuse.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
})
const { keep, reuse } = await import(`data:text/javascript,${encodeURIComponent(outputText)}`)

const place = (id, distanceM) => ({ id, distanceM })
const response = (radius, distances) => ({
  resolvedAddress: 'Calle Corrida, Gijón',
  country: 'ES',
  timeZone: 'Europe/Madrid',
  radius,
  center: { lat: 43.54, lng: -5.66 },
  restaurants: distances.map((d, i) => place(`p${i}`, d)),
})

test('devuelve la misma búsqueda sin volver a pedirla', () => {
  const kept = new Map()
  const origin = { address: 'Calle Corrida 20, Gijón' }
  keep(kept, origin, response(200, [20, 80, 150]))
  assert.equal(reuse(kept, { address: '  calle   CORRIDA 20,   gijón ' }, 200).restaurants.length, 3)
  assert.equal(reuse(kept, origin, 300), null)
})

test('un radio distinto siempre se vuelve a pedir', () => {
  const kept = new Map()
  const origin = { address: 'Rua Augusta 20, Lisboa' }
  keep(kept, origin, response(300, [30, 60, 250]))
  assert.equal(reuse(kept, origin, 100), null)
  assert.equal(reuse(kept, origin, 200), null)
  assert.equal(reuse(kept, origin, 300).restaurants.length, 3)
})

test('caduca a los diez minutos', () => {
  const kept = new Map()
  const origin = { address: 'Calle Corrida 20, Gijón' }
  keep(kept, origin, response(200, [20]))
  for (const entry of kept.values()) entry.at -= 11 * 60 * 1000
  assert.equal(reuse(kept, origin, 200), null)
})

test('la misma calle en otra ciudad es otra búsqueda', () => {
  const kept = new Map()
  keep(kept, { address: 'Calle Mayor 1, Madrid' }, response(200, [20]))
  assert.equal(reuse(kept, { address: 'Calle Mayor 1, Alcalá de Henares' }, 200), null)
})
