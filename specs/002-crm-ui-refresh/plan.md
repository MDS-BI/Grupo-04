# Plan de implementación: rediseño de interfaz del CRM

**Feature**: `002-crm-ui-refresh` | **Rama**: `main` (sin ramas secundarias) | **Fecha**: 2026-11-16 | **Especificación**: [spec.md](spec.md) | **Modelo**: [data-model.md](data-model.md) | **Investigación**: [research.md](research.md) | **Contrato**: [contracts/ui-shell.md](contracts/ui-shell.md) | **Validación**: [quickstart.md](quickstart.md) | **Dominio heredado**: [../001-crm-module/spec.md](../001-crm-module/spec.md)

## Resumen

La aplicación cumple las historias de `001-crm-module` con 29 archivos y 280 pruebas en verde y `eslint` limpio. El problema ya no es funcional sino de interfaz: los formularios viven en tarjetas de 720 px sobre un fondo gris amplio, la búsqueda compite con las secciones del menú lateral, el panel muestra seis tarjetas de “0” sin jerarquía y el alta de oportunidad se bloquea con un aviso estático.

El equipo ya aportó una integración visual en `5aa9799`: embudo comercial de seis etapas (`src/components/commercial-board.js`), identidad verde y MER en SVG. Esta iteración **parte de ese trabajo**: conserva el tablero accionable, extrae su cálculo a una función con pruebas, añade una banda compacta de distribución alimentada por esa misma función, convierte el verde en acento sobre una base neutra y completa lo que falta (estado vacío accionable, accesibilidad, densidad de tabla, superficies y alcance responsive).

Esta iteración rediseña la capa de presentación en cinco frentes coordinados: **navegación** (búsqueda en cabecera y submenús), **flujo** (drawers y alta de cliente al vuelo), **densidad** (tablas ordenables y filtros con chips), **jerarquía** (estado vacío accionable, KPIs compactos y sistema visual) e **identidad** (base neutra, superficies, movimiento y alcance responsive). No cambia entidades, campos, reglas, indicadores ni persistencia.

## Contexto técnico

| Aspecto | Decisión |
|---|---|
| Lenguaje | JavaScript ES2022, HTML y CSS, según el template base |
| Entorno | Vite; versiones exactas de `package.json` y lockfile |
| Dependencias | Ninguna nueva de ejecución ni de desarrollo |
| Persistencia | `localStorage`, mismas claves de `001` y `schemaVersion` sin cambios; no se persisten derivados |
| Pruebas | Vitest + jsdom; unitarias por primitiva, integración por flujo y extensión de la prueba de rendimiento |
| Plataforma | Navegadores modernos; escritorio ≥ 1024 px, tablet 640–1023 px, móvil < 640 px; Chrome y Firefox actuales |
| Accesibilidad | WCAG 2.1 AA: foco visible, `aria-modal`, trampa de foco, `aria-sort`, `aria-pressed`, contraste 4.5:1 |
| Confirmación de descarte | Modal propio de `ui-overlay` (`data-variant="modal"`) con “Descartar” y “Seguir editando”; sin `window.confirm()` |
| Tablas | Única acción por fila “Editar”; borrado solo en la barra compacta heredada; estado vacío distingue filtro de ausencia de datos; encabezado fijo, filas de 44–48 px y cifras tabulares alineadas |
| Cabecera oscura | Búsqueda con fondo claro, ancho máximo 480 px, contraste de texto ≥ 4.5:1 y anillo de foco ≥ 3:1 |
| Panel | Dos presentaciones de una fuente: banda compacta de distribución y tablero accionable, ambas desde `stageDistribution()` |
| Identidad visual | Base neutra (`#F7F8FA`/`#FFFFFF`/`#E4E7EC`/`#0F172A`) con verde solo como acento; `--text-muted` `#52606F`; hexadecimales centralizados en `:root` |
| Espacio y superficies | Escala de 8 px (`--space-1…8`); página plana, sección con borde y sombra solo en lo elevado; una sola señal de elevación por bloque |
| Componentes | Un vocabulario `.btn-*`, dos tamaños (32/40 px) y estados `hover`/`active`/`disabled`/`loading`/foco; se elimina `.primary` |
| Movimiento | `--dur-fast` 120 ms y `--dur-base` 160 ms; `prefers-reduced-motion` anula transiciones |
| Responsive | Bajo 900 px navegación desplegable con submenús completos; bajo 640 px tabla como tarjetas; tema oscuro opcional por tokens |
| Rendimiento | Presupuesto heredado de 500 ms; se extiende a ordenamiento y filtrado sobre 500/1000 registros |
| Escala de aceptación | 500 clientes y 1000 oportunidades |
| Restricción | Solo frontend; sin router, store, librería de componentes ni Playwright |
| Entregable | MVP frontend rediseñado + seis archivos Speckit de esta feature + enmienda mínima de `001` + evidencias en `README.md` |

