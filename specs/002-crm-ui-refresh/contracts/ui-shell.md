# Contrato de interfaz: shell, overlays, tablas y panel

**Feature**: `002-crm-ui-refresh` · **Fecha**: 2026-11-16 · **Ámbito**: contrato de DOM, ARIA, estados y reglas de estilo (tokens, superficies y movimiento) que consumen `app.js` y las pruebas automatizadas. No describe el esquema de datos ni las reglas de negocio.

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
| Estilo de búsqueda | `#global-search-input` sobre `header.topbar` | Ancho máximo 480 px, alto 40 px, fondo claro sobre la cabecera oscura, icono de lupa decorativo a la izquierda, placeholder con contraste ≥ 4.5:1 y `:focus-visible` con anillo de 2 px ≥ 3:1 sobre el fondo real de la cabecera |
| Búsqueda sin criterio | `#global-search-input` vacío | La vista `#view-search` permanece visible y muestra la pista de búsqueda; no lista resultados, no navega y no borra filtros |
| Acción principal | `#topbar-primary-action` | Abre el drawer de “Nuevo cliente”; texto desde `ModuleConfig` |
| Barra lateral | `aside.sidebar` | Contiene solo Panel y los dos grupos de dominio |
| Grupo de navegación | `button.nav-section[data-module]` | `aria-expanded` refleja si el submenú está abierto; `aria-controls` apunta al submenú |
| Submenú | `ul.nav-submenu[id]` | Visible solo cuando el grupo está expandido |
| Entrada de submenú | `button.nav-subitem[data-module][data-mode]` | `data-mode` es `list` o `new` |
| Vista activa | `.nav-section[aria-current="page"]` o `.nav-subitem[aria-current="page"]` | Exactamente un elemento activo a la vez |
| Entrada “Buscar” | — | **No existe** en la barra lateral |
| Botón de navegación móvil | `#nav-toggle` | Visible solo bajo 900 px; `aria-expanded` refleja si el panel está abierto y `aria-controls` apunta a `aside.sidebar` |
| Navegación bajo 900 px | `aside.sidebar[data-open="true"]` | Se abre como panel desplegable superpuesto con los submenús “Listado” y “Nuevo” **completos y etiquetados**; no existe un rail de 60 px sin etiquetas |
| Cierre de navegación móvil | `Escape`, clic en el fondo o `#nav-toggle` | Cierra el panel y devuelve el foco a `#nav-toggle`; el contenido de fondo no recibe foco mientras está abierto |

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
| Pila | El alta al vuelo se apila sobre el drawer de oportunidad; la confirmación de descarte se apila sobre el overlay que la origina; solo el superior responde |
| Cambios sin guardar | Si `dirty`, cerrar o navegar abre `confirm-discard`; “Seguir editando” mantiene el overlay abierto y los datos; “Descartar” cierra sin persistir |
| Confirmación de descarte | `id="confirm-discard"`, `variant="modal"`, título “Descartar cambios”, botón `[data-confirm-discard]` con variante `danger` y botón `[data-cancel-discard]`; prohibido `window.confirm()` |
| Responsive | Bajo 640 px el drawer ocupa el 100 % del viewport |
| Bloqueo de fondo | El contenido de fondo no es enfocable mientras hay un overlay; no se usa `inert` por compatibilidad con jsdom |
| Ciclo de vida del contenido | Las tarjetas de formulario existen en el DOM al inicializar; se trasladan al overlay al abrir y se restauran a su contenedor al cerrar. No se clonan ni se recrean |

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
| Contenedor | `.table-wrap` con `overflow-x: auto`, `role="region"`, `aria-label` descriptivo y `tabindex="0"` para alcanzarlo con teclado |
| Encabezado fijo | `thead th` con `position: sticky; top: 0`, fondo opaco y `z-index` suficiente para cubrir las filas al desplazarse |
| Densidad | Filas de 44–48 px, `font-size: var(--text-sm)` (14 px) y estado `:hover` de fila; la tabla no cambia de alto al ordenar |
| Números | Montos y fechas alineados a la derecha con `font-variant-numeric: tabular-nums`; `th` de esa columna alineado igual |
| Texto largo | `max-width` + `white-space: nowrap` + `text-overflow: ellipsis`; el truncado es solo visual y el texto completo permanece en el DOM |
| Estados de fila | `tr:hover` con fondo tenue y `th[aria-sort]` de la columna activa resaltado con peso o borde, no solo con color. No se introduce selección de fila: el registro se elige con el selector de la barra compacta |
| Modo tarjetas | Bajo 640 px cada `<tr>` se presenta como tarjeta, con una etiqueta por celda tomada del `th` (`data-label`), sin desplazamiento horizontal forzado; `<caption>`, `aria-sort` y la acción “Editar” se conservan |
| Caption | Describe la tabla y el filtro activo; nunca vacío |
| Encabezado | `<th scope="col">` con `<button data-sort="key">` cuando la columna es ordenable |
| Estado de orden | `aria-sort="ascending" \| "descending" \| "none"` en el `<th>` activo |
| Fila | `<tr data-key="...">` con clave estable |
| Acciones | `button[data-action="edit"]` con `aria-label` “Editar <nombre o folio>”; abre el drawer del registro. No existe acción de borrado por fila |
| Barra de acciones heredada | `#edit-entity`, `#delete-entity`, `#edit-document`, `#delete-document` sobre la tabla, con ids, textos y comportamiento de `001`; el borrado solo ocurre aquí |
| Monograma | `.avatar` con iniciales de `monogramFor(name)` y `aria-hidden="true"` |
| Valores ausentes | “sin información” y al final del orden en ambos sentidos |
| Vacío | No se renderiza `<tbody>`; `.empty-state` con CTA “Limpiar filtros” si hay criterio o filtros activos (conserva el texto) o “Nuevo cliente”/“Nueva oportunidad” si no hay registros |
| Orden por defecto | Clientes por `name` ascendente; oportunidades por `folio` ascendente |
| Volumen | 500 y 1000 filas sin virtualización; el orden debe mantenerse bajo 500 ms |

