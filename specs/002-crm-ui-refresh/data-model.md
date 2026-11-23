# Modelo de datos: rediseño de interfaz del CRM

**Feature**: `002-crm-ui-refresh` · **Fecha**: 2026-11-16 · **Modelo de dominio**: [`../001-crm-module/data-model.md`](../001-crm-module/data-model.md) · **Contrato de almacenamiento**: [`../001-crm-module/contracts/entity-storage.md`](../001-crm-module/contracts/entity-storage.md)

## Decisión central

Esta iteración **no modifica el modelo de datos**. No agrega entidades, campos, catálogos, estados, claves de `localStorage` ni versiones de esquema, y no requiere migración. Todo lo nuevo son **vistas derivadas** que se calculan en el render y se descartan al recargar.

| Elemento | Estado |
|---|---|
| Cliente (`Entity`) | Sin cambios, según `001` |
| Oportunidad (`Document`) | Sin cambios, según `001` |
| Ticket | Sin cambios, según `001` |
| `ModuleConfig` (etiquetas, catálogos, ciclo de vida) | Sin cambios; ahora alimenta también los submenús |
| Claves `erp_base_module:*` | Sin cambios |
| `schemaVersion` | Sin cambios; no hay migración |
| Operaciones de `storage.js` | Sin cambios |

## Entidades heredadas

Se heredan sin modificación:

- **Cliente (`Entity`)**: `id`, `entity_id`, `name`, `code`, `category`, `accountOwner`, `acquisitionSource`, `email`, `phone`, `contactName`, `description`, `targetDate`, `createdAt`, `updatedAt`.
- **Oportunidad (`Document`)**: `id`, `entity_id`, `opportunityTitle`, `folio`, `series`, `startDate`, `endDate`, `totalAmount`, `currency`, `opportunityOwner`, `notes`, `status`, `lossReason`, `createdAt`, `updatedAt`.
- **Ticket**: `id`, `entity_id`, `productId`, `productName`, `reason`, `description`, `priority`, `status`, `createdAt`, `updatedAt`.

Los campos, obligatoriedad, validaciones y transiciones están definidos en `001` y **no se repiten aquí** para evitar dos fuentes de verdad.

## Vistas derivadas

| Vista | Origen | Campos | Regla | ¿Se persiste? |
|---|---|---|---|---|
| `ClientRow` | `Entity` | `entity_id`, `name`, `code`, `category`, `accountOwner`, `acquisitionSource`, `targetDate` | Estado de `targetDate` con `getTargetDateStatus` de `001` | No |
| `OpportunityRow` | `Document` | `id`, `entity_id`, `opportunityTitle`, `series`, `folio`, `status`, `totalAmount`, `opportunityOwner`, `startDate`, `endDate` | Cliente asociado resuelto por `entity_id` | No |
| `KpiBand` | `crm-metrics.js` | Los seis indicadores de `FR-024` | Fórmulas exactas de `001` | No |
| `StageBucket` | `Document` | `status`, `count`, `amount` | Un bucket por estado del ciclo de vida, renderizado en el embudo existente | No |
| `FilterChip` | `ModuleConfig` | `filterKey`, `value`, `label`, `active` | Activo si coincide con el `<select>` correspondiente | No |
| `TableRowAction` | UI | `entityId`, `entityType`, `label` | Única acción por fila: “Editar”; abre el drawer y nunca elimina | No |
| `TableEmptyState` | UI | `reason`, `ctaLabel`, `ctaAction` | `no-records` → “Nuevo cliente/oportunidad”; `no-matches` → “Limpiar filtros” | No |
| `OverlayEntry` | UI | `id`, `variant`, `returnFocus`, `dirty` | Pila en memoria para drawer y modal, incluida la confirmación de descarte | No |

### `ClientRow`

Es la fila de la tabla de clientes y de resultados de búsqueda.

```text
ClientRow
  entity_id   string   obligatorio, estable
  name        string
  code        string   normalizado para comparar, mostrado como se guardó
  category    string
  accountOwner string
  acquisitionSource string
  targetDateStatus 'Sin programar' | 'Vencido' | 'Para hoy' | 'Programado'
  monogram    string   2 iniciales, decorativo
```

`monogram` se calcula con `monogramFor()` y es `aria-hidden`; no reemplaza el nombre.

### `OpportunityRow`

```text
OpportunityRow
  id                  string
  entity_id           string
  clientName          string   resuelto desde Entity; 'Cliente desconocido' si no existe
  opportunityTitle    string
  series              'OPP'
  folio               entero > 0
  status              uno de los estados de ModuleConfig
  totalAmount         entero >= 0
  opportunityOwner    string
  startDate           'YYYY-MM-DD'
  endDate             'YYYY-MM-DD'
```

No se duplica el cliente dentro de la oportunidad; se resuelve en el render por `entity_id`.

### `StageBucket` y `stageDistribution()`

```text
stageDistribution(documents, statuses) -> StageBucket[]

StageBucket
  status  string   uno de los estados del ciclo de vida
  count   entero   oportunidades en ese estado
  amount  entero   suma de totalAmount de ese estado
```

Reglas:

- `stageDistribution()` vive en `src/crm-metrics.js` y se extrae del cálculo que hoy está inline en `src/components/commercial-board.js` (commit `5aa9799`); ese componente pasa a consumirla sin cambiar su marcado.
- Recibe `statuses` como segundo argumento para que `crm-metrics.js` siga sin depender de `ModuleConfig`; el llamador pasa `getConfig().statusLifecycle.statuses`, en ese orden.
- Se incluye un `StageBucket` por estado, aunque `count` y `amount` sean `0`.
- Los documentos con `status` desconocido no se agregan a ningún bucket y no se corrigen en silencio; se informa como dato inconsistente si el cargador lo permite.
- `totalAmount` se suma tal como está almacenado; no se convierten monedas ni se aplican impuestos.
- Es **descriptivo**: no calcula probabilidades, no pondera etapas y no es una tasa de conversión.
- Se recalcula en cada render del panel; nunca se escribe en `localStorage`.
- El consumidor único es `renderCommercialBoard()`. No existe un `#stage-distribution` separado: el embudo es la distribución.

### `FilterChip`

```text
FilterChip
  filterKey  'category' | 'accountOwner' | 'acquisitionSource'
  value      string del catálogo
  label      string visible
  active     booleano
```

El chip y el `<select>` comparten el mismo valor. Al activar un chip se escribe en el selector; al cambiar el selector se recalcula `active`. La fuente de verdad es el selector, por compatibilidad con `readSearchFilters()` de `001`. La barra solo se monta en `#view-search`; los listados “Listado” no tienen filtros propios.

### `TableRowAction`

```text
TableRowAction
  entityId    string   identificador estable del registro
  entityType  'client' | 'opportunity'
  type        'edit'   único valor admitido
  label       string   “Editar <nombre o folio>”
```

Reglas:

- Abre el drawer del registro con `openOverlay({ variant: 'drawer' })`.
- No existe acción `delete` por fila: el borrado se hace solo con `#delete-entity` / `#delete-document` en la barra compacta.
- La acción no modifica el registro ni `localStorage`; solo navegación de interfaz.

### `TableEmptyState`

```text
TableEmptyState
  reason    'no-records' | 'no-matches'
  ctaLabel  'Nuevo cliente' | 'Nueva oportunidad' | 'Limpiar filtros'
  ctaAction 'open-create' | 'clear-filters'
```

Reglas:

- `no-matches` cuando hay criterio en `#global-search-input` o algún filtro activo; la CTA limpia filtros y **no** borra el criterio.
- `no-records` cuando no hay criterio, ni filtros, ni registros del tipo; la CTA abre el drawer de alta.
- Con estado vacío no se renderiza `<tbody>`.
- Es una vista de render: no se persiste ni se calcula antes de conocer los resultados.

### `OverlayEntry`

Estado en memoria de la pila de overlays. Permite abrir el alta de cliente sobre el drawer de oportunidad y la confirmación de descarte sobre cualquiera de ellos sin perder el formulario de fondo.

```text
OverlayEntry
  id            'client-drawer' | 'opportunity-drawer' | 'ticket-drawer' | 'quick-client' | 'confirm-discard'
  variant       'drawer' | 'modal'
  returnFocus   HTMLElement que abrió el overlay
  dirty         booleano, para confirmar el descarte
```

Reglas:

- Solo el overlay superior recibe foco y responde a Esc.
- Al cerrar el superior, el foco vuelve a `returnFocus`.
- `confirm-discard` siempre usa `variant: 'modal'` y dos acciones: “Descartar” (`danger`) y “Seguir editando”.
- La pila no se persiste ni sobrevive a una recarga.

## Relaciones e integridad

Sin cambios respecto de `001`:

- Cliente 1 → N Oportunidades por `Document.entity_id`.
- Cliente 1 → N Tickets por `Ticket.entity_id`.
- `entity_id` es el contrato de vinculación y no cambia con el rediseño.
- No se crean referencias huérfanas: el alta al vuelo persiste el cliente **antes** de asignarlo al selector.
- No se duplican datos del cliente dentro de la oportunidad ni de la tabla.

## Persistencia y compatibilidad

- Claves sin cambios: `erp_base_module:entities`, `erp_base_module:documents`, `erp_base_module:tickets`, `erp_base_module:schemaVersion`.
- No hay migración ni reinterpretación de datos.
- Los datos guardados con la interfaz anterior deben seguir siendo legibles y editables con el drawer.
- El orden de tabla y los filtros no se persisten; una recarga vuelve al orden por defecto y a la barra de filtros sin chips activos.
- El criterio de `#global-search-input` y los filtros activos viven en memoria de la sesión de página; al vaciar el criterio se conservan los filtros y la vista de búsqueda permanece.
- Las acciones por fila y los estados vacíos son vistas de render: no se escriben en `localStorage`.

## Modelo entidad-relación

El MER oficial sigue siendo el de `001` (`data-model.md`, sección “Modelo entidad-relación”). Esta iteración no agrega entidades ni relaciones, por lo que no se duplica el diagrama. Las vistas derivadas no forman parte del MER porque no se almacenan.

## Trazabilidad

| Documento | Qué aporta |
|---|---|
| `spec.md` de `002` | Historias, FR-UX, NFR-UX, criterios y éxito |
| `../001-crm-module/data-model.md` | Entidades, campos, validaciones y fórmulas canónicas |
| `plan.md` de `002` | Arquitectura y estrategia técnica |
| `research.md` de `002` | Decisiones y alternativas |
| `contracts/ui-shell.md` de `002` | Contrato de DOM y ARIA |
| `quickstart.md` de `002` | Validación ejecutable de la iteración |
