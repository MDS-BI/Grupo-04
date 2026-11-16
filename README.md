# CRM — Clientes y Oportunidades

Módulo CRM construido sobre el template ERP base (Vite + Vanilla JS). Permite registrar clientes y prospectos, vincular oportunidades comerciales, buscar y consultar fichas, seguir el ciclo de vida de las oportunidades, registrar tickets de soporte y consultar un panel con seis indicadores descriptivos.

> **Estado**: MVP P1 y segunda iteración P2 (tickets y panel) implementados y verificados con pruebas automatizadas (Vitest + jsdom). La validación manual en navegadores (T066) y el protocolo de usabilidad (T069) quedan declarados como pendientes.
>
> **Iteración 3 — rediseño de interfaz**: especificada en `specs/002-crm-ui-refresh/` (navegación, drawers, tablas, filtros y panel accionable). No modifica entidades, reglas ni persistencia.

## Integrantes

| Integrante | Rol | Historias asignadas |
|---|---|---|
| `[completar]` | Documentación / ajustes | `[completar]` |
| `[completar]` | Implementación | `[completar]` |
| `[completar]` | Implementación | `[completar]` |
| `[completar]` | Pruebas / demo | `[completar]` |
| `[completar]` | Pruebas / demo | `[completar]` |
| `[completar]` | Coordinación | `[completar]` |

Agregar o quitar filas según la cantidad real de integrantes. La asignación por historia está en `specs/001-crm-module/spec.md`, sección “Organización por integrante”.

## Problema y alcance

La empresa vende equipos industriales a otras empresas de la Región del Biobío y pierde ventas porque las cotizaciones quedan repartidas entre correos y planillas. El CRM centraliza clientes, oportunidades y seguimiento. Es una demo con datos sintéticos: no hay backend, autenticación ni permisos reales.

- **P1**: clientes, oportunidades, búsqueda, ciclo de vida, terminología y persistencia.
- **P2**: tickets de soporte y panel con indicadores.
- **Fuera del MVP**: correo real, campañas, facturación, cotizaciones con partidas, predicción y sincronización multiusuario.

## Cronograma y división del trabajo

| Hito | Fecha | Entregables | Estado |
|---|---|---|---|
| Hito 1 — Revisión inicial | 20/10/2026 | Repositorio, MER y plan inicial | Cumplido, con observaciones del profesor |
| Hito 2 — Especificaciones y tareas | 10/11/2026 | `spec.md` consolidada, `plan.md`, `data-model.md`, contrato y `tasks.md` generado desde las US | En progreso |
| Hito 3 — Versión integrada de prueba | 17/11/2026 | Código base restaurado, CRM configurado, pruebas ejecutadas y demo interna | Código y pruebas automatizadas listas (278 pruebas); demo manual en navegadores pendiente (T066) |
| Hito 4 — Entrega y presentación | Semana del 30/11/2026 | Repositorio final, README, evidencias y ensayo de 5 minutos | Pendiente |

| Línea | Alcance | Responsable | Iteración |
|---|---|---|---|
| A — Ajustes previos | Coherencia de `spec.md`, `plan.md`, `data-model.md`, contrato, checklist y README; regeneración de tareas | `[integrante]` | 1 |
| B — Incremental | Restauración del código, `ModuleConfig`, reglas, formularios, búsqueda, ciclo de vida, panel y terminología | `[integrante]` | 1–2 |
| C — P2 | Tickets de soporte y panel con indicadores: entidad, formulario, estados, métricas y pruebas | `[integrante]` | 2–3 |

## Estructura prevista del repositorio

```text
specs/001-crm-module/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  tasks.md
  contracts/entity-storage.md
  checklists/requirements.md
specs/002-crm-ui-refresh/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  tasks.md
  contracts/ui-shell.md
src/
  main.js
  app.js
  storage.js
  module-config.js
  crm-rules.js
  crm-metrics.js
  styles.css
  components/
    custom-fields.js
    entity-detail.js
    search-results.js
    shell.js
    dashboard.js
    entity-form.js
    entity-list.js
    document-form.js
    document-list.js
    search-bar.js
    ticket-form.js
    ticket-list.js
    ui-overlay.js
    ui.js
    data-table.js
    quick-create-client.js
    filter-chips.js
tests/
  unit/
  integration/
  performance/
```

