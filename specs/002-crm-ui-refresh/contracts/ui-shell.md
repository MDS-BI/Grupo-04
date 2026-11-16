# Contrato de interfaz: shell, overlays, tablas y panel

**Feature**: `002-crm-ui-refresh` · **Fecha**: 2026-11-16 · **Ámbito**: contrato de DOM, ARIA y estados que consumen `app.js` y las pruebas automatizadas. No describe estilos, ni el esquema de datos, ni reglas de negocio.

## Objetivo

Fijar los identificadores, atributos y comportamientos que la interfaz expone a `src/app.js`, a las pruebas y a `001-crm-module`, para que el rediseño no rompa el contrato de forma silenciosa. Un cambio en este documento exige actualizar las pruebas en la misma tarea.

## Reglas generales

- Los ids listados aquí son contrato público de la feature; no se renombran sin migración de pruebas.
- Todo control interactivo es alcanzable con teclado y tiene foco visible.
- Todo texto ingresado se renderiza como texto; nunca como HTML.
- Ningún elemento nuevo persiste datos ni modifica `localStorage`.
- Los textos visibles respetan la terminología CRM de `FR-030` de `001`.

## 1. Cabecera y navegación

| Elemento | Selector / id | Contrato |
|---|---|---|
| Cabecera | `header.topbar` | Contiene marca, búsqueda global y acción principal; no se oculta al navegar |
| Búsqueda global | `#global-search-input` | `type="search"`, `aria-label` con el término de búsqueda y la terminología CRM; al evento `input` navega a `#/search` y filtra |
| Acción principal | `#topbar-primary-action` | Abre el drawer de “Nuevo cliente”; texto desde `ModuleConfig` |
| Barra lateral | `aside.sidebar` | Contiene solo Panel y los dos grupos de dominio |
| Grupo de navegación | `button.nav-section[data-module]` | `aria-expanded` refleja si el submenú está abierto; `aria-controls` apunta al submenú |
| Submenú | `ul.nav-submenu[id]` | Visible solo cuando el grupo está expandido |
| Entrada de submenú | `button.nav-subitem[data-module][data-mode]` | `data-mode` es `list` o `new` |
| Vista activa | `.nav-section[aria-current="page"]` o `.nav-subitem[aria-current="page"]` | Exactamente un elemento activo a la vez |
| Entrada “Buscar” | — | **No existe** en la barra lateral |

### Comportamiento

1. Escribir en `#global-search-input` muestra `#view-search` y ejecuta `refreshSearch()` con el criterio actual.
2. “Listado” muestra la vista del módulo con su tabla.
3. “Nuevo” abre el drawer del módulo con el formulario vacío y el foco en el primer campo.
4. Expandir un grupo no cambia de vista; solo altera `aria-expanded`.
5. Navegar con cambios sin guardar pide confirmación antes de continuar.

## 2. Drawer y modal

| Aspecto | Contrato |
|---|---|
| Contenedor | `#overlay-root` único en `index.html` |
| Rol | `div[role="dialog"][aria-modal="true"]` con `aria-labelledby` al título visible |
| Variantes | `data-variant="drawer"` (costado derecho, 480 px) o `data-variant="modal"` (centrado) |
| Título | `#overlay-title`; es el destino de `aria-labelledby` |
| Veló | `[data-overlay-backdrop]`; cubre el contenido de fondo |
| Cierre | `[data-close-overlay]`, tecla `Escape` y clic en el veló |
| Foco inicial | Primer campo editable; si no hay campos, el título con `tabindex="-1"` |
| Trampa de foco | `Tab` y `Shift+Tab` ciclan dentro del overlay y nunca alcanzan el fondo |
| Devolución de foco | Al cerrar, el foco vuelve a `returnFocus` |
| Pila | El alta al vuelo se apila sobre el drawer de oportunidad; solo el superior responde |
| Cambios sin guardar | Si `dirty`, cerrar pide confirmación; cancelar mantiene el overlay abierto y los datos |
| Responsive | Bajo 640 px el drawer ocupa el 100 % del viewport |
| Bloqueo de fondo | El contenido de fondo no es enfocable mientras hay un overlay; no se usa `inert` por compatibilidad con jsdom |

### API de `ui-overlay.js`

```text
openOverlay({ id, variant, title, content, returnFocus, onClose, isDirty })
closeOverlay(id, { force })
getTopOverlay()
hasDirtyOverlay()
```

`content` es un nodo del DOM ya construido; el controlador no interpreta HTML.

## 3. Tabla de datos

| Aspecto | Contrato |
|---|---|
| Estructura | `<table class="data-table">` con `<caption class="sr-only">`, `<thead>` y `<tbody>` |
| Caption | Describe la tabla y el filtro activo; nunca vacío |
| Encabezado | `<th scope="col">` con `<button data-sort="key">` cuando la columna es ordenable |
| Estado de orden | `aria-sort="ascending" \| "descending" \| "none"` en el `<th>` activo |
| Fila | `<tr data-key="...">` con clave estable |
| Acciones | `button[data-action]` con `aria-label` que incluye el nombre del registro |
| Monograma | `.avatar` con iniciales de `monogramFor(name)` y `aria-hidden="true"` |
| Valores ausentes | “sin información” y al final del orden en ambos sentidos |
| Vacío | No se renderiza `<tbody>`; se muestra `.empty-state` con CTA |
| Orden por defecto | Clientes por `name` ascendente; oportunidades por `folio` ascendente |
| Volumen | 500 y 1000 filas sin virtualización; el orden debe mantenerse bajo 500 ms |

