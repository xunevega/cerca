# Cerca

Restaurantes a la redonda en Gijón. Escribes una dirección, eliges 100, 200 o 300 metros, y la app enseña hasta diez fichas ordenadas por distancia.

Este es el primer paso. La dirección se sitúa con Google Maps. La nota, el número de reseñas, las fotos, el resumen, la terraza, los animales, la carta y la nube de palabras salen de las reseñas de Google. TripAdvisor queda para el siguiente.

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

- Distancia en metros, del más cercano al más lejano
- Nota y cuánta gente ha opinado
- Hasta tres fotos
- Resumen
- Si las reseñas mencionan terraza, animales o carta y precios, y la frase
- Unos comentarios
- Nube de palabras de esas reseñas

Google solo devuelve unas pocas reseñas por sitio, así que la nube y las frases son un primer recorte, no todas las opiniones.
