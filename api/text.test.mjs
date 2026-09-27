import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  distanceMeters,
  inGijon,
  priceLabel,
  queryAddress,
  signalsFrom,
  wordsFrom,
} from './text.mjs'

test('añade Gijón si la dirección no lo trae', () => {
  assert.equal(queryAddress('  Calle   Corrida '), 'Calle Corrida, Gijón, España')
  assert.equal(queryAddress('Cimadevilla, Gijón'), 'Cimadevilla, Gijón')
  assert.equal(queryAddress('Xixón puerto'), 'Xixón puerto')
})

test('acepta un punto dentro de Gijón y rechaza Oviedo', () => {
  assert.equal(
    inGijon({
      formatted_address: 'Calle Corrida, 33201 Gijón, Asturias, España',
      address_components: [{ long_name: 'Gijón', types: ['locality'] }],
      geometry: { location: { lat: 43.545, lng: -5.662 } },
    }),
    true,
  )
  assert.equal(
    inGijon({
      formatted_address: 'Oviedo, Asturias, España',
      address_components: [{ long_name: 'Oviedo', types: ['locality'] }],
      geometry: { location: { lat: 43.361, lng: -5.849 } },
    }),
    false,
  )
})

test('la distancia de un minuto de latitud ronda los 100 m', () => {
  const meters = distanceMeters({ lat: 43.545, lng: -5.662 }, { lat: 43.545898, lng: -5.662 })
  assert.ok(meters > 90 && meters < 110)
})

test('lee terraza, mascotas y precios, y respeta la negación', () => {
  const yes = signalsFrom([
    'Comimos en la terraza. Admiten perros. El menú cuesta 18 euros.',
  ])
  assert.equal(yes.terrace.status, 'yes')
  assert.equal(yes.pets.status, 'yes')
  assert.equal(yes.menu.status, 'yes')
  assert.match(yes.menu.quote, /18 euros/)

  const no = signalsFrom(['No tienen terraza, pero se come bien.'])
  assert.equal(no.terrace.status, 'no')
  assert.equal(no.pets.status, 'unknown')

  const stillYes = signalsFrom(['La comida no es cara y tienen terraza.'])
  assert.equal(stillYes.terrace.status, 'yes')

  const deniedAfter = signalsFrom(['Hay terraza no, comimos dentro.'])
  assert.equal(deniedAfter.terrace.status, 'no')
})

test('la nube ignora muletillas y cuenta lo que se repite', () => {
  const words = wordsFrom(
    [
      'La sidra estaba muy buena y el pescado también.',
      'Volvería por la sidra y el pescado.',
      'Sidra, pescado y una tarta.',
    ],
    'Casa Manolo',
  )
  const texts = words.map((word) => word.text)
  assert.ok(texts.includes('sidra'))
  assert.ok(texts.includes('pescado'))
  assert.equal(texts.includes('estaba'), false)
  assert.equal(texts.includes('manolo'), false)
})

test('traduce el nivel de precio', () => {
  assert.equal(priceLabel('PRICE_LEVEL_MODERATE'), '€€')
  assert.equal(priceLabel(0), 'Gratis')
  assert.equal(priceLabel(null), null)
})