## Verificación de la constitución

Constitución vigente: `.specify/memory/constitution.md` **v1.0.0**. Es de cumplimiento obligatorio según su sección de Governance.

| Principio / estándar | Estado | Evidencia o acción comprometida |
|---|---|---|
| I. Code Quality & Maintainability | Pasa el diseño | Tres primitivas con una sola responsabilidad (`ui-overlay.js`, `ui.js`, `data-table.js`) y dos componentes de flujo (`quick-create-client.js`, `filter-chips.js`). No se reescribe la lógica de los formularios existentes. |
| II. Test-First & Verification | Pendiente de implementación | Cada primitiva y cada flujo tiene prueba escrita antes o junto con el código. Las 280 pruebas actuales (278 de `001` más 2 del embudo) deben seguir pasando; los 12 archivos acoplados a la búsqueda se migran en la misma tarea que cambia el shell. |
| III. User Experience Consistency | Pasa el diseño | Un único patrón de drawer, modal de confirmación, tabla, chip, estado vacío y botón, descrito en `contracts/ui-shell.md`, más un sistema visual único (paleta neutra, escala de espacio, superficies y movimiento) que se aplica a las cuatro vistas. La tabla distingue el vacío por filtro del vacío por datos. Terminología CRM de `FR-030` intacta. |
| IV. Performance & Reliability | Pasa el diseño | Sin dependencias ni red; orden y filtro en memoria sobre los mismos volúmenes. Se conserva el presupuesto de 500 ms y se amplía la prueba de rendimiento. |
| Quality Standards | Pendiente | `npm run lint`, `npm run format:check`, `npm test -- --run` y `npm run build` en cada incremento; evidencia real en `README.md`. |
| Development Workflow | Pasa el diseño | Cuatro historias entregables por separado (US-UX-01 a US-UX-04), cada una con criterios y pruebas propias. |

**Desviaciones**:

- **Validación visual sin E2E automatizado**: no se adopta Playwright ni pruebas de captura porque el stack no tiene backend ni CI y la matriz de navegadores se valida manualmente. Se sustituye por pruebas de contrato de DOM, integración en jsdom y el recorrido de `quickstart.md`. Misma desviación ya registrada en `001`.
- **Sin enmienda de `001`, la iteración no es conforme**: `FR-036` y `CA-06-11` de `001` quedarían contradiciendo esta feature. La primera tarea de `tasks.md` es esa enmienda y es bloqueante.

**Reevaluación post-diseño (Fase 1)**: las clarificaciones de alcance, flujo y sistema visual no agregan dependencias, entidades, campos ni persistencia. El modal de descarte reutiliza `ui-overlay`; la acción “Editar” reutiliza el drawer; los estados vacíos, el alcance de filtros, la identidad neutra y el responsive son vistas de render o reglas CSS. Los cuatro principios siguen en “Pasa el diseño”.

## Decisiones de investigación (Fase 0)

`research.md` resuelve las decisiones de diseño con su justificación y alternativas descartadas, incluidas las clarificaciones de alcance, flujo y sistema visual. Las que condicionan el plan:

- Drawer lateral de 480 px como patrón único de alta y edición, con pantalla completa bajo 640 px.
- Búsqueda global única en la cabecera; la vista de búsqueda pierde su input propio. Sin criterio, la vista permanece con la pista y conserva los filtros.
- Submenús “Listado” y “Nuevo” generados desde `ModuleConfig`; sin “Reportes”.
- Alta de cliente al vuelo con validación y persistencia existentes.
- Panel con estado vacío accionable (icono), banda de KPIs, **banda de distribución por etapa** y **tablero accionable** derivados de `stageDistribution()`, sin una segunda aritmética.
- Tablas ordenables con `aria-sort`, encabezado fijo, cifras tabulares alineadas y truncado visual; la única acción por fila es “Editar” y el borrado queda en la barra compacta con los ids de `001`.
- Estado vacío de tabla con dos variantes: “Limpiar filtros” si hay criterio o filtros activos, “Nuevo cliente/oportunidad” si no hay registros.
- Confirmación de descarte con modal propio sobre `ui-overlay`; se prohíbe `window.confirm()`.
- Chips de filtro sincronizados con los selectores existentes, montados solo en la vista de búsqueda.
- Sistema visual con tokens, escala tipográfica cerrada y SVG en línea, sin dependencias.
- Identidad neutra con verde reservado a CTA, estado activo y dato destacado; `--text-muted` oscurecido a `#52606F` para cumplir AA sobre los cuatro fondos reales.
- Escala de espacio de 8 px y una sola señal de elevación por bloque; el indicador lateral de 3 px se reserva al estado activo de navegación.
- Botones y campos con un único vocabulario, dos tamaños y estados completos; `prefers-reduced-motion` obligatorio.
- Navegación desplegable bajo 900 px y tabla como tarjetas bajo 640 px, cerrando el hueco del rail de 60 px frente a `FR-UX-002`.
- Tema oscuro opcional, solo por tokens y `prefers-color-scheme`, sin claves nuevas de `localStorage`.
- Cero cambios de esquema y cero migraciones.

## Arquitectura y estructura

```text
specs/002-crm-ui-refresh/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/
    ui-shell.md
  tasks.md                     # se genera con /speckit.tasks
src/
  app.js                       # drawer, búsqueda global, quick-create, orden (modificar)
  crm-metrics.js               # + stageDistribution() extraída del embudo (modificar)
  styles.css                   # tokens, tarjetas, botones, tabla, drawer, KPIs (modificar)
  components/
    shell.js                   # submenús y cabecera (modificar)
    ui-overlay.js              # NUEVO: drawer, modal de confirmación y foco accesible
    ui.js                      # NUEVO: card header, empty state, chips, badges
    data-table.js              # NUEVO: tabla ordenable accesible, acción Editar y vacío contextual
    quick-create-client.js     # NUEVO: alta mínima de cliente
    filter-chips.js            # NUEVO: chips sincronizados con selectores
    dashboard.js               # estado vacío y banda de KPIs (modificar)
    stage-distribution.js      # NUEVO: banda compacta de distribución por etapa
    commercial-board.js        # tablero del equipo: consume stageDistribution y respeta el panel vacío (modificar)
    entity-list.js             # tabla de clientes (modificar)
    document-list.js           # tabla de oportunidades (modificar)
    entity-detail.js           # resumen del cliente en dos columnas (modificar)
    search-results.js          # tablas de resultados (modificar)
    search-bar.js              # barra colapsable (modificar)
index.html                     # shell, overlay root, panel, tablas (modificar)
tests/
  unit/
    ui-overlay.test.js
    data-table.test.js
    crm-metrics-stage-distribution.test.js   # NUEVO: orden, ceros, estado desconocido, montos
  integration/
    ui-shell.test.js
    client-drawer.test.js
    quick-create-client.test.js
    search-filters-chips.test.js
    table-sorting.test.js
    table-empty-state.test.js                # NUEVO: vacío por filtro vs. sin registros
    dashboard-empty-state.test.js
    commercial-board.test.js                 # ampliar: panel vacío y tablero del equipo
    stage-distribution.test.js               # NUEVO: banda, barras, ceros y fuente única
    responsive-nav.test.js                   # NUEVO: nav desplegable < 900 px, Esc y foco devuelto
```

**Archivos de prueba de `001` que se migran en la misma tarea que el shell**: `tests/integration/workspace-shell.test.js`, `search-entities.test.js`, `search-clients.test.js`, `tickets.test.js`, `custom-fields.test.js`, `manage-document.test.js`, `manage-tabs.test.js`, `relabeling.test.js`, `dashboard.test.js`, `critical-journey.test.js`, `tests/unit/security-render.test.js` y `tests/performance/search-performance.test.js`.

**Prueba heredada que cambia de expectativa**: `tests/integration/dashboard.test.js` afirma hoy que la banda de indicadores se ve con almacenamiento vacío. `CA-UX-04-01` exige lo contrario. Se migra en la misma tarea que el estado vacío, conservando el aserto de los seis valores (se siguen calculando y escribiendo en el DOM) y añadiendo `hidden` en la banda, la distribución y el tablero.