### API de `data-table.js`

```text
renderDataTable({ caption, columns, rows, sortKey, sortDirection, onSort, emptyState })
```

`columns` declara `key`, `label`, `sortable`, `numeric`, `render(row)` y `className`. `emptyState` recibe `{ reason, ctaLabel, ctaAction }` y se delega en `ui.js`. El componente no conoce el dominio.

## 4. Filtros

| Aspecto | Contrato |
|---|---|
| Barra | `#search-filters` colapsable **solo dentro de `#view-search`**; `#toggle-filters` con `aria-expanded` y `aria-controls` |
| Alcance | Los listados “Listado” de Clientes y Oportunidades no montan la barra ni los chips; vuelven a la búsqueda con criterio y filtros conservados |
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
| Icono del vacío | `.empty-state__icon` de 48 px dentro de un contenedor circular de 72 px con `--accent-soft`; SVG en línea y `aria-hidden="true"`; el significado lo llevan el título y el texto, no el dibujo |
| CTA del vacío | `#dashboard-empty-cta` abre el drawer de nuevo cliente |
| Banda de indicadores | `#crm-stat-grid` (id heredado de `001`) con `class="stat-grid kpi-band"`; visible solo cuando hay datos; seis tarjetas con valor y etiqueta |
| Comportamiento del vacío | Con almacenamiento vacío, `#crm-stat-grid`, `#stage-distribution` y `#commercial-board` quedan `hidden`; los seis valores se siguen calculando y escribiendo en el DOM |
| Indicadores | Los seis de `FR-024`, sin cambios de fórmula |
| Distribución | `#stage-distribution`: una `.stage-row` por estado del ciclo de vida con etiqueta, conteo y monto como texto y una `.stage-bar` `aria-hidden` cuyo ancho es proporcional al conteo; incluye los estados en cero y nunca divide por cero |
| Proporción | El ancho de la barra se calcula sobre el total de oportunidades del render; si el total es `0`, todas las barras tienen ancho `0` y no aparece `NaN` |
| Tablero | `#commercial-board` → `#commercial-columns`: un `.commercial-column` por estado del ciclo de vida con etiqueta, conteo y monto, y una tarjeta por oportunidad; seis columnas en `.board-scroll` con desplazamiento horizontal, sin grilla de tres por fila |
| Contenedor del tablero | `.board-scroll` con `role="region"`, `aria-label` y `tabindex="0"` para recorrerlo con teclado en pantallas estrechas |
| Tarjeta de oportunidad | `button.commercial-card[data-opportunity-id]` con título, cliente, monto y cierre; al pulsarla navega a oportunidades y abre la edición existente |
| Estados sin datos | Conteo y monto en `0`; la tasa de cierre muestra “Sin datos”, nunca `NaN` |
| Visibilidad | La distribución se oculta con panel vacío o perfil no CRM; el tablero se oculta además cuando no hay ninguna oportunidad, aunque existan clientes |
| Fuente única | `#stage-distribution` y `#commercial-board` consumen la misma llamada a `stageDistribution()` en el mismo render; no hay dos cálculos que puedan divergir |
| Actualización | Todo se recalcula en cada `renderDashboard()`; no hay totales persistidos |
| Accesos directos | `#action-new-entity` (“Nuevo cliente”) y `#action-new-document` (“Nueva oportunidad”) abren el drawer vacío correspondiente sin persistir; `#action-open-entities` y `#action-find` conservan su navegación |

