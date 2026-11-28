# Plan de implementación: Ticket de post-venta completo

**Feature**: `004-ticket-postventa` | **Rama de trabajo**: `main` (sin ramas secundarias, según la instrucción del curso) | **Fecha**: 2026-11-28 | **Especificación**: [spec.md](spec.md) | **Modelo**: [data-model.md](data-model.md) | **Investigación**: [research.md](research.md) | **Contratos**: [ticket-storage.md](contracts/ticket-storage.md), [ticket-ui.md](contracts/ticket-ui.md) | **Validación**: [quickstart.md](quickstart.md) | **Línea base**: [001-crm-module](../001-crm-module/spec.md), [002-crm-ui-refresh](../002-crm-ui-refresh/spec.md), [003-crm-campanas](../003-crm-campanas/spec.md)

## Resumen

El módulo CRM actual registra tickets dentro de la ficha del cliente, siempre en estado `En proceso`, sin folio, asunto, solicitante, canal, responsable, SLA ni historial. La resolución solo admite un resumen y el panel no distingue la operación de soporte. Esta iteración convierte el ticket en una unidad de trabajo completa y **aditiva**: no reemplaza clientes, oportunidades, contactos, actividades, búsqueda, papelera ni los indicadores vigentes.

El enfoque técnico es el mismo que ya usa el proyecto, sin dependencias nuevas: reglas puras en `src/crm-rules.js`, indicadores puros en `src/crm-metrics.js`, persistencia atómica en `src/storage.js`, una vista `#/tickets` coordinada por `src/app.js`, y componentes de presentación que reutilizan el drawer, la tabla, los badges, los diálogos y el sistema visual existentes. La ampliación del esquema sube a `SCHEMA_VERSION = 4` con migración explícita, respaldo recuperable y sin inventar datos históricos.

La entrega se ordena en ocho historias (US-25 a US-32): bandeja global, folio y asunto, solicitante/canal/responsable, ciclo de vida y cierre, SLA, historial, indicadores y satisfacción. La rebanada P1 deja el soporte operable; P2 completa la medición y la voz del cliente.

## Contexto técnico

| Aspecto | Decisión |
|---|---|
| Lenguaje | JavaScript ES2022 con módulos ES; HTML5 y CSS. Sin TypeScript ni framework. |
| Entorno | Vite 8 y Vitest 4 con jsdom 30, según `package.json` y el lockfile. |
| Dependencias | Ninguna nueva de ejecución ni de desarrollo. |
| Persistencia | `localStorage`, claves existentes (`entities`, `documents`, `tickets`, `crmContacts`, `crmActivities`, `crmTrash`, `crmRecovery`, `schemaVersion`) más `erp_base_module:crmBackup:v3`. `SCHEMA_VERSION` pasa de 3 a 4. |
| Escritura | Instantánea completa y atómica: ticket, historial y versión se confirman juntos o no se confirman. El historial es un arreglo embebido, no una colección nueva. |
| Pruebas | Vitest + jsdom: unitarias para reglas puras, integración para flujos de DOM y rendimiento para la bandeja. Sin Playwright ni E2E automatizado (misma desviación declarada en `001` y `002`); el recorrido manual queda en `quickstart.md`. |
| Plataforma | Aplicación web estática de una sola página con rutas hash; Chrome y Firefox actuales en escritorio y móvil. |
| Tipo de proyecto | Frontend único con Vite; `src/` para dominio y componentes, `tests/` para unitarias, integración y rendimiento. |
| Accesibilidad | WCAG 2.1 AA: foco visible, trampa de foco y `Escape` en overlays, filas de bandeja operables con `Enter`/`Espacio`, `aria-sort`, `aria-live`, etiquetas asociadas y semáforo con texto e icono además del color. |
| Rendimiento | Con 1000 tickets, filtrar y ordenar la bandeja en menos de 500 ms en al menos 19 de 20 mediciones; el panel se recalcula en cada render sin totales persistidos. |
| Escala | 1000 tickets, una organización, un navegador y moneda CLP. |
| Restricciones | Sin backend, API, autenticación, permisos por rol, router, store, IA, adjuntos ni ingesta real de canales. Sin datos inventados en la migración. |
| Fecha y hora | Fecha y hora local del dispositivo para folio, SLA, garantía y semáforos; `createdAt`, `resolvedAt`, `closedAt` y `updatedAt` en ISO 8601 generados por el sistema. |
| Catálogos | `channel`, `assignee` y `team` nuevos en `ModuleConfig`; se conservan `priority` y `reason`. Son etiquetas de demostración, no cuentas autenticadas. |

