# Contrato de Cerca

Fecha: 27 de septiembre de 2026. Contrato 4, el vigente.

Este contrato fija Cerca tal como está hoy. Recoge en un solo texto los contratos 1, 2 y 3 y el paso de Gijón a España y Portugal, y los sustituye. Los anteriores se guardan en `contratos/` solo como historia. Nada de lo que aquí se dice cambia salvo un contrato posterior que lo diga.

## Qué es

Cerca enseña sitios para comer en España y Portugal: restaurantes, bares, cafeterías, panaderías, tapas o bocadillos. El idioma de la pantalla es siempre el español, también cuando se busca en Portugal.

Se escribe una dirección de cualquier punto de España o Portugal, o se usa la ubicación actual. No hay lista de ciudades: vale cualquier calle que Google sitúe en uno de los dos países. El radio es 100, 200 o 300 metros. Salen como mucho seis fichas: las mejor valoradas del radio, de mejor a peor nota.

La dirección se sitúa con Google Maps. La ficha junta Google y TripAdvisor. El enlace de cada ficha abre siempre Google Maps.

## Dónde busca

Todo España y Portugal: la península, Baleares, Canarias, Ceuta, Melilla, Azores y Madeira. Lo decide el país que Google da a la dirección o al punto. Una dirección o un punto de otro país no entra.

Cada sitio va con su hora local:

- Península, Baleares: Europe/Madrid.
- Canarias: Atlantic/Canary.
- Ceuta y Melilla: Africa/Ceuta.
- Portugal continental: Europe/Lisbon.
- Azores: Atlantic/Azores.
- Madeira: Atlantic/Madeira.

La zona sale del país y de la posición del punto buscado, y vale para todos los sitios de esa búsqueda.

## Cómo se busca

- Un solo campo, «Dirección», de 3 a 180 caracteres: calle, número y ciudad, como se escribiría en un sobre. Se pide a Google tal cual, sin añadir ciudad ni país.
- Vale el primer resultado de Google que caiga en España o Portugal y que sea una calle, un número, un barrio o un lugar concreto. Si Google solo sitúa una ciudad, una provincia, una región o un código postal, no se busca: hace falta la calle.
- Si no se escribe la ciudad, Google elige dónde está esa calle. La cabecera del resultado siempre dice qué dirección se ha usado.
- Radio solo 100, 200 o 300 metros. Al cambiar el radio se enseña el resultado de la última búsqueda para ese radio (ver «Cambiar de radio»).
- Tres atajos en pantalla, solo para probar: Gran Vía 28, Madrid · Rua Augusta 100, Lisboa · Calle Corrida 20, Gijón. Un atajo borra la ubicación actual, rellena la dirección y busca.
- Si se edita la dirección a mano, se deja de usar el punto de ubicación actual. Si en ese momento se estaba leyendo el GPS, esa lectura se descarta.
- Tipos de Google: restaurante, bar, cafetería, para llevar y panadería. De cada tipo, Google da los 20 sitios más destacados dentro del radio. Se quitan los repetidos.
- Todos los sitios del radio se ordenan por nota ponderada: la nota de Google corregida por el número de reseñas (media bayesiana con 30 reseñas de peso y la nota media de los sitios del radio). Así un 4,6 con 800 reseñas va por delante de un 5,0 con 3. Un sitio sin nota cuenta como la media menos 0,25. A igual nota, va antes el más cercano.
- Se toman los 30 primeros. Luego se quedan los que tienen precio y no están cerrados todo el día de la consulta. De esos, los 6 primeros, en ese orden.
- Al cambiar el radio cambia la lista: a 300 m pueden entrar sitios mejor valorados que no caben en 200 m.
- Esos 30 se revisan en tandas de 8, de mejor a peor nota, y se para al tener seis. El resultado es el mismo que revisar los 30; solo cambia cuántas fichas se piden a Google y a TripAdvisor.

## Ubicación actual

El botón «Ubicación actual» lee el GPS y la red del propio dispositivo, con la máxima precisión y sin reutilizar una lectura vieja. Es la única fuente: no hay ubicación de red del servidor.

- Si la precisión baja de 50 m, se usa ese punto enseguida.
- Si está entre 50 y 100 m, se esperan 2 segundos por si mejora.
- Si está entre 100 y 250 m, se esperan 4 segundos.
- Si es peor, se esperan 6 segundos. El tope es 18 segundos. Siempre se queda la lectura más fina.
- Un punto con precisión peor de 500 m no se usa para buscar. El aviso dice a cuántos metros ha llegado y pide escribir la calle.
- Si el dispositivo no da ningún punto, el aviso pide probar otra vez o escribir una dirección.
- El punto tiene que caer en España o Portugal. Si no, el aviso lo dice.
- Si el punto sirve, el campo pasa a «Ubicación actual» y, bajo el resultado, se lee la precisión en metros. La dirección que se enseña es la que Google da a ese punto.
- Si el radio cambia mientras se lee el GPS, la búsqueda usa el radio nuevo.