### API de `data-table.js`

```text
renderDataTable({ caption, columns, rows, sortKey, sortDirection, onSort })
```

`columns` declara `key`, `label`, `sortable`, `render(row)` y `className`. El componente no conoce el dominio.

## 4. Filtros

| Aspecto | Contrato |
|---|---|
| Barra | `#search-filters` colapsable; `#toggle-filters` con `aria-expanded` y `aria-controls` |
| Selectores | `#search-filter-category`, `#search-filter-owner`, `#search-filter-source` conservan su contrato de `001` |
| Chips | `button.chip[data-filter][data-value]` con `aria-pressed` |
| Sincronización | Chip → selector al pulsar; selector → chip al cambiar; un solo valor activo por filtro |
| Contador | `#active-filter-count` con `aria-live="polite"`; muestra 0 a 3 |
| Limpiar | `#clear-filters` desactiva chips y selectores; **no** borra `#global-search-input` |
| Combinación | Los filtros se combinan con AND, según `FR-012` de `001` |

## 5. Panel

| Aspecto | Contrato |
|---|---|
| Estado vacío | `#dashboard-empty-state` visible solo si `entities` y `documents` están vacíos; envuelve el `#dashboard-empty-hint` existente, que conserva su id y su texto |
| Ilustración | SVG en línea dentro del estado vacío; decorativa con `aria-hidden="true"`; si transmite información, lleva `<title>` |
| CTA del vacío | `#dashboard-empty-cta` abre el drawer de nuevo cliente |
| Banda de KPIs | `#crm-stat-grid` (id heredado de `001`) con `class="stat-grid kpi-band"`; visible solo cuando hay datos; seis tarjetas con valor y etiqueta |
| Comportamiento del vacío | Con almacenamiento vacío, `#crm-stat-grid` y `#commercial-board` quedan `hidden`; los seis valores se siguen calculando y escribiendo en el DOM |
| Indicadores | Los seis de `FR-024`, sin cambios de fórmula |
| Distribución | `#commercial-board` → `#commercial-columns`: un `.commercial-column` por estado del ciclo de vida con la etiqueta, el conteo y el monto; incluye los estados en cero |
| Tarjeta de oportunidad | `button.commercial-card[data-opportunity-id]` con título, cliente, monto y cierre; al pulsarla navega a oportunidades y abre la edición existente |
| Estados sin datos | Conteo y monto en `0`; la tasa de cierre muestra “Sin datos”, nunca `NaN` |
| Visibilidad | El embudo se oculta si el perfil no es CRM o si no hay clientes ni oportunidades |
| Actualización | Todo se recalcula en cada `renderDashboard()`; no hay totales persistidos |
| Accesos directos | Abren la vista correspondiente con drawer vacío cuando corresponde |

## 6. Jerarquía visual

| Aspecto | Contrato |
|---|---|
| Etiquetas | `font-weight: 500`; el obligatorio se marca con `<span class="req" aria-hidden="true">*</span>` y `aria-required` en el control |
| Texto secundario | `#64748B`, contraste ≥ 4.5:1 sobre el fondo de la tarjeta |
| Tarjetas | `border-radius: 16px`, borde de 1 px y sombra suave; cabecera con icono en contenedor de color tenue |
| CTA primaria | Fondo `#0F766E`, texto blanco; máximo una por bloque |
| Acción secundaria | Fondo blanco, borde de 1 px y texto oscuro |
| Acción destructiva | Variante `danger`; nunca sólida junto a la CTA primaria |
| Iconos | SVG en línea con `aria-hidden="true"` cuando son decorativos |
| Números | Montos en CLP con separador local; conteos sin decimales |

## 7. Pruebas que dependen de este contrato

| Archivo | Depende de |
|---|---|
| `tests/integration/workspace-shell.test.js` | `#global-search-input`, `.nav-section`, `.nav-subitem` |
| `tests/integration/search-entities.test.js` | `#global-search-input`, `#search-results-list` |
| `tests/integration/search-clients.test.js` | `#global-search-input`, tablas de resultados |
| `tests/integration/tickets.test.js` | `#global-search-input`, drawer de ticket |
| `tests/integration/accessibility.test.js` | foco, `role="dialog"`, etiquetas |
| `tests/integration/critical-journey.test.js` | navegación completa |
| `tests/unit/security-render.test.js` | renderizado de resultados |
| `tests/performance/search-performance.test.js` | `#global-search-input` y tiempo de búsqueda |
| `tests/integration/commercial-board.test.js` | `#commercial-board`, `#commercial-columns`, `.commercial-card[data-opportunity-id]` |
| `tests/integration/dashboard.test.js` | `#crm-stat-grid`, `#dashboard-empty-hint`, `#commercial-board` |

## 8. Criterios de aceptación del contrato

- Ningún id o atributo listado puede desaparecer sin actualizar sus pruebas en la misma tarea.
- Toda apertura de overlay devuelve el foco al disparador al cerrarse.
- Toda tabla expone `aria-sort` en la columna activa y un `<caption>` accesible.
- Chips y selectores nunca quedan desincronizados.
- El estado vacío del panel solo aparece cuando ambas colecciones están vacías, y en ese caso oculta la banda y el embudo.
- El embudo se oculta cuando el perfil no es CRM o no hay clientes ni oportunidades.
- Navegar, ordenar, filtrar y consultar el panel no modifican `localStorage`.
