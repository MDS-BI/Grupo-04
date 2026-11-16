---
description: "Lista de tareas de implementación del rediseño de interfaz del CRM"
---

# Tareas: rediseño de interfaz del CRM

**Feature**: `002-crm-ui-refresh`
**Entrada**: [`spec.md`](spec.md), [`plan.md`](plan.md), [`research.md`](research.md), [`data-model.md`](data-model.md), [`contracts/ui-shell.md`](contracts/ui-shell.md), [`quickstart.md`](quickstart.md)
**Prerrequisitos**: `001-crm-module` implementado (29 archivos, 280 pruebas en verde) y revisión de esta feature.

**Pruebas**: incluidas por exigencia explícita de la especificación y del Principio II de la constitución (cada primitiva y cada flujo se prueba antes o junto con el código). Las tareas de prueba se escriben primero y deben fallar antes de implementar.

**Organización**: por historia de usuario, en orden de prioridad, para que cada historia sea implementable y verificable de forma independiente.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes).
- **[Historia]**: `US1` = US-UX-01, `US2` = US-UX-02, `US3` = US-UX-03, `US4` = US-UX-04.
- Las rutas son relativas a la raíz del repositorio (`C:\Users\marti\Documents\Proyectos\Grupo-04`).

## Convenciones de rutas

- Código: `src/` y `src/components/`.
- Pruebas: `tests/unit/`, `tests/integration/` y `tests/performance/`.
- Documentos: `specs/002-crm-ui-refresh/` y `specs/001-crm-module/`.

## Decisiones de clarificación ya incorporadas

Estas decisiones de `spec.md` condicionan tareas concretas y no admiten reinterpretación durante la implementación:

- Cada fila de tabla ofrece **solo** “Editar”; el borrado vive únicamente en la barra compacta con `#delete-entity` / `#delete-document`.
- El estado vacío de una tabla distingue `no-matches` (CTA “Limpiar filtros”, conserva el texto) de `no-records` (CTA “Nuevo cliente/oportunidad”).
- La confirmación de descarte es un modal propio (`confirm-discard`) de `ui-overlay`; se prohíbe `window.confirm()`.
- La barra de filtros y los chips se montan solo en `#view-search`; los listados “Listado” no los muestran.
- Al vaciar `#global-search-input`, la vista de búsqueda permanece con la pista y conserva los filtros.
- La distribución (`#stage-distribution`) y el tablero (`#commercial-board`) son **dos presentaciones de una sola llamada** a `stageDistribution()`; ninguna tarea puede introducir un segundo cálculo.
- La barra de distribución se escala por **conteo**; el monto se muestra como texto.
- El tablero se oculta cuando no hay ninguna oportunidad, aunque existan clientes; la distribución muestra ceros sin dividir por cero.
- El estado vacío usa **icono en contenedor tenue**, no ilustración figurativa.
- La escala tipográfica es cerrada (12/14/16/20/28 px); ninguna tarea puede añadir un `font-size` fuera de ella.
- La tabla mantiene el encabezado fijo, alinea cifras a la derecha con `tabular-nums` y trunca solo visualmente el texto largo.
- La búsqueda sobre la cabecera oscura tiene estilo explícito y contraste medido; no se confía en el estilo por defecto del navegador.
- La base visual es **neutra** (fondo `#F7F8FA`, superficie `#FFFFFF`, borde `#E4E7EC`, texto `#0F172A`); el verde es acento de CTA, estado activo y dato destacado, nunca fondo de página o de sección.
- Cada bloque usa **una sola señal de elevación**: página plana, sección con borde y solo lo elevado con sombra. Prohibido borde + sombra + radio + franja en el mismo bloque.
- Paddings, gaps y márgenes pertenecen a la escala de 8 px (4/8/12/16/24/32/48/64); no hay valores arbitrarios.
- Botones y campos comparten **un solo vocabulario de clases**, dos tamaños (32/40 px), cuatro variantes y estados `hover`/`active`/`disabled`/`loading`/foco.
- Las transiciones duran 120–160 ms y se anulan con `prefers-reduced-motion: reduce`.
- Bajo 900 px la navegación es un **panel desplegable** con submenús completos; bajo 640 px la tabla se presenta como **tarjetas** por registro. No se admite el rail de iconos sin etiquetas.
- El tema oscuro es opcional; si se entrega, solo por tokens y con `prefers-color-scheme`, sin claves nuevas de `localStorage`.

---

## Fase 1: Setup (infraestructura compartida)

**Propósito**: dejar la línea base documental y de verificación lista antes de tocar la interfaz.

- [X] T001 Verificar que `specs/001-crm-module/spec.md` ya reformula `FR-036` y `CA-06-11`, apunta a `specs/002-crm-ui-refresh/spec.md` (`FR-036` en L517, `CA-06-11` en L422 y punteros en L7 y L20) y que la enmienda está publicada (`0caa9e0`). Si coincide, cerrar la tarea sin editar; solo si falta el puntero o el texto, aplicarlo. **No es bloqueante**: la dependencia ya está satisfecha.
- [X] T002 Ejecutar la línea base `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build`, y registrar en `README.md` la salida real (280 pruebas, 29 archivos) junto con la sección de evidencias de la feature `002`.

---

## Fase 2: Fundacional (prerrequisitos bloqueantes)

**Propósito**: sistema visual, contenedor de overlays y primitiva de diálogo accesible que comparten todas las historias.

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta completar esta fase.

- [X] T003 [P] Añadir en `index.html` el contenedor único `<div id="overlay-root"></div>` al final de `<body>`, fuera de `.workspace`, según `contracts/ui-shell.md` §2.
- [X] T004 [P] Ampliar `src/styles.css` con los tokens del sistema visual (`--radius-lg`, `--radius-xl`, `--shadow-sm`, `--shadow-md`, escala tipográfica cerrada `--text-xs` 12 px, `--text-sm` 14 px, `--text-base` 16 px, `--text-lg` 20 px, `--text-xl` 28 px, pesos 400/500/600, `--text-muted: #52606F`), `:focus-visible` global, `.req` para campos obligatorios y etiquetas de formulario en peso 500, según `contracts/ui-shell.md` §6. Normalizar los `font-size` existentes a la escala y dejar `clamp()` solo en el `h1` del panel (`NFR-UX-006`, `FR-UX-012`).
- [X] T005 Escribir primero `tests/unit/ui-overlay.test.js` con los casos de apertura, cierre con Esc, clic en velo, `returnFocus`, trampa de foco con Tab/Shift+Tab, confirmación por `isDirty`, pila de dos overlays y `aria-modal`; incluir el modal `confirm-discard` con “Descartar”/“Seguir editando” y comprobar que `window.confirm` no se invoca; la prueba debe fallar antes de implementar.
- [X] T006 Implementar `src/components/ui-overlay.js` con la API `openOverlay`, `closeOverlay`, `getTopOverlay` y `hasDirtyOverlay`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby` a `#overlay-title`, pila en memoria, variante `modal` para `confirm-discard` y bloqueo de fondo sin `inert` (jsdom).
- [X] T007 [P] Crear `src/components/ui.js` con primitivas de presentación reutilizables: cabecera de tarjeta con icono SVG en línea, **estado vacío con icono en contenedor circular tenue** parametrizado por `reason`/CTA, chip `aria-pressed`, badge y monograma decorativo (`aria-hidden="true"`), sin lógica de dominio.
- [X] T008 Añadir a `src/styles.css` los estilos de overlay, drawer (`data-variant="drawer"`, 480 px), modal centrado, velo, pantalla completa bajo 640 px y variantes `.btn-primary`, `.btn-secondary`, `.btn-ghost` y `.btn-danger`; depende de T004.

