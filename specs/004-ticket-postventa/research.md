# Investigación y decisiones de diseño: ticket de post-venta completo

**Feature**: `004-ticket-postventa` | **Fecha**: 2026-11-28 | **Plan**: [plan.md](plan.md) | **Especificación**: [spec.md](spec.md)

## Propósito

La especificación no deja marcadores `NEEDS CLARIFICATION`; las decisiones abiertas se cerraron con supuestos explícitos en el propio documento. Esta investigación resuelve las decisiones **técnicas** necesarias para implementarlas sin introducir un backend, una colección nueva ni dependencias. Cada decisión indica qué se eligió, por qué y qué alternativa se descartó.

## Contexto de la línea base

- Aplicación web estática con Vite, JavaScript ES2022, HTML y CSS; sin framework ni router.
- Persistencia en `localStorage` con seis colecciones, marcador de recuperación y `schemaVersion`.
- `SCHEMA_VERSION = 3`; los tickets actuales no tienen folio, asunto, canal, técnico, equipo, SLA, historial, cierre ni satisfacción.
- Ciclo actual: `En proceso → Resuelto`; los tickets nuevos se fuerzan a `En proceso`.
- Pruebas: Vitest + jsdom, 57 archivos y 461 pruebas en verde al 2026-11-28.
- El panel ya calcula indicadores comerciales en cada render y no persiste agregados.

## Decisiones

### R-01 — Mantener el stack y la arquitectura existentes

**Decisión**: implementar con los módulos actuales (`crm-rules.js`, `crm-metrics.js`, `storage.js`, `app.js`, `components/*`), sin dependencias nuevas, sin router, sin store y sin framework.

**Rationale**: el proyecto ya tiene separación entre reglas puras, persistencia y presentación; la iteración amplía el dominio del ticket y reutiliza esa separación. Introducir un router o un store obligaría a migrar 57 archivos de prueba y no aporta valor verificable para una sola vista nueva.

**Alternativas consideradas**:
- Framework reactivo o store global: descartado por costo de migración, dependencias y pruebas.
- Router con rutas reales: descartado porque el shell usa hash y la especificación solo exige una ruta estable `#/tickets`.
- Backend o API: fuera de alcance explícito.

### R-02 — Esquema v4 aditivo con escrituras bloqueadas hasta migrar

**Decisión**: subir `SCHEMA_VERSION` a 4; conservar todas las claves y campos; agregar los campos del ticket de forma aditiva. Las lecturas de datos v3 se permiten con tolerancia para mostrar el aviso de migración, pero **toda escritura se bloquea mientras la versión almacenada sea menor que 4**. La versión 4 se escribe solo después de verificar la instantánea transformada.

**Rationale**: hoy `saveSnapshot` escribe siempre `SCHEMA_VERSION`; si se sube a 4 sin bloquear, el primer guardado de cualquier entidad migraría los tickets en silencio y sin respaldo. Bloquear escrituras hace explícita la migración (FR-071, NFR-013) y evita mezclar datos v3 con reglas v4.

**Alternativas consideradas**:
- Migración automática al detectar la versión: contradice “explícita, confirmada y respaldada”.
- Escritura v4 tolerante con tickets v3 incompletos: deja folio, asunto e historial ausentes y rompe la unicidad y la auditoría.
- Duplicar la aplicación por versión: descartado por complejidad innecesaria.

### R-03 — Folio determinista `TKT-AAAA-####`

**Decisión**: `formatTicketFolio(year, sequence)` produce `TKT-AAAA-####` con cuatro dígitos y ceros a la izquierda. `nextTicketFolio(tickets, createdAt)` toma el año local de `createdAt`, busca el mayor correlativo de ese año en toda la colección y devuelve el siguiente. La asignación ocurre dentro de `addTicket` (y en la migración); el formulario nunca la envía. `buildTicket` conserva el folio anterior y `updateTicket` rechaza cualquier cambio. Si el correlativo supera 9999, el alta se rechaza.

**Rationale**: el folio debe ser legible, estable y verificable sin un contador persistido que pueda desincronizarse. Calcular el máximo sobre la colección es O(n) y suficiente para 1000 tickets. La unicidad se comprueba contra toda la colección, no solo contra el año.