**Decisiones de estructura**:

- Los formularios se **trasladan** al drawer al abrirlo y se restauran a su contenedor original al cerrarlo; no se duplican ni se recrean. Permanecen en el DOM desde la inicialización, de modo que se conservan ids, validaciones y las 280 pruebas heredadas sin migración masiva.
- `commercial-board.js` **no se reescribe**: conserva su marcado, sus clases y sus tarjetas. Solo pasa a consumir `stageDistribution()` y a ocultarse cuando el panel está vacío o no hay oportunidades.
- `stage-distribution.js` es una presentación nueva sobre la misma función: no recalcula nada, no conoce `ModuleConfig` y no persiste. Su ancho de barra se deriva del conteo del render.
- La tabla densa no cambia el modelo: `data-table.js` marca columnas numéricas y envuelve la tabla en `.table-wrap`. Encabezado fijo y truncado son CSS; las pruebas verifican estructura y atributos, no estilos calculados, porque jsdom no resuelve `position: sticky`.
- `app.js` sigue siendo el coordinador; no se introduce store ni router.
- El contrato de `contracts/ui-shell.md` es la fuente de verdad de ids y ARIA; cambiarlo exige actualizar pruebas en la misma tarea.
- `data-model.md` de esta feature documenta solo vistas derivadas; el esquema sigue en `001`.
- El modal de descarte no duplica lógica: reutiliza `ui-overlay` a través de una única función `confirmDiscardChanges()` usada por `showModule()`, el cierre del drawer y la navegación por hash.
- La barra de filtros se monta solo en `#view-search`; los listados “Listado” no la montan y leen el criterio y los filtros conservados al volver.
- La acción “Editar” de la fila y los controles `#edit-entity` / `#edit-document` abren el mismo drawer; no hay dos implementaciones de edición.
- El sistema visual se resuelve por completo en `styles.css` con tokens; no se agrega ningún archivo nuevo por las fases 8–10. Las media queries de navegación y tabla no se pueden evaluar en jsdom: las pruebas verifican la estructura (`#nav-toggle`, `aria-expanded`, `data-label` por celda) y el efecto visual se valida a 768 y 390 px en `quickstart.md`.

## Estrategia de implementación

1. **Enmendar `001`**: reformular `FR-036` y `CA-06-11` y añadir el puntero a esta feature.
2. **Línea base**: `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build`; registrar resultados reales en `README.md`.
3. **Sistema de diseño**: tokens, escala tipográfica cerrada, tarjetas con cabecera e icono, botones, tabla densa, chips, estados vacíos con icono y estilos de la cabecera oscura.
4. **Primitivas con prueba previa**: `ui-overlay`, `data-table`, `filter-chips`.
5. **US-UX-01**: cabecera con búsqueda global, submenús y migración de los 12 archivos de prueba.
6. **US-UX-02**: drawer de cliente, oportunidad y ticket; alta de cliente al vuelo; guardián de cambios compartido con modal de descarte propio.
7. **US-UX-03**: tablas de resultados, acción “Editar” por fila, ordenamiento, estados vacíos con CTA contextual y chips de filtro solo en la búsqueda.
8. **US-UX-04**: extraer `stageDistribution()` del tablero con prueba unitaria, estado vacío con icono, banda de KPIs compacta, banda de distribución y visibilidad del tablero según datos.
9. **Identidad neutra**: paleta sin tinte verde, `--text-muted` corregido, detalles nativos, sidebar e indicadores; auditar que no queden hexadecimales fuera de `:root`.
10. **Sistema**: escala de espacio, jerarquía de superficies, botones y campos unificados, movimiento y estados de tabla.
11. **Responsive**: navegación desplegable bajo 900 px, tabla como tarjetas bajo 640 px y tema oscuro opcional por tokens.
12. **Verificación**: regresión completa, accesibilidad, responsive manual, rendimiento y documentación.

## Validación prevista