## Verificación de la constitución

Constitución vigente: `.specify/memory/constitution.md` **v1.0.0**. Es de cumplimiento obligatorio según su sección de Governance.

| Principio / estándar | Estado | Evidencia o acción comprometida |
|---|---|---|
| I. Code Quality & Maintainability | Pasa el diseño | Una sola fuente de verdad para estados (`TICKET_TRANSITIONS`, `canTransitionTicket`), folio (`nextTicketFolio`), SLA (`computeSlaDueAt`, `getSlaStatus`), historial (`appendTicketHistory`) e indicadores (`crm-metrics.js`). La interfaz y el almacenamiento consumen esas funciones; no se duplican reglas en `app.js`. |
| II. Test-First & Verification | Pendiente de implementación | Cada regla y cada flujo tiene prueba escrita antes o junto con el código, según la estrategia de `tasks.md`. Los 57 archivos y 461 pruebas vigentes deben seguir en verde; las pruebas que fijan el ciclo anterior (`ticket-rules`, `ticket-resolution`, `tickets`, `integrity`, fixture de rendimiento) se actualizan de forma justificada y sin reducir cobertura. |
| III. User Experience Consistency | Pasa el diseño | La bandeja reutiliza `data-table`, badges y estados vacíos; el alta y la edición reutilizan el drawer y `ticket-form`; el detalle es un drawer de solo lectura con acciones; la eliminación y el cierre usan el modal accesible de `ui-overlay`, no `window.confirm()`. Terminología “ticket/tickets” y textos en español. |
| IV. Performance & Reliability | Pasa el diseño | Filtro y orden en una sola pasada sobre 1000 tickets, claves derivadas precalculadas por render y sin red. La instantánea atómica impide tickets a medio actualizar; la migración conserva respaldo y la versión anterior ante fallo. |
| Quality Standards | Pendiente | `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build` en cada incremento; resultados reales, fecha, navegador y equipo en `README.md`. |
| Development Workflow | Pasa el diseño | Ocho historias verificables por separado, con dependencias explícitas: US-25 a US-30 (P1) y US-31 a US-32 (P2). Cada incremento actualiza su documentación y evidencia. |

**Desviaciones**:

- **Sin E2E automatizado ni matriz de navegadores en CI**: el stack no tiene backend ni CI y jsdom no evalúa media queries, contraste ni rendimiento real. Se sustituye por pruebas unitarias, integración de DOM, presupuesto de rendimiento en jsdom y el recorrido manual de `quickstart.md`, registrando navegador y equipo. Es la misma desviación ya aceptada en `001` y `002`.
- **Confirmación de migración**: el flujo actual usa `window.confirm()`. Esta iteración lo sustituye por el modal accesible de `ui-overlay` para la migración y para las acciones destructivas del ticket, porque `window.confirm()` no es estilizable, no expone `role="dialog"` y bloquea jsdom. Es una mejora de consistencia, no un cambio de alcance.
- **Concurrencia entre pestañas**: no se promete serialización transaccional. Se relee la instantánea antes de escribir y se verifica la unicidad del folio; una escritura obsoleta se rechaza con un mensaje de recarga cuando se detecta. La limitación se documenta en el contrato y en `README.md`.