**Alternativas consideradas**:
- UUID o identificador aleatorio: no es legible ni citable.
- Contador persistido por año: se corrompe o desincroniza con el respaldo y la restauración.
- Folio secuencial global: no cumple el formato anual exigido.
- Reutilizar el `id` técnico: no es un folio humano.

### R-04 — Máquina de estados pura y compartida

**Decisión**: `TICKET_STATUSES = ['Nuevo', 'En proceso', 'En espera', 'Resuelto', 'Cerrado']`; `TICKET_TRANSITIONS` declara solo:

| Desde | Hacia |
|---|---|
| `Nuevo` | `En proceso` |
| `En proceso` | `En espera`, `Resuelto` |
| `En espera` | `En proceso`, `Resuelto` |
| `Resuelto` | `Cerrado` |
| `Cerrado` | — |

`canTransitionTicket(from, to)` y `nextTicketStatuses(status)` son la única fuente de verdad. La interfaz no ofrece acciones fuera de la tabla y el almacenamiento vuelve a validar. `Cerrado` es terminal y de solo lectura. La creación fuerza `Nuevo` para tickets nuevos del esquema 4; los históricos conservan su estado.

**Rationale**: una tabla declarativa evita que la interfaz y el almacenamiento diverjan y permite probar todas las combinaciones. La prohibición de reapertura desde `Resuelto` se conserva.

**Alternativas consideradas**:
- Validar solo en la interfaz: una escritura directa o una prueba podría saltarse la regla.
- Estados como máquina de objetos con efectos: mezcla reglas con persistencia.
- Permitir `Nuevo → Resuelto` para “alta rápida”: contradice CA-28-03 y la trazabilidad de primera respuesta.

### R-05 — SLA derivado, sin pausas y congelado al resolver

**Decisión**: `SLA_HOURS_BY_PRIORITY = { Alta: 24, Media: 72, Baja: 168 }`. `computeSlaDueAt(createdAt, priority)` devuelve `createdAt + horas`. `getSlaStatus(ticket, now)` devuelve `Vencido` si `now >= slaDueAt`, `Por vencer` si `0 < slaDueAt - now <= 25%` del objetivo y `En plazo` en el resto. `slaDueAt` se materializa al guardar y en la migración como dato informativo, pero **nunca se acepta como entrada y se recalcula en cada lectura**; la fuente de verdad son `createdAt` y `priority`. Para `Resuelto`/`Cerrado` se compara `resolvedAt` con el objetivo vigente; sin `resolvedAt` verificable se muestra `Sin datos`. `En espera` no pausa el SLA. La prioridad se congela desde `Resuelto`.

**Rationale**: derivar en lectura evita semáforos obsoletos y cumple “no se lee un total persistido”. Materializar `slaDueAt` facilita inspección y respaldo, pero no se confía en el valor almacenado. El umbral del 25% es el definido en la especificación y coincide con los valores “Por vencer” (6/18/42 horas).

**Alternativas consideradas**:
- Persistir solo `slaDueAt` y leerlo: se desincroniza si cambia la prioridad o la zona horaria.
- Calendario laboral, feriados o pausas: fuera de alcance.
- Semáforo persistido: viola “no se persiste el semáforo como total derivado”.
- Objetivos por cliente o contrato: no están en el alcance.

### R-06 — Historial embebido, append-only y atómico

**Decisión**: cada ticket tiene `history[]` con eventos `{ id, at, type, field, from, to, note, actor }`. `type ∈ {creacion, estado, prioridad, asignacion, equipo, resolucion, cierre, satisfaccion, migracion}`. `appendTicketHistory(ticket, event, now)` es pura: asigna `at`, completa `id` como `${ticket.id}:${history.length + 1}` y agrega al final. No se edita ni se elimina un evento. `updateTicket`, `assignTicket`, `changeTicketStatus`, `resolveTicket`, `closeTicket`, `registerSatisfaction` y la migración agregan el evento **antes** de la única escritura de la instantánea. La interfaz muestra el historial de más reciente a más antiguo, desempatando por orden de inserción.

