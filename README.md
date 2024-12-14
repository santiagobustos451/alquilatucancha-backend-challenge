# Actualizaciones

### Actualización 1: Precacheo, Optimización del fetching de disponibilidad

- Se identificó una ineficiencia en el proceso de fetching de disponibilidad, ya que las peticiones se realizaban de forma secuencial. Esto fue corregido mediante la paralelización de las solicitudes a la API siempre que fue posible, lo que redujo el tiempo de respuesta inicial de aproximadamente ~18 segundos a ~4.5 segundos.

- Se implementó un servicio de precaching que precarga la información de los clubes y canchas utilizando el endpoint /zones.

> Nota: En un escenario real, se asume que este endpoint devolvería las zonas más populares en lugar de todas las zonas. Sin embargo, con la API mock utilizada, el endpoint solo devuelve 3 zonas, lo que permite precargar toda la información en poco más de 4 segundos.

#### Resultados de la actualización

- Reducción del tiempo de respuesta a ~1s cuando se requiere hacer un fetch a la API mock, y a ~20ms cuando la información está disponible en cache.

# Introducción

Este proyecto implementa un sistema de caching con Redis para mejorar la eficiencia de las consultas en una aplicación que gestiona la disponibilidad de canchas deportivas. Utilizando un enfoque basado en eventos, el sistema actualiza la cache de manera dinámica en respuesta a cambios en los datos de los clubes, canchas y horarios. La integración con Redis permite reducir el tiempo de respuesta de las consultas al evitar la necesidad de realizar llamadas repetitivas a la API, lo que optimiza significativamente el rendimiento de la aplicación.

### Resultados obtenidos

La implementación de Redis como sistema de cache ha tenido un impacto notable en el rendimiento de las consultas. Antes de la implementación de la cache, la respuesta inicial a la búsqueda de clubes, canchas y slots tomaba aproximadamente 18 segundos, debido a la necesidad de hacer llamadas a la API para recuperar los datos.

Con la cache de Redis en funcionamiento, la respuesta de las consultas se ha reducido a un promedio de **22ms**, lo que representa una mejora significativa en la velocidad de la aplicación. Sin embargo, en algunas ocasiones, las consultas pueden tardar un poco más (alrededor de 500ms), principalmente cuando es necesario actualizar la cache de los slots debido a cambios en los datos. Este comportamiento es esperado y no afecta significativamente el rendimiento general, ya que ocurre en casos puntuales y la mayoría de las consultas se benefician de la cache con tiempos de respuesta significativamente más bajos.

### Cómo correr la aplicación

El desarrollo se llevó a cabo utilizando docker compose, mediante el cual se creo el contenedor del servidor de redis. Luego de instalar las dependencias, correr el siguiente comando para iniciar los contenedores.

```bash
  docker compose up --build
```

> Probado con [Docker version 26.0.0, build 2ae903e] y [Docker Compose version v2.26.1-desktop.1]

## **Explicación del enfoque implementado**

A continuación, se detalla la solución implementada para optimizar el sistema de manejo de datos del proyecto "Alquila Tu Cancha". Se emplearon **Redis** y servicios cacheados para mejorar el rendimiento y reducir la latencia de las operaciones recurrentes, como obtener clubes, canchas o turnos disponibles.

---

### **1. Introducción de Redis**

Se configuró un contenedor aparte para **Redis**, que actúa como sistema de almacenamiento en caché para datos consultados con frecuencia. Redis permite:

- Almacenar resultados de consultas a la API, reduciendo el tiempo de respuesta.
- Manejar datos transitorios con tiempo de expiración.
- Facilitar el borrado o actualización de datos específicos cuando ocurren eventos.

---

### **2. Servicio de caché: `AlquilaTuCanchaCacheService`**

Este servicio reemplaza al cliente HTTP directo en el handler principal. Su lógica es la siguiente:

#### **Interfaz y Constructor**

El servicio implementa una interfaz que define las dependencias clave:

- `RedisClient`: Cliente para interactuar con Redis.
- `AlquilaTuCanchaClient`: Cliente HTTP para obtener datos directamente de la API.

#### **Funciones principales**

##### **`getClubs(placeId: string): Promise<Club[]>`**

- **Cache indexado por lugar**:
  - Se verifica si los clubes de un lugar (`placeId`) están en cache bajo la clave `clubsInPlace-${placeId}`.
  - Si existen, se obtienen los IDs de los clubes y luego los datos individuales de cada club, almacenados en claves como `club-${clubId}`.
- **Si no están cacheados**:
  - Se obtiene la lista completa desde el cliente HTTP.
  - Se almacena un índice de IDs en el cache (`clubsInPlace-${placeId}`).
  - Se cachean los datos individuales de cada club.

##### **`getCourts(clubId: number): Promise<Court[]>`**

- Intenta obtener las canchas asociadas a un club (`clubId`) desde la clave `courts-${clubId}`.
- Si no están cacheadas, las consulta desde la API y las almacena en Redis.

##### **`getAvailableSlots(clubId: number, courtId: number, date: Date): Promise<Slot[]>`**

- Las horas disponibles para una cancha específica en una fecha se cachean bajo la clave:

slots:${clubId}:${courtId}:${YYYY-MM-DD}

- Si no están en cache, las consulta desde la API y las almacena.

---

### **3. Handlers para eventos**

Para mantener el cache actualizado, se implementaron handlers que reaccionan a eventos específicos del sistema. Estos handlers borran o actualizan datos relevantes en el cache.