## 6. Sistema visual (jerarquía, superficies y movimiento)

### 6.1 Paleta

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#F7F8FA` | Fondo de página; superficie plana, sin borde ni sombra |
| `--surface` | `#FFFFFF` | Fondo de tarjetas, secciones y controles |
| `--border` | `#E4E7EC` | Borde de 1 px de secciones, tablas y campos |
| `--text` | `#0F172A` | Texto principal |
| `--text-muted` | `#52606F` | Texto secundario; ≥ 4.5:1 sobre `#F7F8FA`, `#FFFFFF`, `#E6EDE9` y `#123C36` |
| `--accent` | `#0F766E` | Acento verde: CTA primaria, estado activo y dato destacado |
| `--accent-soft` | `#E6F4F1` | Fondo tenue de chips de icono, estado activo de navegación y selección de fila |
| `--danger` | `#B42318` | Acción destructiva y errores |

Reglas: ningún hexadecimal de color vive fuera de `:root` (o del bloque `@media (prefers-color-scheme: dark)` si se entrega tema oscuro); el verde no se usa como fondo de página ni de sección.

### 6.2 Espacio y superficies

| Aspecto | Contrato |
|---|---|
| Escala de espacio | `--space-1` 4, `--space-2` 8, `--space-3` 12, `--space-4` 16, `--space-5` 24, `--space-6` 32, `--space-7` 48, `--space-8` 64 px; todo `padding`, `gap` y `margin` pertenece a la escala |
| Nivel 0 — página | Fondo `--bg`, sin borde, sin sombra |
| Nivel 1 — sección | `--surface` + borde de 1 px `--border` + radio; sin sombra |
| Nivel 2 — elevado | Solo `.drawer`, `.modal`, `.popover`: `--surface` + `--shadow-md` |
| Prohibición | Un mismo bloque no acumula borde, sombra, radio y franja de color; el indicador lateral de 3 px se reserva al estado activo de navegación |
| Radio | `--radius-md` 8 px en controles y `--radius-lg` 16 px en tarjetas y overlays |

### 6.3 Tipografía y controles

| Aspecto | Contrato |
|---|---|
| Etiquetas | `font-weight: 500`; el obligatorio se marca con `<span class="req" aria-hidden="true">*</span>` y `aria-required` en el control |
| Tipografía | Escala cerrada de cinco pasos (12/14/16/20/28 px), pesos 400 texto / 500 etiquetas y tablas / 600 títulos y CTA, `line-height` 1.5 en texto y 1.2 en títulos; ningún tamaño fuera de la escala salvo el `clamp()` del `h1` del panel |
| Contraste en cabecera | Sobre el fondo oscuro real de `header.topbar`: texto y placeholder ≥ 4.5:1 y anillo de foco ≥ 3:1 |
| Botones | Un solo vocabulario: `.btn` + `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`; dos tamaños (`--control-sm` 32 px, `--control-md` 40 px); estados `:hover`, `:active`, `:disabled`, `[data-loading]` y `:focus-visible` |
| Alias prohibido | `.primary` no existe; toda llamada se migra a `.btn-primary` en la misma tarea |
| Campos | Misma altura, radio, tipografía y anillo de foco que los botones del mismo tamaño |
| CTA primaria | `--accent` con texto blanco; máximo una por bloque |
| Acción secundaria | `--surface`, borde de 1 px y texto `--text` |
| Acción destructiva | `--danger`; nunca sólida junto a la CTA primaria |
| Iconos | SVG en línea, 20 px base y un único grosor (`stroke-width: 1.75`); `aria-hidden="true"` cuando son decorativos |
| Números | Montos en CLP con separador local; conteos sin decimales; `font-variant-numeric: tabular-nums` |
| Detalles nativos | `accent-color: var(--accent)`, `::selection` en `--accent-soft`, `color-scheme` declarado y scrollbar fina con degradación |

### 6.4 Movimiento y preferencias