**Rationale**: un arreglo embebido garantiza que el cambio y su evento se escriban juntos; una colección separada permitiría un ticket actualizado sin historial o un historial huérfano. El `id` derivado del ticket y la posición es estable dentro del ticket y no requiere un contador global.

**Actor**: se usa `actor` explícito si el llamador lo entrega; si no, el `assignee` vigente del ticket; si tampoco existe, `"Sistema"`. No se inventa un usuario autenticado. En la creación se usa el técnico elegido o `"Sistema"`.

**Alternativas consideradas**:
- Colección `ticketHistory` separada: rompe la atomicidad de una sola instantánea y complica la eliminación.
- Log global de eventos: excede el alcance y mezcla dominios.
- Reconstruir historial desde `updatedAt`: inventa cambios que el sistema nunca registró.
- IDs aleatorios por evento: válidos, pero el id determinista simplifica pruebas y respaldo.

### R-07 — Solicitante, canal, técnico y equipo

**Decisión**: `contactId` es opcional y debe pertenecer al mismo `entity_id`. Al guardar se copia `requesterName`, `requesterEmail` y `requesterPhone` desde el contacto seleccionado, o se toman los valores ingresados. El correo se valida con `isValidEmail` solo si está presente; el teléfono se acepta como texto no vacío. `channel` es obligatorio en altas nuevas y opcional en tickets migrados; se valida contra `catalogs.channel`. `assignee` y `team` son opcionales, se validan contra sus catálogos y se muestran como “Sin asignar”. La reasignación usa `assignTicket` para escribir el cambio y su evento juntos.

En actualización, un `contactId` **sin cambios** que ya no existe o pertenece a otro cliente se conserva con una advertencia visible (“Solicitante no registrado”); un `contactId` **nuevo o modificado** inválido se rechaza. Lo mismo aplica a `channel` ausente en un ticket migrado: se conserva como “Canal no registrado” hasta que el usuario elija uno; si envía un valor, debe ser del catálogo.

**Rationale**: el respaldo histórico del solicitante no debe cambiar si el contacto se edita o elimina, y no se debe bloquear la edición de otros campos por un dato legado. La validación estricta se reserva a valores nuevos, en línea con “los valores persistidos que dejen de existir no se reescriben en silencio”.

**Alternativas consideradas**:
- Guardar solo `contactId` y leer el contacto en vivo: pierde el dato histórico y falla si el contacto se elimina.
- Exigir siempre un contacto existente: impide editar tickets con contactos eliminados.
- Texto libre para canal/técnico/equipo: impide filtrar y validar por catálogo.

### R-08 — Garantía y vínculo de origen

**Decisión**: `warrantyEndsAt` es una fecha de calendario `YYYY-MM-DD` opcional, validada con `isValidCalendarDate`. La presentación compara con `todayLocal()`: igual o posterior a hoy → “En garantía”; anterior → “Fuera de garantía”; vacía → “Garantía no registrada”. No se calcula cobertura ni se crea un módulo de garantías. `documentId` es opcional, debe existir y pertenecer al mismo cliente al guardar. Si el documento se elimina después, el ticket conserva la referencia y muestra “Venta de origen no disponible”; no se borra ni se reasigna el ticket.

**Rationale**: son vínculos mínimos de post-venta industrial y no justifican módulos completos. La comparación con el día local evita corrimientos por UTC.

**Alternativas consideradas**:
- Calcular meses de cobertura o crear un catálogo de garantías: fuera de alcance.
- Borrar en cascada el ticket al eliminar el documento: pierde el caso de soporte.
- Validar el documento solo en la interfaz: una escritura directa podría dejar una referencia cruzada.

### R-09 — Bandeja global con estado de vista en memoria

**Decisión**: nueva vista `tickets` en `VIEW_IDS` y en `availableViews()`, ruta `#/tickets`, entrada `nav-tickets` en la barra lateral. El estado de filtros (`status`, `priority`, `assignee`) y el orden (`priority-sla` por defecto, `sla`, `recent`) vive en variables de módulo de `app.js`; no se persiste ni se codifica en la URL. Los filtros se combinan con AND y “Todos” deja de restringir. “Limpiar filtros” restaura el orden por defecto y anuncia el cambio con `aria-live`. El orden por defecto es un comparador estable:

1. rango de prioridad `Alta < Media < Baja`;
2. `slaDueAt` ascendente (calculado, no leído);
3. `createdAt` ascendente;
4. `folio` ascendente.

La tabla se renderiza con `data-table.js`; la fila se activa con `Enter` o `Espacio` y abre el detalle.

**Rationale**: la especificación pide filtros y orden de sesión, no enlaces compartibles. Mantenerlos en memoria evita una fuente de verdad adicional y cumple “no se persisten”. El desempate por `folio` garantiza un orden estable incluso con fechas idénticas.

**Alternativas consideradas**:
- Persistir filtros en `localStorage`: agrega estado no requerido y complica las pruebas.
- Codificar filtros en el hash: útil para compartir, pero no está en el alcance y complica el respaldo de ruta.
- Ordenar con `Array.prototype.sort` inestable: el desempate explícito lo evita.
- Paginación o virtualización: innecesaria para 1000 filas; se mide primero.

### R-10 — Detalle en drawer de solo lectura

**Decisión**: `ticket-detail.js` construye un drawer de solo lectura con folio, asunto, estado, prioridad, SLA, cliente, solicitante, canal, técnico, equipo, producto, referencia, garantía, vínculo de origen, descripción, primera respuesta, resolución, satisfacción e historial. Las acciones (“Editar”, “Asignar”, “Cambiar estado”, “Resolver”, “Cerrar”, “Eliminar”) se muestran según el estado y abren el drawer de edición o un diálogo específico. No se crea una ruta de detalle ni se duplica el formulario.

**Rationale**: reutiliza `ui-overlay`, el formulario y el patrón de drawers ya probado; una ruta de detalle obligaría a un router y a manejar enlaces profundos que no se piden.

**Alternativas consideradas**:
- Página de detalle con ruta propia: más profunda, pero fuera de alcance.
- Edición inline en la tabla: mezcla lectura y escritura y complica la accesibilidad.
- Un segundo formulario en el detalle: duplica validaciones.

### R-11 — Indicadores de soporte puros y recalculados

**Decisión**: en `crm-metrics.js`:

- `countOpenTickets(tickets)`: estados `Nuevo`, `En proceso`, `En espera`.
- `countOverdueTickets(tickets, now)`: abiertos con `now >= computeSlaDueAt(createdAt, priority)`.
- `ticketPriorityDistribution(tickets)`: conteo de abiertos por `Alta`, `Media`, `Baja`, incluyendo ceros; “Sin prioridad” solo si existen datos inválidos.
- `averageResolutionHours(tickets)`: promedio de `(resolvedAt - createdAt)` en horas sobre fechas válidas; un decimal; `null` si no hay datos.
- `slaCompliance(tickets)`: `resueltos dentro del objetivo / resueltos con SLA calculable × 100`; un decimal; `null` si no hay denominador.
- `averageSatisfaction(tickets)`: promedio de notas válidas 1–5; un decimal; `null` si no hay notas.

El panel y la ficha del cliente consumen estas funciones en cada render; no se persisten agregados. Se conservan los indicadores comerciales y de actividades existentes.

**Rationale**: una sola implementación por fórmula evita divergencias entre panel y ficha, y las funciones puras son fáciles de probar con fixtures de control. Devolver `null` en lugar de `0` permite distinguir “Sin datos” de un cero real.

**Alternativas consideradas**:
- Contadores denormalizados en el ticket o en una colección de métricas: se desincronizan y violan “no se persisten”.
- Calcular en el componente con aritmética propia: duplica fórmulas.
- Devolver `0` sin datos: confunde “ningún ticket” con “sin información”.

### R-12 — Satisfacción entera 1–5 y comentario seguro