**Checkpoint**: `npm test -- --run tests/unit/ui-overlay.test.js` en verde y el shell visual no cambia todavía el comportamiento de `001`.

---

## Fase 3: US-UX-01 — Navegar y buscar desde cualquier vista (Prioridad: P1) 🎯 MVP

**Meta**: búsqueda global única en la cabecera, barra lateral sin entrada “Buscar”, submenús “Listado / Nuevo” generados desde `ModuleConfig`, vista activa con `aria-current`, guardián de cambios con modal propio y comportamiento estable al vaciar el criterio.

**Prueba independiente**: desde el panel, escribir `CLI-DEMO-003` en `#global-search-input` y llegar a `#view-search` con resultados; expandir Clientes y Oportunidades y ver “Listado / Nuevo”; abrir “Nuevo” y ver el drawer vacío; comprobar que la barra lateral no contiene “Buscar”; vaciar el criterio y verificar que la vista permanece con la pista y los filtros intactos; provocar un cambio sin guardar y comprobar el modal `confirm-discard`.

### Pruebas de US-UX-01 ⚠️

- [X] T009 [P] [US1] Crear `tests/integration/ui-shell.test.js` con `#global-search-input` (navegación a `#view-search` al escribir), búsqueda sin criterio (permanece en la vista, muestra la pista, no lista ni borra filtros), ausencia de `#nav-search`, submenús `aria-expanded`/`aria-controls`, entradas `data-mode="list|new"`, `aria-current` único y confirmación con el modal `confirm-discard` al navegar con cambios sin guardar (`CA-UX-01-01…08`).
- [X] T010 [P] [US1] Migrar a `#global-search-input` los archivos `tests/integration/workspace-shell.test.js`, `tests/integration/search-entities.test.js`, `tests/integration/search-clients.test.js`, `tests/integration/tickets.test.js`, `tests/integration/custom-fields.test.js`, `tests/integration/manage-document.test.js`, `tests/integration/manage-tabs.test.js` y `tests/integration/relabeling.test.js`, conservando sus aserciones de resultados y sin recortar cobertura; sustituir toda pulsación de `#nav-search` por foco e `input` directo en `#global-search-input`.
- [X] T011 [P] [US1] Migrar a `#global-search-input` `tests/integration/critical-journey.test.js`, `tests/unit/security-render.test.js` y `tests/performance/search-performance.test.js`; las pruebas deben fallar antes de T012–T017 y quedar en verde después. `tests/integration/dashboard.test.js` se migra **una sola vez** en T041 (US4), que asume el cambio de selector y añade el aserto de `hidden`; no se toca en esta tarea. `tests/integration/accessibility.test.js` se cubre en T020.

### Implementación de US-UX-01

- [X] T012 [US1] Reestructurar `index.html`: `header.topbar` con marca, `<input type="search" id="global-search-input">` con `aria-label` de terminología CRM, icono de lupa decorativo, ancho máximo 480 px y `#topbar-primary-action`; convertir Clientes y Oportunidades en `button.nav-section[data-module]` con `aria-expanded`/`aria-controls`; eliminar `#nav-search` y el `#search-input` de `#view-search`.
- [X] T013 [US1] Implementar en `src/components/shell.js` la generación de `ul.nav-submenu` y `button.nav-subitem[data-module][data-mode]` desde `ModuleConfig` (etiquetas “Listado” y “Nuevo”), con `aria-expanded` real y sin “Reportes”.
- [X] T014 [US1] En `src/app.js` conectar `#global-search-input`: al evento `input` ejecutar `showModule('search', { skipHistory: false })` y `refreshSearch()`, conservar el criterio al navegar y volver, y al quedar vacío mantener `#view-search` con la pista “Escribe para buscar” sin listar resultados ni borrar filtros; adaptar `src/components/search-bar.js` manteniendo `readSearchFilters()`.
- [X] T015 [US1] Extraer en `src/app.js` la confirmación de descarte de `showModule()` (hoy en `src/app.js:155-163`) a `confirmDiscardChanges()`, que abre `confirm-discard` en `ui-overlay`, y usarla en `showModule()`, `onLocationChange()` y `hashchange`/`popstate`, restaurando la vista anterior con “Seguir editando” (`CA-UX-01-07`, `CA-UX-01-08`).
- [X] T016 [US1] En `src/app.js` marcar exactamente un elemento activo con `aria-current="page"` (grupo o subitem según la vista y el modo) y manejar `data-mode="new"` en los subitems y en `#topbar-primary-action` para abrir el drawer del módulo con formulario vacío y foco en el primer campo.
- [X] T017 [US1] Eliminar las referencias residuales en `src/app.js` y `src/components/search-results.js` al input de la vista (`search-input`), incluyendo `opts.focusSearch`, y dejar el foco inicial en `#global-search-input` cuando la vista sea `search`.

**Checkpoint**: `npm test -- --run` completo en verde; US-UX-01 verificable sin depender de las otras historias.

---

## Fase 4: US-UX-02 — Registrar y editar sin abandonar la lista (Prioridad: P1)

**Meta**: alta y edición de cliente, oportunidad y ticket en drawer lateral; validaciones existentes dentro del drawer; modal propio de descarte; alta de cliente al vuelo que actualiza el selector sin perder el formulario de oportunidad.

