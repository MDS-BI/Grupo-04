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

---

## Fase 1: Setup (infraestructura compartida)

**Propósito**: dejar la línea base documental y de verificación lista antes de tocar la interfaz.

- [ ] T001 Enmendar `FR-036` y `CA-06-11` en `specs/001-crm-module/spec.md` para que la búsqueda global viva en la cabecera y Clientes/Oportunidades expongan submenú “Listado / Nuevo”, y añadir el puntero a `specs/002-crm-ui-refresh/spec.md`; es bloqueante porque sin la enmienda ambas especificaciones se contradicen.
- [ ] T002 Ejecutar la línea base `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build`, y registrar en `README.md` la salida real (280 pruebas, 29 archivos) junto con la sección de evidencias de la feature `002`.

---

## Fase 2: Fundacional (prerrequisitos bloqueantes)

**Propósito**: sistema visual, contenedor de overlays y primitiva de diálogo accesible que comparten todas las historias.

**⚠️ CRÍTICO**: ninguna historia puede empezar hasta completar esta fase.

- [ ] T003 [P] Añadir en `index.html` el contenedor único `<div id="overlay-root"></div>` al final de `<body>`, fuera de `.workspace`, según `contracts/ui-shell.md` §2.
- [ ] T004 [P] Ampliar `src/styles.css` con los tokens del sistema visual (`--radius-lg`, `--radius-xl`, `--shadow-sm`, `--shadow-md`, escala tipográfica, `--text-muted: #64748B`), `:focus-visible` global y `.req` para campos obligatorios, según `contracts/ui-shell.md` §6.
- [ ] T005 Escribir primero `tests/unit/ui-overlay.test.js` con los casos de apertura, cierre con Esc, clic en velo, `returnFocus`, trampa de foco con Tab/Shift+Tab, confirmación por `isDirty`, pila de dos overlays y `aria-modal`; la prueba debe fallar antes de implementar.
- [ ] T006 Implementar `src/components/ui-overlay.js` con la API `openOverlay`, `closeOverlay`, `getTopOverlay` y `hasDirtyOverlay`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby` a `#overlay-title`, pila en memoria y bloqueo de fondo sin `inert` (jsdom).
- [ ] T007 [P] Crear `src/components/ui.js` con primitivas de presentación reutilizables: cabecera de tarjeta con icono SVG en línea, estado vacío accionable, chip `aria-pressed`, badge y monograma decorativo (`aria-hidden="true"`), sin lógica de dominio.
- [ ] T008 Añadir a `src/styles.css` los estilos de overlay, drawer (`data-variant="drawer"`, 480 px), modal centrado, velo, pantalla completa bajo 640 px y variantes `.btn-primary`, `.btn-secondary`, `.btn-ghost`; depende de T004.

**Checkpoint**: `npm test -- --run tests/unit/ui-overlay.test.js` en verde y el shell visual no cambia todavía el comportamiento de `001`.

---

## Fase 3: US-UX-01 — Navegar y buscar desde cualquier vista (Prioridad: P1) 🎯 MVP

**Meta**: búsqueda global única en la cabecera, barra lateral sin entrada “Buscar”, submenús “Listado / Nuevo” generados desde `ModuleConfig`, vista activa con `aria-current` y guardián de cambios compartido.

**Prueba independiente**: desde el panel, escribir `CLI-DEMO-003` en `#global-search-input` y llegar a `#view-search` con resultados; expandir Clientes y Oportunidades y ver “Listado / Nuevo”; abrir “Nuevo” y ver el drawer vacío; comprobar que la barra lateral no contiene “Buscar” y que solo hay un elemento con `aria-current="page"`.

### Pruebas de US-UX-01 ⚠️

