# Contrato de almacenamiento de entidades

**Feature**: `001-crm-module` · **Modelo**: [data-model.md](../data-model.md) · **Especificación**: [spec.md](../spec.md)

## Propósito

La aplicación almacena los registros de entidad, documento y ticket localmente en el navegador usando `localStorage`. Este contrato conserva la forma base del template ERP y agrega el **perfil CRM** que el módulo exige en la capa de dominio. El contrato base sigue siendo válido para otros módulos; la obligatoriedad CRM no se impone a nivel genérico de almacenamiento, sino en `crm-rules.js` antes de escribir.

## Claves de almacenamiento

| Clave | Contenido | Estado |
|---|---|---|
| `erp_base_module:entities` | Lista de clientes (`Entity`) | Base, documentada en el README |
| `erp_base_module:documents` | Lista de oportunidades (`Document`) | Base, documentada en el README |
| `erp_base_module:tickets` | Lista de tickets | Propuesta, P2 |
| `erp_base_module:crmContacts` | Lista de contactos por cliente | Propuesta, iteración 4 |
| `erp_base_module:crmActivities` | Lista de actividades y tareas | Propuesta, iteración 4 |
| `erp_base_module:crmTrash` | Elementos de papelera (máximo 50, FIFO) | Propuesta, iteración 4 |
| `erp_base_module:crmRecovery` | Marcador y versión recuperable previa a escrituras | Propuesta, iteración 4 |
| `erp_base_module:schemaVersion` | Versión del esquema | Propuesta |

`SCHEMA_VERSION = 2` cubre la instantánea de cinco colecciones (clientes, oportunidades, tickets, contactos y actividades) con papelera y recuperación; `SCHEMA_VERSION = 3` se aplica al incorporar los campos de resolución de tickets de US-11. Ninguna migración puede ejecutarse sin explicación, confirmación del usuario y versión recuperable.

## Forma de los datos base

Cada registro de entidad debe incluir:

- `id`: cadena única
- `entity_id`: cadena única, generada automáticamente, usada para vincular documentos y tickets
- `name`: cadena no vacía
- `code`: cadena no vacía
- `taxId`: cadena opcional (identificación fiscal)
- `email`: cadena opcional con formato de correo válido cuando está presente
- `phone`: cadena opcional
- `address`: cadena opcional
- `category`: cadena opcional a nivel base
- `description`: cadena opcional
- `targetDate`: cadena de fecha opcional (`YYYY-MM-DD`) válida cuando está presente
- `creditLimit`: número opcional no negativo
- `paymentTerms`: cadena opcional
- `createdAt`: cadena de marca de tiempo ISO
- `updatedAt`: cadena de marca de tiempo ISO

Cada registro de documento debe incluir:

- `id`: cadena única
- `entity_id`: el `entity_id` autogenerado de la entidad vinculada
- `contactId`: contacto opcional del mismo cliente; si se informa, debe existir en `erp_base_module:crmContacts` y pertenecer a esa entidad
- `series`: cadena opcional que agrupa folios consecutivos
- `folio`: entero positivo obligatorio; junto con la serie forma el número oficial del documento
- `startDate`: cadena de fecha de calendario válida
- `endDate`: cadena de fecha de calendario válida, igual o posterior a `startDate`
- `quantity`: entero positivo opcional
- `subtotal`: número no negativo opcional
- `discount`: número no negativo opcional; no puede superar el subtotal
- `taxAmount`: número no negativo opcional
- `totalAmount`: número no negativo opcional a nivel base
- `currency`: cadena opcional
- `paymentTerms`: cadena opcional
- `notes`: cadena opcional
- `status`: cadena opcional a nivel base
- `createdAt`: cadena de marca de tiempo ISO
- `updatedAt`: cadena de marca de tiempo ISO

## Perfil CRM: obligatoriedad en dominio

El almacenamiento genérico acepta los campos como opcionales para no romper el módulo ERP base. El módulo CRM exige lo siguiente **antes de persistir**:

### Cliente

| Campo | Obligatorio CRM | Regla adicional |
|---|---|---|
| `name` | Sí | No vacío tras `trim` |
| `code` | Sí | Único tras `trim` y mayúsculas |
| `category` | Sí | Prospecto, Activo o Inactivo |
| `accountOwner` | Sí | Ejecutivo A o Ejecutivo B |
| `acquisitionSource` | Sí | Sitio web, Referido, Contacto directo u Otro |
| `email` | No | Formato básico si existe |
| `phone` | No | Recortado |
| `contactName` | No | Recortado |
| `targetDate` | No | Fecha real `YYYY-MM-DD` |
| `id`, `entity_id`, `createdAt`, `updatedAt` | Generados | No se ingresan manualmente |