## Requisitos

- Node.js y npm.
- Navegador moderno.

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abrir la URL que imprime Vite (por defecto `http://localhost:5173`).

## Pruebas y build

```bash
npm test
npx vitest run
npm run build
npm run lint
npm run format:check
```

Registrar en la sección de evidencias la fecha, el comando y el resultado real. No declarar pruebas que no se hayan ejecutado.

## Configuración del módulo

Toda la adaptación vive en `src/module-config.js`:

- `moduleName`: `CRM — Clientes y Oportunidades`.
- `labels`: Cliente/Clientes y Oportunidad/Oportunidades.
- `customFields`: `contactName`, `accountOwner`, `acquisitionSource`, `opportunityTitle`, `opportunityOwner`, `lossReason`.
- `catalogs`: `category`, `accountOwner`, `opportunityOwner`, `acquisitionSource` (validados por el cargador; el módulo base sin catálogos conserva el respaldo genérico).
- `statusLifecycle`: Nueva → Contactada → Propuesta → Negociación → Ganada / Perdida.
- `theme.accentColor`: `#0F766E`.

Catálogos: tipo de cliente (Prospecto, Activo, Inactivo), responsables (Ejecutivo A, Ejecutivo B), orígenes (Sitio web, Referido, Contacto directo, Otro), prioridades de ticket (Alta, Media, Baja) y motivos de ticket (soporte, reclamo, consulta). El detalle está en `specs/001-crm-module/data-model.md`.

## Persistencia

- `erp_base_module:entities`: clientes.
- `erp_base_module:documents`: oportunidades.
- `erp_base_module:tickets`: tickets de soporte (P2).
- `erp_base_module:schemaVersion`: versión de esquema.

Los datos viven en el `localStorage` del navegador. Borrar el perfil del navegador elimina la persistencia. No hay respaldo central ni acceso simultáneo. El panel no guarda totales derivados: se recalculan en cada render a partir de clientes y oportunidades.

## Demo

Datos sintéticos sugeridos:

| Dato | Valor |
|---|---|
| Cliente | Empresa Demo 1 |
| Código | CLI-DEMO-003 |
| Tipo | Prospecto |
| Responsable | Ejecutivo A |
| Origen | Referido |
| Oportunidad | Adquisición de compresor industrial |
| Folio | 3001 |
| Fechas | 2026-11-02 → 2026-11-30 |
| Monto | 8.500.000 CLP |
| Ticket | Compresor industrial · soporte · prioridad Alta |
| Panel | Seis indicadores recalculados en cada visita |

Recorrido: crear cliente → crear oportunidad → buscar → abrir ficha → avanzar etapa → registrar ticket → marcar el ticket como resuelto → recargar → abrir Panel. Repetir el folio debe fallar. Probar también monto cero, campos vacíos, fechas invertidas, cliente inexistente, ticket sin producto, reapertura de un ticket resuelto y cancelación.

## Evidencias y registro de cambios