| Aspecto | Contrato |
|---|---|
| Tokens | `--dur-fast: 120ms`, `--dur-base: 160ms`, `--ease-out` |
| Alcance | Overlays, hover y foco; nada dura más de 160 ms ni rebota |
| Movimiento reducido | `@media (prefers-reduced-motion: reduce)` anula transiciones y animaciones sin cambiar comportamiento ni foco |
| Tema oscuro (opcional) | Solo tokens dentro de `@media (prefers-color-scheme: dark)`; mantiene los contrastes de §6.1 y no agrega claves de `localStorage` |

## 7. Pruebas que dependen de este contrato

| Archivo | Depende de |
|---|---|
| `tests/integration/workspace-shell.test.js` | `#global-search-input`, `.nav-section`, `.nav-subitem` |
| `tests/integration/search-entities.test.js` | `#global-search-input`, `#search-results-list` |
| `tests/integration/search-clients.test.js` | `#global-search-input`, tablas de resultados |
| `tests/integration/table-sorting.test.js` | `.data-table`, `button[data-action="edit"]`, barra compacta heredada |
| `tests/integration/table-empty-state.test.js` | `.empty-state`, `reason`, CTA de filtros y de alta |
| `tests/integration/tickets.test.js` | `#global-search-input`, drawer de ticket |
| `tests/integration/accessibility.test.js` | foco, `role="dialog"`, etiquetas |
| `tests/integration/critical-journey.test.js` | navegación completa |
| `tests/unit/security-render.test.js` | renderizado de resultados |
| `tests/performance/search-performance.test.js` | `#global-search-input` y tiempo de búsqueda |
| `tests/integration/commercial-board.test.js` | `#commercial-board`, `#commercial-columns`, `.commercial-card[data-opportunity-id]` |
| `tests/integration/stage-distribution.test.js` | `#stage-distribution`, `.stage-row`, `.stage-bar`, `.board-scroll` |
| `tests/integration/responsive-nav.test.js` | `#nav-toggle`, `aside.sidebar[data-open]`, `aria-expanded`, foco devuelto |
| `tests/integration/dashboard.test.js` | `#crm-stat-grid`, `#dashboard-empty-hint`, `#commercial-board` |

## 8. Criterios de aceptación del contrato

- Ningún id o atributo listado puede desaparecer sin actualizar sus pruebas en la misma tarea.
- Toda apertura de overlay devuelve el foco al disparador al cerrarse.
- La confirmación de descarte siempre es un `role="dialog"` propio; ninguna prueba depende de `window.confirm()`.
- Toda tabla expone `aria-sort` en la columna activa y un `<caption>` accesible.
- Toda tabla mantiene el encabezado visible al desplazarse, alinea montos y fechas a la derecha y trunca solo visualmente el texto largo.
- Ningún tamaño tipográfico queda fuera de la escala declarada en §6.
- La distribución y el tablero nunca muestran cifras distintas para el mismo estado.
- Con cero oportunidades, el tablero está oculto y las barras de la distribución miden cero, sin `NaN`.
- Toda tabla ofrece solo la acción “Editar” por fila; el borrado queda en la barra compacta con sus ids de `001`.
- El estado vacío de una tabla distingue “sin coincidencias” de “sin registros” y su CTA corresponde a esa causa.
- Chips y selectores nunca quedan desincronizados.
- El estado vacío del panel solo aparece cuando ambas colecciones están vacías, y en ese caso oculta la banda de indicadores, la distribución y el tablero.
- El tablero se oculta cuando el perfil no es CRM o cuando no hay ninguna oportunidad; la distribución se mantiene con ceros.
- Navegar, ordenar, filtrar y consultar el panel no modifican `localStorage`.
- La base visual es neutra y el verde solo aparece como acento; ningún hexadecimal de color vive fuera de `:root`.
- Todo espaciado pertenece a la escala de 8 px y ningún bloque acumula borde + sombra + radio + franja.
- No convive más de un vocabulario de clases para botones y campos.
- Con `prefers-reduced-motion: reduce` no hay transición ni animación alguna.
- Bajo 900 px `#nav-toggle` abre el sidebar con “Listado / Nuevo” completos, `aria-expanded`, cierre con Esc y foco devuelto; no existe rail de iconos sin etiquetas.
- Bajo 640 px la tabla se presenta como tarjetas con etiqueta por celda y sin desplazamiento horizontal forzado.
- Si se entrega tema oscuro, responde a `prefers-color-scheme`, conserva los contrastes de §6.1 y no agrega claves de `localStorage`.