**Prueba independiente**: desde Clientes → Listado, abrir “Nuevo”, guardar un cliente válido y ver la fila sin recargar; editar con la acción “Editar” de la fila y comprobar que el borrado no está en la fila; en Oportunidades sin clientes, usar “Crear cliente ahora” y comprobar que el cliente queda seleccionado y se conservan asunto, folio, fechas y monto; cerrar con cambios y verificar el modal `confirm-discard`; comprobar Tab, Shift+Tab, Esc y devolución de foco.

### Pruebas de US-UX-02 ⚠️

- [ ] T018 [P] [US2] Crear `tests/integration/client-drawer.test.js` con apertura desde “Nuevo cliente” y desde la acción “Editar” de la fila, formulario vacío y foco inicial, guardado con fila nueva, edición conservando `id`/`entity_id`, modal `confirm-discard` al cerrar con Esc/velo/Cancelar con “Seguir editando”/“Descartar”, errores dentro del drawer con foco en el primero y retorno de foco (`CA-UX-02-01…07`, `CA-UX-02-10`).
- [ ] T019 [P] [US2] Crear `tests/integration/quick-create-client.test.js` con el flujo “Crear cliente ahora”: cliente creado y seleccionado en `#document-entity`, formulario de oportunidad intacto, cancelación sin registros y datos inválidos sin crear (`CA-UX-02-08`, `CA-UX-02-09`).
- [ ] T020 [P] [US2] Ampliar `tests/integration/accessibility.test.js` y `tests/integration/tickets.test.js` con `role="dialog"`, `aria-modal`, trampa de foco del drawer de oportunidad/ticket, `confirm-discard` apilado sobre el drawer, dos overlays apilados y devolución del foco al disparador correcto. Comprobar que, al cerrar el drawer, cada tarjeta vuelve a su contenedor y las pruebas heredadas siguen en verde. Añadir el caso del detalle de cliente: resumen en dos columnas y apertura del drawer de ticket con el cliente preseleccionado (`CA-UX-02-12`).

### Implementación de US-UX-02

- [ ] T021 [US2] En `src/app.js` trasladar las tarjetas existentes `#entity-form`, `#document-form` y `#ticket-form` al drawer con `openOverlay({ content })` en el momento de abrir y devolverlas a su contenedor original al cerrar, sin reescribir formularios ni ids; abrir la edición desde la acción “Editar” de la fila y desde “Nuevo”.
- [ ] T022 [US2] En `src/app.js` integrar `isDirty` con el indicador `dirty` existente y aplicar `confirmDiscardChanges()` al cerrar con Esc, velo, “Cancelar” y al navegar; “Seguir editando” conserva los datos y “Descartar” cierra sin persistir ni mostrar éxito (`FR-UX-005`, `CA-UX-02-04`).
- [ ] T023 [P] [US2] Crear `src/components/quick-create-client.js` con el modal de alta mínima (nombre, código, tipo, responsable y origen obligatorios; correo y teléfono opcionales) reutilizando `validateClient` y `addEntity`, sin reglas nuevas.
- [ ] T024 [US2] En `src/app.js` sustituir el bloqueo de `#document-no-clients` por la CTA “Crear cliente ahora” conectada a `quick-create-client`, actualizar y seleccionar `#document-entity` tras guardar y conservar todos los campos escritos del formulario de oportunidad; al cancelar, no alterar el formulario.
- [ ] T025 [US2] Enfocar el primer campo con error dentro del drawer tras un envío inválido, asociando los mensajes existentes con `aria-describedby` (`CA-UX-02-05`), y ajustar `src/components/entity-detail.js` para conservar el resumen en dos columnas existente y añadir el acceso al drawer de ticket con el cliente preseleccionado (`CA-UX-02-12`).

**Checkpoint**: US-UX-01 y US-UX-02 funcionan de forma independiente; la suite completa sigue en verde.

---

## Fase 5: US-UX-03 — Encontrar y comparar registros (Prioridad: P1)

**Meta**: tablas accesibles ordenables con monograma, acción “Editar” por fila, barra compacta heredada para el borrado, estados vacíos contextuales, orden por defecto estable y barra de filtros colapsable con chips sincronizados solo en la vista de búsqueda.

**Prueba independiente**: buscar clientes, ordenar por responsable en ambos sentidos y comprobar `aria-sort`; verificar que cada fila solo ofrece “Editar” y que el borrado sigue en la barra compacta; activar dos chips y ver contador, resultados y sincronización con los `<select>`; pulsar “Limpiar” y comprobar que el texto de búsqueda permanece; provocar “sin coincidencias” y “sin registros” y verificar la CTA correspondiente; confirmar que “Listado” no muestra filtros; repetir con teclado.

### Pruebas de US-UX-03 ⚠️

- [ ] T026 [P] [US3] Crear `tests/unit/data-table.test.js` con orden ascendente/descendente, `aria-sort` en la columna activa, valores vacíos al final en ambos sentidos, orden estable, `<caption>` no vacío, contenedor `.table-wrap` con `role="region"`/`aria-label`/`tabindex="0"`, encabezado dentro de `<thead>`, declaración de columnas numéricas y render de la acción “Editar” sin acción de borrado.
- [ ] T027 [P] [US3] Crear `tests/integration/table-sorting.test.js` con tablas de clientes y oportunidades, columnas de `contracts/ui-shell.md` §3, monograma con iniciales `aria-hidden`, orden por defecto (nombre y folio ascendente), `button[data-action="edit"]` con `aria-label` que abre el drawer y ausencia de borrado por fila; comprobar estructura de encabezado fijo, contenedor desplazable y columnas numéricas (`CA-UX-03-01…12`). Comprobar que `#edit-entity`, `#delete-entity`, `#edit-document` y `#delete-document` siguen en la barra compacta con sus ids (la barra se construye en T036A). Migrar `tests/integration/opportunity-lifecycle.test.js` para sustituir `[data-edit-document]`/`[data-delete-document]` por la acción “Editar” de fila y `#delete-document` de la barra compacta, conservando las aserciones de ciclo de vida.
- [ ] T028 [P] [US3] Crear `tests/integration/table-empty-state.test.js` con `reason="no-matches"` (hay criterio o filtros: CTA “Limpiar filtros”, conserva el texto y no crea registros) y `reason="no-records"` (sin criterio ni filtros: CTA “Nuevo cliente”/“Nueva oportunidad” que abre el drawer), sin `<tbody>` en ambos casos.
- [ ] T029 [P] [US3] Crear `tests/integration/search-filters-chips.test.js` con chips `aria-pressed`, sincronización chip ↔ selector en ambos sentidos, contador `#active-filter-count` con `aria-live`, “Limpiar” sin borrar el criterio, combinación AND (`CA-UX-03-05…08`) y ausencia de barra/chips en los listados “Listado” de Clientes y Oportunidades.
- [ ] T030 [P] [US3] Extender `tests/performance/search-performance.test.js` con 20 ordenamientos sobre 500 clientes y 1000 oportunidades, exigiendo al menos 19 de 20 bajo 500 ms y sin modificar `localStorage` (`NFR-UX-003`).