| Fecha | Cambio | Comando / evidencia | Resultado |
|---|---|---|---|
| 2026-11-03 | Consolidación documental y modelo de datos | Revisión de `spec.md`, `plan.md`, `data-model.md` | Pendiente de validación del equipo |
| 2026-11-04 | Restauración del código base (T001–T002) | `git checkout dea57da -- src index.html`; `git checkout borrador -- tests` | 14 archivos de `src/` más `index.html` y 12 archivos de prueba restaurados. Las pruebas base cubren el template ERP genérico y se adaptarán en las historias. |
| 2026-11-04 | Verificación de la base sin modificar (T003) | `npm install`; `npx vitest run`; `npm run build` | `npm install` completado; 12 archivos y 111 pruebas aprobadas; build Vite correcto (HTML 14,18 kB). `npm audit` reporta 5 vulnerabilidades de dependencias de desarrollo, no bloqueantes para la demo. |
| 2026-11-04 | Entorno de pruebas jsdom (T004) | `npx vitest run` con `environment: 'jsdom'` y `tests/setup.js` | 12 archivos y 111 pruebas aprobadas; limpieza de `localStorage` entre pruebas. |
| 2026-11-04 | Lint y formato (T004A) | `npm run lint`; `npm run format:check` | ESLint 9 y Prettier 3 configurados; ambos comandos terminan sin errores sobre la base restaurada. |
| 2026-11-15 | Fase 2 Foundational (T005–T015): almacenamiento atómico con `schemaVersion`, identidad y marcas ISO, recuperación ante JSON corrupto/cuota, perfil CRM en `ModuleConfig` (incluye `catalogs`), reglas puras base, campos personalizados accesibles, tokens `#0F766E`, shell y enrutador con respaldo Clientes | `npx vitest run`; `npm run lint`; `npm run format:check`; `npm run build` | `npx vitest run`: 12 archivos, 124 pruebas aprobadas. `npm run lint`: sin errores. `npm run format:check`: todos los archivos cumplen Prettier. `npm run build`: Vite correcto (HTML 19,74 kB). Se adaptaron pruebas del template para fijarlas al perfil genérico (ver nota de adaptaciones). |
| 2026-11-15 | US1 (T016–T022): alta, edición, eliminación con cascada y unicidad de código normalizado; `validateClient`, `getTargetDateStatus`, lista de clientes con estados del próximo contacto | `npx vitest run`; `npm run lint`; `npm run format:check`; `npm run build` | `npx vitest run`: 14 archivos, 152 pruebas aprobadas (nuevas: `crm-rules.test.js`, `create-edit-delete-client.test.js`; se confirmaron fallando antes de implementar). `npm run lint`: sin errores. `npm run format:check`: correcto. `npm run build`: Vite correcto. |
| 2026-11-15 | US2 (T023–T029): búsqueda normalizada de clientes y oportunidades, filtros AND, resultados separados, ficha de cliente y detalle de oportunidad en solo lectura | `npx vitest run`; `npm run lint`; `npm run format:check`; `npm run build` | `npx vitest run`: 16 archivos, 175 pruebas aprobadas (nuevas: `search.test.js`, `search-clients.test.js`; fallaron antes de implementar). `npm run lint`: sin errores. `npm run format:check`: correcto. `npm run build`: Vite correcto. |
| 2026-11-15 | US4 (T030–T036): reglas de oportunidad (folio único, monto entero ≥ 0, fechas, responsable, etapa Nueva), formulario con serie OPP/moneda CLP/etapa fija, lista de oportunidades y bloqueo sin clientes | `npx vitest run`; `npm run lint`; `npm run format:check`; `npm run build` | `npx vitest run`: 18 archivos, 199 pruebas aprobadas (nuevas: `opportunity-rules.test.js`, `create-opportunity.test.js`; fallaron antes de implementar). `npm run lint`: sin errores. `npm run format:check`: correcto. `npm run build`: Vite correcto. |
| 2026-11-15 | US5 (T037–T042): ciclo Nueva → Contactada → Propuesta → Negociación → Ganada, pérdida con motivo, rechazo de saltos y reaperturas, edición conservando estado final, eliminación solo de la oportunidad y acciones en la lista | `npx vitest run`; `npm run lint`; `npm run format:check`; `npm run build` | `npx vitest run`: 20 archivos, 220 pruebas aprobadas (nuevas: `lifecycle.test.js`, `opportunity-lifecycle.test.js`; fallaron antes de implementar). `npm run lint`: sin errores. `npm run format:check`: correcto. `npm run build`: Vite correcto. |
| 2026-11-15 | US6 (T043–T047): terminología Cliente/Clientes y Oportunidad/Oportunidades en gestión, formularios, búsqueda, detalle, mensajes y estados vacíos; aviso de configuración conflictiva; valores desconocidos preservados; nombres accesibles de la barra lateral | `npx vitest run`; `npm run lint`; `npm run format:check`; `npm run build` | `npx vitest run`: 20 archivos, 225 pruebas aprobadas (ampliadas: `relabeling.test.js`; fallaron los casos nuevos antes de implementar). `npm run lint`: sin errores. `npm run format:check`: correcto. `npm run build`: Vite correcto. |
| 2026-11-15 | Pulido P1 (T060–T064): seguridad de renderizado, riesgos de almacenamiento (cuota, JSON corrupto, esquema incompatible, pestaña obsoleta), accesibilidad, rendimiento de búsqueda y auditoría de privacidad (sin exportación ni orden por ubicación) | `npx vitest run` | 25 archivos y 238 pruebas aprobadas. Nuevas: `security-render.test.js`, `storage-risks.test.js`, `accessibility.test.js`, `search-performance.test.js`, `critical-journey.test.js`. |
| 2026-11-15 | Verificación final P1 (T067) | `npm test -- --run`; `npm run build`; `npm run lint`; `npm run format:check` | `npm test -- --run`: 25 archivos y 238 pruebas aprobadas (32,3 s). `npm run build`: Vite correcto (HTML 19,93 kB). `npm run lint`: sin errores. `npm run format:check`: sin diferencias. |
| 2026-11-15 | P2 US3 y US7 (T048–T059): reglas y persistencia de tickets (`erp_base_module:tickets`, cascada atómica, sin reapertura), formulario y lista de tickets en la ficha del cliente, seis métricas puras en `src/crm-metrics.js`, panel con acciones rápidas y recálculo en cada render, entrada Panel en la barra lateral | `npx vitest run`; `npm run lint`; `npm run format:check`; `npm run build` | `npx vitest run`: 28 archivos y 278 pruebas aprobadas (nuevas: `ticket-rules.test.js`, `tickets.test.js`, `crm-metrics.test.js`; ampliadas: `dashboard.test.js`, `relabeling.test.js`; los casos nuevos fallaron antes de implementar). `npm run lint`: sin errores. `npm run format:check`: sin diferencias. `npm run build`: Vite correcto (HTML 25,25 kB; CSS 7,49 kB; JS 69,37 kB). |
| 2026-11-15 | Rendimiento (T063): 500 clientes y 1000 oportunidades, 20 búsquedas y 20 recálculos del panel | `npx vitest run tests/performance/search-performance.test.js --reporter=verbose` | jsdom sobre Node.js 24.20.0, Windows 11, equipo de desarrollo del grupo. Búsquedas: 20/20 bajo 500 ms (más lenta 4,3 ms). Panel: 20/20 recálculos bajo 500 ms (más lento 35,7 ms). Cada medición validó el resultado renderizado (coincidencia única de cliente/folio y los seis indicadores correctos). |
| Pendiente | Validación manual en navegadores (T066) | Escenarios 1–4 y 6 de `quickstart.md` en Chrome y Firefox actuales; Edge/Safari y pantalla estrecha | **Pendiente declarada**: no se ejecutó en navegadores reales. Las comprobaciones DOM se hicieron en jsdom. |
| Pendiente | Protocolo de usabilidad (T069) | 5 participantes, 4 tareas, SC-001 a SC-004 | **Pendiente declarada**: no se ejecutó. No se reportan tiempos ni tasas de éxito sin medición. |