- [ ] T009 [P] [US1] Crear `tests/integration/ui-shell.test.js` con `#global-search-input` (navegación a `#view-search` al escribir), ausencia de `#nav-search`, submenús `aria-expanded`/`aria-controls`, entradas `data-mode="list|new"`, `aria-current` único y confirmación al navegar con cambios sin guardar (`CA-UX-01-01…08`).
- [ ] T010 [P] [US1] Migrar a `#global-search-input` los archivos `tests/integration/workspace-shell.test.js`, `tests/integration/search-entities.test.js`, `tests/integration/search-clients.test.js` y `tests/integration/tickets.test.js`, conservando sus asserciones de resultados y sin recortar cobertura.
- [ ] T011 [P] [US1] Migrar a `#global-search-input` `tests/integration/accessibility.test.js`, `tests/integration/critical-journey.test.js`, `tests/unit/security-render.test.js` y `tests/performance/search-performance.test.js`; las pruebas deben fallar antes de T012–T017 y quedar en verde después.

### Implementación de US-UX-01

- [ ] T012 [US1] Reestructurar `index.html`: `header.topbar` con marca, `<input type="search" id="global-search-input">` con `aria-label` de terminología CRM y `#topbar-primary-action`; convertir Clientes y Oportunidades en `button.nav-section[data-module]` con `aria-expanded`/`aria-controls`; eliminar `#nav-search` y el `#search-input` de `#view-search`.
- [ ] T013 [US1] Implementar en `src/components/shell.js` la generación de `ul.nav-submenu` y `button.nav-subitem[data-module][data-mode]` desde `ModuleConfig` (etiquetas “Listado” y “Nuevo”), con `aria-expanded` real y sin “Reportes”.
- [ ] T014 [US1] En `src/app.js` conectar `#global-search-input`: al evento `input` ejecutar `showModule('search', { skipHistory: false })` y `refreshSearch()`, conservar el criterio al navegar y volver, y en `src/components/search-bar.js` adaptar `setupSearchBar` al input global manteniendo `readSearchFilters()`.
- [ ] T015 [US1] Extraer en `src/app.js` la confirmación de descarte de `showModule()` (hoy en `src/app.js:155-163`) a una función compartida `confirmDiscardChanges()` y usarla en `showModule()`, `onLocationChange()` y `hashchange`/`popstate`, restaurando la vista anterior al cancelar (`CA-UX-01-07`, `CA-UX-01-08`).
- [ ] T016 [US1] En `src/app.js` marcar exactamente un elemento activo con `aria-current="page"` (grupo o subitem según la vista y el modo) y manejar `data-mode="new"` en los subitems y en `#topbar-primary-action` para abrir el drawer del módulo con formulario vacío y foco en el primer campo.
- [ ] T017 [US1] Eliminar las referencias residuales en `src/app.js` y `src/components/search-results.js` al input de la vista (`search-input`), incluyendo `opts.focusSearch`, y dejar el foco inicial en `#global-search-input` cuando la vista sea `search`.

**Checkpoint**: `npm test -- --run` completo en verde; US-UX-01 verificable sin depender de las otras historias.

---

## Fase 4: US-UX-02 — Registrar y editar sin abandonar la lista (Prioridad: P1)

**Meta**: alta y edición de cliente, oportunidad y ticket en drawer lateral; validaciones existentes dentro del drawer; alta de cliente al vuelo que actualiza el selector sin perder el formulario de oportunidad.

**Prueba independiente**: desde Clientes → Listado, abrir “Nuevo”, guardar un cliente válido y ver la fila sin recargar; en Oportunidades sin clientes, usar “Crear cliente ahora” y comprobar que el cliente queda seleccionado y se conservan asunto, folio, fechas y monto; verificar Tab, Shift+Tab, Esc y devolución de foco.

### Pruebas de US-UX-02 ⚠️

