# Contrato de Cerca

Fecha: 27 de septiembre de 2026. Contrato 3, el vigente.

Este contrato fija Cerca tal como está hoy. Recoge en un solo texto el contrato 1, el contrato 2 y los cambios de servidor del mismo día, y los sustituye. Los anteriores se guardan en `contratos/` solo como historia. Nada de lo que aquí se dice cambia salvo un contrato posterior que lo diga.

## Qué es

Cerca enseña sitios para comer en Gijón: restaurantes, bares, cafeterías, panaderías, tapas o bocadillos. El idioma de la pantalla es el español.

Se escribe una dirección o se usa la ubicación actual. El radio es 100, 200 o 300 metros. Salen como mucho diez fichas, de la más cercana a la más lejana.

La dirección se sitúa con Google Maps. La ficha junta Google y TripAdvisor. El enlace de cada ficha abre siempre Google Maps.

## Dónde busca

Solo Gijón. Un punto fuera de la caja de Gijón, o una dirección que no sea de Gijón, no entra. La caja es latitud 43,48–43,585 y longitud −5,78–−5,55, y la dirección tiene que mencionar Gijón o Xixón.

## Cómo se busca

- Dirección de al menos tres caracteres, o un punto de ubicación actual.
- Radio solo 100, 200 o 300 metros. Al cambiar el radio se enseña el resultado de la última búsqueda para ese radio (ver «Cambiar de radio»).
- Ejemplos en pantalla: Calle Corrida, Cimadevilla, Playa de San Lorenzo. Un ejemplo borra la ubicación actual y busca esa dirección.
- Si se edita la dirección a mano, se deja de usar el punto de ubicación actual. Si en ese momento se estaba leyendo el GPS, esa lectura se descarta.
- Tipos de Google: restaurante, bar, cafetería, para llevar y panadería. Se quitan los repetidos.
- Se toman los 30 más cercanos dentro del radio. Luego se quedan los que tienen precio y no están cerrados todo el día de la consulta. De esos, los 10 más cercanos.
- Esos 30 se revisan en tandas de 12, de más cerca a más lejos, y se para al tener diez. El resultado es el mismo que revisar los 30; solo cambia cuántas fichas se piden a Google y a TripAdvisor.

## Ubicación actual

El botón «Ubicación actual» lee el GPS y la red del propio dispositivo, con la máxima precisión y sin reutilizar una lectura vieja. Es la única fuente: no hay ubicación de red del servidor.

- Si la precisión baja de 50 m, se usa ese punto enseguida.
- Si está entre 50 y 100 m, se esperan 2 segundos por si mejora.
- Si está entre 100 y 250 m, se esperan 4 segundos.
- Si es peor, se esperan 6 segundos. El tope es 18 segundos. Siempre se queda la lectura más fina.
- Un punto con precisión peor de 500 m no se usa para buscar. El aviso dice a cuántos metros ha llegado y pide escribir la calle.
- Si el dispositivo no da ningún punto, el aviso pide probar otra vez o escribir una dirección.
- Si el punto sirve, el campo pasa a «Ubicación actual» y, bajo el resultado, se lee la precisión en metros.
- Si el radio cambia mientras se lee el GPS, la búsqueda usa el radio nuevo.

## Cambiar de radio

- Si en los últimos 10 minutos, en la misma página y el mismo día de Madrid, ya se hizo esa búsqueda con ese radio, se enseña sin volver a pedirla.
- Si solo se hizo con un radio mayor, el menor se saca de ella cuando es seguro: cuando trajo menos de diez sitios o cuando el décimo queda más lejos que el radio nuevo. Si no es seguro, se pide de nuevo.
- Un radio mayor siempre se pide.
- La página recuerda como mucho 30 búsquedas. No se guarda nada en el servidor ni en el almacenamiento del navegador; al cerrar o recargar la página, se olvida todo.
- Al sacar un radio menor de uno mayor, TripAdvisor se consultó con el radio mayor. En casos raros, un sitio cercano puede quedar emparejado con su ficha de TripAdvisor cuando una búsqueda directa con el radio menor no la habría encontrado. Se acepta.

## Quién entra en la lista

Entra un sitio si Google o TripAdvisor marcan precio. El precio de Google puede ser el nivel o el rango en euros de Places API (New), si esa API está activa. El de TripAdvisor es su nivel de precio. No se inventa un rango en euros a partir del nivel.

No entra un sitio cerrado todo el día de la consulta. Si ese día abre, entra aunque en ese momento esté cerrado. El horario es el de Europe/Madrid. Se usa el de Google. El de TripAdvisor solo rellena el hueco si Google no trae horas y el horario de TripAdvisor está en Europe/Madrid.

No entra un sitio cerrado de forma permanente.

## Qué mezcla la ficha

Google y TripAdvisor forman una sola ficha. No hay enlace a TripAdvisor.

