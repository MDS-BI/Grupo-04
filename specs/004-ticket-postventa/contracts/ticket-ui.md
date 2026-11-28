# Contrato de interfaz: bandeja y detalle de tickets

**Feature**: `004-ticket-postventa` | **Especificación**: [spec.md](../spec.md) | **Modelo**: [data-model.md](../data-model.md) | **Almacenamiento**: [ticket-storage.md](ticket-storage.md) | **Validación**: [quickstart.md](../quickstart.md)

## Propósito

Este contrato fija la vista, la ruta, los identificadores del DOM, las columnas, el orden, las acciones, los estados vacíos y el comportamiento accesible de la bandeja global y del detalle de un ticket. Es la fuente de verdad para las pruebas de integración y para la implementación; cambiarlo exige actualizar las pruebas en la misma tarea.

La interfaz **reutiliza** el drawer de `ui-overlay`, la tabla de `data-table`, los badges y estados vacíos de `ui.js`, el formulario `ticket-form.js` y el sistema visual de `styles.css`. No se crea un router, una ruta de detalle ni un formulario paralelo.

## Vista y navegación

| Elemento | Contrato |
|---|---|
| Vista | `VIEW_IDS.tickets = 'view-tickets'`; se agrega a `availableViews()`. |
| Ruta | `#/tickets`; un hash desconocido cae en `fallbackView()` (`dashboard`). |
| Navegación | Botón `#nav-tickets`, clase `nav-module`, `data-module="tickets"`, etiqueta `#nav-tickets-label` con el texto “Tickets” e icono decorativo. |
| Estado activo | `setActiveNav({ view: 'tickets' })` marca `#nav-tickets` con `aria-current="page"` y la clase activa; `clearActiveNavigation()` lo limpia. |
| Título | `#tickets-heading` con el texto “Tickets”; la sección usa `aria-labelledby="tickets-heading"`. |
| Entrada desde la ficha del cliente | La lista embebida de tickets se conserva; cada fila permite abrir el detalle global. No se elimina la vista actual. |

La navegación por hash usa el mecanismo existente (`updateHash`, `readViewFromHash`). No se agregan parámetros de filtro a la URL.

## Estructura de la vista

```text
#view-tickets.view[aria-labelledby="tickets-heading"]
  h1#tickets-heading                    "Tickets"
  #ticket-inbox-message[role="status"][aria-live="polite"]
  .toolbar
    button#new-ticket-inbox             "Nuevo ticket"
    label + select#ticket-filter-status
    label + select#ticket-filter-priority
    label + select#ticket-filter-assignee
    button#ticket-clear-filters         "Limpiar filtros"
    label + select#ticket-sort
  #ticket-filter-announcer[sr-only][aria-live="polite"]
  #tickets-table                        tabla o estado vacío
```

### Controles

| Control | Opciones | Valor inicial | Comportamiento |
|---|---|---|---|
| `#new-ticket-inbox` | — | — | Abre el drawer de alta existente, vacío, con el cliente como primer dato obligatorio y sin abandonar la vista. |
| `#ticket-filter-status` | `Todos`, `Nuevo`, `En proceso`, `En espera`, `Resuelto`, `Cerrado` | `Todos` | Filtra por estado. |
| `#ticket-filter-priority` | `Todos`, `Alta`, `Media`, `Baja` | `Todos` | Filtra por prioridad. |
| `#ticket-filter-assignee` | `Todos` + catálogo `assignee` | `Todos` | Filtra por técnico. |
| `#ticket-clear-filters` | — | — | Restaura `Todos` en los tres filtros, vuelve al orden `priority-sla` y anuncia el cambio. |
| `#ticket-sort` | `priority-sla`, `sla`, `recent` | `priority-sla` | Cambia el orden sin recargar. |

Los filtros se combinan con **AND**. “Todos” deja de restringir ese campo. El estado vive en variables de módulo de `app.js`; no se persiste ni se escribe en la URL. Al cambiar un filtro o el orden se vuelve a renderizar la tabla y se anuncia el resultado en `#ticket-filter-announcer`.

### Orden