### Oportunidad

| Campo | Obligatorio CRM | Regla adicional |
|---|---|---|
| `entity_id` | Sí | Debe existir en `entities` |
| `series` | Automático | Fijo `OPP` al crear |
| `folio` | Sí | Entero > 0; único junto con `series` |
| `opportunityTitle` | Sí | No vacío tras `trim` |
| `startDate` | Sí | Fecha real `YYYY-MM-DD` |
| `endDate` | Sí | Fecha real ≥ `startDate` |
| `totalAmount` | Sí | Entero finito ≥ 0, CLP |
| `currency` | Automático | Fijo `CLP` |
| `status` | Automático | `Nueva` al crear |
| `opportunityOwner` | Sí | Catálogo |
| `lossReason` | Condicional | Obligatorio solo al pasar a `Perdida` |
| `notes` | No | Texto seguro |

### Ticket (P2, ampliado en el esquema v4)

> La ampliación vigente se documenta en [004-ticket-postventa/contracts/ticket-storage.md](../../004-ticket-postventa/contracts/ticket-storage.md). Un ticket v4 incluye además folio, asunto, solicitante, canal, técnico, equipo, garantía, vínculo de origen, SLA derivado e historial embebido, y comienza en `Nuevo`.

| Campo | Obligatorio | Regla |
|---|---|---|
| `entity_id` | Sí | Cliente existente |
| `folio` | Automático | `TKT-AAAA-####`, único global e inmutable; lo asigna el almacenamiento |
| `subject` | Sí | 1–120 caracteres tras recorte; separado de la descripción |
| `productName` | Sí en demo | No vacío si no hay `productId` |
| `productId` | No | Si se informa, cadena no vacía; no se valida contra catálogo externo (el módulo Producto está fuera del alcance) |
| `reason` | Sí | soporte, reclamo o consulta |
| `description` | Sí | No vacío |
| `priority` | Sí | Alta, Media o Baja; congelada desde `Resuelto` |
| `status` | Automático | `Nuevo` al crear; ciclo `Nuevo → En proceso → En espera → En proceso → Resuelto → Cerrado` |
| `channel` | Sí en altas nuevas | Catálogo `channel`; tolerado ausente en datos migrados |
| `assignee`, `team` | No | Catálogos `assignee` y `team` o nulos; reasignación solo en tickets abiertos |
| `contactId` | No | Contacto del mismo cliente; se conserva si el contacto se elimina |
| `requesterName`, `requesterEmail`, `requesterPhone` | No | Respaldo del solicitante; correo válido si existe |
| `warrantyEndsAt` | No | Fecha real `YYYY-MM-DD` |
| `documentId` | No | Oportunidad del mismo cliente; se conserva si se elimina |
| `slaDueAt` | Derivado | 24/72/168 h desde `createdAt`; se recalcula y no se acepta del usuario |
| `firstResponseAt`, `closedAt` | Automático | Generados por el sistema; no editables |
| `satisfactionScore` | No | Entero 1–5, una sola vez, al resolver o mientras está `Resuelto` |
| `satisfactionComment` | No | Hasta 500 caracteres recortados |
| `history` | Automático | Historial append-only con al menos un evento por ticket v4 |
| `resolutionSummary` | Sí al resolver | No vacío ni solo espacios; obligatorio en la transición a `Resuelto` |
| `resolvedAt` | Automático | ISO 8601 generado al resolver; se conserva en ediciones posteriores |
| `legacyResolutionIncomplete` | Automático | Solo lo asigna la migración; no editable por el usuario |

### Contacto

| Campo | Obligatorio | Regla |
|---|---|---|
| `entity_id` | Sí | Cliente existente |
| `name` | Sí | No vacío, recortado |
| `role` | No | Recortado |
| `email` | No | Formato válido si existe; no es clave única |
| `phone` | No | Recortado |
| `isPrimary` | Automático con regla | Como máximo uno por `entity_id`; exactamente uno cuando el cliente tenga al menos un contacto |

### Actividad