### Implementación de US-UX-03

- [ ] T031 [P] [US3] Implementar `src/components/data-table.js` con `renderDataTable({ caption, columns, rows, sortKey, sortDirection, onSort, emptyState })`, `.table-wrap` desplazable (`role="region"`, `aria-label`, `tabindex="0"`), `<caption class="sr-only">`, `<th scope="col">`, `aria-sort`, `<tr data-key>`, marca de columna numérica (`data-numeric`) alineada a la derecha, clases de truncado, orden estable, vacíos al final y estado vacío delegado en `ui.js` según `reason`; el componente no conoce el dominio.
- [ ] T032 [US3] Reescribir `src/components/entity-list.js` para renderizar la tabla de clientes con monograma, nombre, código, tipo, responsable, origen, próximo contacto y una única acción “Editar” que abre el drawer usando `renderDataTable`, y pasar el `emptyState` correspondiente.
- [ ] T033 [P] [US3] Reescribir `src/components/document-list.js` para la tabla de oportunidades con cliente vinculado por `entity_id`, folio, asunto, estado, monto y una única acción “Editar”, sin mezclar oportunidades con clientes y con `emptyState` contextual.
- [ ] T034 [P] [US3] Adaptar `src/components/search-results.js` a dos secciones de tabla etiquetadas (clientes y oportunidades) con `<caption>` que describa el filtro activo, acción “Editar” por fila y estado vacío con CTA contextual en lugar de `<tbody>` vacío.
- [ ] T035 [P] [US3] Crear `src/components/filter-chips.js` que genere `button.chip[data-filter][data-value]` con `aria-pressed`, escriba en los tres `<select>` existentes, refleje los cambios de los selectores y actualice `#active-filter-count`.
- [ ] T036 [US3] Ajustar `index.html`: montar `#search-filters` únicamente dentro de `#view-search` (sin duplicarla en los listados), `#toggle-filters` con `aria-expanded`/`aria-controls`, contenedor de chips, `#active-filter-count` con `aria-live="polite"` y botón `#clear-filters` que no toque `#global-search-input`.
- [ ] T036A [US3] Montar la barra compacta de acciones heredada sobre cada tabla: contenedor en `index.html` encima de `.table-wrap`, con el selector de registro y los botones `#edit-entity`, `#delete-entity`, `#edit-document` y `#delete-document` reubicados **con sus ids, textos y comportamiento de `001`** (selección y borrado sin cambios); la fila sigue ofreciendo solo “Editar”. Añadir a `tests/integration/table-sorting.test.js` asertos de ubicación (la barra precede a la tabla), de selección y de borrado con los ids heredados (`CA-UX-02-11`, `FR-UX-013`). Depende de T032 y T033; se ejecuta antes de T037.
- [ ] T037 [US3] En `src/app.js` mantener el estado de orden por tabla (clave y dirección), aplicar el orden por defecto, conectar `onSort`, `#toggle-filters`, la sincronización de chips y las CTA de los estados vacíos (`clear-filters` vs. `open-create`), conservar `readSearchFilters()`/`clearSearchFilters()` de `src/components/search-bar.js` y no montar filtros en los listados.

**Checkpoint**: US-UX-03 verificable de forma independiente; búsqueda, orden y filtros bajo presupuesto de 500 ms.

---

## Fase 6: US-UX-04 — Consultar un panel accionable (Prioridad: P2)

**Meta**: estado vacío con icono que oculta banda, distribución y tablero; banda compacta de seis indicadores; banda de distribución y tablero accionable como dos presentaciones de `stageDistribution()`.

**Prueba independiente**: abrir el panel con `localStorage` vacío y ver icono + CTA “Registra tu primer cliente” sin KPIs, distribución ni tablero; crear datos y comprobar los seis indicadores, las seis filas de la distribución y las seis columnas del tablero con las mismas cifras; marcar una oportunidad como ganada/perdida y ver el recálculo y el ancho de las barras.

### Pruebas de US-UX-04 ⚠️

- [ ] T038 [P] [US4] Crear `tests/unit/crm-metrics-stage-distribution.test.js` con un bucket por estado del ciclo de vida, ceros incluidos, orden de `statusLifecycle.statuses`, estado desconocido ignorado y suma de `totalAmount` en el campo `amount`.
- [ ] T039 [P] [US4] Crear `tests/integration/dashboard-empty-state.test.js` con `#dashboard-empty-state` visible solo sin clientes ni oportunidades, icono `aria-hidden` dentro de contenedor tenue, CTA `#dashboard-empty-cta` que abre el drawer de cliente y `#crm-stat-grid`, `#stage-distribution` y `#commercial-board` ocultos (`CA-UX-04-01…03`). Incluir los accesos directos `#action-new-entity` y `#action-new-document`: abren el drawer vacío correspondiente sin alterar el almacenamiento (`CA-UX-04-08`).
- [ ] T040 [P] [US4] Ampliar `tests/integration/commercial-board.test.js` con el tablero alimentado por `stageDistribution()`, seis columnas con etiqueta/conteo/monto, estados en cero, `.board-scroll` con `role="region"` y `tabindex="0"`, tarjeta `button.commercial-card[data-opportunity-id]` que abre la edición y ocultamiento del tablero sin oportunidades o sin perfil CRM (`CA-UX-04-11`).
- [ ] T041 [P] [US4] Migrar `tests/integration/dashboard.test.js`: la banda `#crm-stat-grid` queda `hidden` con almacenamiento vacío, se conservan los asertos de los seis valores calculados en el DOM y se añade la verificación de “Sin datos” en la tasa de cierre. Esta tarea es la única responsable de `tests/integration/dashboard.test.js`: incluye la migración del foco a `#global-search-input`, el aserto de `hidden` en `#crm-stat-grid`, `#stage-distribution` y `#commercial-board`, y la conservación de los seis valores calculados.

### Implementación de US-UX-04

