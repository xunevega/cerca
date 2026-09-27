# Contrato 2 de Cerca

Fecha: 27 de septiembre de 2026.

Este contrato cambia tres puntos de `CONTRATO.md`. Todo lo demás sigue igual. Donde los dos digan cosas distintas, manda este.

## 1. Ubicación actual: sin ubicación de red del servidor

Se quita la frase «Solo si el dispositivo no da un punto útil se prueba la ubicación de red del servidor».

El motivo: el servidor pedía a Google la posición por su propia IP, no por la del usuario. Una vez desplegada, Cerca recibía la ubicación del centro de datos, que nunca llegaba a 500 m de precisión. Costaba una llamada a Google y no daba nada a cambio.

Queda así:

- «Ubicación actual» usa solo el GPS y la red del propio dispositivo, con las mismas esperas de antes (enseguida por debajo de 50 m; 2, 4 o 6 segundos según la precisión; tope de 18 segundos; siempre la lectura más fina).
- Un punto con precisión peor de 500 m no se usa. El aviso dice a cuántos metros ha llegado y pide escribir la calle.
- Si el dispositivo no da ningún punto, el aviso pide probar otra vez o escribir una dirección.
- Desaparece `/api/here`. La Geolocation API de Google ya no se usa.

## 2. Precio por persona, a la manera española

El rango en euros se escribe con el símbolo detrás y un espacio: «20-60 €», «Más de 50 €», «Menos de 15 €». Con decimales, coma: «12,5-20 €». Si Google trae otra moneda, sale su código detrás: «Menos de 15 USD».

Sigue saliendo solo si Google lo trae en `priceRange`. No se inventa a partir del nivel.

## 3. Cambiar de radio sin repetir llamadas

Donde decía «Al cambiar el radio se repite la última búsqueda», ahora dice: al cambiar el radio se enseña el resultado de la última búsqueda para ese radio.

- Si en los últimos 10 minutos, en la misma página y el mismo día de Madrid, ya se hizo esa búsqueda con ese radio, se enseña sin volver a pedirla.
- Si solo se hizo con un radio mayor, el menor se saca de ella cuando es seguro: cuando trajo menos de diez sitios o cuando el décimo queda más lejos que el radio nuevo. Si no es seguro, se pide de nuevo.
- Un radio mayor siempre se pide.
- No se guarda nada de Google ni de TripAdvisor en el servidor ni en el almacenamiento del navegador. Solo se reutiliza lo que la página ya tiene, mientras está abierta. Así se cumplen las condiciones de Google Maps, que no permiten guardar el contenido de Places.

Una diferencia posible: al sacar 100 m de una búsqueda de 300 m, TripAdvisor se ha consultado con el radio mayor. En casos raros, un sitio a menos de 100 m puede quedar emparejado con su ficha de TripAdvisor cuando la consulta de 100 m no la habría encontrado. El emparejamiento sigue siendo por nombre parecido y a menos de 100 m del sitio.

## Vigencia

Este contrato, junto con `CONTRATO.md`, describe Cerca el 27 de septiembre de 2026. Cualquier otro cambio necesita un contrato posterior.