## Cambiar de radio

- Si en los últimos 10 minutos, en la misma página y el mismo día en la hora local del sitio buscado, ya se hizo esa búsqueda con ese radio (la misma dirección, sin contar mayúsculas ni espacios de más, o el mismo punto), se enseña sin volver a pedirla.
- Un radio distinto siempre se pide de nuevo, porque la lista cambia con el radio.
- La página recuerda como mucho 30 búsquedas. No se guarda nada en el servidor ni en el almacenamiento del navegador; al cerrar o recargar la página, se olvida todo.

## Quién entra en la lista

Entra un sitio si Google o TripAdvisor marcan precio. El precio de Google puede ser el nivel o el rango en euros de Places API (New), si esa API está activa. El de TripAdvisor es su nivel de precio. No se inventa un rango en euros a partir del nivel.

No entra un sitio cerrado todo el día de la consulta. Si ese día abre, entra aunque en ese momento esté cerrado. Lo que queda abierto de madrugada de la noche anterior (por ejemplo, de 00:00 a 02:30 tras abrir el domingo) no cuenta como que abra ese día. El día y el horario son los de la hora local del sitio (ver «Dónde busca»). Se usa el de Google. El de TripAdvisor solo rellena el hueco si Google no trae horas y el horario de TripAdvisor está en una zona que da la misma hora que la local.

No entra un sitio cerrado de forma permanente.

Solo entran sitios donde se puede comer:

- No entra un sitio solo para llevar: si Google dice que no se consume en el local, queda fuera. Que un sitio tenga para llevar es un dato de la ficha, no decide si entra.
- El desayuno no cuenta como comida. Entra un sitio si Google dice que sirve comida o cena.
- Si Google no dice nada de comidas ni cenas, se mira su tipo principal: panaderías, pastelerías, cafeterías, cafés, heladerías, bombonerías, teterías, zumerías y sitios de desayunos quedan fuera; restaurantes y bares entran (tapas, bocadillos). Si dice que no sirve ni comida ni cena, queda fuera aunque sea restaurante.
- El tipo principal sale de Places API (New); si no está disponible, se miran los tipos de la lista cercana de Google.

## Qué mezcla la ficha

Google y TripAdvisor forman una sola ficha. No hay enlace a TripAdvisor.

- Nota de Google y número de reseñas de Google. Si hay ficha de TripAdvisor, se rotulan «Google» y «en Google», y al lado salen la nota y las reseñas de TripAdvisor.
- «Mucha gente» si Google tiene 200 reseñas o más. «Poca gente» si tiene menos de 40.
- El rango por persona, solo si Google lo trae en `priceRange`, escrito a la manera española: «20-60 €», «Más de 50 €», «Menos de 15 €», con coma en los decimales («12,5-20 €») y un espacio que no deja el símbolo solo en otra línea. En otra moneda sale su código detrás: «Menos de 15 USD».
- «Informado por N personas», solo si ese dato existe.
- Tipo de sitio.
- Horario de hoy, con el día en español y en la hora local del sitio.
- Descripción, solo el texto editorial de Google. Si no hay, no se pone ninguna frase de relleno.
- Hasta tres fotos de Google, cargadas según se acercan a la pantalla.
- Para llevar, si lo marca Google o si las reseñas o la información del local de TripAdvisor lo dicen, en español, portugués o inglés.
- Terraza, «Tiene terraza» o «Sin terraza», si queda claro en las reseñas o en la información del local. Si no se menciona, no sale. No se leen los pies de foto: a TripAdvisor no se le piden fotos.
- Animales, solo si las reseñas lo confirman o lo dice el local. Si no, no se enseña.
- Nube de palabras: las que salen en las reseñas en español y en portugués de Google y de TripAdvisor, hasta doce, con su número. Se quitan las palabras vacías del español, el portugués y el inglés, y el nombre del sitio. La primera pastilla es «Todas».

El emparejamiento con TripAdvisor es por nombre parecido y a menos de 100 m. Al comparar nombres no cuentan palabras como restaurante, bar, cafetería, café, pastelaria, padaria, tasca, taberna, marisqueira, churrasqueira, cervecería, cervejaria o sidrería. En Portugal se piden a TripAdvisor las reseñas en portugués; en España, en español. Si no hay ficha, la tarjeta se queda solo con Google.

## Cómo se leen las reseñas

Se leen en español, en portugués y en inglés. Cada reseña va con el idioma que declara Google o TripAdvisor; si no lo declara, se reconoce el portugués por palabras como «não», «muito», «também» o las terminaciones «-ção» y «-ções», y lo demás se lee como español.