**Decisión**: `validateSatisfaction(score, comment)` exige un entero entre 1 y 5 y un comentario opcional recortado de hasta 500 caracteres. La nota se registra al resolver (campo opcional en el diálogo) o desde el detalle mientras el ticket está `Resuelto`; una vez `Cerrado`, es de solo lectura. `registerSatisfaction` no modifica estado ni `resolvedAt`, agrega una entrada `satisfaccion` y se escribe en la misma instantánea. El comentario se muestra como texto seguro (`textContent`).

**Rationale**: CSAT es la métrica de voz del cliente definida en la especificación; una nota entera evita promedios ambiguos y el comentario acotado evita abusos de almacenamiento. La inmutabilidad tras el cierre protege la medición.

**Alternativas consideradas**:
- NPS (-100 a 100): otra escala y otro significado; no es lo pedido.
- Nota decimal o texto libre: complica el promedio y la validación.
- Obligar la nota al resolver: el cliente puede no haber respondido; la especificación la hace opcional.

### R-13 — Migración explícita, determinista y con respaldo recuperable

**Decisión**: `requestMigration(from, to)` describe los pasos según la versión de origen y no escribe. `applyMigration()`:

1. Lee la instantánea completa sin validar (`readSnapshotForBackup`) y la versión almacenada.
2. Construye en memoria los tickets v4: ordena por `createdAt` ascendente (desempate por `id`) y asigna folio por año local con `nextTicketFolio` sobre el conjunto ya transformado; copia `subject` de la descripción recortada a 120 caracteres; deja vacíos los campos opcionales ausentes; calcula `slaDueAt` si `createdAt` y `priority` son válidos; conserva `status`, `resolutionSummary` y `resolvedAt`; marca `legacyResolutionIncomplete` cuando corresponde; agrega una entrada `migracion` con la fecha real; no crea `firstResponseAt`.
3. Escribe el respaldo `erp_base_module:crmBackup:v3` con `{ createdAt, schemaVersion: 3, collections, ticketCount }`. Si no hay cuota, aborta antes de tocar nada.
4. Escribe las colecciones transformadas, verifica que todos los tickets tengan folio único, asunto e historial y que las demás colecciones no hayan cambiado, y **solo entonces** escribe `schemaVersion: 4`.
5. Si algo falla, restaura las colecciones desde el respaldo y conserva `schemaVersion: 3`.

`loadMigrationBackup()` devuelve el respaldo y sus metadatos. `restoreMigrationBackup()` valida el respaldo, restaura las colecciones y el marcador v3, y exige confirmación explícita en la interfaz. `cancelMigration()` no escribe.

Un `createdAt` ausente o inválido en un ticket histórico se trata como error de integridad y **aborta la migración antes de escribir**, con un mensaje que indica el ticket; no se inventa una fecha ni se usa la fecha de la migración.

**Rationale**: el orden determinista hace reproducible la asignación de folios y permite auditar el resultado. Escribir la versión al final evita que una migración incompleta se lea como v4. El respaldo separado del marcador de recuperación permite restaurar aunque la aplicación se recargue.

**Alternativas consideradas**:
- Migración en sitio sin respaldo: un fallo deja datos irrecuperables.
- Asignar folios por orden de almacenamiento: no es determinista ni explicable.
- Usar la fecha de migración para tickets sin `createdAt`: inventa datos.
- Reutilizar `crmRecovery` como respaldo único: se sobrescribe en la siguiente escritura.
- Guardar un respaldo por ejecución con clave dinámica: complica la restauración y no está en el alcance.

### R-14 — Integridad tolerante a v3 y estricta en v4

**Decisión**: `validateIntegrity(snapshot, options)` acepta la versión de esquema y aplica reglas estrictas de v4 solo cuando corresponde: folio con formato y único, asunto no vacío, historial con al menos una entrada, estados v4 y referencias opcionales válidas cuando están presentes. Para datos v3, acepta la ausencia de los campos nuevos y valida lo existente. Después de migrar, la validación es estricta. Los tickets `Cerrado` no admiten cambios. Los tickets migrados no se consideran inválidos por no tener `firstResponseAt`, `closedAt`, `channel`, `assignee`, `team` o satisfacción.

**Rationale**: si la validación exige campos v4 antes de migrar, la aplicación no puede ni siquiera leer los datos para mostrar el aviso. La validación por versión permite leer, avisar y migrar sin debilitar las reglas posteriores.