- [ ] T018 [P] [US2] Crear `tests/integration/client-drawer.test.js` con apertura desde “Nuevo cliente”, formulario vacío y foco inicial, guardado con fila nueva, edición conservando `id`/`entity_id`, confirmación al cerrar con Esc/velo/Cancelar, errores dentro del drawer con foco en el primero y retorno de foco (`CA-UX-02-01…07`, `CA-UX-02-10`).
- [ ] T019 [P] [US2] Crear `tests/integration/quick-create-client.test.js` con el flujo “Crear cliente ahora”: cliente creado y seleccionado en `#document-entity`, formulario de oportunidad intacto, cancelación sin registros y datos inválidos sin crear (`CA-UX-02-08`, `CA-UX-02-09`).
- [ ] T020 [P] [US2] Ampliar `tests/integration/accessibility.test.js` y `tests/integration/tickets.test.js` con `role="dialog"`, `aria-modal`, trampa de foco del drawer de oportunidad/ticket, dos overlays apilados y devolución del foco al disparador correcto.

### Implementación de US-UX-02

- [ ] T021 [US2] En `src/app.js` montar las tarjetas `#entity-form`, `#document-form` y `#ticket-form` dentro del drawer mediante `openOverlay({ content })` sin reescribir los formularios ni sus ids, y abrir la edición desde la fila y desde “Nuevo”.
- [ ] T022 [US2] En `src/app.js` integrar `isDirty` con el indicador `dirty` existente y aplicar la confirmación de descarte al cerrar con Esc, velo, “Cancelar” y al navegar; al descartar, no persistir ni mostrar mensaje de éxito (`CA-UX-02-04`).
- [ ] T023 [P] [US2] Crear `src/components/quick-create-client.js` con el modal de alta mínima (nombre, código, tipo, responsable y origen obligatorios; correo y teléfono opcionales) reutilizando `validateClient` y `addEntity`, sin reglas nuevas.
- [ ] T024 [US2] En `src/app.js` sustituir el bloqueo de `#document-no-clients` por la CTA “Crear cliente ahora” conectada a `quick-create-client`, actualizar y seleccionar `#document-entity` tras guardar y conservar todos los campos escritos del formulario de oportunidad; al cancelar, no alterar el formulario.
- [ ] T025 [US2] Enfocar el primer campo con error dentro del drawer tras un envío inválido, asociando los mensajes existentes con `aria-describedby` (`CA-UX-02-05`), y ajustar `src/components/entity-detail.js` para que la ficha del cliente use el resumen en dos columnas y permita abrir el drawer de ticket.

**Checkpoint**: US-UX-01 y US-UX-02 funcionan de forma independiente; la suite completa sigue en verde.

---

## Fase 5: US-UX-03 — Encontrar y comparar registros (Prioridad: P1)

**Meta**: tablas accesibles ordenables con monograma, orden por defecto estable, barra de filtros colapsable con chips sincronizados, contador de filtros activos y limpieza que conserva el criterio.

**Prueba independiente**: buscar clientes, ordenar por responsable en ambos sentidos y comprobar `aria-sort`; activar dos chips y ver contador, resultados y sincronización con los `<select>`; pulsar “Limpiar” y comprobar que el texto de búsqueda permanece; repetir con teclado.

### Pruebas de US-UX-03 ⚠️

- [ ] T026 [P] [US3] Crear `tests/unit/data-table.test.js` con orden ascendente/descendente, `aria-sort` en la columna activa, valores vacíos al final en ambos sentidos, orden estable y `<caption>` no vacío.
- [ ] T027 [P] [US3] Crear `tests/integration/table-sorting.test.js` con tablas de clientes y oportunidades, columnas de `contracts/ui-shell.md` §3, monograma con iniciales `aria-hidden`, orden por defecto (nombre y folio ascendente) y acciones por fila con `aria-label`.
- [ ] T028 [P] [US3] Crear `tests/integration/search-filters-chips.test.js` con chips `aria-pressed`, sincronización chip ↔ selector en ambos sentidos, contador `#active-filter-count` con `aria-live`, “Limpiar” sin borrar el criterio y combinación AND (`CA-UX-03-05…08`).
- [ ] T029 [P] [US3] Extender `tests/performance/search-performance.test.js` con 20 ordenamientos sobre 500 clientes y 1000 oportunidades, exigiendo al menos 19 de 20 bajo 500 ms y sin modificar `localStorage` (`NFR-UX-003`).