**Reevaluación post-diseño (Fase 1)**: las decisiones de `research.md` no agregan dependencias, entidades persistidas nuevas ni colecciones. El historial es embebido, el SLA es derivado y los indicadores son funciones puras. La única clave nueva es el respaldo de migración, que no es una entidad de negocio. La migración y el respaldo se resuelven dentro de `storage.js` y `storage-recovery.js`; no se introduce un motor de migraciones. Los cuatro principios siguen en “Pasa el diseño”.

## Decisiones de investigación (Fase 0)

`research.md` documenta cada decisión con su justificación y alternativas descartadas. Las que condicionan el plan:

- Esquema v4 aditivo; las escrituras se bloquean mientras haya una migración pendiente y la lectura de datos v3 sigue disponible para mostrar el aviso.
- Folio determinista `TKT-AAAA-####`: máximo correlativo del año local de `createdAt` más uno; unicidad contra toda la colección; inmutable; límite 9999 por año.
- Máquina de estados pura y compartida; `Cerrado` terminal; `Resuelto` solo avanza a `Cerrado`; la prioridad se congela desde `Resuelto`.
- SLA derivado de `createdAt` y prioridad vigente, con `slaDueAt` materializado solo como dato informativo y recalculado en cada lectura; sin pausas ni calendario laboral.
- Historial embebido, append-only y escrito en la misma instantánea; `actor` es el técnico asignado o “Sistema”, nunca una identidad autenticada inventada.
- Solicitante con `contactId` más copia de respaldo; un contacto eliminado o de otro cliente no se reescribe en silencio, pero un valor nuevo inválido se rechaza.
- Bandeja global con estado de filtros y orden en memoria, no persistido; comparador estable por prioridad, `slaDueAt`, `createdAt` y `folio`.
- Detalle en drawer de solo lectura con acciones por estado; no se crea una ruta de detalle.
- Indicadores y CSAT calculados en el render; no se persisten agregados.
- Migración con respaldo `erp_base_module:crmBackup:v3`, verificación previa de cuota, folio determinista, asunto copiado de la descripción y una entrada `migracion` veraz; restauración explícita.
- Rendimiento con filtro y orden en memoria y claves precalculadas; no se agrega virtualización ni paginación.

## Arquitectura y estructura

```text
specs/004-ticket-postventa/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  contracts/
    ticket-storage.md
    ticket-ui.md
  tasks.md                     # se genera con /speckit.tasks

src/
  module-config.js             # catálogos channel, assignee y team (modificar)
  crm-rules.js                 # estados, transiciones, folio, SLA, historial, validaciones (modificar)
  crm-metrics.js               # indicadores de soporte y CSAT (modificar)
  storage.js                   # v4, operaciones de ticket y migración (modificar)
  storage-recovery.js          # registrar la clave de respaldo de migración (modificar)
  crm-timeline.js              # folio, asunto y estados nuevos (modificar)
  app.js                       # vista tickets, ruta, filtros, orden y acciones (modificar)
  styles.css                   # bandeja, semáforo, detalle y badges (modificar)
  components/
    ticket-form.js             # campos nuevos, resolución y satisfacción (modificar)
    ticket-list.js             # fila global y modo embebido (modificar)
    ticket-detail.js           # NUEVO: detalle de solo lectura con acciones e historial
    dashboard.js               # tarjetas de soporte y CSAT (modificar)
    entity-detail.js           # promedio CSAT del cliente (modificar)
    shell.js                   # entrada de navegación y estado activo (modificar)
    data-table.js              # reutilización; sin cambio de contrato (sin cambios)
    ui-overlay.js              # confirmación reutilizable (modificar)
    ui.js                      # badges y estados vacíos reutilizados (modificar si hace falta)
index.html                     # navegación, vista y controles accesibles (modificar)

tests/
  unit/
    ticket-folio.test.js               # NUEVO
    ticket-lifecycle.test.js           # NUEVO
    ticket-sla.test.js                 # NUEVO
    ticket-history.test.js             # NUEVO
    ticket-metrics.test.js             # NUEVO
    ticket-satisfaction.test.js        # NUEVO
    ticket-rules.test.js               # ampliar y actualizar ciclo
    ticket-resolution.test.js          # ampliar y actualizar ciclo
    storage.test.js                    # ampliar operaciones nuevas
    storage-migration.test.js          # ampliar v3 → v4
    integrity.test.js                  # ampliar estados y referencias opcionales
  integration/
    tickets-inbox.test.js              # NUEVO
    ticket-lifecycle-ui.test.js        # NUEVO
    ticket-migration-v4.test.js        # NUEVO
    ticket-satisfaction.test.js        # NUEVO
    dashboard-tickets.test.js          # NUEVO
    tickets.test.js                    # ampliar y actualizar ciclo
    ticket-resolution.test.js          # ampliar y actualizar ciclo
    accessibility.test.js              # ampliar bandeja y detalle
  performance/
    search-performance.test.js         # ampliar con la bandeja de 1000 tickets
```