### Pendientes declarados

- **T066 (manual, navegadores)**: pendiente. Requiere Chrome y Firefox actuales (y Edge/Safari si están disponibles), además de la tabla de validaciones transversales de `quickstart.md`. No se marca como completada.
- **T069 (usabilidad)**: pendiente. Requiere 5 participantes y la medición de SC-001 a SC-004. No se inventan participantes ni resultados.
- **Nombres de integrantes (AMB-01)**: la tabla de integrantes sigue con `[completar]`; el equipo debe completarla. No se inventan nombres.
- **Entorno de las pruebas**: Node.js con jsdom (Vitest). La accesibilidad, el rendimiento, los tickets y el panel se verificaron a nivel de DOM y de funciones; el contraste se calculó sobre los tokens CSS. La comprobación con navegador real sigue pendiente en T066, y los escenarios 5 y 7 de `quickstart.md` deben recorrerse manualmente en esa misma validación.

### Adaptaciones de pruebas heredadas del template

Las pruebas del template ERP se conservan, pero algunas fijaban supuestos del módulo base que el perfil CRM cambia. No se eliminó ninguna aserción; se ajustó el punto de partida y se justifica el cambio:

| Prueba | Cambio | Justificación |
|---|---|---|
| `tests/integration/create-entity.test.js`, `add-document.test.js`, `edit-delete-entity.test.js`, `search-entities.test.js`, `manage-tabs.test.js` | Arrancan con `initApp(normalizeConfig(undefined))` en lugar de `boot()` | `boot()` aplica el perfil CRM (`userConfig`); estas pruebas describen el contrato del módulo base genérico, que debe seguir vigente (FR-029, CA-06-09). Sus aserciones no cambian. |
| `tests/integration/workspace-shell.test.js` | Espera la etiqueta `Buscar` en la barra lateral | FR-036 fija “Buscar” para el módulo CRM; el texto anterior (“Búsqueda”) era una decisión del template. |
| `tests/unit/module-config.test.js` | El caso “userConfig null por defecto” pasa a verificar el perfil CRM cargado | T009 exige que `userConfig` contenga el perfil CRM; la prueba anterior comprobaba justamente el valor que la tarea cambia. |
| `tests/integration/relabeling.test.js` | El perfil CRM abre en Panel, `nav-dashboard` está visible y se añaden aserciones de las tarjetas del panel | P2 habilita Panel y cambia la ruta de respaldo de Clientes a Panel (FR-036, CA-06-02, CA-06-07); las aserciones anteriores fijaban el estado P1. |

