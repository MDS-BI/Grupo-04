# Contrato de almacenamiento: tickets de post-venta (esquema v4)

**Feature**: `004-ticket-postventa` | **Modelo**: [data-model.md](../data-model.md) | **Especificación**: [spec.md](../spec.md) | **Contrato base**: [001-crm-module/contracts/entity-storage.md](../../001-crm-module/contracts/entity-storage.md) | **Interfaz**: [ticket-ui.md](ticket-ui.md)

## Propósito

Este contrato define las operaciones de dominio que la interfaz y las pruebas pueden usar para crear, consultar, actualizar, resolver, cerrar, asignar y eliminar tickets, además del protocolo de migración `v3 → v4`. No describe la implementación interna; describe el comportamiento observable, las validaciones, la atomicidad y los errores.

El contrato base de `001` sigue vigente para clientes, oportunidades, contactos, actividades, papelera y recuperación. Las operaciones de ticket descritas aquí lo amplían y **no** reemplazan `loadTickets`, `addTicket`, `updateTicket`, `resolveTicket`, `deleteTicketsForEntity` ni la cascada de papelera.

## Versión y claves

- `SCHEMA_VERSION = 4`.
- Se conservan las claves: `erp_base_module:entities`, `erp_base_module:documents`, `erp_base_module:tickets`, `erp_base_module:crmContacts`, `erp_base_module:crmActivities`, `erp_base_module:crmTrash`, `erp_base_module:crmRecovery` y `erp_base_module:schemaVersion`.
- Se agrega `erp_base_module:crmBackup:v3` para el respaldo previo a la migración.
- La clave de respaldo se registra en `storage-recovery.js` para que el mecanismo existente no la trate como ajena.
- La versión 4 se escribe solo después de verificar una instantánea completa. Las escrituras se bloquean mientras la versión almacenada sea menor que 4.

## Forma del ticket

