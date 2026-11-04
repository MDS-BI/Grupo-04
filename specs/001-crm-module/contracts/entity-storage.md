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
| `erp_base_module:schemaVersion` | Versión del esquema | Propuesta |

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

### Ticket (P2)

| Campo | Obligatorio | Regla |
|---|---|---|
| `entity_id` | Sí | Cliente existente |
| `productName` | Sí en demo | No vacío si no hay `productId` |
| `productId` | No | Si se informa, cadena no vacía; no se valida contra catálogo externo (el módulo Producto está fuera del alcance) |
| `reason` | Sí | soporte, reclamo o consulta |
| `description` | Sí | No vacío |
| `priority` | Sí | Alta, Media o Baja |
| `status` | Automático | `En proceso` al crear |

## Operaciones

- `saveSnapshot(snapshot)`: helper interno que valida y persiste entidades y documentos (y tickets en P2) como una sola instantánea; no forma parte de la API pública.

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
- `saveTickets(tickets)`: persiste la lista completa.
- `addTicket(ticket)`: añade un ticket.
- `updateTicket(id, updates)`: actualiza un ticket existente.

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
- Eliminar una entidad debe eliminar todos los documentos vinculados a su `entity_id` como una sola operación atómica. En P2, cuando exista la colección de tickets, la misma operación debe incluir los tickets.
- Las operaciones de almacenamiento deben preservar el orden actual de la lista y actualizar las marcas de tiempo.
- Ante cuota agotada o JSON corrupto, conservar los datos previos y devolver un error; no reiniciar el almacenamiento.
- El esquema debe versionarse y no migrar en silencio.

## Expectativas de extensibilidad

- Los campos adicionales añadidos por módulos personalizados deben persistirse junto a los campos base sin manejo especial en la capa de almacenamiento.
- Las operaciones base anteriores permanecen estables para que los módulos personalizados puedan construir sobre ellas sin modificación.
- `entity_id` es el contrato de vinculación con otros módulos; no se reemplaza por `code` ni por RUT.
- La separación entre almacenamiento e interfaz permite sustituir `localStorage` por una API posteriormente.
