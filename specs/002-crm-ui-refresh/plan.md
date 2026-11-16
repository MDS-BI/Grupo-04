# Plan de implementación: rediseño de interfaz del CRM

**Feature**: `002-crm-ui-refresh` | **Rama**: `main` (sin ramas secundarias) | **Fecha**: 2026-11-16 | **Especificación**: [spec.md](spec.md) | **Modelo**: [data-model.md](data-model.md) | **Investigación**: [research.md](research.md) | **Contrato**: [contracts/ui-shell.md](contracts/ui-shell.md) | **Validación**: [quickstart.md](quickstart.md) | **Dominio heredado**: [../001-crm-module/spec.md](../001-crm-module/spec.md)

## Resumen

La aplicación cumple las historias de `001-crm-module` con 278 pruebas en verde y `eslint` limpio. El problema ya no es funcional sino de interfaz: los formularios viven en tarjetas de 720 px sobre un fondo gris amplio, la búsqueda compite con las secciones del menú lateral, el panel muestra seis tarjetas de “0” sin jerarquía y el alta de oportunidad se bloquea con un aviso estático.

Esta iteración rediseña la capa de presentación en cuatro frentes coordinados: **navegación** (búsqueda en cabecera y submenús), **flujo** (drawers y alta de cliente al vuelo), **densidad** (tablas ordenables y filtros con chips) y **jerarquía** (estado vacío accionable, KPIs compactos y sistema visual). No cambia entidades, campos, reglas, indicadores ni persistencia.

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
| Rendimiento | Presupuesto heredado de 500 ms; se extiende a ordenamiento y filtrado sobre 500/1000 registros |
| Escala de aceptación | 500 clientes y 1000 oportunidades |
| Restricción | Solo frontend; sin router, store, librería de componentes ni Playwright |
| Entregable | MVP frontend rediseñado + seis archivos Speckit de esta feature + enmienda mínima de `001` + evidencias en `README.md` |

## Verificación de la constitución

Constitución vigente: `.specify/memory/constitution.md` **v1.0.0**. Es de cumplimiento obligatorio según su sección de Governance.

| Principio / estándar | Estado | Evidencia o acción comprometida |
|---|---|---|
| I. Code Quality & Maintainability | Pasa el diseño | Tres primitivas con una sola responsabilidad (`ui-overlay.js`, `ui.js`, `data-table.js`) y dos componentes de flujo (`quick-create-client.js`, `filter-chips.js`). No se reescribe la lógica de los formularios existentes. |
| II. Test-First & Verification | Pendiente de implementación | Cada primitiva y cada flujo tiene prueba escrita antes o junto con el código. Las 278 pruebas de `001` deben seguir pasando; los 8 archivos acoplados al DOM se migran en la misma tarea que cambia el shell. |
| III. User Experience Consistency | Pasa el diseño | Un único patrón de drawer, tabla, chip, estado vacío y botón, descrito en `contracts/ui-shell.md`. Terminología CRM de `FR-030` intacta. |
| IV. Performance & Reliability | Pasa el diseño | Sin dependencias ni red; orden y filtro en memoria sobre los mismos volúmenes. Se conserva el presupuesto de 500 ms y se amplía la prueba de rendimiento. |
| Quality Standards | Pendiente | `npm run lint`, `npm run format:check`, `npm test -- --run` y `npm run build` en cada incremento; evidencia real en `README.md`. |
| Development Workflow | Pasa el diseño | Cuatro historias entregables por separado (US-UX-01 a US-UX-04), cada una con criterios y pruebas propias. |

**Desviaciones**:

- **Validación visual sin E2E automatizado**: no se adopta Playwright ni pruebas de captura porque el stack no tiene backend ni CI y la matriz de navegadores se valida manualmente. Se sustituye por pruebas de contrato de DOM, integración en jsdom y el recorrido de `quickstart.md`. Misma desviación ya registrada en `001`.
- **Sin enmienda de `001`, la iteración no es conforme**: `FR-036` y `CA-06-11` de `001` quedarían contradiciendo esta feature. La primera tarea de `tasks.md` es esa enmienda y es bloqueante.

## Decisiones de investigación (Fase 0)

`research.md` resuelve las nueve decisiones de diseño con su justificación y alternativas descartadas. Las que condicionan el plan:

- Drawer lateral de 480 px como patrón único de alta y edición, con pantalla completa bajo 640 px.
- Búsqueda global única en la cabecera; la vista de búsqueda pierde su input propio.
- Submenús “Listado” y “Nuevo” generados desde `ModuleConfig`; sin “Reportes”.
- Alta de cliente al vuelo con validación y persistencia existentes.
- Panel con estado vacío accionable, banda de KPIs y `stageDistribution()` derivada.
- Tablas ordenables con `aria-sort` y chips de filtro sincronizados con los selectores existentes.
- Sistema visual con tokens, sin dependencias y con SVG en línea.
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
  crm-metrics.js               # + stageDistribution() (modificar)
  styles.css                   # tokens, tarjetas, botones, tabla, drawer, KPIs (modificar)
  components/
    shell.js                   # submenús y cabecera (modificar)
    ui-overlay.js              # NUEVO: drawer/modal accesible
    ui.js                      # NUEVO: card header, empty state, chips, badges
    data-table.js              # NUEVO: tabla ordenable accesible
    quick-create-client.js     # NUEVO: alta mínima de cliente
    filter-chips.js            # NUEVO: chips sincronizados con selectores
    dashboard.js               # estado vacío, KPIs y distribución (modificar)
    entity-list.js             # tabla de clientes (modificar)
    entity-detail.js           # resumen del cliente en dos columnas (modificar)
    search-results.js          # tablas de resultados (modificar)
    search-bar.js              # barra colapsable (modificar)