**Alternativas consideradas**:
- Validación laxa permanente: permite tickets nuevos sin folio o historial.
- Reparar datos automáticamente al leer: escritura silenciosa y no confirmada.
- Bloquear también la lectura: impide mostrar el aviso y la acción de migración.

### R-15 — Rendimiento de la bandeja con 1000 tickets

**Decisión**: filtrar y ordenar en memoria con una sola pasada de filtro y un comparador que usa claves precalculadas por render (`priorityRank`, `slaDueAt`). La fila de la bandeja no reconstruye el historial completo; el detalle lo hace solo al abrirse. El presupuesto es < 500 ms en al menos 19 de 20 mediciones con 1000 tickets, medido en jsdom y registrado con navegador y equipo en la validación manual. El panel recalcula sus indicadores en cada render; son funciones O(n) sobre 1000 registros.

**Rationale**: 1000 filas no justifican virtualización ni paginación, y el cuello de botella esperado es el DOM, no el filtro. Precalcular evita repetir `computeSlaDueAt` por comparación. La medición real se documenta porque jsdom no representa el render del navegador.

**Alternativas consideradas**:
- Virtualización: dependencia o complejidad de scroll no justificada.
- Paginación: cambia la experiencia y no está pedida.
- Web Worker: overhead y complejidad para 1000 registros.
- Índices persistidos: violan “no se persisten agregados”.

### R-16 — Accesibilidad de bandeja y detalle

**Decisión**: la tabla usa `aria-sort`, `role="region"` con etiqueta y foco; la fila es un `<tr>` con `tabindex="0"` y activación por `Enter`/`Espacio` (sin convertirla en botón anidado). El detalle usa `openOverlay` con `aria-modal`, trampa de foco, `Escape` y devolución del foco al control de origen. Los errores se anuncian con `role="alert"`/`aria-live`; el semáforo incluye texto e icono; el contraste objetivo es AA. En pantallas estrechas se priorizan folio, asunto, estado y SLA sin perder el acceso al detalle.

**Rationale**: cumple NFR-010, FR-074 y SC-026, y reutiliza el comportamiento ya probado de `ui-overlay`. La fila con `tabindex` evita un botón dentro de otra celda y mantiene la semántica de tabla.

**Alternativas consideradas**:
- Solo color para el SLA: excluye a personas con daltonismo.
- `window.confirm()`: no es accesible ni estilizable.
- Convertir toda la fila en un botón: rompe la semántica de tabla.
- Enlaces `<a href="#/tickets/id">`: exigiría una ruta de detalle.

### R-17 — Estrategia de pruebas y regresión

**Decisión**: unitarias para reglas puras, integración en jsdom para flujos de DOM y persistencia, y rendimiento en el archivo existente. Se agregan los archivos listados en el plan. Se actualizan las pruebas que fijan `En proceso` como estado inicial (`ticket-rules`, `ticket-resolution`, `tickets`, `integrity` y el fixture de rendimiento) en la misma tarea que el cambio, conservando sus asertos de validación y resolución. No se elimina cobertura de US-01 a US-16.

**Rationale**: el cambio de ciclo es intencional y afecta expectativas documentadas; actualizarlas junto con el código evita una suite roja transitoria y permite revisar el diff. Las pruebas de migración y de fallo simulado cubren SC-020 y SC-024.

**Alternativas consideradas**:
- Playwright: no hay CI ni backend; se declara la misma desviación de `001`/`002`.
- Pruebas solo manuales: no protegen la atomicidad ni la migración.
- Mantener `En proceso` como estado inicial por compatibilidad: contradice FR-056 y CA-28-01.

### R-18 — Concurrencia y doble envío

**Decisión**: no se promete concurrencia transaccional. `addTicket` relee la instantánea justo antes de escribir, recalcula el folio si cambió el conjunto y verifica la unicidad. Si detecta que la base cambió de forma incompatible, rechaza el guardado con un mensaje que pide recargar. La interfaz deshabilita el botón mientras guarda y no muestra éxito si la escritura falla.