| Campo | Obligatorio | Regla |
|---|---|---|
| `entity_id` | Sí | Cliente existente |
| `type` | Sí | llamada, correo, reunion, nota o tarea |
| `subject` | Sí | No vacío |
| `notes` | No | Texto seguro |
| `dueDate` | Condicional | Obligatorio solo en `tarea`; fecha real `YYYY-MM-DD` |
| `owner` | Sí | Catálogo de `ModuleConfig` |
| `contactId` | No | Contacto existente del mismo cliente o nulo |
| `documentId` | No | Oportunidad existente del mismo cliente o nulo |
| `status` | Automático | `pendiente` al crear; `completada` es final con `completedAt` |

## Operaciones

- `saveSnapshot(snapshot)`: helper interno que valida y persiste entidades, documentos, tickets, contactos, actividades y papelera como una sola instantánea; no forma parte de la API pública.

### Entidades

- `loadEntities()`: devuelve todas las entidades almacenadas.
- `saveEntities(entities)`: persiste la lista completa.
- `addEntity(entity)`: añade una nueva entidad.
- `updateEntity(id, updates)`: actualiza una entidad existente.
- `deleteEntity(id)`: elimina una entidad por `id`.
- `deleteDocumentsForEntity(entityId)`: elimina todos los documentos vinculados a una entidad eliminada.
- `deleteTicketsForEntity(entityId)`: elimina todos los tickets vinculados (P2).

### Documentos

- `loadDocuments()`: devuelve todos los documentos almacenados.
- `saveDocuments(documents)`: persiste la lista completa.
- `addDocument(document)`: añade un nuevo documento.
- `updateDocument(id, updates)`: actualiza un documento existente.
- `deleteDocument(id)`: elimina un documento por `id`.

### Tickets (P2)

- `loadTickets()`: devuelve todos los tickets.
- `saveTickets(tickets)`: persiste la lista completa por compatibilidad; no aplica reglas de folio, transición ni historial.
- `addTicket(payload, options?)`: añade un ticket en `Nuevo`, asigna folio determinista y agrega el evento `creacion`.
- `updateTicket(id, updates, options?)`: actualiza campos permitidos, valida transiciones, congela la prioridad desde `Resuelto`, aplica solo lectura a `Cerrado` y agrega los eventos de historial en la misma instantánea.
- `assignTicket(id, { assignee, team }, options?)`: reasigna técnico o equipo de un ticket abierto con eventos `asignacion` y `equipo`.
- `changeTicketStatus(id, to, options?)`: aplica la máquina de estados compartida; delega resolución y cierre.
- `resolveTicket(id, summary, { satisfactionScore?, satisfactionComment? })`: resuelve con resumen obligatorio y CSAT opcional en una sola escritura.
- `closeTicket(id, options?)`: cierra un ticket `Resuelto` y escribe `closedAt`; `Cerrado` es terminal.
- `registerSatisfaction(id, score, comment, options?)`: registra la satisfacción una sola vez mientras el ticket está `Resuelto`.
- `deleteTicket(id)`: elimina solo el ticket y su historial embebido; no toca al cliente ni usa la papelera.
- `requestMigration`, `applyMigration`, `cancelMigration`, `loadMigrationBackup` y `restoreMigrationBackup`: protocolo explícito `v3 → v4` con respaldo `erp_base_module:crmBackup:v3` y restauración verificada.

### Contactos

- `loadContacts()`: devuelve todos los contactos.
- `saveContacts(contacts)`: persiste la lista completa.
- `addContact(contact)`: añade un contacto validando `entity_id` y la unicidad del principal.
- `updateContact(id, updates)`: actualiza un contacto y reajusta el principal en la misma operación.
- `deleteContact(id)`: elimina un contacto; si tiene actividades u oportunidades asociadas exige elegir un contacto de destino del mismo cliente y reasigna esas referencias en la misma escritura; sin destino disponible bloquea la eliminación.
- `deleteContactsForEntity(entityId)`: elimina los contactos de un cliente dentro de la instantánea de cascada.

### Actividades

- `loadActivities()`: devuelve todas las actividades.
- `saveActivities(activities)`: persiste la lista completa.
- `addActivity(activity)`: añade una actividad validando tipo, vencimiento y vínculos.
- `updateActivity(id, updates)`: actualiza una actividad; completar registra `completedAt` y la vuelve final.
- `deleteActivity(id)`: elimina una actividad sin afectar al cliente.
- `deleteActivitiesForEntity(entityId)`: elimina las actividades dentro de la instantánea de cascada.