- Terraza: terraza, terraço, esplanada, al aire libre, ao ar livre, mesas en la calle o fuera, mesas na rua, lá fora o cá fora, jardín, jardim, patio, terrace.
- Animales: mascotas, perros, cães, cão, cachorros, animales de compañía, animais de estimação, admiten perros o mascotas, aceitam cães o animais, pet friendly, dog friendly.
- Para llevar: para llevar, para levar, para recoger, take away, takeout.
- En español e inglés, una mención cuenta como negativa si justo antes van «no», «sin», «ni» o «nunca», o si justo después van «no», «sin» o «ni».
- En portugués niegan «não», «sem», «nem» y «nunca». «No» no niega, porque en portugués es «en el»: «almoçámos no terraço» es «Tiene terraza».
- No cuentan como negación los giros «sin duda», «sin lugar a duda(s)», «sin ninguna duda», «sin embargo», «no solo», «no solamente», «no obstante», «ni que decir», «sem dúvida(s)», «sem qualquer dúvida», «não só», «não apenas», «não somente», «no entanto», «não obstante» y «nem por isso».
- «Perro caliente», «perros calientes» y «cachorro quente» son comida, no animales.
- Si una reseña confirma algo, gana a otra que lo niega.

## Qué no lleva la ficha

No se muestran el teléfono, la web, la accesibilidad, los niños, el destacado, lo popular, la clientela, los servicios, el ambiente, la planificación ni el pago. No hay recuadro de carta con el símbolo €. No hay «Nota justa», «Nota alta», «Abierto ahora» ni «Cerrado ahora». No se pegan frases de reseñas. No se enseña el nivel de precio de TripAdvisor como texto. No hay enlace que abra TripAdvisor.

«Ver en Google Maps» está en todas las fichas y abre Google Maps.

## Avisos

Todos los avisos salen en español.

- Dirección vacía o de menos de tres caracteres: «Escribe una dirección o usa tu ubicación.»
- Google no la encuentra: «No encuentro esa dirección. Revisa la calle, el número y la ciudad.»
- Google solo sitúa la ciudad o la zona: «Google solo encuentra la ciudad o la zona. Escribe la calle, el número y la ciudad.»
- Dirección fuera de los dos países: «Cerca busca en España y Portugal. Esa dirección queda fuera.»
- Ubicación actual fuera de los dos países: «Esa ubicación no está en España ni en Portugal. Cerca solo busca allí.»

Los fallos técnicos tampoco se enseñan en inglés. Un fallo de red, un tiempo de espera agotado o una respuesta que no se entiende nunca enseñan el texto técnico; el detalle se queda en el registro del servidor.

- Sin conexión: «No hay conexión. Revisa la red y prueba otra vez.»
- Google tarda más de 12 segundos: «Google tarda demasiado en responder. Prueba otra vez.»
- Otro fallo al hablar con Google: «No se ha podido hablar con Google. Prueba otra vez en un momento.»
- Demasiadas peticiones: «Demasiadas peticiones seguidas. Espera un minuto y prueba otra vez.»

## Servidor y costes

- El servidor solo tiene dos puertas: `POST /api/search` y `GET /api/photo`. No hay `/api/here`.
- Tope por IP y minuto: 20 búsquedas y 150 fotos. Pasado el tope, responde 429.
- No se guarda contenido de Google ni de TripAdvisor en el servidor.
- A TripAdvisor se le pide como mucho una petición cada 250 ms, en todo el servidor. Si aun así responde 429, se espera (1, 2 y 3 segundos) y se reintenta hasta tres veces. Sin este ritmo, TripAdvisor corta a partir de unas 5 peticiones seguidas y las fichas se quedan sin sus datos.
- Si Places API (New) responde que no está activa, se deja de preguntar y se vuelve a probar a los 10 minutos.
- Una dirección de más de 180 caracteres o un cuerpo de más de 8 000 bytes se rechazan.
- La respuesta de búsqueda trae, además de la lista, el país (`ES` o `PT`) y la zona horaria del sitio buscado.
- Una ruta mal escrita, una carpeta o un fichero que no existe no tumban el servidor. Un fichero con extensión que no existe da 404; cualquier otra ruta, la portada.
- Los ficheros de `dist/assets` llevan caché de un año; `index.html`, sin caché.
- Todas las respuestas llevan `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` y una política de permisos que solo deja la geolocalización a la propia página.
- APIs de Google necesarias, con la misma clave: Geocoding API, Places API y, para el rango en euros, Places API (New). La Geolocation API no se usa.

## Claves

`clave.env` guarda `GOOGLE_MAPS_API_KEY` y `TRIPADVISOR_API_KEY`. No se sube al repositorio. El navegador no ve las claves.

## Vigencia

Este contrato describe Cerca el 27 de septiembre de 2026 y sustituye a los contratos 1, 2 y 3. Cualquier cambio de territorio, de idioma, de ubicación, de búsqueda, de mezcla entre Google y TripAdvisor, de lo que entra en la lista, de lo que se ve en la ficha, de los avisos o del servidor necesita otro contrato. Hasta entonces, esto se mantiene tal cual.