#### **Estructura general de un handler**

- Se usan decoradores como `@EventsHandler` y `@Inject` para manejar eventos y acceder a dependencias.
- Cada handler escucha un tipo de evento y ejecuta la lógica apropiada.

#### **Handlers implementados**

##### **`ClubUpdatedHandler`**

- **Evento**: `ClubUpdatedEvent`
- **Acciones**:

1. Borra el cache del club afectado: `club-${event.clubId}`.
2. Consulta los datos actualizados desde la API y los cachea nuevamente.
3. Si los horarios (`openhours`) cambian, elimina las claves de turnos (`slots:${event.clubId}:*`) para evitar inconsistencias.

##### **`CourtUpdatedHandler`**

- **Evento**: `CourtUpdatedEvent`
- **Acciones**:

1. Borra el cache de las canchas asociadas al club afectado: `courts-${event.clubId}`.
2. Obtiene y cachea las canchas actualizadas desde la API.

##### **`SlotAvailableHandler`**

- **Evento**: `SlotAvailableEvent`
- **Acciones**:

1. Elimina del cache los slots asociados a la cancha en esa fecha determinada (`slots:${clubId}:${courtId}:${YYYY-MM-DD}`).

##### **`SlotBookedHandler`**

- **Evento**: `SlotBookedEvent`
- **Acciones**:

1. Elimina del cache los slots asociados a la cancha en esa fecha determinada (`slots:${clubId}:${courtId}:${YYYY-MM-DD}`).

---

### **4. Consideraciones técnicas**

#### **Tiempo de vida en cache (TTL)**

- Se estableció el TTL para los datos cacheados mediante variables de entorno, lo que permite una configuración flexible y adaptable. Los valores predeterminados son:

  - **Clubes y canchas**: TTL de 3600 segundos (1 hora). Este tiempo es adecuado para datos que no cambian con frecuencia, como la información de los clubes y sus canchas.
  - **Slots**: TTL de 300 segundos (5 minutos). Este tiempo más corto se aplica a los slots, ya que son datos más volátiles que pueden cambiar rápidamente y necesitan ser actualizados con mayor frecuencia.

  Estos valores pueden ser modificados mediante las variables de entorno correspondientes para ajustarse a necesidades específicas de cada entorno o configuración.

#### **Formato de las claves en cache**

El formato de las claves utilizadas para almacenar los datos en Redis sigue una estructura consistente que permite un acceso fácil y organizado. Los formatos de clave son los siguientes:

- **Índice de clubes por `placeId`**:

  ```
  clubsInPlace-${placeId}
  ```

  Esta clave se utiliza para almacenar un índice de clubes asociados a un lugar específico (`placeId`). El valor es una lista de identificadores de clubes, lo que permite recuperar rápidamente todos los clubes asociados a un lugar sin necesidad de realizar múltiples consultas a la API.

- **Claves de clubes**:

  ```
  club-${clubId}
  ```

  Se utiliza para almacenar los datos de un club específico identificado por su `clubId`.

- **Claves de canchas**:

  ```
  courts-${clubId}
  ```

  Se usa para almacenar la lista de canchas asociadas a un club, identificado por su `clubId`.

- **Claves de slots**:
  ```
  slots:${clubId}:${courtId}:${YYYY-MM-DD}
  ```
  El formato para las claves de los turnos es más específico, combinando el `clubId`, `courtId` y la fecha (`YYYY-MM-DD`) para garantizar que los datos de los slots se mantengan organizados por cancha y día.

Estas claves son dinámicamente generadas en función de los parámetros de la solicitud, lo que permite una fácil identificación y eliminación de datos específicos cuando se actualizan o eliminan.

---

### **Ventajas del sistema**

1. **Reducción de latencia**: Los datos en cache permiten respuestas inmediatas para consultas recurrentes.
2. **Mantenimiento simplificado**: El uso de eventos asegura que los datos en cache sean consistentes y se actualicen automáticamente.
3. **Eficiencia**: Redis maneja datos transitorios de manera óptima, liberando memoria para datos menos usados.

---

### **5. Mejoras potenciales**

A continuación, se mencionan algunas áreas que podrían mejorarse para optimizar aún más la gestión de la cache y la eficiencia de los eventos:

1. **Modificar los slots directamente al recibir un evento**:

   - Actualmente, cuando se recibe un evento relacionado con un turno (`slot`), la estrategia seguida es eliminar la clave correspondiente en la cache, lo que obliga a que el dato se recargue desde la API en la próxima consulta. Una mejora potencial sería la posibilidad de modificar directamente el slot en la cache cuando se reciba el evento, en lugar de eliminarlo por completo. Esto reduciría el tiempo de respuesta y la carga en la API, ya que los datos modificados se actualizarían instantáneamente en la cache.

2. **Mejorar el manejo de los eventos de actualización de clubes**:
   - En la implementación actual, cuando se recibe un evento de actualización de un club, se eliminan todos los slots asociados a ese club de la cache. Una mejora sería detectar qué horarios cacheados se verían afectados por la modificación específica (por ejemplo, cambios en los horarios de apertura) y eliminar solo aquellos slots cuyo valor haya cambiado. Esto permitiría mantener los datos cacheados de manera más eficiente, evitando la eliminación innecesaria de slots que no se han visto afectados por la actualización, lo que mejoraría el rendimiento del sistema y reduciría el impacto en el tiempo de respuesta de las consultas.