| Valor | Etiqueta | Comparador |
|---|---|---|
| `priority-sla` | “Prioridad y SLA” (predeterminado) | `Alta` → `Media` → `Baja`; dentro de cada prioridad, `slaDueAt` ascendente; empate por `createdAt` ascendente; empate final por `folio` ascendente. |
| `sla` | “Vencimiento SLA” | `slaDueAt` ascendente; empate por `createdAt` y `folio`. |
| `recent` | “Más reciente” | `createdAt` descendente; empate por `folio` ascendente. |

El orden es estable y no muta el arreglo almacenado. `slaDueAt` se calcula con `computeSlaDueAt(createdAt, priority)` en el render; no se lee el valor materializado como verdad.

## Tabla de la bandeja

La tabla se construye con `renderDataTable` y las columnas se definen en `ticket-list.js` en modo global. Cada fila:

- lleva `data-ticket-id="<id>"`, `tabindex="0"` y una etiqueta accesible que incluye folio y asunto;
- se activa con `Enter` o `Espacio` y abre el detalle;
- no contiene acciones destructivas; las acciones viven en el detalle;
- muestra los valores ausentes con un texto explícito, nunca con una celda vacía ambigua.

| Columna | Contenido | Valor ausente |
|---|---|---|
| Folio | `TKT-AAAA-####` en texto monoespaciado/tabular. | No aplica (obligatorio). |
| Asunto | Texto recortado, con la descripción como detalle secundario accesible. | No aplica (obligatorio). |
| Cliente | Nombre del cliente. | “Cliente no disponible” si la referencia es inválida. |
| Solicitante | `requesterName` o el nombre del contacto. | “Solicitante no registrado”. |
| Canal | `channel`. | “Canal no registrado”. |
| Técnico | `assignee` o “Sin asignar”. | “Sin asignar”. |
| Prioridad | Badge `Alta`/`Media`/`Baja`. | No aplica (obligatorio). |
| Estado | Badge con uno de los cinco estados. | No aplica (obligatorio). |
| SLA | Semáforo con texto e icono: “En plazo”, “Por vencer”, “Vencido” o “Sin datos”. | “Sin datos”. |

**Semáforo**:

- `En plazo`: clase `sla-on-time`, icono de reloj/check, texto “En plazo”.
- `Por vencer`: clase `sla-due-soon`, icono de advertencia, texto “Por vencer”.
- `Vencido`: clase `sla-overdue`, icono de alerta, texto “Vencido”.
- `Sin datos`: texto “Sin datos”, sin color de alarma.

El color nunca es la única señal. Los badges de estado usan las clases existentes y una clase específica por estado (`status-new`, `status-in-progress`, `status-waiting`, `status-resolved`, `status-closed`) para que el contraste y la lectura no dependan solo del tono.

**Responsive**:

- ≥ 1024 px: todas las columnas.
- 640–1023 px: se priorizan folio, asunto, cliente, técnico, prioridad, estado y SLA; solicitante y canal pueden ocultarse visualmente sin perder el detalle.
- < 640 px: se priorizan folio, asunto, estado y SLA; la fila conserva el acceso al detalle. No se exige scroll horizontal para operar la fila.

## Estados vacíos

| Situación | Título | Mensaje / acción |
|---|---|---|
| No hay tickets en el sistema | “No hay tickets registrados” | Invita a crear el primer ticket con `#new-ticket-inbox` o un CTA equivalente. |
| Hay tickets pero los filtros no arrojan coincidencias | “No hay tickets que coincidan con los filtros” | Ofrece “Limpiar filtros”. |
| Detalle sin historial | “Sin cambios registrados” | — |
| Ticket sin satisfacción | “Sin satisfacción registrada” | — |
| Indicador sin denominador | “Sin datos” | — |

El estado vacío se renderiza dentro de `#tickets-table` mediante `renderEmptyState` y distingue `no-records` de `no-matches`; no se muestra “crear” cuando el problema es un filtro ni “limpiar” cuando no hay registros.

## Detalle del ticket

El detalle es un drawer de solo lectura construido con `openOverlay({ variant: 'drawer' })`. Se abre desde una fila de la bandeja o desde la lista embebida del cliente. El título es `Ticket <folio>` y el contenido incluye:

| Sección | IDs / contenido |
|---|---|
| Identificación | `#ticket-detail-folio`, `#ticket-detail-subject`, `#ticket-detail-status`, `#ticket-detail-priority`, `#ticket-detail-sla`. |
| Cliente y solicitante | `#ticket-detail-client`, `#ticket-detail-requester`, `#ticket-detail-channel`. |
| Responsable | `#ticket-detail-assignee`, `#ticket-detail-team` (“Sin asignar” cuando falta). |
| Equipo y origen | `#ticket-detail-product`, `#ticket-detail-equipment`, `#ticket-detail-warranty`, `#ticket-detail-document`. |
| Caso | `#ticket-detail-description`, `#ticket-detail-first-response`. |
| Resolución | `#ticket-detail-resolution`, `#ticket-detail-resolved-at`, `#ticket-detail-closed-at`. |
| Satisfacción | `#ticket-detail-satisfaction` (nota, comentario y fecha tomada del evento `satisfaccion` más reciente; “Sin satisfacción registrada”). |
| Historial | `#ticket-detail-history` con `role="list"`; cada evento muestra tipo, fecha, actor y detalle; orden descendente. |

### Acciones por estado

| Acción | ID | `Nuevo` | `En proceso` | `En espera` | `Resuelto` | `Cerrado` |
|---|---|---|---|---|---|---|
| Editar | `#ticket-detail-edit` | Sí | Sí | Sí | Sí (campos permitidos) | No |
| Asignar | `#ticket-detail-assign` | Sí | Sí | Sí | No | No |
| Cambiar estado | `#ticket-detail-change-status` | Sí (`En proceso`) | Sí (`En espera`, `Resuelto`) | Sí (`En proceso`, `Resuelto`) | Sí (`Cerrado`) | No |
| Resolver | `#ticket-detail-resolve` | No | Sí | Sí | No | No |
| Cerrar | `#ticket-detail-close` | No | No | No | Sí | No |
| Eliminar | `#ticket-detail-delete` | Sí | Sí | Sí | Sí | Sí |
| Registrar satisfacción | `#ticket-detail-satisfaction-action` | No | No | No | Sí (si no existe) | No |

“Editar” abre el drawer existente con `startTicketEdit`; no hay un segundo formulario. “Asignar”, “Cambiar estado”, “Resolver”, “Cerrar” y la satisfacción usan diálogos de `ui-overlay`; “Eliminar” usa la confirmación accesible. Todas las acciones respetan las reglas de `ticket-storage.md` y muestran el error sin cerrar el diálogo cuando la validación falla.

`#ticket-detail-status` es únicamente el texto de estado (no interactivo); la acción “Cambiar estado” usa `#ticket-detail-change-status` y nunca comparte `id` con el texto de estado.

### Diálogos

| Diálogo | Campos / contenido | Confirmación |
|---|---|---|
| Asignar | `#assign-ticket-assignee` (catálogo + “Sin asignar”), `#assign-ticket-team` (catálogo + “Sin asignar”). | “Asignar” |
| Cambiar estado | `#ticket-status-target` con solo los estados permitidos por `nextTicketStatuses(status)`; `#ticket-status-note` visible y opcional cuando el destino es `En espera`. | “Cambiar estado” |
| Resolver | `#ticket-resolution-summary` obligatorio; `#ticket-resolution-score` (1–5, opcional); `#ticket-resolution-comment` (opcional, 500). | “Resolver ticket” |
| Cerrar | Mensaje con folio y asunto; aclara que el cierre es terminal y que el ticket quedará de solo lectura. | “Cerrar ticket” |
| Satisfacción | `#ticket-satisfaction-score` (1–5), `#ticket-satisfaction-comment` (opcional, 500). | “Guardar satisfacción” |
| Eliminar | Mensaje con folio y asunto; aclara que el cliente no se elimina y que la acción es definitiva. | “Eliminar ticket” |

Todos los diálogos usan `openOverlay` con `role="dialog"`, `aria-modal="true"`, título asociado, foco inicial en el primer campo o en el título, trampa de foco, `Escape` para cancelar y devolución del foco al control de origen.