La forma completa está en [data-model.md](../data-model.md#entidad-ticket-ampliada). Para este contrato, un ticket válido v4 incluye al menos:

```text
{
  id, folio, entity_id, contactId, requesterName, requesterEmail, requesterPhone,
  subject, description, productId, productName, equipmentReference,
  warrantyEndsAt, documentId, reason, channel, priority, status,
  assignee, team, slaDueAt, firstResponseAt, resolutionSummary,
  resolvedAt, closedAt, satisfactionScore, satisfactionComment,
  history, legacyResolutionIncomplete, createdAt, updatedAt
}
```

Campos inmutables después de crear: `id`, `folio`, `entity_id`, `createdAt`, `firstResponseAt`, `resolvedAt`, `closedAt` y los eventos ya escritos de `history`. `slaDueAt` es derivado y no se acepta como entrada.

## Operaciones

Todas las operaciones de escritura:

1. leen la instantánea vigente;
2. validan la entrada y el estado anterior;
3. construyen el ticket siguiente y agregan el historial en memoria;
4. llaman una sola vez a la escritura atómica de la instantánea;
5. devuelven el ticket resultante o lanzan un `Error` sin modificar nada.

Las firmas admiten un objeto `options` opcional con `{ now, actor }` para pruebas deterministas. En la aplicación, `now` es la fecha y hora del sistema y `actor` se omite (se deriva del técnico asignado o de `"Sistema"`).

### Lectura

```text
loadTickets(): Ticket[]
```

- Devuelve todos los tickets en el orden almacenado.
- No valida reglas de escritura.
- Con datos v3, devuelve los tickets tal como están para que la interfaz muestre el aviso de migración.
- No modifica `localStorage`.

### Alta

```text
addTicket(payload, options?): Ticket
```

- Genera `id` si no existe y `folio` con `nextTicketFolio(tickets, createdAt)`.
- Fuerza `status = 'Nuevo'` para tickets nuevos del esquema 4.
- Genera `createdAt` y `updatedAt`.
- Valida cliente, producto, motivo, prioridad, asunto, descripción, canal, contacto, técnico, equipo, garantía y documento según [data-model.md](../data-model.md#validaciones).
- Agrega el evento `creacion` con el folio asignado.
- Relee la instantánea justo antes de escribir y verifica que el folio siga libre. Si la base cambió de forma incompatible, rechaza con un mensaje de recarga.
- Si el correlativo anual supera 9999, rechaza el alta.
- No acepta `folio`, `status`, `firstResponseAt`, `resolvedAt`, `closedAt`, `history` ni `slaDueAt` como valores confiables del formulario; los deriva o ignora según corresponda.

**Errores de validación**: se lanzan como `Error` con el primer mensaje de `validateTicket`. La interfaz los presenta campo por campo. No se escribe nada.

### Actualización

```text
updateTicket(id, updates, options?): Ticket
```

- Conserva `id`, `folio`, `entity_id`, `createdAt`, `firstResponseAt`, `resolvedAt`, `closedAt` y `history` previo.
- Rechaza cualquier cambio de `folio`, `id`, `entity_id` o `createdAt`.
- Rechaza cualquier cambio sobre un ticket `Cerrado`.
- En `Resuelto`, permite editar `subject`, `description`, `contactId`, `requesterName`, `requesterEmail`, `requesterPhone`, `channel`, `team`, `warrantyEndsAt` y `documentId`; rechaza cambios de `priority`, `resolutionSummary`, `resolvedAt`, `closedAt`, `assignee` y `satisfactionScore` (la satisfacción se registra con `registerSatisfaction`).
- En estados abiertos, permite editar los campos descriptivos y `priority`; cada cambio de prioridad recalcula `slaDueAt` desde `createdAt` y agrega un evento `prioridad`.
- Si `updates.status` cambia, valida con `canTransitionTicket(previous.status, nextStatus)` y aplica las reglas de `changeTicketStatus` (incluido `firstResponseAt`, `resolvedAt` y `closedAt`).
- Si el ticket deja `Nuevo` por primera vez y `firstResponseAt` está vacío, lo genera con `now`.
- Si `contactId` no cambia y el contacto ya no existe, conserva el valor y el respaldo; si `contactId` cambia a un valor inválido, rechaza.
- Si `channel` está ausente en un ticket migrado y no se envía, conserva `null`; si se envía, debe ser del catálogo.
- Recalcula `slaDueAt` cuando cambia `priority`; nunca lo toma de `updates`.
- Agrega eventos `estado`, `prioridad`, `asignacion`, `equipo`, `resolucion` o `cierre` según los cambios efectivos.
- No agrega eventos por cambios de asunto, descripción, solicitante, canal, garantía o vínculo de origen.
- Valida el ticket completo antes de escribir.

**Errores**: ticket inexistente, transición no permitida, prioridad congelada, ticket cerrado, referencia inválida, asunto/descripción inválidos o folio alterado. Ninguno escribe.

### Reasignación

```text
assignTicket(id, { assignee?, team? }, options?): Ticket
```

- Solo para tickets abiertos (`Nuevo`, `En proceso`, `En espera`).
- Valida `assignee` y `team` contra sus catálogos o `null`.
- Agrega un evento `asignacion` por cada cambio de técnico y un evento `equipo` por cada cambio de equipo, con `from` y `to`.
- Escribe el cambio y el historial en una sola instantánea.
- Si no hay cambios efectivos, devuelve el ticket sin escribir ni agregar eventos.
- Rechaza `Resuelto` y `Cerrado`; en `Resuelto` el equipo se puede editar con `updateTicket` (CA-28-09), pero el técnico no se reasigna.

### Cambio de estado

```text
changeTicketStatus(id, to, { note?, resolutionSummary?, actor?, now? }): Ticket
```

- Valida `canTransitionTicket(previous.status, to)`.
- `to = 'En espera'`: acepta `note` opcional; la guarda en el evento `estado`; el SLA sigue corriendo.
- `to = 'En proceso'`: reanuda desde `En espera`; no exige nota.
- `to = 'Resuelto'`: exige `resolutionSummary` no vacío y aplica las mismas reglas que `resolveTicket`.
- `to = 'Cerrado'`: aplica las mismas reglas que `closeTicket`.
- `to = 'Nuevo'`: no es una transición válida desde ningún estado.
- Genera `firstResponseAt` si es la primera salida de `Nuevo`.
- Agrega el evento `estado` con `from`, `to` y `note` cuando corresponde.

### Resolución

```text
resolveTicket(id, summary, { satisfactionScore?, satisfactionComment?, actor?, now? }): Ticket
```

- Solo desde `En proceso` o `En espera`.
- Exige `summary` no vacío tras `trim`; lo guarda en `resolutionSummary`.
- Genera `resolvedAt = now` y `status = 'Resuelto'` en la misma escritura.
- Si se informa satisfacción, la valida con `validateSatisfaction` y la guarda en la misma operación; agrega un evento `satisfaccion` separado.
- Agrega el evento `resolucion`.
- No permite resolver un ticket ya `Resuelto` ni `Cerrado`.
- Mantiene `slaDueAt` calculado desde `createdAt` y `priority`; no lo reinicia.

### Cierre

```text
closeTicket(id, { actor?, now? }): Ticket
```

- Solo desde `Resuelto`.
- Genera `closedAt = now` y `status = 'Cerrado'`.
- Agrega el evento `cierre` con la fecha y el estado anterior.
- No exige motivo adicional.
- No permite cerrar un ticket ya `Cerrado` ni uno que no esté `Resuelto`.

### Satisfacción

```text
registerSatisfaction(id, score, comment, { actor?, now? }): Ticket
```

- Solo mientras el ticket está `Resuelto`.
- Valida `score` como entero de 1 a 5 y `comment` como texto recortado de hasta 500 caracteres.
- Si el ticket ya tiene `satisfactionScore`, rechaza la operación para no reescribir la medición; la interfaz no ofrece la acción.
- Guarda `satisfactionScore` y `satisfactionComment`; no modifica `status`, `resolvedAt` ni `closedAt`.
- Agrega un evento `satisfaccion`.
- Rechaza tickets `Nuevo`, `En proceso`, `En espera` y `Cerrado`.

### Eliminación individual

```text
deleteTicket(id): { deleted: true, ticket: Ticket }
```

- Elimina solo el ticket identificado y, con él, su historial embebido.
- No elimina al cliente, sus oportunidades, contactos, actividades ni otros tickets.
- No usa la papelera de clientes.
- La confirmación con folio y asunto es responsabilidad de la interfaz ([ticket-ui.md](ticket-ui.md)).
- Si el ticket no existe, lanza un error sin escribir.

### Operaciones heredadas

- `deleteTicketsForEntity(entityId)`: se conserva para la cascada de eliminación de un cliente. Elimina todos los tickets del cliente dentro de la instantánea de papelera; no es una eliminación individual.
- `saveTickets(tickets)`: se conserva por compatibilidad y pruebas de almacenamiento, pero **no** es la vía de mutación de la interfaz. No aplica reglas de folio, transición ni historial.
- `resolveTicket(id, summary)`: la firma existente sigue funcionando; los parámetros adicionales son opcionales.

## Historial

- `appendTicketHistory(ticket, event, now)` es pura y agrega al final.
- El `id` del evento es `${ticket.id}:${history.length + 1}`; es único dentro del ticket.
- `at` lo genera el sistema; no se acepta del usuario.
- `actor` se toma del parámetro explícito, del `assignee` vigente o de `"Sistema"`.
- El historial se agrega antes de la escritura y forma parte de la misma instantánea.
- No se edita ni se elimina un evento.
- La lectura para la interfaz ordena de más reciente a más antiguo, desempatando por orden de inserción.

## Validaciones y errores

| Condición | Resultado | Efecto |
|---|---|---|
| Ticket inexistente en `updateTicket`, `assignTicket`, `changeTicketStatus`, `resolveTicket`, `closeTicket`, `registerSatisfaction` o `deleteTicket` | `Error` “Ticket no encontrado” | Sin escritura |
| `folio` enviado distinto al almacenado | `Error` de folio inmutable | Sin escritura |
| `entity_id` distinto al almacenado | `Error` de cliente inmutable | Sin escritura |
| Transición no declarada | `Error` de transición no permitida | Sin escritura |
| `Resuelto` intenta volver a `Nuevo`, `En proceso` o `En espera` | `Error` que explica la prohibición de reapertura | Sin escritura |
| Cambio de prioridad en `Resuelto` o `Cerrado` | `Error` de prioridad congelada | Sin escritura |
| Cualquier cambio en `Cerrado` | `Error` de ticket cerrado | Sin escritura |
| Resolución sin resumen | `Error` de resumen obligatorio | Sin escritura |
| Cierre desde un estado distinto de `Resuelto` | `Error` de transición | Sin escritura |
| Satisfacción fuera de 1–5, decimal o no numérica | `Error` “nota entera de 1 a 5” | Sin escritura |
| Comentario de satisfacción > 500 | `Error` con el máximo | Sin escritura |
| Satisfacción ya registrada | `Error` que indica que ya existe una nota | Sin escritura |
| `contactId` nuevo inexistente o de otro cliente | `Error` de contacto | Sin escritura |
| `channel` nuevo fuera del catálogo | `Error` de canal | Sin escritura |
| `assignee` o `team` nuevos fuera del catálogo | `Error` de catálogo | Sin escritura |
| `documentId` nuevo inexistente o de otro cliente | `Error` de documento | Sin escritura |
| `warrantyEndsAt` con formato inválido | `Error` de fecha | Sin escritura |
| `subject` vacío o > 120 | `Error` de asunto | Sin escritura |
| `description` vacía | `Error` de descripción | Sin escritura |
| Folio duplicado o correlativo agotado | `Error` de folio | Sin escritura |
| Cuota agotada o JSON corrupto | `Error` recuperable | Se conserva la versión anterior |
| Escritura con migración pendiente | `Error` que pide completar la migración | Sin escritura |

Los mensajes exactos pueden variar en redacción, pero deben ser claros, en español y contener la causa. Las pruebas deben afirmar el comportamiento (no escribir, conservar datos, rechazar) y pueden usar expresiones regulares sobre fragmentos estables.

## Atomicidad

- `saveSnapshot` valida las seis colecciones, prepara una versión recuperable, escribe todas las claves y confirma. Si una escritura falla, restaura los valores anteriores y lanza un error.
- Una operación de ticket llama a `saveSnapshot` **una sola vez** con el ticket y su historial ya construidos.
- Un fallo de validación ocurre antes de `saveSnapshot`; no hay cambios parciales.
- Un fallo de cuota o de serialización restaura la instantánea anterior; la interfaz no muestra éxito.
- La versión 4 no se escribe hasta que la migración verifica la instantánea completa. Para eso, la migración usa un escritor interno que separa la escritura de colecciones del marcador de versión; el `saveSnapshot` normal sigue confirmando colecciones y versión juntas.

## Migración y respaldo

```text
requestMigration(from, to = SCHEMA_VERSION): MigrationPlan
applyMigration(): MigrationResult
cancelMigration(): { applied: false, keptVersion, plan }
loadMigrationBackup(): Backup | null
restoreMigrationBackup(): { restored: true, schemaVersion: <1|2|3>, ticketCount }
```

### `requestMigration`

- No escribe.
- Devuelve `{ from, to, steps, requiresConfirmation, backup }`.
- Para `from = 1`, incluye los pasos vigentes de `1 → 2`, `2 → 3` y `3 → 4`.
- Para `from = 2`, incluye los pasos vigentes de `2 → 3` y los de `3 → 4`.
- Para `from = 3`, describe la ampliación de tickets, el respaldo y la ausencia de datos inventados.
- Si `from >= to`, devuelve un plan vacío sin confirmación.

### `applyMigration`

1. Lee la instantánea completa y la versión.
2. Construye los tickets v4 en memoria:
   - ordena por `createdAt` ascendente y desempata por `id`;
   - asigna folio por año local con el correlativo anual;
   - copia `subject` de la descripción recortada a 120;
   - deja vacíos los campos opcionales ausentes;
   - calcula `slaDueAt` si `createdAt` y `priority` son válidos;
   - conserva `status`, `resolutionSummary`, `resolvedAt` y `legacyResolutionIncomplete`;
   - agrega `migracion` con la fecha real;
   - no crea `firstResponseAt`.
3. Escribe el respaldo `erp_base_module:crmBackup:v3` con `{ createdAt, schemaVersion: <versión de origen>, collections, ticketCount }`; si no hay cuota, aborta sin tocar las colecciones. La clave conserva el nombre `crmBackup:v3` por contrato, pero el metadato registra la versión real de origen (1, 2 o 3). Si ya existe un respaldo, solo se reemplaza después de la confirmación explícita de la nueva migración; cancelar nunca lo borra.
4. Escribe las colecciones transformadas y verifica folio único, asunto e historial; verifica que clientes, oportunidades, contactos, actividades y papelera no hayan cambiado.
5. Escribe `schemaVersion: 4`.
6. Si algo falla, restaura desde el respaldo y conserva `schemaVersion: 3`.

- Un `createdAt` ausente o inválido aborta la migración antes de escribir, con un mensaje que identifica el ticket. No se inventa una fecha.
- Un ticket histórico `Resuelto` sin resumen o sin `resolvedAt` verificable se marca `legacyResolutionIncomplete = true`, como ya ocurre en la migración vigente.
- La migración no modifica clientes, oportunidades, contactos, actividades ni papelera.

### `loadMigrationBackup`

- Devuelve el respaldo parseado o `null` si no existe.
- No escribe.
- Si el respaldo está corrupto, lanza un error recuperable.

### `restoreMigrationBackup`

- Exige una llamada explícita; la interfaz pide confirmación.
- Valida la forma del respaldo y que su `schemaVersion` esté entre 1 y 3.
- Restaura las seis colecciones y escribe el `schemaVersion` del respaldo (3 si el respaldo era v3).
- No borra el respaldo.
- Si falla, conserva la instantánea actual y lanza un error.

### `cancelMigration`

- Descarta el plan pendiente y no escribe.
- Devuelve `{ applied: false, keptVersion, plan }`.

## Compatibilidad

- `loadTickets`, `addTicket`, `updateTicket` y `resolveTicket` conservan sus nombres. `addTicket` cambia el estado inicial a `Nuevo` y agrega folio, asunto, canal e historial; es un cambio intencional de la iteración.
- `deleteTicketsForEntity` se conserva para la cascada de clientes.
- `SCHEMA_VERSION` pasa de 3 a 4; cualquier consumidor que comparara con 3 debe actualizarse.
- Las claves existentes no cambian de nombre.
- Los datos v3 se pueden leer, pero no escribir hasta migrar.
- Las operaciones nuevas no son obligatorias para clientes, oportunidades, contactos, actividades ni papelera.

## Ejemplo de uso

```js
const ticket = addTicket({
  entityId: cliente.entity_id,
  subject: 'Equipo no enciende',
  description: 'El equipo dejó de responder después del corte.',
  productName: 'Compresor 50 HP',
  reason: 'soporte',
  priority: 'Alta',
  channel: 'Teléfono',
  contactId: contacto.id,
  requesterName: contacto.name,
  requesterEmail: contacto.email,
  requesterPhone: contacto.phone,
  assignee: 'Técnico A',
  team: 'Soporte técnico'
});

const atendido = changeTicketStatus(ticket.id, 'En proceso');
const resuelto = resolveTicket(atendido.id, 'Se reemplazó el fusible de control.', {
  satisfactionScore: 5,
  satisfactionComment: 'Atención rápida.'
});
const cerrado = closeTicket(resuelto.id);
const eliminado = deleteTicket(cerrado.id);
```

En la interfaz, la eliminación y el cierre se confirman antes de llamar a estas operaciones. El almacenamiento no abre diálogos.