### Implementación de US-UX-03

- [ ] T030 [P] [US3] Implementar `src/components/data-table.js` con `renderDataTable({ caption, columns, rows, sortKey, sortDirection, onSort })`, `<caption class="sr-only">`, `<th scope="col">`, `aria-sort`, `<tr data-key>`, orden estable y vacíos al final; el componente no conoce el dominio.
- [ ] T031 [US3] Reescribir `src/components/entity-list.js` para renderizar la tabla de clientes con monograma, nombre, código, tipo, responsable, origen, próximo contacto y acciones usando `renderDataTable`.
- [ ] T032 [P] [US3] Reescribir `src/components/document-list.js` para la tabla de oportunidades con cliente vinculado por `entity_id`, folio, asunto, estado, monto y acciones, sin mezclar oportunidades con clientes.
- [ ] T033 [P] [US3] Adaptar `src/components/search-results.js` a dos secciones de tabla etiquetadas (clientes y oportunidades) con `<caption>` que describa el filtro activo y estado vacío con CTA en lugar de `<tbody>` vacío.
- [ ] T034 [P] [US3] Crear `src/components/filter-chips.js` que genere `button.chip[data-filter][data-value]` con `aria-pressed`, escriba en los tres `<select>` existentes, refleje los cambios de los selectores y actualice `#active-filter-count`.
- [ ] T035 [US3] Ajustar `index.html`: `#toggle-filters` con `aria-expanded`/`aria-controls`, contenedor de chips dentro de `#search-filters`, `#active-filter-count` con `aria-live="polite"` y botón `#clear-filters` que no toque `#global-search-input`.
- [ ] T036 [US3] En `src/app.js` mantener el estado de orden por tabla (clave y dirección), aplicar el orden por defecto, conectar `onSort`, `#toggle-filters`, la sincronización de chips y conservar `readSearchFilters()`/`clearSearchFilters()` de `src/components/search-bar.js`.

**Checkpoint**: US-UX-03 verificable de forma independiente; búsqueda, orden y filtros bajo presupuesto de 500 ms.

---

## Fase 6: US-UX-04 — Consultar un panel accionable (Prioridad: P2)

**Meta**: estado vacío ilustrado y accionable que oculta banda y embudo, banda compacta de seis indicadores con datos, y distribución por etapa sobre el embudo comercial existente mediante `stageDistribution()`.

**Prueba independiente**: abrir el panel con `localStorage` vacío y ver ilustración + CTA “Registra tu primer cliente” sin KPIs ni embudo; crear datos y comprobar los seis indicadores y las seis columnas del embudo con conteo y monto; marcar una oportunidad como ganada/perdida y ver el recálculo.

### Pruebas de US-UX-04 ⚠️

- [ ] T037 [P] [US4] Crear `tests/unit/crm-metrics-stage-distribution.test.js` con un bucket por estado del ciclo de vida, ceros incluidos, orden de `statusLifecycle.statuses`, estado desconocido ignorado y suma de `totalAmount`.
- [ ] T038 [P] [US4] Crear `tests/integration/dashboard-empty-state.test.js` con `#dashboard-empty-state` visible solo sin clientes ni oportunidades, ilustración `aria-hidden` con `<title>`, CTA `#dashboard-empty-cta` que abre el drawer de cliente y `#crm-stat-grid`/`#commercial-board` ocultos (`CA-UX-04-01…03`).
- [ ] T039 [P] [US4] Ampliar `tests/integration/commercial-board.test.js` con el embudo alimentado por `stageDistribution()`, seis columnas con etiqueta/conteo/monto, estados en cero, tarjeta `button.commercial-card[data-opportunity-id]` que abre la edición y ocultamiento del embudo sin datos o sin perfil CRM.
- [ ] T040 [P] [US4] Migrar `tests/integration/dashboard.test.js`: la banda `#crm-stat-grid` queda `hidden` con almacenamiento vacío, se conservan los asertos de los seis valores calculados en el DOM y se añade la verificación de “Sin datos” en la tasa de cierre.