| Nivel | Evidencia requerida |
|---|---|
| Unitario | `ui-overlay` (apertura, cierre, Esc, foco, restauración, dos overlays, `confirm-discard`), `data-table` (orden asc/desc, `aria-sort`, vacíos al final, estabilidad, contenedor `role="region"` y columnas numéricas) y `stageDistribution` (un bucket por estado, ceros incluidos, estado desconocido ignorado, suma de montos) |
| Integración | Búsqueda desde cabecera y sin criterio, submenús, drawer de cliente y oportunidad, alta al vuelo, modal de descarte, chips, ordenamiento, acción “Editar” por fila, estados vacíos de tabla, banda de distribución y tablero del panel |
| Regresión | Las 280 pruebas actuales pasan (278 de `001` más 2 del embudo); los 12 archivos migrados no pierden cobertura |
| Accesibilidad | Recorrido completo con teclado por cabecera, submenús, drawer, modal de descarte, tabla, tablero, distribución y navegación desplegable; foco visible y devuelto; `aria-modal`, `aria-expanded`, `aria-sort`, `aria-pressed` y regiones desplazables verificadas; ninguna dependencia de `window.confirm()` |
| Responsive | Capturas manuales a 1440, 1024, 768 y 390 px; drawer a pantalla completa bajo 640 px; a 768 px navegación desplegable con “Listado / Nuevo” completos; a 390 px tabla como tarjetas con etiqueta por celda y sin scroll horizontal forzado |
| Contraste | Texto secundario `#52606F` sobre `#F7F8FA`, `#FFFFFF`, `#E6EDE9` y `#123C36`; botón primario `#0F766E` con texto blanco ≥ 4.5:1; placeholder y anillo de foco de `#global-search-input` sobre la cabecera oscura ≥ 4.5:1 y ≥ 3:1 |
| Auditoría visual | Cero hexadecimales fuera de `:root`, cinco tamaños tipográficos, espaciados solo de la escala y ausencia de `.primary` (`SC-UX-009`) |
| Movimiento | Con `prefers-reduced-motion: reduce` no hay transición; con la preferencia por defecto, las transiciones duran 120–160 ms |
| Tema oscuro | Si se entrega: responde a `prefers-color-scheme`, conserva AA y no agrega claves de `localStorage`; si no, se declara pendiente |
| Rendimiento | 20 búsquedas y 20 ordenamientos con 500/1000 registros; al menos 19 de 20 bajo 500 ms; registrar equipo y navegador |
| Datos | Comparar `localStorage` antes y después de navegar, ordenar, filtrar y consultar el panel: sin claves ni campos nuevos |
| Documental | Coherencia entre `spec.md` de `002`, enmienda de `001`, `plan.md`, `research.md`, `data-model.md`, `contracts/ui-shell.md` y `quickstart.md` |

## Riesgos y mitigaciones