## Formulario de alta y edición

Se reutiliza `#ticket-form` en el drawer existente. Los campos nuevos son:

| Campo | ID | Regla |
|---|---|---|
| Asunto | `#ticket-subject` | Obligatorio, 1–120, recortado. |
| Contacto | `#ticket-contact` | Solo contactos del cliente seleccionado + “Sin contacto”. |
| Solicitante (nombre) | `#ticket-requester-name` | Opcional; se copia del contacto o se ingresa. |
| Solicitante (correo) | `#ticket-requester-email` | Opcional; formato válido si existe. |
| Solicitante (teléfono) | `#ticket-requester-phone` | Opcional; texto no vacío si existe. |
| Canal | `#ticket-channel` | Obligatorio en alta; catálogo `channel`. |
| Técnico | `#ticket-assignee` | Opcional; catálogo `assignee`. |
| Equipo | `#ticket-team` | Opcional; catálogo `team`. |
| Garantía | `#ticket-warranty` | Fecha `YYYY-MM-DD` opcional. |
| Vínculo de origen | `#ticket-document` | Oportunidad del mismo cliente o “Sin vínculo”. |
| Folio | `#ticket-folio` | Solo lectura; visible en edición; no se envía. |

Los errores usan `#error-ticket-<campo>` con `aria-live="polite"` y `aria-invalid` en el control. El folio se muestra como texto de solo lectura; no se ofrece como campo editable. Al cambiar de cliente se recargan contactos y documentos y se limpian las selecciones incompatibles. Cancelar la edición conserva el ticket y no escribe.

## Accesibilidad

- La tabla usa `aria-sort` en los encabezados ordenables y `role="region"` con etiqueta y foco en el contenedor desplazable.
- Las filas son enfocables y se activan con `Enter`/`Espacio`; el foco visible es obligatorio.
- El detalle y los diálogos usan la pila de `ui-overlay`: solo el superior recibe foco, `Escape` cierra y el foco vuelve al control de origen.
- Los mensajes de éxito y error usan `role="status"` o `role="alert"` con `aria-live`; los cambios de filtros se anuncian.
- Las etiquetas están asociadas a sus controles; los campos obligatorios usan `aria-required="true"`.
- El semáforo incluye texto e icono; los badges de estado no dependen solo del color.
- Objetivo WCAG 2.1 AA y contraste ≥ 4.5:1 para texto normal y ≥ 3:1 para elementos de interfaz.
- El recorrido completo debe ser posible solo con teclado (SC-026).

## Mensajes

| Situación | Mensaje esperado |
|---|---|
| Ticket creado desde la bandeja | “Ticket registrado correctamente.”; la bandeja se actualiza según filtros y orden. |
| Ticket actualizado | “Ticket actualizado correctamente.” |
| Cambio de estado | “Estado del ticket actualizado.” |
| Resolución | “Ticket resuelto correctamente.” |
| Cierre | “Ticket cerrado correctamente.” |
| Satisfacción | “Satisfacción registrada.” |
| Eliminación | “Ticket eliminado.” |
| Filtros limpiados | “Filtros limpiados. Se muestran todos los tickets.” |
| Error de validación | Mensaje específico del campo, sin cerrar el diálogo y conservando lo escrito. |
| Error de almacenamiento | Mensaje recuperable; no se muestra éxito y se conserva la versión anterior. |
| Folio agotado | Mensaje que indica el límite anual de 9999. |
| Migración pendiente | Aviso que pide completar la migración antes de guardar. |

Los textos se renderizan con `textContent` o nodos de texto; no se interpreta HTML ni se ejecutan scripts.

## Fuera del contrato

- No hay una ruta `#/tickets/:id` ni enlaces profundos al detalle.
- No se persisten filtros, orden ni borradores.
- No hay edición inline en la fila, acciones masivas, exportación, adjuntos ni notificaciones.
- No hay filtros por fecha, texto libre, canal o equipo en esta iteración.
- No se modifican las vistas de clientes, oportunidades, búsqueda, actividades, papelera ni el detalle existente salvo el enlace al detalle global y el promedio CSAT del cliente.