### Implementación de US-UX-04

- [ ] T041 [P] [US4] Implementar `stageDistribution(documents, statuses)` en `src/crm-metrics.js` devolviendo `StageBucket[]` (`status`, `count`, `amount`) sin depender de `ModuleConfig`, sin persistir y sin calcular tasas de conversión.
- [ ] T042 [US4] Hacer que `src/components/commercial-board.js` consuma `stageDistribution()` conservando su marcado, clases y tarjetas, y oculte `#commercial-board` cuando no haya clientes ni oportunidades o el perfil no sea CRM.
- [ ] T043 [US4] Modificar `src/components/dashboard.js` para mostrar `#dashboard-empty-state` solo si `entities` y `documents` están vacíos, aplicar `hidden` a `#crm-stat-grid` y `#commercial-board` en ese caso y mantener el cálculo de los seis indicadores de `FR-024` en cada render.
- [ ] T044 [US4] Ajustar `index.html`: añadir `#dashboard-empty-state` envolviendo `#dashboard-empty-hint` (id y texto conservados), SVG en línea con `<title>`, CTA `#dashboard-empty-cta`, y `class="stat-grid kpi-band"` en `#crm-stat-grid`.
- [ ] T045 [US4] Añadir a `src/styles.css` los estilos de `.kpi-band`/`.kpi`, `.empty-state` y la ilustración del panel, con contraste ≥ 4.5:1 para `#64748B`.
- [ ] T046 [US4] En `src/app.js` conectar `#dashboard-empty-cta` y los accesos directos del panel a los drawers vacíos correspondientes, y asegurar que `renderDashboard()` recalcule KPIs y embudo al volver al panel.

**Checkpoint**: las cuatro historias funcionan de forma independiente; el panel vacío nunca muestra seis tarjetas de “0”.

---

## Fase 7: Pulido y aspectos transversales

**Propósito**: evidencias reales, limpieza y validación completa de la iteración.

- [ ] T047 [P] Documentar en `README.md` los datos sintéticos usados, las capturas/mediciones de responsive y contraste y el estado real de cada historia, sin declarar cumplido lo no verificado.
- [ ] T048 [P] Limpiar referencias muertas a `#nav-search`, `#search-input`, `opts.focusSearch` y estilos obsoletos en `src/app.js`, `src/components/shell.js`, `src/styles.css` e `index.html`.
- [ ] T049 Ejecutar `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build`, corregir cualquier regresión hasta dejar las cuatro órdenes sin errores (incluidas las 280 pruebas heredadas) y anotar la salida real en `README.md`.
- [ ] T050 [P] Ejecutar el recorrido manual de `quickstart.md` escenarios 1–4 con teclado, a 1440/1024/768/390 px y con verificación de contraste, registrando dimensiones y navegador.
- [ ] T051 [P] Ejecutar la validación de rendimiento de `quickstart.md` (20 búsquedas y 20 ordenamientos sobre 500/1000 registros) y registrar equipo, navegador y tiempos.
- [ ] T052 Comparar `localStorage` antes y después de navegar, ordenar, filtrar y consultar el panel (mismas claves `erp_base_module:*`, mismo `schemaVersion`, sin totales nuevos) y registrar la comparación en `README.md` (`SC-UX-006`).
- [ ] T053 Revisar la coherencia documental entre `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/ui-shell.md`, `quickstart.md` y la enmienda de `specs/001-crm-module/spec.md`; actualizar el contrato y sus pruebas en la misma tarea si cambió algún id.