- [ ] T042 [P] [US4] Implementar `stageDistribution(documents, statuses)` en `src/crm-metrics.js` devolviendo `StageBucket[]` (`status`, `count`, `amount`) sin depender de `ModuleConfig`, sin persistir y sin calcular tasas de conversión.
- [ ] T043 [US4] Hacer que `src/components/commercial-board.js` consuma `stageDistribution()` conservando su marcado, clases y tarjetas, y oculte `#commercial-board` cuando no haya ninguna oportunidad o el perfil no sea CRM.
- [ ] T044 [US4] Modificar `src/components/dashboard.js` para mostrar `#dashboard-empty-state` solo si `entities` y `documents` están vacíos, aplicar `hidden` a `#crm-stat-grid`, `#stage-distribution` y `#commercial-board` en ese caso y mantener el cálculo de los seis indicadores de `FR-024` en cada render.
- [ ] T045 [US4] Ajustar `index.html`: añadir `#dashboard-empty-state` envolviendo `#dashboard-empty-hint` (id y texto conservados), icono SVG en línea dentro de `.empty-state__icon`, CTA `#dashboard-empty-cta`, el contenedor `#stage-distribution` antes del tablero y `class="stat-grid kpi-band"` en `#crm-stat-grid`.
- [ ] T046 [US4] Añadir a `src/styles.css` los estilos de `.kpi-band`/`.kpi`, `.empty-state`, `.empty-state__icon` (contenedor de 72 px con `--accent-soft` e icono de 48 px), `.stage-row`, `.stage-bar` y `.board-scroll`, con contraste ≥ 4.5:1 para `--text-muted` (`#52606F`) sobre el fondo de la tarjeta y de las columnas.
- [ ] T047 [US4] En `src/app.js` conectar `#dashboard-empty-cta`, `#action-new-entity` y `#action-new-document` a los drawers vacíos correspondientes (sin cambiar la navegación de `#action-open-entities` ni `#action-find`), y asegurar que `renderDashboard()` recalcule KPIs, distribución y tablero al volver al panel.

**Checkpoint**: las cuatro historias funcionan de forma independiente; el panel vacío nunca muestra seis tarjetas de “0”.

---

## Fase 7: Refinamiento gráfico (transversal)

**Propósito**: convertir el rediseño estructural en una interfaz que además se vea densa y moderna, sin añadir dependencias ni tocar el modelo de datos. **Se ejecuta después de las historias que tocan cada archivo y antes de T050, T051 y T053**, que miden el resultado final.

- [ ] T055 [US3] Añadir a `src/styles.css` el estilo de tabla densa: `.table-wrap` con `overflow-x: auto`, `thead th` con `position: sticky` y fondo opaco, filas de 44–48 px, `[data-numeric]` alineado a la derecha con `font-variant-numeric: tabular-nums`, truncado con `text-overflow: ellipsis` y estado `:hover` de fila. Ampliar T027 con aserciones de estructura (`role="region"`, `aria-label`, `tabindex="0"`, columna numérica) y dejar el efecto visual para T051.
- [ ] T056 [P] [US4] Crear `src/components/stage-distribution.js` que consuma `stageDistribution(documents, statuses)` y renderice `#stage-distribution` con una `.stage-row` por estado (etiqueta, conteo, monto y `.stage-bar` `aria-hidden` con ancho proporcional al conteo); si el total es `0`, todas las barras miden `0` y no se divide por cero. No conoce `ModuleConfig` ni persiste nada.
- [ ] T057 [P] [US4] Crear `tests/integration/stage-distribution.test.js` con una fila por estado del ciclo de vida, ceros incluidos, ancho de barra proporcional al conteo, total `0` sin `NaN`, coincidencia exacta de conteos y montos con `#commercial-board` (`CA-UX-04-10`), recálculo tras cambiar una etapa y `hidden` con panel vacío.
- [ ] T058 [US4] Ajustar `index.html` y `src/styles.css`: montar `#stage-distribution` entre la banda de indicadores y el tablero, envolver `#commercial-columns` en `.board-scroll` con seis columnas en una sola fila de desplazamiento horizontal (se elimina la grilla de tres por fila) y conectar en `src/app.js` una única llamada a `stageDistribution()` por render para ambas presentaciones.
- [ ] T059 Fijar en `src/styles.css` el estilo de `#global-search-input` y `#topbar-primary-action` sobre la cabecera oscura: ancho máximo 480 px, alto 40 px, fondo claro, borde, placeholder ≥ 4.5:1, icono de lupa decorativo y `:focus-visible` ≥ 3:1; medir y registrar el contraste real en `README.md` (`NFR-UX-005`).

**Checkpoint**: `npm test -- --run` en verde con las 280 pruebas heredadas y las nuevas; `npm run lint`, `npm run format:check` y `npm run build` sin errores; ninguna medida tipográfica fuera de la escala; distribución y tablero con las mismas cifras.

---

## Fase 8: Identidad visual neutra (quick wins)

**Propósito**: retirar el tinte verde global y dejar una base neutra con acento reservado, sin tocar la estructura ni el comportamiento. Es la fase de mayor impacto visual por menor riesgo: solo color, detalle nativo y dos correcciones puntuales. **Se ejecuta después de T004 y de las cuatro historias**, porque reescribe tokens que todas consumen, y **antes de T050, T051, T053 y T054**.

- [ ] T060 Neutralizar la paleta en `:root` y en el tema `.crm`: fondo `--bg` `#F7F8FA`, superficie `--surface` `#FFFFFF`, borde `--border` `#E4E7EC`, texto `--text` `#0F172A`; conservar el verde solo en `--accent`/CTA, estado activo y dato destacado. Mover a `:root` cualquier hexadecimal que hoy viva en reglas (incluido el bloque `.crm` de `src/styles.css`) para que `NFR-UX-009` sea verificable con una búsqueda de texto.
- [ ] T061 [P] Añadir los detalles nativos en `:root`/`body`: `accent-color: var(--accent)`, `::selection` con acento tenue, `color-scheme: light` (o `light dark` si se entrega T072), `caret-color` y scrollbar fina (`scrollbar-width: thin` y `scrollbar-color`) con degradación a los valores por defecto. Sin JavaScript ni dependencias.
- [ ] T062 Ajustar el sidebar: estado activo con fondo tenue (`--accent-soft`) e **indicador de 3 px a la izquierda** en lugar del relleno verde completo; etiquetas de sección a `--text-xs` (12 px) con `letter-spacing: 0.08em` y mayúsculas; iconos a 20 px con un único grosor (`stroke-width: 1.75`).
- [ ] T063 Sustituir la franja `border-left: 4px` de `.stat-card` (`src/styles.css:229`) por un **chip de icono tenue** y cifra con `font-variant-numeric: tabular-nums`; retirar del mismo bloque la combinación borde + sombra + radio para dejar una sola señal de elevación.
- [ ] T064 [P] Corregir el contraste del texto secundario: fijar `--text-muted: #52606F` y verificar ≥ 4.5:1 sobre los cuatro fondos reales (`#F7F8FA`, `#FFFFFF`, `#E6EDE9` y la cabecera oscura `#123C36`). Registrar los cuatro pares medidos en `README.md` (`CA-UX-05-02`, `NFR-UX-008`).

