# Cerca

Sitios para comer a la redonda en España y Portugal: restaurantes, bares, cafeterías, tapas o bocadillos. Escribes una dirección de cualquier punto de los dos países (calle, número y ciudad) o usas la ubicación actual, eliges 100, 200 o 300 metros, y la app enseña los seis sitios mejor valorados del radio (nota de Google más media estrella por cada ×10 reseñas).

La pantalla está siempre en español. La dirección se sitúa con Google Maps; no hay lista de ciudades. La ficha junta la puntuación y las reseñas de Google y, cuando hay ficha, las de TripAdvisor, más el horario, la terraza y una nube hecha con los dos. Ver en Google Maps abre siempre el sitio en Google.

La clave de TripAdvisor va en la misma `clave.env`:

```
TRIPADVISOR_API_KEY=tu_clave
```

## Arrancar

```bash
npm install
npm run dev
```

Abre http://localhost:5173

La clave va en `clave.env`, en la raíz:

```
GOOGLE_MAPS_API_KEY=tu_clave
```

En Google Cloud, con la misma clave y facturación activa:

- Geocoding API
- Places API

La clave se queda en el servidor. El navegador no la ve.

## Qué hace la ficha

- Distancia en metros
- Nota y cuánta gente ha opinado
- Hasta tres fotos
- Resumen
- Solo entran sitios con precio marcado por Google o TripAdvisor
- Horario del día de la consulta, en la hora local del sitio: Madrid, Canarias, Ceuta, Lisboa, Azores o Madeira
- Si ese día está cerrado, no entra en la lista. Si abre ese día, sí
- Solo sitios donde se come: fuera los que son solo para llevar y los que solo dan desayunos (pastelerías, cafés, panaderías), salvo que Google diga que sirven comida o cena
- Si Google o TripAdvisor marcan para llevar, sale en la ficha
- Si las reseñas o la información del local dejan claro que hay terraza o que no hay, sale en la ficha. Si no se menciona, no sale
- Si las reseñas confirman animales, o lo dice el local, sale. Si no, no se enseña
- El rango en euros (20-60 €) sale de Places API (New), en el campo `priceRange`
- La nube junta las palabras que salen en las reseñas de texto de Google y de TripAdvisor, en español y en portugués
- Terraza, animales y para llevar se leen en español, portugués e inglés

Places API, la clásica, sigue haciendo la búsqueda. Para el rango en euros hay que activar también Places API (New) en el mismo proyecto.

## Protecciones del servidor

- Tope por IP y minuto: 20 búsquedas y 150 fotos. Pasado el tope, responde 429 con un aviso en español.
- La búsqueda va en tandas, de mejor a peor nota, y para al tener seis fichas. El resultado es el mismo que pedirlas todas, con menos llamadas de pago a Google y TripAdvisor.
- Los errores internos o de red no llegan en inglés a la pantalla; se registran en el servidor.
- Los ficheros de `dist/assets` se sirven con caché larga (llevan hash) e `index.html` sin caché.
- Cambiar de radio no siempre llama al servidor. La página reutiliza durante 10 minutos lo que ya ha recibido para el mismo radio. En el servidor no se guarda nada de Google ni de TripAdvisor.
- «Ubicación actual» usa solo el GPS y la red del dispositivo. La Geolocation API de Google ya no hace falta.

El contrato vigente es `CONTRATO.md`. Los anteriores están en `contratos/`.

## Publicar en Railway

1. En Railway: New Project → Deploy from GitHub repo → `xunevega/cerca`.
2. En Variables, añade `GOOGLE_MAPS_API_KEY` y `TRIPADVISOR_API_KEY` (las mismas de `clave.env`).
3. En Settings → Networking, Generate Domain.

`railway.json` ya dice cómo compilar (`npm run build`) y arrancar (`npm start`). El servidor escucha en el puerto que da Railway (`PORT`).

## Comprobar el contrato

```bash
node scripts/verificar-contrato.mjs                       # lista repartida por España y Portugal
node scripts/verificar-contrato.mjs URL "Calle X 1, Soria" # cualquier dirección
```

Busca cada dirección a 100, 200 y 300 m en la app publicada y comprueba en cada resultado las reglas que se ven desde fuera: como mucho 6 sitios, todos dentro del radio, al menos 100 reseñas, con precio, abiertos hoy y en orden de puntuación. Las reglas internas (qué es sitio de comidas, para llevar, idiomas) las cubren los tests (`npm test`).
