# Contrato de Cerca

> Modificado por `CONTRATO-2.md` (27 de septiembre de 2026) en la ubicación actual, el formato del precio y el cambio de radio. Donde los dos digan cosas distintas, manda el segundo.

Fecha: 27 de septiembre de 2026.

Este contrato fija Cerca tal como está. La ubicación actual, la búsqueda y la ficha que mezcla Google Maps y TripAdvisor quedan así. Nada de esto cambia salvo un contrato posterior que lo diga.

## Qué es

Cerca enseña sitios para comer en Gijón: restaurantes, bares, cafeterías, panaderías, tapas o bocadillos. El idioma de la pantalla es el español.

Se escribe una dirección o se usa la ubicación actual. El radio es 100, 200 o 300 metros. Salen como mucho diez fichas, de la más cercana a la más lejana.

La dirección se sitúa con Google Maps. La ficha junta Google y TripAdvisor. El enlace de cada ficha abre siempre Google Maps.

## Dónde busca

Solo Gijón. Un punto fuera de la caja de Gijón, o una dirección que no sea de Gijón, no entra. La caja es latitud 43,48–43,585 y longitud −5,78–−5,55, y la dirección tiene que mencionar Gijón o Xixón.

## Cómo se busca

- Dirección de al menos tres caracteres, o un punto de ubicación actual.
- Radio solo 100, 200 o 300 metros. Al cambiar el radio se repite la última búsqueda.
- Ejemplos en pantalla: Calle Corrida, Cimadevilla, Playa de San Lorenzo. Un ejemplo borra la ubicación actual y busca esa dirección.
- Si se edita la dirección a mano, se deja de usar el punto de ubicación actual.
- Tipos de Google: restaurante, bar, cafetería, para llevar y panadería. Se quitan los repetidos.
- Se toman los 30 más cercanos dentro del radio. Luego se quedan los que tienen precio y no están cerrados todo el día de la consulta. De esos, los 10 más cercanos.

## Ubicación actual

El botón «Ubicación actual» lee el GPS y la red del propio dispositivo, con la máxima precisión y sin reutilizar una lectura vieja.

- Si la precisión baja de 50 m, se usa ese punto enseguida.
- Si está entre 50 y 100 m, se esperan 2 segundos por si mejora.
- Si está entre 100 y 250 m, se esperan 4 segundos.
- Si es peor, se esperan 6 segundos. El tope es 18 segundos. Siempre se queda la lectura más fina.
- Solo si el dispositivo no da un punto útil se prueba la ubicación de red del servidor.
- Un punto con precisión peor de 500 m no se usa para buscar. El aviso dice a cuántos metros ha llegado y pide escribir la calle. Si no hay ningún punto, el aviso pide probar otra vez o escribir una dirección.
- Si el punto sirve, el campo pasa a «Ubicación actual» y, bajo el resultado, se lee la precisión en metros.

## Quién entra en la lista

Entra un sitio si Google o TripAdvisor marcan precio. El precio de Google puede ser el nivel o el rango en euros de Places API (New), si esa API está activa. El de TripAdvisor es su nivel de precio. No se inventa un rango en euros a partir del nivel.

No entra un sitio cerrado todo el día de la consulta. Si ese día abre, entra aunque en ese momento esté cerrado. El horario es el de Europe/Madrid. Se usa el de Google. El de TripAdvisor solo rellena el hueco si Google no trae horas y el horario de TripAdvisor está en Europe/Madrid.

No entra un sitio cerrado de forma permanente.

## Qué mezcla la ficha

Google y TripAdvisor forman una sola ficha. No hay enlace a TripAdvisor.

- Nota de Google y número de reseñas de Google. Si hay ficha de TripAdvisor, se rotulan «Google» y «en Google», y al lado salen la nota y las reseñas de TripAdvisor.
- «Mucha gente» si Google tiene 200 reseñas o más. «Poca gente» si tiene menos de 40.
- El rango en euros por persona, solo si Google lo trae en `priceRange`. «Informado por N personas», solo si ese dato existe.
- Tipo de sitio.
- Horario de hoy, con el día en español.
- Descripción, solo el texto editorial de Google. Si no hay, no se pone ninguna frase de relleno.
- Hasta tres fotos de Google.
- Para llevar, si lo marca Google o si las reseñas o la información del local de TripAdvisor lo dicen.
- Terraza, «Tiene terraza» o «Sin terraza», si queda claro en las reseñas, en la información del local o en los pies de foto. Si no se menciona, no sale.
- Animales, solo si las reseñas lo confirman o lo dice el local. Si no, no se enseña.
- Nube de palabras: las que salen en las reseñas de texto de Google y en las reseñas en español de TripAdvisor, hasta doce, con su número. La primera pastilla es «Todas».

El emparejamiento con TripAdvisor es por nombre parecido y a menos de 100 m. Si no hay ficha, la tarjeta se queda solo con Google.

## Qué no lleva la ficha

No se muestran el teléfono, la web, la accesibilidad, los niños, el destacado, lo popular, la clientela, los servicios, el ambiente, la planificación ni el pago. No hay recuadro de carta con el símbolo €. No hay «Nota justa», «Nota alta», «Abierto ahora» ni «Cerrado ahora». No se pegan frases de reseñas. No se enseña el nivel de precio de TripAdvisor como texto. No hay enlace que abra TripAdvisor.

«Ver en Google Maps» está en todas las fichas y abre Google Maps.

## Claves

`clave.env` guarda `GOOGLE_MAPS_API_KEY` y `TRIPADVISOR_API_KEY`. No se sube al repositorio. El navegador no ve las claves.

## Vigencia

Este contrato describe Cerca el 27 de septiembre de 2026. Cualquier cambio de ubicación, de mezcla entre Google y TripAdvisor, de lo que entra en la lista o de lo que se ve en la ficha necesita otro contrato. Hasta entonces, esto se mantiene tal cual.