**Checkpoint**: la interfaz no tiene fondo ni sección teñidos de verde; no queda ningún hexadecimal de color fuera de `:root`; el texto secundario cumple AA sobre los cuatro fondos reales; la cifra de los indicadores se lee alineada y sin franja lateral.

---

## Fase 9: Sistema de superficies y componentes

**Propósito**: convertir la base neutra en un sistema: ritmo de espacio, jerarquía de superficies, componentes unificados y movimiento intencional. **Depende de la Fase 8** (necesita los tokens neutros) y **se ejecuta antes de T050, T051, T053 y T054**.

- [ ] T065 Declarar la escala de espacio `--space-1` 4 px, `--space-2` 8 px, `--space-3` 12 px, `--space-4` 16 px, `--space-5` 24 px, `--space-6` 32 px, `--space-7` 48 px y `--space-8` 64 px, y aplicarla a todos los `padding`, `gap` y `margin` de `src/styles.css`. Cualquier valor intermedio se redondea a la escala (`CA-UX-05-03`).
- [ ] T066 Establecer la jerarquía de superficies: `.page` plana (`--bg`, sin borde ni sombra), secciones `.card`/`.commercial-column` con borde de 1 px y sin sombra, y solo `.drawer`, `.modal`, `.popover` con `--shadow-md`. Eliminar la sombra de `.card`, `.stat-card` y `.action-card` y cualquier bloque que acumule borde + sombra + radio + franja (`CA-UX-05-04`). Dejar una sola CTA sólida por bloque —cada tarjeta o sección con cabecera propia— y el resto como acciones secundarias con borde fino (`FR-UX-012`).
- [ ] T067 Unificar botones y campos en un solo vocabulario: conservar `.btn` + `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger` y retirar el alias `.primary` migrando todas sus llamadas en `index.html` y `src/`; dos tamaños (`--control-sm` 32 px, `--control-md` 40 px) y estados `:hover`, `:active`, `:disabled`, `[data-loading]` y `:focus-visible` con el mismo radio y tipografía (`CA-UX-05-05`, `FR-UX-016`).
- [ ] T068 Declarar los tokens de movimiento `--dur-fast: 120ms`, `--dur-base: 160ms` y `--ease-out`, aplicarlos a overlays, hover y foco, y añadir un bloque `@media (prefers-reduced-motion: reduce)` que anule transiciones y animaciones sin cambiar el comportamiento ni el foco (`CA-UX-05-06`, `NFR-UX-007`).
- [ ] T069 [P] Añadir los estados de tabla que faltan: `:hover` de fila y `th[aria-sort]` de la columna activa resaltado, perceptible sin depender solo del color (peso o borde). No se introduce selección de fila: el registro se elige con el selector de la barra compacta. Ampliar `tests/unit/data-table.test.js` con los atributos que exponen el estado activo (`aria-sort`).

**Checkpoint**: todos los espaciados pertenecen a la escala; ninguna tarjeta acumula señales de elevación; no queda la clase `.primary`; con `prefers-reduced-motion: reduce` no hay transición alguna; la tabla comunica hover, selección y columna activa.

---

## Fase 10: Responsive y tema opcional

**Propósito**: cerrar el hueco funcional de navegación bajo 900 px (`FR-UX-002`, `FR-UX-018`) y adaptar la tabla a móvil; el tema oscuro queda como entrega opcional. **Depende de la Fase 9** (tokens y componentes ya unificados).

- [ ] T070 Implementar la navegación desplegable bajo 900 px: botón `#nav-toggle` con `aria-expanded` y `aria-controls`, panel `.sidebar` que se abre como capa con fondo de página, submenús “Listado / Nuevo” **completos y etiquetados**, cierre con Esc y con clic fuera, devolución del foco al botón que lo abrió y desplazamiento bloqueado del fondo. Eliminar el rail de 60 px sin etiquetas. Crear `tests/integration/responsive-nav.test.js` con apertura, `aria-expanded`, Esc, foco devuelto y presencia de los submenús (`CA-UX-05-07`).
- [ ] T071 Presentar la tabla como tarjetas bajo 640 px: `.data-table` en modo bloque con una tarjeta por `<tr>`, etiqueta de columna visible por celda (`data-label` o `::before` con el texto del `th`), sin desplazamiento horizontal forzado y conservando `<caption>`, `aria-sort` y la acción “Editar”. Ampliar `tests/integration/table-sorting.test.js` con la estructura de etiquetas por celda (`CA-UX-05-08`).
- [ ] T072 (Opcional) Tema oscuro solo por tokens: duplicar los valores de `:root` en un bloque `@media (prefers-color-scheme: dark)` con superficies, bordes y texto equivalentes, `color-scheme: light dark` y contraste AA en los cuatro pares de `T064`. No agregar claves de `localStorage`, no tocar `schemaVersion` y no duplicar reglas por selector. Si no se entrega, declararlo **pendiente** en `README.md` (`CA-UX-05-09`, `FR-UX-019`).

**Checkpoint**: a 768 px la navegación expone “Listado / Nuevo” completos con foco y Esc correctos; a 390 px cada fila es una tarjeta con etiquetas y sin scroll horizontal forzado; el tema oscuro se entrega con contraste medido o queda declarado pendiente, nunca reportado como cumplido.

---

## Fase 11: Pulido y aspectos transversales

**Propósito**: evidencias reales, limpieza y validación completa de la iteración.

**Nota de numeración**: los ids T048–T054 son anteriores a las fases 7–10 (T055–T072). El orden real de ejecución es el de las fases, no el numérico: T048–T054 se ejecutan al final, después de T055–T072.