### Papelera

- `loadTrash()`: devuelve los elementos recuperables ordenados por `deletedAt`.
- `moveEntityToTrash(entityId)`: mueve el agregado completo (cliente, oportunidades, tickets, contactos y actividades) en una sola escritura y aplica el límite FIFO de 50.
- `restoreFromTrash(trashId)`: restaura el agregado detectando conflictos de identificadores antes de escribir.
- `purgeTrashEntry(trashId)`: elimina definitivamente un elemento con confirmación explícita.

### Recuperación y escritura atómica

- `prepareSnapshot(snapshot)`: serializa y guarda una versión completa recuperable en `erp_base_module:crmRecovery` antes de sustituir datos; si no hay espacio, la operación se rechaza sin reemplazar la versión vigente.
- `commitSnapshot()`: confirma la escritura y limpia el marcador solo después de verificar que la versión completa quedó persistida.
- `restorePreviousSnapshot()`: restaura la versión recuperable cuando la escritura no se confirma.
- `detectPendingRecovery()`: comprobación al iniciar que detecta una operación interrumpida antes de habilitar escrituras.
- `canWrite()` / `isWriteBlocked()`: impide nuevas escrituras mientras no se verifique una versión íntegra.

## Invariantes de cascada y papelera

- Eliminar un cliente mueve el agregado completo a la papelera en una sola instantánea; nunca deja oportunidades, tickets, contactos ni actividades huérfanos.
- Restaurar devuelve el agregado completo o, si hay conflicto de identificadores, se detiene e informa sin escribir.
- Purgar es definitivo y exige confirmación; la papelera conserva como máximo 50 elementos y descarta el más antiguo por `deletedAt`.
- La papelera no sustituye un respaldo externo: borrar el almacenamiento del navegador elimina también su contenido.
- Ninguna migración puede ejecutarse sin explicación, confirmación del usuario y versión recuperable.

## Expectativas de validación

- Un `name` o `code` faltante debe rechazarse antes de la persistencia.
- Un `code` duplicado tras normalización debe rechazarse y conservar el registro existente.
- Un `email` presente debe tener formato válido; un `creditLimit` presente debe ser un número no negativo.
- Un documento sin `folio` entero positivo debe rechazarse; un `discount` mayor que el `subtotal` debe rechazarse.
- Un `entity_id` debe generarse automáticamente y ser único.
- Un documento o ticket sin un `entity_id` que coincida con una entidad existente debe rechazarse.
- Una oportunidad con `series/folio` duplicado debe rechazarse.
- Una oportunidad con `status` distinto de `Nueva` al crear debe rechazarse.
- Una transición no declarada debe rechazarse en la capa de dominio y en el almacenamiento.
- Entrar en `Perdida` sin `lossReason` debe rechazarse.
- Eliminar una entidad debe mover a la papelera el agregado completo del cliente (entidad, documentos, tickets, contactos y actividades) como una sola operación atómica; restaurar o purgar exige confirmación.
- Un contacto repetido como principal en el mismo cliente debe rechazarse; al marcar un nuevo principal, el anterior deja de serlo en la misma operación.
- Una tarea sin `dueDate` debe rechazarse; una actividad con `contactId` o `documentId` inexistente debe rechazarse.
- Resolver un ticket sin `resolutionSummary` no vacío debe rechazarse; `resolvedAt` lo genera el sistema y no se acepta como entrada manual.
- Un elemento de papelera que supere el límite de 50 debe descartar el más antiguo por `deletedAt` y advertir que la papelera es local.
- Las operaciones de almacenamiento deben preservar el orden actual de la lista y actualizar las marcas de tiempo.
- Ante cuota agotada o JSON corrupto, conservar los datos previos y devolver un error; no reiniciar el almacenamiento.
- El esquema debe versionarse y no migrar en silencio.

## Expectativas de extensibilidad

- Los campos adicionales añadidos por módulos personalizados deben persistirse junto a los campos base sin manejo especial en la capa de almacenamiento.
- Las operaciones base anteriores permanecen estables para que los módulos personalizados puedan construir sobre ellas sin modificación.
- `entity_id` es el contrato de vinculación con otros módulos; no se reemplaza por `code` ni por RUT.
- La separación entre almacenamiento e interfaz permite sustituir `localStorage` por una API posteriormente.