- **Pruebas acopladas al DOM**: mover la búsqueda rompe 12 archivos. La tarea de shell incluye su migración y no se cierra hasta que la suite completa pase. El traslado de formularios al drawer no rompe la suite porque las tarjetas siguen en el DOM y se restauran al cerrar; solo `opportunity-lifecycle.test.js` requiere migración por el borrado de fila.
- **Cambios sin guardar en drawer**: el guardián vive hoy en `showModule()` (`src/app.js:155-163`). Se extrae una función compartida y se cubre con prueba de integración.
- **Foco en overlays**: jsdom no implementa `inert` ni `<dialog>` completo. Se implementa trampa de foco explícita con `keydown` y prueba unitaria propia.
- **Dos overlays simultáneos**: el alta al vuelo se abre sobre el drawer de oportunidad y la confirmación de descarte se apila sobre el overlay que la origina. Solo el superior recibe foco y se apila en una pila de overlays.
- **Confirmación bloqueante**: `window.confirm()` no es estilizable, no expone `role="dialog"` y bloquea jsdom. Se prohíbe y se cubre con el modal de `ui-overlay` en la prueba unitaria.
- **Doble vía de borrado**: la fila solo ofrece “Editar”. El borrado queda exclusivamente en la barra compacta con `#delete-entity` / `#delete-document`, para no duplicar acciones destructivas ni sus confirmaciones.
- **Estado vacío ambiguo**: el componente recibe `reason` (`no-records` o `no-matches`) para no ofrecer “crear” cuando el problema es un filtro, ni “limpiar” cuando no hay registros.
- **Dos fuentes de búsqueda**: se elimina el input de la vista y queda un único control global.
- **Dos vistas de etapas**: la versión anterior descartaba `#stage-distribution` por riesgo de divergencia. Ahora ambas presentaciones leen la misma llamada a `stageDistribution()` en el mismo render, así que la divergencia es imposible; la banda compacta resuelve la lectura proporcional y el tablero conserva la acción. Se documenta la regla en `data-model.md` y se prueba en `stage-distribution.test.js` (`CA-UX-04-10`).
- **Barras sin datos**: con cero oportunidades el total es `0`; el ancho se calcula con `share = total === 0 ? 0 : count / total` y se prueba que no aparece `NaN` (`CA-UX-04-12`).
- **Tablero de seis columnas en grilla 3×2**: sustituye la grilla por `.board-scroll` con seis columnas y desplazamiento horizontal, para que la lectura por etapa sea una sola fila.
- **Contraste sobre la cabecera oscura**: el input de búsqueda y la acción principal viven sobre `#123C36`. Se fija fondo, placeholder y anillo de foco en el contrato y se mide el contraste real en la validación manual (`NFR-UX-005`).
- **Estilos no verificables en jsdom**: `position: sticky`, `text-overflow` y `tabular-nums` no se calculan en jsdom. Las pruebas verifican estructura, clases y atributos; el efecto visual se valida en el recorrido de `quickstart.md`.
- **Regresión en el panel vacío**: `tests/integration/dashboard.test.js` espera hoy la banda visible con ceros. Se migra junto con el estado vacío, en la misma tarea.
- **Interpretación del embudo**: el tablero conserva el título “Embudo comercial” del equipo y la banda compacta se rotula “Distribución por etapa”; ninguna de las dos es una “tasa de conversión” ni una predicción.
- **Auditoría de color manual**: mover hexadecimales a `:root` puede dejar valores inline en `index.html` o en estilos de componentes. La tarea T060 incluye una búsqueda de `#` en `src/styles.css`, `index.html` y `src/` y la registra en `README.md`; `SC-UX-009` es la evidencia.
- **Contraste medido sobre fondos tintados**: `#64748B` pasa sobre blanco pero falla sobre `#F2F4F8` y `#E6EDE9`. Se cambia a `#52606F` y se miden los cuatro pares reales; no se acepta una medición única sobre blanco (`NFR-UX-008`).
- **Regresión por reescritura de tokens**: T060 reemplaza valores que las cuatro historias ya consumen. Se ejecuta después de ellas y con la suite completa en verde; cualquier prueba que dependa de un color concreto se revisa en la misma tarea.
- **Dos vocabularios de botón**: retirar `.primary` puede dejar llamadas huérfanas en `index.html` o `src/`. T067 migra todas las apariciones y `npm run build` más la suite detectan cualquier referencia rota.
- **Media queries no verificables en jsdom**: jsdom no evalúa `@media` ni `prefers-reduced-motion`. Las pruebas cubren estructura y atributos; la navegación a 768 px, la tabla a 390 px, el movimiento reducido y el tema oscuro se validan manualmente en `quickstart.md`.
- **QA de tema oscuro**: si se entrega, duplica la superficie de contraste. T072 reutiliza los tokens y T064 mide los mismos cuatro pares en ambos esquemas; si no se alcanza AA, se retira la entrega y se declara pendiente en lugar de dejar un tema que incumple.
- **Navegación móvil y foco**: un panel desplegable mal cerrado deja el foco atrapado o en el fondo. T070 exige Esc, clic fuera, devolución del foco y prueba de integración propia (`responsive-nav.test.js`).

## Seguimiento de complejidad

Se agregan seis archivos y ningún patrón adicional. `ui-overlay` existe porque tres flujos necesitan el mismo comportamiento accesible; `data-table` porque tres listados comparten columnas, orden, densidad y estados; `ui.js` porque cabeceras, chips y estados vacíos se repiten en todas las vistas; `quick-create-client` y `filter-chips` encapsulan dos interacciones que de otro modo quedarían dispersas en `app.js`; `stage-distribution` porque la banda compacta y el tablero son dos presentaciones con propósitos distintos sobre una única función. El tablero de etapas **no** se agrega como componente nuevo: se reutiliza `commercial-board.js` y solo se extrae su cálculo a `stageDistribution()`. Las fases 8–10 **no agregan archivos**: son tokens, reglas CSS y una media query; su única prueba nueva es `responsive-nav.test.js`, porque la navegación móvil sí introduce comportamiento. No se justifica un router, un store ni una librería de componentes: el estado sigue viviendo en `app.js` y en `localStorage`.