- [ ] T048 [P] Documentar en `README.md` los datos sintéticos usados, las capturas/mediciones de responsive y contraste y el estado real de cada historia, sin declarar cumplido lo no verificado.
- [ ] T049 [P] Limpiar referencias muertas a `#nav-search`, `#search-input`, `opts.focusSearch` y estilos obsoletos en `src/app.js`, `src/components/shell.js`, `src/styles.css` e `index.html`.
- [ ] T050 Ejecutar `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build`, corregir cualquier regresión hasta dejar las cuatro órdenes sin errores (incluidas las 280 pruebas heredadas) y anotar la salida real en `README.md`.
- [ ] T051 [P] Ejecutar el recorrido manual de `specs/002-crm-ui-refresh/quickstart.md` escenarios 1–5 con teclado, a 1440/1024/768/390 px y con verificación de contraste, registrando dimensiones y navegador en `README.md`; incluir el modal `confirm-discard`, la acción “Editar” por fila, los dos estados vacíos de tabla, la navegación desplegable a 768 px y la tabla como tarjetas a 390 px. Cronometrar cinco altas de cliente desde formulario vacío con datos sintéticos y registrar mediana y rango para `SC-UX-002`.
- [ ] T052 [P] Ejecutar la validación de rendimiento de `specs/002-crm-ui-refresh/quickstart.md` (20 búsquedas y 20 ordenamientos sobre 500/1000 registros) y registrar equipo, navegador y tiempos en `README.md`.
- [ ] T053 Comparar `localStorage` antes y después de navegar, ordenar, filtrar y consultar el panel (mismas claves `erp_base_module:*`, mismo `schemaVersion`, sin totales nuevos) y registrar la comparación en `README.md` (`SC-UX-006`); incluir la comprobación de que el tema oscuro, si se entregó, no añadió claves.
- [ ] T054 Revisar la coherencia documental entre `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/ui-shell.md`, `quickstart.md`, `tasks.md` y la enmienda de `specs/001-crm-module/spec.md`; actualizar el contrato y sus pruebas en la misma tarea si cambió algún id, y dejar registrados en `README.md` los resultados de `SC-UX-007`, `SC-UX-009`, `SC-UX-010` y `SC-UX-011`. Incluir la auditoría de `SC-UX-007`: búsqueda de `font-size` en `src/styles.css` y recorrido de las cuatro vistas confirmando que solo existen los cinco tamaños de la escala más el `clamp()` del `h1` del panel.

---

## Dependencias y orden de ejecución

### Dependencias por fase

- **Setup (Fase 1)**: sin dependencias. T001 es una verificación no bloqueante: la enmienda de `001` ya está publicada.
- **Fundacional (Fase 2)**: depende de T001–T002 y **bloquea** las cuatro historias.
- **US1, US2, US3 (Fase 3–5)**: dependen de la Fase 2. US1 es el MVP.
- **US4 (Fase 6)**: depende de la Fase 2; su CTA reutiliza el drawer de US2, por lo que en la práctica se completa después de US2.
- **Refinamiento gráfico (Fase 7)**: depende de T031–T033 (tabla), T042–T044 (métricas y panel) y T012 (cabecera). **T050, T051 y T053 se ejecutan después de T055–T059**, porque miden lo que esa fase construye.
- **Identidad visual neutra (Fase 8)**: depende de T004 (tokens base) y de que las cuatro historias estén implementadas, porque reescribe valores de color que ellas consumen. T060 es la puerta de la fase; T061, T062, T063 y T064 pueden ir después.
- **Sistema de superficies y componentes (Fase 9)**: depende de T060–T064. T065–T066 (espacio y superficies) preceden a T067–T069, que reutilizan los tokens ya normalizados.
- **Responsive y tema opcional (Fase 10)**: depende de T065–T069; T070, T071 y T072 comparten `src/styles.css` y se ejecutan en secuencia; T072 depende además de T064.
- **Pulido (Fase 11)**: depende de todas las historias y de las fases 7, 8, 9 y 10. **T050, T051, T053 y T054 se ejecutan al final**, porque miden el resultado de esas fases.

### Dependencias entre historias

- **US-UX-01 (P1)**: independiente tras la Fase 2. T015 (modal `confirm-discard`) depende de `ui-overlay` (T006); el subitem “Nuevo” y `#topbar-primary-action` abren el drawer con el formulario existente trasladado por `ui-overlay`, sin depender de las validaciones ni del alta al vuelo de US2.
- **US-UX-02 (P1)**: independiente tras la Fase 2; reutiliza `confirmDiscardChanges()` de T015 y el drawer de `ui-overlay`.
- **US-UX-03 (P1)**: independiente tras la Fase 2; reutiliza `readSearchFilters()` y la acción “Editar” abre el drawer de US2.
- **US-UX-04 (P2)**: independiente en cálculo (`stageDistribution`), pero su CTA “Registra tu primer cliente” y los accesos directos reutilizan el drawer de US2; el tablero debe ocultarse cuando no hay oportunidades.
- **Fase 7 (T055–T059)**: la distribución nueva (T056–T058) depende de T042 y de la tabla de US3; el estilo de búsqueda (T059) depende de T012; la densidad de tabla (T055) depende de T031–T033. T050, T051 y T053 se ejecutan al final.
- **Fases 8–10 (T060–T072)**: son transversales y no pertenecen a una historia. T060 bloquea a T061–T064; T065–T066 bloquean a T067–T069; T070, T071 y T072 comparten `src/styles.css` y no se paralelizan; T072 es opcional. Ninguna de estas tareas cambia el modelo de datos ni `localStorage`.

### Dentro de cada historia

1. Las pruebas se escriben y fallan antes de la implementación (T009–T011, T018–T020, T026–T030, T038–T041).
2. Primero las primitivas compartidas, después los componentes de dominio y al final el cableado en `src/app.js` e `index.html`.
3. Ninguna historia se declara terminada con la suite en rojo.

### Oportunidades de paralelización

- T003 y T004 son paralelizables (archivos distintos).
- T007 es paralelizable con T005–T006 (archivo nuevo).
- En US1: T009, T010 y T011 en paralelo (archivos distintos); T012 (`index.html`) y T013 (`shell.js`) pueden ejecutarse en paralelo; T014–T017 son secuenciales por editar `src/app.js`.
- En US2: T018, T019 y T020 en paralelo; T023 (`quick-create-client.js`) en paralelo con T021–T022.
- En US3: T026–T030 en paralelo; T031 en paralelo con T026–T030; después T032–T035 en paralelo (archivos distintos); T036, T036A y T037 secuenciales por editar `index.html` y `src/app.js`.
- En US4: T038–T041 en paralelo; T042 en paralelo; T043–T047 secuenciales por dependencia.
- En Fase 7: T056 y T057 en paralelo (archivos nuevos); T055, T058 y T059 comparten `src/styles.css` e `index.html`, por lo que se ejecutan en secuencia.
- En Fase 8: T061 y T064 en paralelo (detalles nativos y auditoría de contraste); T060, T062 y T063 comparten `src/styles.css` y se ejecutan en secuencia. T060 va primero.
- En Fase 9: T069 en paralelo con T065–T066 (prueba de tabla); T065 y T066 comparten `src/styles.css` y se ejecutan en secuencia; T067 y T068 también tocan `styles.css` y `index.html`.
- En Fase 10: T070, T071 y T072 comparten `src/styles.css` y se ejecutan en secuencia; T072 es opcional.
- Pulido: T048, T049 y T052 en paralelo; T050, T051, T053 y T054 dependen de las historias entregadas y de las fases 7–10.