## Uso de IA

La parte técnica se desarrolla con asistencia de IA, conforme al feedback del curso.

- **Generado con IA**: propuesta de implementación de Fase 2, US1, US2, US4, US5, US6, US3 y US7, y pulido P1/P2 (`src/storage.js`, `src/module-config.js`, `src/crm-rules.js`, `src/crm-metrics.js`, `src/app.js`, componentes —incluidos `ticket-form.js` y `ticket-list.js`— y pruebas asociadas), redacción de esta sección de evidencias y de las notas de adaptación.
- **Revisado manualmente**: alcance P1 frente a `spec.md` y `tasks.md`, textos de interfaz en español, criterios de eliminación en cascada, ciclo de vida y decisión de dejar T066/T069 como pendientes.
- **Verificado con pruebas**: todos los resultados de la tabla anterior provienen de comandos ejecutados en este repositorio (Vitest, ESLint, Prettier y build de Vite). No se declaran pruebas, participantes ni validación empresarial que no se hayan ejecutado.

## Validación documental (T068)

Se contrastaron `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/entity-storage.md` y el MER de `data-model.md` contra la implementación:

- Cliente (`Entity`) y Oportunidad (`Document`) conservan campos, obligatoriedad y estados acordados; `series + folio` es única y `entity_id` se mantiene como contrato de relación.
- Ciclo de vida, motivo de pérdida y estados finales coinciden con `data-model.md` y `spec.md`.
- Catálogos: `data-model.md` indica que tipo, responsables y orígenes viven en la configuración; se materializaron en la clave `catalogs` de `ModuleConfig` (extensión de implementación, no cambio de contrato).
- Divergencia detectada y no corregida (por regla de alcance): el ejemplo JSON de `data-model.md` muestra las colecciones dentro de un único documento, mientras `contracts/entity-storage.md` y la implementación usan claves separadas (`erp_base_module:entities`, `:documents`, `:schemaVersion`). Prevalece el contrato; se deja constancia para la revisión documental.
- El MER enumera las claves y relaciones usadas por la aplicación; los tickets permanecen declarados para P2.

## Documentación

- [Especificación](specs/001-crm-module/spec.md)
- [Plan](specs/001-crm-module/plan.md)
- [Investigación técnica](specs/001-crm-module/research.md)
- [Modelo de datos](specs/001-crm-module/data-model.md)
- [Inicio rápido y validación](specs/001-crm-module/quickstart.md)
- [Contrato de almacenamiento](specs/001-crm-module/contracts/entity-storage.md)
- [Checklist](specs/001-crm-module/checklists/requirements.md)
- [MER (Mermaid, en `data-model.md`)](specs/001-crm-module/data-model.md)
- **Iteración 3 — rediseño de interfaz** (`specs/002-crm-ui-refresh/`): [especificación](specs/002-crm-ui-refresh/spec.md), [plan](specs/002-crm-ui-refresh/plan.md), [investigación](specs/002-crm-ui-refresh/research.md), [modelo de datos](specs/002-crm-ui-refresh/data-model.md), [contrato de interfaz](specs/002-crm-ui-refresh/contracts/ui-shell.md) y [validación](specs/002-crm-ui-refresh/quickstart.md). No agrega entidades ni cambios de esquema.
