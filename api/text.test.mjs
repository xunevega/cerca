import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  countryOf,
  distanceMeters,
  preciseEnough,
  textLanguage,
  zoneFor,
  priceLabel,
  closedOnSearchDay,
  pricePerPerson,
  queryAddress,
  todayFromTripAdvisor,
  todaySchedule,
  signalsFrom,
  wordsFrom,
} from './text.mjs'

const result = (formatted, components, types = ['street_address']) => ({
  formatted_address: formatted,
  types,
  address_components: components,
})

test('pasa la dirección tal cual, sin añadir ciudad ni país', () => {
  assert.equal(queryAddress('  Calle   Corrida 20,  Gijón '), 'Calle Corrida 20, Gijón')
  assert.equal(queryAddress('Rua Augusta 20, Lisboa'), 'Rua Augusta 20, Lisboa')
})

test('solo vale España o Portugal', () => {
  const es = result('Gran Vía, 1, Madrid, España', [
    { long_name: 'Madrid', short_name: 'Madrid', types: ['locality'] },
    { long_name: 'España', short_name: 'ES', types: ['country', 'political'] },
  ])
  const pt = result('R. Augusta 20, Lisboa, Portugal', [
    { long_name: 'Lisboa', short_name: 'Lisboa', types: ['locality'] },
    { long_name: 'Portugal', short_name: 'PT', types: ['country', 'political'] },
  ])
  const fr = result('Rue de Rivoli, Paris, Francia', [
    { long_name: 'Francia', short_name: 'FR', types: ['country', 'political'] },
  ])
  assert.equal(countryOf(es), 'ES')
  assert.equal(countryOf(pt), 'PT')
  assert.equal(countryOf(fr), null)
})

test('una ciudad entera o un código postal no bastan como dirección', () => {
  assert.equal(preciseEnough({ types: ['locality', 'political'] }), false)
  assert.equal(preciseEnough({ types: ['postal_code'] }), false)
  assert.equal(preciseEnough({ types: ['route'] }), true)
  assert.equal(preciseEnough({ types: ['street_address'] }), true)
  assert.equal(preciseEnough({ types: ['neighborhood', 'political'] }), true)
})