---

## Dependencias y orden de ejecución

### Dependencias por fase

- **Setup (Fase 1)**: sin dependencias; T001 es bloqueante para toda la feature (contradicción con `001`).
- **Fundacional (Fase 2)**: depende de T001–T002 y **bloquea** las cuatro historias.
- **US1, US2, US3 (Fase 3–5)**: dependen de la Fase 2. US1 es el MVP.
- **US4 (Fase 6)**: depende de la Fase 2; su CTA reutiliza el drawer de US2, por lo que en la práctica se completa después de US2.
- **Pulido (Fase 7)**: depende de las historias que se decidan entregar.

### Dependencias entre historias

- **US-UX-01 (P1)**: independiente tras la Fase 2. El subitem “Nuevo” y `#topbar-primary-action` dependen del drawer de US2 para mostrar el formulario vacío.
- **US-UX-02 (P1)**: independiente tras la Fase 2; no requiere US1.
- **US-UX-03 (P1)**: independiente tras la Fase 2; reutiliza `readSearchFilters()` y no depende de US1 ni US2.
- **US-UX-04 (P2)**: independiente en cálculo (`stageDistribution`), pero su CTA “Registra tu primer cliente” y los accesos directos reutilizan el drawer de US2.

### Dentro de cada historia

1. Las pruebas se escriben y fallan antes de la implementación (T009–T011, T018–T020, T026–T029, T037–T040).
2. Primero las primitivas compartidas, después los componentes de dominio y al final el cableado en `src/app.js` e `index.html`.
3. Ninguna historia se declara terminada con la suite en rojo.

### Oportunidades de paralelización

- T003 y T004 son paralelizables (archivos distintos).
- T007 es paralelizable con T005–T006 (archivo nuevo).
- En US1: T009, T010 y T011 en paralelo (archivos distintos); T012 (`index.html`) y T013 (`shell.js`) pueden ejecutarse en paralelo; T014–T017 son secuenciales por editar `src/app.js`.
- En US2: T018, T019 y T020 en paralelo; T023 (`quick-create-client.js`) en paralelo con T021–T022.
- En US3: T026–T029 en paralelo; T030 en paralelo con T026–T029; después T031–T034 en paralelo (archivos distintos) y T035–T036 secuenciales.
- En US4: T037–T040 en paralelo; T041 en paralelo; T042–T046 secuenciales por dependencia.
- Pulido: T047, T048, T050 y T051 en paralelo; T049, T052 y T053 dependen de las historias entregadas.

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

## Ejemplo paralelo: US-UX-03

```bash
# Primitiva y pruebas
Task: "Crear tests/unit/data-table.test.js"
Task: "Implementar src/components/data-table.js"
Task: "Crear tests/integration/table-sorting.test.js"
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

---

## Estrategia de implementación

### MVP primero (US-UX-01 + primitivas)

1. Completar Fase 1 (T001–T002) y Fase 2 (T003–T008).
2. Completar Fase 3 (US-UX-01, T009–T017).
3. **DETENERSE y VALIDAR** con `npm test -- --run` y el Escenario 1 de `quickstart.md`.
4. Demostrar la búsqueda global y la navegación con submenús como primer incremento.

### Entrega incremental

1. Setup + Fundacional → base lista.
2. US-UX-01 → MVP demostrable (búsqueda y navegación).
3. US-UX-02 → alta/edición en drawer, incluido el alta al vuelo.
4. US-UX-03 → tablas, orden y chips.
5. US-UX-04 → panel accionable.
6. Pulido → evidencias, rendimiento, `localStorage` y documentación.

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
- No se agregan dependencias, entidades, campos, claves de `localStorage` ni versiones de esquema.
- Si cambia un id de `contracts/ui-shell.md`, se actualizan las pruebas en la misma tarea.
- Registrar en `README.md` los resultados reales; lo no verificado se declara pendiente.