**Decisiones de estructura**:

- `src/app.js` sigue siendo el coordinador: registra `tickets` en `VIEW_IDS`, añade la vista a `availableViews()`, mantiene el estado de filtros y orden en variables de módulo y delega las reglas en `crm-rules.js`. No se introduce router, store ni librería de componentes.
- `ticket-list.js` conserva el modo embebido de la ficha del cliente y añade un modo global que devuelve filas para `data-table`; no se duplica el listado. La fila global enlaza al detalle y es operable con teclado.
- `ticket-form.js` sigue siendo el único formulario de alta y edición. El detalle no duplica la edición: ofrece “Editar” y abre el mismo drawer.
- `ticket-detail.js` es de solo lectura y concentra las acciones por estado (“Asignar”, “Cambiar estado”, “Resolver”, “Cerrar”, “Eliminar”), la satisfacción y el historial.
- `data-table.js` no cambia de contrato: recibe columnas con `render(row)` y filas; la bandeja solo aporta columnas, orden y estado vacío.
- `ui-overlay.js` añade una confirmación reutilizable sobre `openOverlay` para eliminación, cierre y migración. No se usa `window.confirm()` en las acciones nuevas.
- `storage.js` concentra folio, transiciones, historial, satisfacción, SLA materializado y migración. `crm-rules.js` permanece puro; no lee `localStorage` ni el DOM.
- La migración se resuelve con un pipeline por versión: `1 → 2` conserva la incorporación de contactos, actividades, papelera y recuperación; `2 → 3` conserva la resolución de tickets; `3 → 4` agrega la ampliación de post-venta. La versión 4 se escribe solo después de verificar la instantánea transformada.
- Los datos v3 se leen con tolerancia (campos nuevos ausentes) para poder mostrar el aviso de migración; las escrituras se bloquean hasta completarla. Esto evita una migración silenciosa al primer guardado.
- El respaldo de migración se registra en `storage-recovery.js` para que el mecanismo existente no lo trate como una clave ajena.

## Estrategia de implementación