index.html                     # shell, overlay root, panel, tablas (modificar)
tests/
  unit/
    ui-overlay.test.js
    data-table.test.js
  integration/
    ui-shell.test.js
    client-drawer.test.js
    quick-create-client.test.js
    search-filters-chips.test.js
    table-sorting.test.js
    dashboard-empty-state.test.js
    dashboard-funnel.test.js
```

**Archivos de prueba de `001` que se migran en la misma tarea que el shell**: `tests/integration/workspace-shell.test.js`, `search-entities.test.js`, `search-clients.test.js`, `tickets.test.js`, `accessibility.test.js`, `critical-journey.test.js`, `tests/unit/security-render.test.js` y `tests/performance/search-performance.test.js`.

**Decisiones de estructura**:

- Los formularios se **mueven** al drawer, no se duplican. Así se conservan ids, validaciones y pruebas.
- `app.js` sigue siendo el coordinador; no se introduce store ni router.
- El contrato de `contracts/ui-shell.md` es la fuente de verdad de ids y ARIA; cambiarlo exige actualizar pruebas en la misma tarea.
- `data-model.md` de esta feature documenta solo vistas derivadas; el esquema sigue en `001`.

## Estrategia de implementación

1. **Enmendar `001`**: reformular `FR-036` y `CA-06-11` y añadir el puntero a esta feature.
2. **Línea base**: `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build`; registrar resultados reales en `README.md`.
3. **Sistema de diseño**: tokens, tarjetas con cabecera e icono, botones, tabla, chips, estados vacíos e ilustraciones SVG.
4. **Primitivas con prueba previa**: `ui-overlay`, `data-table`, `filter-chips`.
5. **US-UX-01**: cabecera con búsqueda global, submenús y migración de los 8 archivos de prueba.
6. **US-UX-02**: drawer de cliente, oportunidad y ticket; alta de cliente al vuelo; guardián de cambios compartido.
7. **US-UX-03**: tablas de resultados, ordenamiento y chips de filtro.
8. **US-UX-04**: estado vacío, banda de KPIs y distribución por etapa.
9. **Verificación**: regresión completa, accesibilidad, responsive manual, rendimiento y documentación.

## Validación prevista

| Nivel | Evidencia requerida |
|---|---|
| Unitario | `ui-overlay` (apertura, cierre, Esc, foco, restauración, dos overlays), `data-table` (orden asc/desc, `aria-sort`, vacíos al final, estabilidad) y `stageDistribution` |
| Integración | Búsqueda desde cabecera, submenús, drawer de cliente y oportunidad, alta al vuelo, chips, ordenamiento, estado vacío y panel con datos |
| Regresión | Las 278 pruebas de `001` pasan; los 8 archivos migrados no pierden cobertura |
| Accesibilidad | Recorrido completo con teclado por cabecera, submenús, drawer, tabla y panel; foco visible y devuelto; `aria-modal`, `aria-sort` y `aria-pressed` verificados |
| Responsive | Capturas manuales a 1440, 1024, 768 y 390 px; drawer a pantalla completa bajo 640 px; tabla con desplazamiento horizontal |
| Contraste | Texto secundario `#64748B` sobre `#FFFFFF` y botón primario `#0F766E` con texto blanco ≥ 4.5:1 |
| Rendimiento | 20 búsquedas y 20 ordenamientos con 500/1000 registros; al menos 19 de 20 bajo 500 ms; registrar equipo y navegador |
| Datos | Comparar `localStorage` antes y después de navegar, ordenar, filtrar y consultar el panel: sin claves ni campos nuevos |
| Documental | Coherencia entre `spec.md` de `002`, enmienda de `001`, `plan.md`, `research.md`, `data-model.md`, `contracts/ui-shell.md` y `quickstart.md` |

## Riesgos y mitigaciones

- **Pruebas acopladas al DOM**: mover la búsqueda rompe 8 archivos. La tarea de shell incluye su migración y no se cierra hasta que la suite completa pase.
- **Cambios sin guardar en drawer**: el guardián vive hoy en `showModule()` (`src/app.js:155-163`). Se extrae una función compartida y se cubre con prueba de integración.
- **Foco en overlays**: jsdom no implementa `inert` ni `<dialog>` completo. Se implementa trampa de foco explícita con `keydown` y prueba unitaria propia.
- **Dos overlays simultáneos**: el alta al vuelo se abre sobre el drawer de oportunidad. Solo el superior recibe foco y se apila en una pila de overlays.
- **Dos fuentes de búsqueda**: se elimina el input de la vista y queda un único control global.
- **Crecimiento del panel**: la distribución es solo lectura y se recalcula una vez por render.
- **Interpretación del embudo**: se etiqueta “Distribución por etapa”, nunca “tasa de conversión” ni predicción.

## Seguimiento de complejidad

Se agregan cinco archivos y ningún patrón adicional. `ui-overlay` existe porque tres flujos necesitan el mismo comportamiento accesible; `data-table` porque tres listados comparten columnas, orden y estados; `ui.js` porque cabeceras, chips y estados vacíos se repiten en todas las vistas; `quick-create-client` y `filter-chips` encapsulan dos interacciones que de otro modo quedarían dispersas en `app.js`. No se justifica un router, un store ni una librería de componentes: el estado sigue viviendo en `app.js` y en `localStorage`.