**Rationale**: `localStorage` no ofrece transacciones entre pestañas; Web Locks queda fuera de alcance. Una relectura y una verificación de unicidad cubren el doble envío y reducen la ventana de carrera sin prometer más de lo que la demo puede cumplir.

**Alternativas consideradas**:
- Web Locks: mejora la serialización, pero agrega complejidad y no está en el alcance.
- Bloqueo optimista con revisión por ticket: no cubre la creación concurrente de dos tickets.
- Ignorar el problema: puede duplicar folios o perder un ticket.

### R-19 — Confirmaciones accesibles

**Decisión**: eliminación de ticket, cierre y migración usan un modal de confirmación construido sobre `openOverlay`, con título, mensaje, “Cancelar” y la acción explícita. La eliminación indica folio y asunto, aclara que el cliente no se elimina y que la acción es definitiva. El foco queda atrapado, `Escape` cancela y el foco vuelve al control de origen. No se usa `window.confirm()` en las acciones nuevas.

**Rationale**: cumple las reglas de confirmación de la especificación y la consistencia de `002`; además permite probar el diálogo en jsdom sin bloquearlo.

**Alternativas consideradas**:
- `window.confirm()`: bloqueante, no estilizable y difícil de probar.
- Confirmación inline en la fila: ocupa espacio y es fácil de activar por error.
- Sin confirmación: viola CA-28-10.

### R-20 — Documentación y trazabilidad

**Decisión**: esta feature produce `research.md`, `data-model.md`, `contracts/ticket-storage.md`, `contracts/ticket-ui.md` y `quickstart.md`. Durante la implementación se actualizan `specs/001-crm-module/data-model.md` (campos, evento e migración), `specs/001-crm-module/contracts/entity-storage.md` (operaciones y respaldo), `specs/001-crm-module/spec.md` (referencia y ampliación de FR-025/FR-026), `specs/001-crm-module/tasks.md` (fase de tickets), `specs/001-crm-module/quickstart.md` (recorrido) y `README.md` (alcance, evidencias y uso de IA).

**Rationale**: la especificación declara que el modelo de `001` es la fuente de verdad; dejar los artefactos de la feature sin reconciliar produciría dos descripciones del mismo ticket. La actualización se hace en la misma tarea que el cambio correspondiente, no al final.

**Alternativas consideradas**:
- Duplicar el modelo completo en `004` y no tocar `001`: dos fuentes de verdad divergentes.
- Actualizar solo `README.md`: deja contratos y modelo desactualizados.

## Resumen de decisiones que condicionan tareas

| Decisión | Impacto en tareas |
|---|---|
| R-02, R-13, R-14 | Migración, respaldo, bloqueo de escritura e integridad por versión son una fase propia antes de las historias. |
| R-03, R-04, R-05, R-06 | Reglas puras y pruebas unitarias preceden a la persistencia y a la interfaz. |
| R-09, R-10, R-16, R-19 | La vista, el detalle, la tabla y los diálogos se implementan sobre primitivas existentes; no se crean rutas ni formularios paralelos. |
| R-11, R-12 | Indicadores y CSAT se prueban con fixtures de control antes de conectarlos al panel y a la ficha. |
| R-15, R-18 | El presupuesto de rendimiento y la verificación de folio se prueban antes de cerrar la bandeja. |
| R-17, R-20 | Las pruebas heredadas y la documentación de `001` se actualizan en la misma tarea que el cambio de ciclo o de contrato. |

## Riesgos residuales

- La validación manual en navegadores reales (contraste, responsive, rendimiento y recorrido con teclado) sigue pendiente hasta ejecutar `quickstart.md`; no se declarará como aprobada sin evidencia.
- La concurrencia entre pestañas no es transaccional; la relectura reduce pero no elimina la ventana de carrera. Se documenta como límite de la demo.
- La migración depende de que `createdAt` sea válido en los tickets v3. Si un registro histórico lo tiene corrupto, la migración se detiene y se informa; no se repara ni se inventa.
- El folio se agota a los 9999 tickets por año; el alta se rechaza con un mensaje claro y se documenta como límite de la demo.