1. **Línea base**: `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build`; registrar los resultados reales en `README.md`.
2. **Fundamentos de dominio**: catálogos `channel`, `assignee` y `team`; `TICKET_STATUSES`, `TICKET_TRANSITIONS`, `canTransitionTicket`, `nextTicketStatuses`, `formatTicketFolio`, `nextTicketFolio`, `computeSlaDueAt`, `getSlaStatus`, `appendTicketHistory`, `validateSatisfaction`, `validateWarrantyDate` y ampliación de `validateTicket`. Pruebas unitarias primero.
3. **Persistencia v4**: `SCHEMA_VERSION = 4`, `buildTicket` ampliado, `addTicket` con folio y estado `Nuevo`, `updateTicket` con transiciones e historial, `assignTicket`, `changeTicketStatus`, `resolveTicket`, `closeTicket`, `deleteTicket` y `registerSatisfaction`; validación de integridad tolerante a v3 y bloqueo de escrituras con migración pendiente.
4. **Migración y respaldo**: plan por versión, respaldo `crmBackup:v3`, escritura verificada, restauración explícita, cancelación sin efectos y modal accesible de confirmación.
5. **US-25 a US-27**: vista `#/tickets`, navegación, bandeja con columnas, filtros, orden, estados vacíos; folio y asunto; solicitante, canal, técnico, equipo, garantía y vínculo de origen en el formulario y el detalle.
6. **US-28 a US-30**: ciclo de vida y cierre, SLA visible, historial en el detalle, reasignación y eliminación individual con confirmación.
7. **US-31 y US-32**: indicadores de soporte en el panel, promedio CSAT en panel y ficha del cliente, registro y validación de satisfacción.
8. **Accesibilidad, rendimiento y regresión**: recorrido por teclado, semáforo con texto e icono, caso de 1000 tickets, actualización de pruebas acopladas al ciclo anterior y documentación de `001`, `README.md` y evidencias.

## Validación prevista

| Nivel | Evidencia requerida |
|---|---|
| Unitario | Folio (formato, correlativo anual, unicidad, límite 9999, inmutabilidad), transiciones válidas e inválidas, SLA (objetivos y tres semáforos, recálculo por prioridad, congelamiento al resolver), historial (tipos, orden, atomicidad, actor), indicadores (fórmulas, ceros, “Sin datos”, sin división por cero), satisfacción (1–5 entero, comentario de 500, promedio) y validaciones de contacto, canal, equipo, garantía y documento. |
| Integración | Alta desde la bandeja; folio visible e inmutable; filtros AND y “Limpiar filtros”; orden por prioridad y SLA; estados vacíos diferenciados; detalle; reasignación; ciclo completo y rechazo de saltos/reaperturas; resolución con solución y CSAT; cierre; eliminación conservando al cliente; panel con indicadores; migración v3 → v4 con respaldo y restauración; persistencia tras recargar. |
| Accesibilidad | Recorrido completo con teclado: navegación, filtros, tabla, apertura de detalle, asignación, cambio de estado, resolución, cierre, historial y satisfacción. `Enter`/`Espacio` en la fila, foco visible y devuelto, `Escape` cierra el drawer, errores anunciados y semáforo con texto e icono. |
| Rendimiento | Con 1000 tickets, abrir la bandeja, aplicar filtros y ordenar en menos de 500 ms en al menos 19 de 20 mediciones; registrar navegador y equipo. El panel se recalcula en el render sin totales persistidos. |
| Integridad | Un fallo simulado durante un cambio no modifica el ticket ni deja una entrada parcial; la escritura obsoleta no muestra éxito; la migración cancelada conserva v3; la restauración devuelve el respaldo. |
| Migración | Respaldo con metadatos y JSON íntegro; folio determinista por año; asunto copiado de la descripción; campos ausentes vacíos; sin solución, cierre, técnico, canal ni CSAT inventados; entrada `migracion`; clientes, oportunidades, contactos, actividades y papelera intactos. |
| Regresión | Las 57 archivos y 461 pruebas vigentes pasan; las pruebas del ciclo anterior se actualizan de forma justificada y no se elimina cobertura de US-01 a US-16. |
| Documental | Coherencia entre `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/ticket-storage.md`, `contracts/ticket-ui.md`, `quickstart.md`, `001-crm-module/data-model.md`, `001-crm-module/contracts/entity-storage.md` y `README.md`. |

## Riesgos y mitigaciones