test('cada territorio con su hora', () => {
  assert.equal(zoneFor(43.545, -5.662, 'ES'), 'Europe/Madrid')
  assert.equal(zoneFor(39.57, 2.65, 'ES'), 'Europe/Madrid')
  assert.equal(zoneFor(28.12, -15.43, 'ES'), 'Atlantic/Canary')
  assert.equal(zoneFor(35.889, -5.32, 'ES'), 'Africa/Ceuta')
  assert.equal(zoneFor(35.292, -2.94, 'ES'), 'Africa/Ceuta')
  assert.equal(zoneFor(38.71, -9.14, 'PT'), 'Europe/Lisbon')
  assert.equal(zoneFor(37.74, -25.67, 'PT'), 'Atlantic/Azores')
  assert.equal(zoneFor(32.65, -16.91, 'PT'), 'Atlantic/Madeira')
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
  assert.equal(signalsFrom(['Lo pedimos para llevar.']).takeaway.status, 'yes')
  assert.equal(signalsFrom(['No hacen para llevar.']).takeaway.status, 'no')
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

test('el horario es el del día consultado en Gijón', () => {
  const sundayEvening = new Date('2026-09-27T16:30:00Z')
  const schedule = todaySchedule(
    {
      periods: [
        { open: { day: 0, time: '1300' }, close: { day: 0, time: '1530' } },
        { open: { day: 1, time: '1300' }, close: { day: 1, time: '1530' } },
      ],
    },
    {
      periods: [
        { open: { date: '2026-09-27', day: 0, time: '1300' }, close: { date: '2026-09-27', day: 0, time: '1530' } },
        { open: { date: '2026-09-28', day: 1, time: '1300' }, close: { date: '2026-09-28', day: 1, time: '1530' } },
        { open: { date: '2026-09-28', day: 1, time: '2000' }, close: { date: '2026-09-28', day: 1, time: '2330' } },
      ],
    },
    sundayEvening,
  )
  assert.equal(schedule, 'Domingo · 13:00–15:30')

  const closedTuesday = todaySchedule(
    { weekday_text: ['martes: Cerrado'] },
    null,
    new Date('2026-09-29T10:00:00Z'),
  )
  assert.equal(closedTuesday, 'Martes · Cerrado')
  assert.equal(closedOnSearchDay(closedTuesday), true)
  assert.equal(closedOnSearchDay(schedule), false)
  assert.equal(closedOnSearchDay(null), false)

  const fromTripAdvisor = todayFromTripAdvisor(
    {
      timezone: 'Europe/Madrid',
      periods: [{ day_of_week: 'Sunday', opens: '13:00', closes: '16:30' }],
    },
    sundayEvening,
  )
  assert.equal(fromTripAdvisor, 'Domingo · 13:00–16:30')
  assert.equal(todayFromTripAdvisor({ timezone: 'America/New_York', periods: [] }, sundayEvening), null)
})

test('traduce el nivel de precio', () => {
  assert.equal(priceLabel('PRICE_LEVEL_MODERATE'), '€€')
  assert.equal(priceLabel(0), 'Gratis')
  assert.equal(priceLabel(null), null)
})

test('formatea el precio por persona de Google', () => {
  assert.equal(
    pricePerPerson({
      startPrice: { currencyCode: 'EUR', units: '10' },
      endPrice: { currencyCode: 'EUR', units: '20' },
    }),
    '10-20\u00a0€',
  )
  assert.equal(
    pricePerPerson({
      startPrice: { currencyCode: 'EUR', units: '1' },
      endPrice: { currencyCode: 'EUR', units: '10' },
    }),
    '1-10\u00a0€',
  )
  assert.equal(
    pricePerPerson({ startPrice: { currencyCode: 'EUR', units: '50' } }),
    'Más de 50\u00a0€',
  )
  assert.equal(pricePerPerson(null), null)
})

test('los giros «sin duda» o «no solo» no niegan la terraza', () => {
  assert.equal(signalsFrom(['Sin duda la terraza es lo mejor.']).terrace.status, 'yes')
  assert.equal(signalsFrom(['No solo tiene terraza, también jardín.']).terrace.status, 'yes')
  assert.equal(signalsFrom(['Sin embargo, la terraza estaba llena.']).terrace.status, 'yes')
  assert.equal(signalsFrom(['No tienen terraza.']).terrace.status, 'no')
  assert.equal(signalsFrom(['Un local sin terraza.']).terrace.status, 'no')
})

test('los perritos y perros calientes no son mascotas', () => {
  assert.equal(signalsFrom(['Pedimos unos perros calientes riquísimos.']).pets.status, 'unknown')
  assert.equal(signalsFrom(['Un perro caliente enorme.']).pets.status, 'unknown')
  assert.equal(signalsFrom(['Fuimos con el perro y nos pusieron agua.']).pets.status, 'yes')
  assert.equal(signalsFrom(['No admiten perros.']).pets.status, 'no')
})

test('el precio en otra moneda lleva el código detrás', () => {
  assert.equal(
    pricePerPerson({ endPrice: { currencyCode: 'USD', units: '15' } }),
    'Menos de 15\u00a0USD',
  )
  assert.equal(
    pricePerPerson({
      startPrice: { currencyCode: 'EUR', units: '12', nanos: 500000000 },
      endPrice: { currencyCode: 'EUR', units: '20' },
    }),
    '12,5-20\u00a0€',
  )
})

test('lee terraza, animales y para llevar en portugués', () => {
  assert.equal(signalsFrom(['Almoçámos na esplanada, muito agradável.']).terrace.status, 'yes')
  assert.equal(signalsFrom([{ text: 'Sentámo-nos no terraço.', lang: 'pt' }]).terrace.status, 'yes')
  assert.equal(signalsFrom(['Não tem esplanada.']).terrace.status, 'no')
  assert.equal(signalsFrom(['Sem dúvida a esplanada é o melhor.']).terrace.status, 'yes')
  assert.equal(signalsFrom(['Aceitam cães e trouxeram água.']).pets.status, 'yes')
  assert.equal(signalsFrom(['Não aceitam cães.']).pets.status, 'no')
  assert.equal(signalsFrom(['Comemos um cachorro quente ótimo.']).pets.status, 'unknown')
  assert.equal(signalsFrom(['Pedimos para levar.']).takeaway.status, 'yes')
})

test('distingue portugués de español', () => {
  assert.equal(textLanguage('Muito bom, a comida estava ótima'), 'pt')
  assert.equal(textLanguage('La comida estaba muy buena'), 'es')
  assert.equal(textLanguage('Great food', 'pt-PT'), 'pt')
  assert.equal(textLanguage('Great food', 'en'), 'en')
  assert.equal(signalsFrom([{ text: 'No terrace at all.', lang: 'en' }]).terrace.status, 'no')
})

test('la nube guarda palabras portuguesas enteras y quita las vacías', () => {
  const words = wordsFrom(['O pão estava ótimo, não muito caro. Pão excelente.']).map((w) => w.text)
  assert.ok(words.includes('pão'))
  assert.ok(!words.includes('não'))
  assert.ok(!words.includes('muito'))
})

test('el horario sale en la hora de Lisboa', () => {
  // 23:30 del sábado en Madrid es 22:30 del sábado en Lisboa; 00:30 del domingo en Madrid es 23:30 del sábado en Lisboa.
  const madridSunday = new Date('2026-09-26T22:30:00Z')
  const periods = [{ open: { day: 6, time: '1200' }, close: { day: 6, time: '2359' } }]
  assert.match(todaySchedule({ periods }, null, madridSunday, 'Europe/Lisbon'), /^Sábado · 12:00–23:59$/)
  assert.equal(todaySchedule({ periods }, null, madridSunday, 'Europe/Madrid'), null)
})

test('la cola de la noche anterior no cuenta como horario de hoy', () => {
  const monday = new Date('2026-09-28T10:00:00Z')
  const current = {
    periods: [
      { open: { date: '2026-09-28', day: 1, time: '0000', truncated: true }, close: { date: '2026-09-28', day: 1, time: '0230' } },
      { open: { date: '2026-09-29', day: 2, time: '2000' }, close: { date: '2026-09-30', day: 3, time: '0230' } },
    ],
  }
  assert.equal(todaySchedule(null, current, monday, 'Europe/Madrid'), 'Lunes · Cerrado')
  const normal = { periods: [{ open: { date: '2026-09-28', day: 1, time: '0700' }, close: { date: '2026-09-29', day: 2, time: '0030' } }] }
  assert.equal(todaySchedule(null, normal, monday, 'Europe/Madrid'), 'Lunes · 07:00–00:30')
})

test('la nota ponderada premia muchas reseñas frente a pocas', async () => {
  const { weightedRating, localMeanRating } = await import('./text.mjs')
  const mean = localMeanRating([{ rating: 4.2, user_ratings_total: 100 }, { rating: 4.4, user_ratings_total: 50 }])
  assert.ok(Math.abs(mean - 4.3) < 1e-9)
  assert.ok(weightedRating(4.6, 800, mean) > weightedRating(5, 3, mean))
  assert.ok(weightedRating(4.5, 200, mean) > weightedRating(4.2, 200, mean))
  assert.ok(weightedRating(null, 0, mean) < mean)
})

test('solo entra donde se come: fuera solo para llevar y lo que solo da desayunos', async () => {
  const { eatsHere } = await import('./text.mjs')
  // Núa para levar (A Coruña): sin consumo en el local.
  assert.equal(eatsHere({ dineIn: false, servesLunch: true, primaryType: 'meal_takeaway' }), false)
  // Migas (A Coruña): pastelería que solo da desayunos.
  assert.equal(eatsHere({ dineIn: true, primaryType: 'cake_shop', types: ['cake_shop', 'breakfast_restaurant', 'cafe'] }), false)
  // Cafetería que da comidas: entra.
  assert.equal(eatsHere({ dineIn: true, servesLunch: true, primaryType: 'cafe' }), true)
  // Bar sin datos de comidas: fuera. Bar que da comidas: entra.
  assert.equal(eatsHere({ primaryType: 'bar' }), false)
  assert.equal(eatsHere({ primaryType: 'irish_pub' }), false)
  assert.equal(eatsHere({ primaryType: 'bar', servesLunch: true }), true)
  assert.equal(eatsHere({ types: ['bar', 'point_of_interest'] }), false)
  assert.equal(eatsHere({ primaryType: 'bar_and_grill' }), true)
  assert.equal(eatsHere({ primaryType: 'spanish_restaurant' }), true)
  // Restaurante que dice no dar ni comida ni cena: fuera.
  assert.equal(eatsHere({ primaryType: 'restaurant', servesLunch: false, servesDinner: false }), false)
  // Sin tipo principal (Places API New apagada): se mira la lista de tipos.
  assert.equal(eatsHere({ types: ['bakery', 'store'] }), false)
  assert.equal(eatsHere({ types: ['restaurant', 'food'] }), true)
})