- Nota de Google y número de reseñas de Google. Si hay ficha de TripAdvisor, se rotulan «Google» y «en Google», y al lado salen la nota y las reseñas de TripAdvisor.
- «Mucha gente» si Google tiene 200 reseñas o más. «Poca gente» si tiene menos de 40.
- El rango por persona, solo si Google lo trae en `priceRange`, escrito a la manera española: «20-60 €», «Más de 50 €», «Menos de 15 €», con coma en los decimales («12,5-20 €») y un espacio que no deja el símbolo solo en otra línea. En otra moneda sale su código detrás: «Menos de 15 USD».
- «Informado por N personas», solo si ese dato existe.
- Tipo de sitio.
- Horario de hoy, con el día en español.
- Descripción, solo el texto editorial de Google. Si no hay, no se pone ninguna frase de relleno.
- Hasta tres fotos de Google, cargadas según se acercan a la pantalla.
- Para llevar, si lo marca Google o si las reseñas o la información del local de TripAdvisor lo dicen.
- Terraza, «Tiene terraza» o «Sin terraza», si queda claro en las reseñas, en la información del local o en los pies de foto. Si no se menciona, no sale.
- Animales, solo si las reseñas lo confirman o lo dice el local. Si no, no se enseña.
- Nube de palabras: las que salen en las reseñas de texto de Google y en las reseñas en español de TripAdvisor, hasta doce, con su número. La primera pastilla es «Todas».

El emparejamiento con TripAdvisor es por nombre parecido y a menos de 100 m. Si no hay ficha, la tarjeta se queda solo con Google.

## Cómo se leen las reseñas

- Una mención cuenta como negativa si justo antes van «no», «sin», «ni» o «nunca», o si justo después van «no», «sin» o «ni».
- No cuentan como negación los giros «sin duda», «sin lugar a duda(s)», «sin ninguna duda», «sin embargo», «no solo», «no solamente», «no obstante» y «ni que decir». «Sin duda la terraza es lo mejor» es «Tiene terraza».
- «Perro caliente» y «perros calientes» son comida, no animales.
- Si una reseña confirma algo, gana a otra que lo niega.

## Qué no lleva la ficha

No se muestran el teléfono, la web, la accesibilidad, los niños, el destacado, lo popular, la clientela, los servicios, el ambiente, la planificación ni el pago. No hay recuadro de carta con el símbolo €. No hay «Nota justa», «Nota alta», «Abierto ahora» ni «Cerrado ahora». No se pegan frases de reseñas. No se enseña el nivel de precio de TripAdvisor como texto. No hay enlace que abra TripAdvisor.

«Ver en Google Maps» está en todas las fichas y abre Google Maps.

## Avisos

Todos los avisos salen en español. Un fallo de red, un tiempo de espera agotado o una respuesta que no se entiende nunca enseñan el texto técnico en inglés; el detalle se queda en el registro del servidor.

- Sin conexión: «No hay conexión. Revisa la red y prueba otra vez.»
- Google tarda más de 12 segundos: «Google tarda demasiado en responder. Prueba otra vez.»
- Otro fallo al hablar con Google: «No se ha podido hablar con Google. Prueba otra vez en un momento.»
- Demasiadas peticiones: «Demasiadas peticiones seguidas. Espera un minuto y prueba otra vez.»

## Servidor y costes

- El servidor solo tiene dos puertas: `POST /api/search` y `GET /api/photo`. No hay `/api/here`.
- Tope por IP y minuto: 20 búsquedas y 150 fotos. Pasado el tope, responde 429.
- No se guarda contenido de Google ni de TripAdvisor en el servidor.
- Si Places API (New) responde que no está activa, se deja de preguntar y se vuelve a probar a los 10 minutos.
- Una dirección de más de 180 caracteres o un cuerpo de más de 8 000 bytes se rechazan.
- Una ruta mal escrita, una carpeta o un fichero que no existe no tumban el servidor. Un fichero con extensión que no existe da 404; cualquier otra ruta, la portada.
- Los ficheros de `dist/assets` llevan caché de un año; `index.html`, sin caché.
- Todas las respuestas llevan `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` y una política de permisos que solo deja la geolocalización a la propia página.
- APIs de Google necesarias, con la misma clave: Geocoding API, Places API y, para el rango en euros, Places API (New). La Geolocation API no se usa.

## Claves

`clave.env` guarda `GOOGLE_MAPS_API_KEY` y `TRIPADVISOR_API_KEY`. No se sube al repositorio. El navegador no ve las claves.

## Vigencia

Este contrato describe Cerca el 27 de septiembre de 2026 y sustituye a los contratos 1 y 2. Cualquier cambio de ubicación, de búsqueda, de mezcla entre Google y TripAdvisor, de lo que entra en la lista, de lo que se ve en la ficha, de los avisos o del servidor necesita otro contrato. Hasta entonces, esto se mantiene tal cual.