- **Migración silenciosa al primer guardado**: hoy `saveSnapshot` escribe siempre la versión vigente. Se separa la escritura de colecciones del marcador de versión, se bloquean las escrituras mientras haya migración pendiente y se escribe v4 solo después de verificar la transformación. Prueba de integración dedicada.
- **Datos v3 inválidos para reglas v4**: `validateIntegrity` exigiría folio, asunto e historial a tickets históricos. Se hace tolerante a la versión almacenada y se valida estrictamente después de migrar. Los tickets v3 se pueden leer para mostrar el aviso, pero no escribir.
- **Folio duplicado o agotado**: se calcula contra toda la colección y se vuelve a leer antes de escribir. Al superar 9999 en un año se rechaza el alta con un mensaje claro; no se reciclan correlativos.
- **Doble envío o dos pestañas**: se relee la instantánea antes de persistir y se verifica la unicidad; si la base cambió, se rechaza con un mensaje de recarga. No se promete concurrencia transaccional y se documenta la limitación.
- **Historial parcial**: el evento se agrega antes de `saveSnapshot` y forma parte de la misma instantánea; un fallo restaura la versión anterior. Se prueba con un fallo simulado.
- **Prioridad y SLA históricos**: cambiar la prioridad después de resolver alteraría la medición. Se congela desde `Resuelto` y el semáforo de tickets resueltos se calcula con `resolvedAt` contra el objetivo vigente.
- **Tickets históricos vencidos**: un ticket abierto migrado puede aparecer `Vencido` porque su `createdAt` es real. Se documenta como resultado veraz, no como error.
- **Contacto o documento eliminado**: el ticket conserva `contactId`/`documentId` y su respaldo; un valor nuevo inválido se rechaza, pero un valor ya persistido no se reescribe en silencio. Se muestra “Solicitante no registrado” o “Venta de origen no disponible”.
- **CSAT fuera de rango o posterior al cierre**: la validación es pura y compartida; `Cerrado` es de solo lectura. Se prueba con 0, 6, decimales, texto y comentario de 501 caracteres.
- **Panel con división por cero**: todas las métricas devuelven `null` o cero según corresponda y la presentación muestra “Sin datos”. Se prueba con almacenamiento vacío.
- **Rendimiento de la bandeja**: 1000 filas con historial y semáforo pueden degradar el render. Se precalculan claves de orden por render, se evita reconstruir el historial completo en la fila y se mide el presupuesto. Si no se cumple, se reduce el trabajo de la fila antes de considerar virtualización, que queda fuera de alcance.
- **Pruebas acopladas al ciclo anterior**: `ticket-rules`, `ticket-resolution`, `tickets`, `integrity` y el fixture de rendimiento fijan `En proceso` como estado inicial. Se actualizan en la misma tarea que el cambio de ciclo, conservando sus asertos de validación y resolución.
- **`window.confirm()` bloqueante**: se sustituye por el modal de `ui-overlay` en migración y acciones destructivas; se prueba el foco atrapado y la devolución del foco.
- **Media queries, contraste y rendimiento real no verificables en jsdom**: las pruebas verifican estructura, atributos y tiempos de jsdom; la validación visual, el contraste AA y el presupuesto en navegador se registran manualmente en `quickstart.md` con navegador y equipo.

## Seguimiento de complejidad

La iteración agrega **un componente de dominio** (`ticket-detail.js`) y **seis archivos de prueba unitaria** más cinco de integración. No se agrega router, store, librería de componentes, backend ni colección nueva: el historial es embebido y el SLA es derivado. `ticket-detail.js` se justifica porque el detalle de solo lectura con historial, satisfacción y acciones por estado no cabe en el formulario ni en la fila de la bandeja; reutiliza `ui-overlay`, badges y estados vacíos. `ticket-list.js` se amplía en lugar de crear un listado global paralelo. `data-table.js` se reutiliza sin cambios de contrato. La migración se resuelve en los módulos existentes, sin un motor genérico. No se justifica virtualización: el presupuesto de 1000 tickets se cubre con filtro y orden en memoria; si la medición falla, se optimiza la fila antes de introducir una dependencia.