---

## Ejemplo paralelo: US-UX-01

```bash
# Pruebas de la historia (archivos distintos)
Task: "Crear tests/integration/ui-shell.test.js"
Task: "Migrar workspace-shell, search-entities, search-clients y tickets a #global-search-input"
Task: "Migrar accessibility, critical-journey, security-render y search-performance"

# Shell y navegación en paralelo
Task: "Reestructurar index.html: topbar, submenús, sin #nav-search"
Task: "Generar submenús desde ModuleConfig en src/components/shell.js"
```

## Ejemplo paralelo: US-UX-02

```bash
# Pruebas de la historia (archivos distintos)
Task: "Crear tests/integration/client-drawer.test.js con modal confirm-discard"
Task: "Crear tests/integration/quick-create-client.test.js"
Task: "Ampliar accessibility y tickets con overlays apilados"

# Componentes de flujo
Task: "Crear src/components/quick-create-client.js"
```

## Ejemplo paralelo: US-UX-03

```bash
# Primitiva, pruebas y estado vacío
Task: "Crear tests/unit/data-table.test.js"
Task: "Implementar src/components/data-table.js"
Task: "Crear tests/integration/table-sorting.test.js"
Task: "Crear tests/integration/table-empty-state.test.js"
Task: "Crear tests/integration/search-filters-chips.test.js"

# Componentes de tabla y chips (archivos distintos)
Task: "Tabla de clientes en src/components/entity-list.js"
Task: "Tabla de oportunidades en src/components/document-list.js"
Task: "Tablas de resultados en src/components/search-results.js"
Task: "Chips sincronizados en src/components/filter-chips.js"
```

## Ejemplo paralelo: US-UX-04

```bash
Task: "tests/unit/crm-metrics-stage-distribution.test.js"
Task: "tests/integration/dashboard-empty-state.test.js"
Task: "Ampliar tests/integration/commercial-board.test.js"
Task: "Migrar tests/integration/dashboard.test.js"
Task: "Implementar stageDistribution() en src/crm-metrics.js"
```

## Ejemplo paralelo: Fase 7

```bash
# Componente nuevo y su prueba (archivos distintos)
Task: "Crear src/components/stage-distribution.js"
Task: "Crear tests/integration/stage-distribution.test.js"

# Secuenciales: comparten styles.css / index.html
Task: "Estilo de tabla densa en src/styles.css"
Task: "Montar #stage-distribution y .board-scroll en index.html"
Task: "Estilo de #global-search-input sobre la cabecera oscura"
```

## Ejemplo paralelo: Fases 8–10

```bash
# Fase 8 — T060 primero, luego estos dos en paralelo
Task: "Detalles nativos en :root (accent-color, ::selection, scrollbar)"
Task: "Auditoría de contraste de --text-muted sobre los cuatro fondos"

# Fase 9 — prueba de estados de tabla en paralelo con los tokens
Task: "Escala --space-1…8 y superficies en src/styles.css"
Task: "Ampliar tests/unit/data-table.test.js con hover y columna activa"

# Fase 10 — secuenciales: comparten src/styles.css
Task: "Navegación desplegable < 900 px + tests/integration/responsive-nav.test.js"
Task: "Tabla como tarjetas < 640 px + ampliación de table-sorting.test.js"
```

---

## Estrategia de implementación

### MVP primero (US-UX-01 + primitivas)

1. Completar Fase 1 (T001–T002) y Fase 2 (T003–T008).
2. Completar Fase 3 (US-UX-01, T009–T017).
3. **DETENERSE y VALIDAR** con `npm test -- --run` y el Escenario 1 de `quickstart.md`.
4. Demostrar la búsqueda global, la navegación con submenús y el modal de descarte como primer incremento.

### Entrega incremental

1. Setup + Fundacional → base lista.
2. US-UX-01 → MVP demostrable (búsqueda y navegación).
3. US-UX-02 → alta/edición en drawer, incluido el alta al vuelo y el modal de descarte.
4. US-UX-03 → tablas con “Editar”, estados vacíos contextuales, orden, densidad y chips.
5. US-UX-04 → panel accionable con distribución y tablero.
6. Fase 7 → refinamiento gráfico: tabla densa, distribución, tablero en scroll horizontal y búsqueda sobre cabecera oscura.
7. Fase 8 → identidad neutra: paleta sin tinte, detalles nativos, sidebar, indicadores y contraste corregido.
8. Fase 9 → sistema: escala de espacio, superficies, botones y campos unificados, movimiento y estados de tabla.
9. Fase 10 → responsive: navegación desplegable, tabla como tarjetas y tema oscuro opcional.
10. Fase 11 → pulido: evidencias, rendimiento, `localStorage` y documentación.

Cada incremento debe dejar `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build` sin errores antes de pasar al siguiente.

### Estrategia de equipo paralelo

1. El equipo completa Setup + Fundacional.
2. Después de la Fase 2: una persona toma US-UX-01, otra US-UX-02 y otra US-UX-03; US-UX-04 espera a US-UX-02 por la CTA del drawer.
3. La integración final se hace sobre `src/app.js` e `index.html` de forma secuencial para evitar conflictos.

---

## Notas

- `[P]` indica archivos distintos y sin dependencias pendientes.
- Cada historia se puede completar y probar de forma independiente.
- Toda apertura de overlay devuelve el foco al disparador; ningún cambio de interfaz persiste datos.
- La confirmación de descarte nunca usa `window.confirm()`; siempre es el modal `confirm-discard` de `ui-overlay`.
- La fila de tabla solo ofrece “Editar”; ningún cambio debe reintroducir el borrado por fila.
- No se agregan dependencias, entidades, campos, claves de `localStorage` ni versiones de esquema.
- Si cambia un id de `contracts/ui-shell.md`, se actualizan las pruebas en la misma tarea.
- La distribución y el tablero se alimentan de una única llamada a `stageDistribution()` por render; si alguien necesita “otra vista”, lee la misma función.
- Ningún `font-size` nuevo puede quedar fuera de la escala de `--text-*`; el icono del estado vacío sustituye a cualquier ilustración.
- Registrar en `README.md` los resultados reales; lo no verificado se declara pendiente.
