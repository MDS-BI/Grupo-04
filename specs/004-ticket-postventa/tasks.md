---

description: "Task list for feature implementation"
---

# Tasks: Ticket de post-venta completo

**Input**: Documentos de diseño en `specs/004-ticket-postventa/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ticket-storage.md](contracts/ticket-storage.md), [contracts/ticket-ui.md](contracts/ticket-ui.md), [quickstart.md](quickstart.md)

**Tests**: **Obligatorias**. La especificación lo exige en FR-077, SC-016…SC-027 y el Principio II de la constitución. Todo test se escribe antes que su implementación y debe fallar primero. No se reduce la cobertura de US-01 a US-16.

**Organization**: Tareas agrupadas por historia de usuario (US-25 a US-32) para permitir implementación y prueba independientes. Las fases P1 (US-25 a US-30) forman la rebanada operable de soporte; las P2 (US-32 y US-31) completan medición y voz del cliente. La fase de US-32 precede a la de US-31 porque `spec.md` declara que US-31 depende de US-32 para el promedio de satisfacción.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencia de una tarea incompleta).
- **[Story]**: historia a la que pertenece la tarea (`[US25]`…`[US32]`).
- Toda tarea indica la ruta exacta del archivo que modifica o crea.

## Path Conventions

Proyecto único frontend con Vite: `src/` (dominio y componentes), `tests/` (unitarias, integración y rendimiento), `index.html`, `src/styles.css`, `specs/`. No se agregan dependencias ni carpetas nuevas.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verificar la línea base y confirmar que el stack no necesita cambios.

- [ ] T001 Ejecutar `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build` desde la raíz y registrar en `README.md` la fecha, el total real de archivos y pruebas (línea base esperada: 57 archivos / 461 pruebas según `quickstart.md`) y el resultado de cada comando; no continuar con la suite en rojo.
- [ ] T002 [P] Confirmar en `package.json` y `vitest.config.mjs` que no se requieren dependencias ni configuración nuevas y que las carpetas `tests/unit`, `tests/integration` y `tests/performance` se descubren con el entorno jsdom y `tests/setup.js`.

**Checkpoint**: Línea base registrada y entorno de pruebas confirmado.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Reglas puras del ticket, persistencia v4, migración con respaldo y confirmaciones accesibles. Sin esta fase ninguna historia puede comenzar.

**⚠️ CRITICAL**: No iniciar US-25 hasta completar T003–T026.

### Tests de dominio (escribir primero y comprobar que fallan)

- [ ] T003 [P] Ampliar `tests/unit/module-config.test.js` para exigir los catálogos `channel` (`Teléfono`, `Correo`, `WhatsApp`, `Presencial`, `Portal`), `assignee` (`Técnico A/B/C`) y `team` (`Soporte técnico`, `Terreno`, `Repuestos`), sin repetidos ni vacíos, conservando `priority` y `reason`.
- [ ] T004 [P] Crear `tests/unit/ticket-lifecycle.test.js` con los cinco estados de `TICKET_STATUSES`, la tabla exacta de `TICKET_TRANSITIONS`, las 25 combinaciones de `canTransitionTicket` (incluidos `Nuevo → Resuelto`, `Nuevo → Cerrado`, `En espera → Nuevo` y cualquier salida de `Cerrado`) y `nextTicketStatuses(status)` (CA-28-01…CA-28-08).
- [ ] T005 [P] Crear `tests/unit/ticket-folio.test.js` para `formatTicketFolio(year, sequence)` (`TKT-AAAA-####` con ceros a la izquierda) y `nextTicketFolio(tickets, createdAt)`: año local de `createdAt`, máximo correlativo del año (no el conteo), huecos, cambio de año, unicidad global y rechazo al superar 9999 (CA-26-01, CA-26-02, CA-26-07).
- [ ] T006 [P] Crear `tests/unit/ticket-sla.test.js` para `SLA_HOURS_BY_PRIORITY` (24/72/168 h), `computeSlaDueAt(createdAt, priority)` y `getSlaStatus(ticket, now)`: `now === slaDueAt` → `Vencido`; exactamente 25 % restante → `Por vencer`; más de 25 % → `En plazo`; recálculo al cambiar prioridad; `Resuelto`/`Cerrado` comparados con `resolvedAt`; fechas inválidas → `Sin datos` (CA-29-01…CA-29-07).
- [ ] T007 [P] Crear `tests/unit/ticket-history.test.js` para `appendTicketHistory(ticket, event, now)`: `id` = `${ticket.id}:${history.length + 1}`, `at` generado, orden de inserción, `actor` explícito → `assignee` vigente → `"Sistema"`, inmutabilidad del ticket original y prohibición de editar/eliminar eventos (CA-30-01…CA-30-07).
- [ ] T008 [P] Crear `tests/unit/ticket-satisfaction.test.js` para `validateSatisfaction(score, comment)`: enteros 1–5 aceptados; `0`, `6`, `1.5`, `"4"`, vacío y no numérico rechazados con mensaje “nota entera de 1 a 5”; comentario recortado, 500 caracteres aceptados y 501 rechazados; comentario opcional (CA-32-03, CA-32-04).
- [ ] T009 [P] Ampliar `tests/unit/ticket-rules.test.js` para `validateTicket` v4: asunto obligatorio/recortado/≤120, canal obligatorio en altas y opcional en históricos, `contactId` del mismo cliente, correo del solicitante válido si existe, `assignee`/`team` de catálogo o nulos, `warrantyEndsAt` de calendario, `documentId` del mismo cliente, producto vigente y claves de error por campo (CA-26-04, CA-26-05, CA-27-01…CA-27-09).
- [ ] T010 [P] Ampliar `tests/unit/integrity.test.js` para `validateIntegrity`: datos v3 tolerantes (sin `folio`, `subject`, `history`, `channel`, `assignee`, `team`, `firstResponseAt`, `closedAt` ni satisfacción) son legibles; datos v4 estrictos exigen folio válido y único, asunto y al menos un evento; los migrados no se invalidan por campos opcionales ausentes (R-14).
- [ ] T011 [P] Ampliar `tests/unit/storage.test.js` para las operaciones v4: `addTicket` asigna folio y estado `Nuevo`, crea evento `creacion` y deja `firstResponseAt`/`resolvedAt`/`closedAt` nulos; `updateTicket` rechaza folio/cliente/`createdAt` alterados, transiciones inválidas, prioridad en `Resuelto` y cualquier cambio en `Cerrado`; `assignTicket`, `changeTicketStatus`, `resolveTicket`, `closeTicket`, `deleteTicket` y `registerSatisfaction`; fallo simulado de cuota no deja ticket ni historial parcial; escritura bloqueada con migración pendiente (FR-051…FR-072).
- [ ] T012 [P] Ampliar `tests/unit/storage-migration.test.js` para `requestMigration`, `applyMigration`, `cancelMigration`, `loadMigrationBackup` y `restoreMigrationBackup`: folio determinista por año y `createdAt`, asunto copiado de la descripción, campos ausentes vacíos, entrada `migracion`, sin `firstResponseAt` inventado, respaldo `erp_base_module:crmBackup:v3` con metadatos, versión 4 escrita al final, `createdAt` inválido aborta sin escribir, cancelar conserva v3 y restaurar devuelve el respaldo (R-13, FR-071).

### Implementación de dominio

- [ ] T013 Agregar a `src/module-config.js` los catálogos `channel`, `assignee` y `team` con sus constantes exportadas (`CRM_TICKET_CHANNELS`, `CRM_TICKET_ASSIGNEES`, `CRM_TICKET_TEAMS`) y registrarlos en `userConfig.catalogs`, conservando `priority` y `reason` (depende de T003).
- [ ] T014 Implementar en `src/crm-rules.js` `TICKET_STATUSES` ampliado, `TICKET_TRANSITIONS`, `canTransitionTicket`, `nextTicketStatuses`, `formatTicketFolio`, `nextTicketFolio`, `SLA_HOURS_BY_PRIORITY`, `computeSlaDueAt`, `getSlaStatus`, `appendTicketHistory`, `validateSatisfaction` y `validateWarrantyDate`, sin leer `localStorage` ni el DOM (depende de T004–T008).
- [ ] T015 Ampliar `validateTicket` en `src/crm-rules.js` con asunto, canal, contacto, solicitante, técnico, equipo, garantía y documento, con tolerancia para valores ya persistidos de catálogos retirados y para tickets v3 sin canal (depende de T009; después de T014 por el mismo archivo).
- [ ] T016 Ajustar `validateIntegrity` en `src/crm-rules.js` para aceptar la versión almacenada y aplicar reglas estrictas solo a v4 (depende de T010 y T015 por el mismo archivo).

### Implementación de persistencia y migración

- [ ] T017 Cambiar `SCHEMA_VERSION` a 4 en `src/storage.js`, permitir lectura tolerante de v3 y bloquear toda escritura con versión menor que 4 con un mensaje que pida completar la migración, manteniendo `saveSnapshot` atómico (depende de T016).
- [ ] T018 [P] Registrar la clave `erp_base_module:crmBackup:v3` en el mecanismo de `src/storage-recovery.js` sin alterar su contrato ni tratar el respaldo como clave ajena (depende de T012).
- [ ] T019 Ampliar `buildTicket`, `addTicket` y `updateTicket` en `src/storage.js`: folio generado e inmutable, estado inicial `Nuevo`, historial `creacion`, `firstResponseAt` al abandonar `Nuevo`, rechazo de folio duplicado/agotado, relectura de la instantánea antes de escribir y validación completa antes de la única escritura (depende de T013–T017).
- [ ] T020 Implementar en `src/storage.js` `assignTicket`, `changeTicketStatus`, `resolveTicket` (ampliado con satisfacción), `closeTicket`, `deleteTicket` y `registerSatisfaction`, cada una con su evento de historial en la misma instantánea y sin escritura ante error (depende de T019).
- [ ] T021 Implementar en `src/storage.js` el pipeline `v3 → v4` con `requestMigration`, `applyMigration`, `cancelMigration`, `loadMigrationBackup` y `restoreMigrationBackup`: conservar los pasos vigentes `1 → 2` y `2 → 3` cuando corresponda, respaldo antes de escribir, escritor interno que separa colecciones de `schemaVersion`, verificación de folio/asunto/historial, versión al final y restauración ante fallo (depende de T018 y T020).
- [ ] T022 [P] Agregar a `src/components/ui-overlay.js` un diálogo de confirmación reutilizable sobre `openOverlay` (título, mensaje, “Cancelar”, acción explícita y variante destructiva), con trampa de foco, `Escape` y devolución del foco; probarlo en `tests/unit/ui-overlay.test.js` sin usar `window.confirm()` (R-19).
- [ ] T023 Reemplazar en `src/app.js` el `window.confirm()` del aviso de migración por el diálogo de T022: mostrar versión detectada y pasos, permitir cancelar sin escribir, confirmar la migración y ofrecer la restauración explícita, informando el error sin mostrar éxito (depende de T021 y T022).
- [ ] T024 Crear `tests/integration/ticket-migration-v4.test.js`: aviso con versión 3, cancelación que conserva todo, confirmación con respaldo `crmBackup:v3`, `schemaVersion` 4, folios únicos, `entities`, `documents`, `crmContacts`, `crmActivities` y `crmTrash` idénticas a la instantánea previa (FR-076), escrituras bloqueadas antes de migrar y restauración que devuelve v3 (CA-26-01, FR-071, NFR-013).
- [ ] T025 Actualizar las pruebas acopladas al ciclo anterior en `tests/unit/ticket-rules.test.js` (incluida la aserción “forces the initial En proceso status when creating”, que pasa a `Nuevo`), `tests/unit/ticket-resolution.test.js`, `tests/integration/ticket-resolution.test.js`, `tests/integration/tickets.test.js` y `tests/performance/search-performance.test.js` para el estado inicial `Nuevo` y la secuencia `Nuevo → En proceso → Resuelto`, sin eliminar asertos de validación ni cobertura de US-03/US-11 (R-17, FR-077).
- [ ] T026 [P] Actualizar `specs/001-crm-module/data-model.md` (campos v4, evento de historial, catálogos, SLA, indicadores y migración) y `specs/001-crm-module/contracts/entity-storage.md` (operaciones, atomicidad, respaldo y restauración) para que describan el mismo contrato que `specs/004-ticket-postventa/` (R-20).

**Checkpoint**: Reglas puras, persistencia v4, migración y confirmaciones listas. US-25 puede comenzar.

---

## Phase 3: User Story 25 - Bandeja global de tickets (Priority: P1) 🎯 MVP

**Goal**: Vista `#/tickets` con todos los tickets de todos los clientes, alta desde la bandeja, filtros AND, orden estable y estados vacíos diferenciados.

**Independent Test**: con al menos tres clientes y cinco tickets en distintos estados, abrir “Tickets”, comprobar que aparecen todos, filtrar por estado/prioridad/técnico, ordenar por prioridad y vencimiento, limpiar filtros y verificar los dos estados vacíos. No requiere crear ni modificar tickets.

### Tests for User Story 25

> T027 se escribe antes de la implementación y debe fallar. T033 (presupuesto de rendimiento) y T034 (accesibilidad) se ejecutan después de T028–T032 porque miden la vista ya construida.

- [ ] T027 [P] [US25] Crear `tests/integration/tickets-inbox.test.js` con: `#nav-tickets` y `#/tickets` abren `#view-tickets` con título “Tickets”; se listan tickets de tres clientes; cada fila muestra folio, asunto, cliente, solicitante, canal, técnico, prioridad, estado y SLA con los textos de ausencia del contrato; filtros combinados con AND y “Todos”; “Limpiar filtros” restaura el orden `priority-sla` y anuncia el cambio; orden `priority-sla`/`sla`/`recent` con desempates por `createdAt` y `folio`; estados “No hay tickets registrados” y “No hay tickets que coincidan con los filtros”; `Enter`/`Espacio` en la fila abre el detalle; los filtros no se persisten al recargar (CA-25-01…CA-25-08, FR-046…FR-050).

### Implementation for User Story 25

- [ ] T028 [US25] Agregar a `index.html` el botón `#nav-tickets` (`nav-module`, `data-module="tickets"`, etiqueta `#nav-tickets-label`, icono decorativo) y la sección `#view-tickets` con `#tickets-heading`, `#ticket-inbox-message`, `#new-ticket-inbox`, `#ticket-filter-status`, `#ticket-filter-priority`, `#ticket-filter-assignee`, `#ticket-clear-filters`, `#ticket-sort` y `#tickets-table`, con etiquetas asociadas y `aria-live` donde indica `contracts/ticket-ui.md`.
- [ ] T029 [US25] Registrar la vista `tickets` en `src/components/shell.js`: sumarla a `clearActiveNavigation()` y a la rama de `setActiveNav` que marca `#nav-tickets` con `aria-current="page"`, sin romper Panel, Entidades, Oportunidades, Actividades ni Papelera.
- [ ] T030 [US25] Registrar en `src/app.js` `VIEW_IDS.tickets = 'view-tickets'`, `availableViews()` con `tickets` (respaldo `dashboard` para hash inválido), el estado de módulo de filtros y orden (no persistido), `renderTicketInbox()` con filtro/orden en una sola pasada, handlers de los controles, “Nuevo ticket” reutilizando el drawer existente y el refresco tras alta/edición; integrar la vista en `showModule` y `refreshAll`.
- [ ] T031 [US25] Ampliar `src/components/ticket-list.js` con el modo global: columnas de `contracts/ticket-ui.md` para `renderDataTable`, filas con `data-ticket-id`, `tabindex="0"`, etiqueta accesible con folio y asunto, activación por `Enter`/`Espacio`, textos explícitos de ausencia y estado vacío `no-records`/`no-matches`; conservar intacto el modo embebido de la ficha del cliente.
- [ ] T032 [US25] Crear `src/components/ticket-detail.js` como drawer de solo lectura sobre `openOverlay({ variant: 'drawer' })` con folio, asunto, estado, prioridad, cliente, descripción, `#ticket-detail-first-response`, `#ticket-detail-resolution`, `#ticket-detail-resolved-at` y `#ticket-detail-closed-at` (con “Sin datos” o “—” cuando aún no existan), abrible desde una fila de la bandeja y desde la lista embebida; sin ruta de detalle ni formulario paralelo, con `Escape` y devolución del foco.
- [ ] T033 [US25] Ampliar `tests/performance/search-performance.test.js` con 1000 tickets: abrir la bandeja, aplicar filtros y ordenar en menos de 500 ms en al menos 19 de 20 mediciones en jsdom, sin persistir claves derivadas (CA-29-08, FR-075, R-15).
- [ ] T034 [US25] Ampliar `tests/integration/accessibility.test.js` con la bandeja: navegación por teclado, `aria-sort`, `role="region"` con etiqueta, foco visible en filas, anuncio en `#ticket-filter-announcer` y activación de la fila sin botón anidado (NFR-010, FR-074).

**Checkpoint**: Bandeja navegable, filtrable y ordenable; abre el detalle de solo lectura. Es el MVP demostrable.

---

## Phase 4: User Story 26 - Folio y asunto (Priority: P1)

**Goal**: Folio `TKT-AAAA-####` único e inmutable visible en todos los listados y asunto obligatorio de hasta 120 caracteres.

**Independent Test**: crear dos tickets el mismo año y comprobar folios consecutivos distintos; intentar editar el folio y comprobar que no se ofrece ni se acepta; guardar sin asunto, con solo espacios y con 121 caracteres y verificar el rechazo; recargar y comprobar que folio y asunto persisten.

### Tests for User Story 26

- [ ] T035 [US26] Ampliar `tests/integration/tickets.test.js` con asunto obligatorio, recorte, límite de 120 y conservación de lo escrito; folio visible y de solo lectura, rechazo de cambio por interfaz y por `updateTicket`; folio conservado tras recargar y unicidad ante doble alta (CA-26-03…CA-26-07). Ampliar `tests/unit/security-render.test.js` para comprobar que `subject` y `description` con etiquetas HTML o texto tipo script se muestran como texto (`textContent`), sin ejecución (FR-073, NFR-014).

### Implementation for User Story 26

- [ ] T036 [US26] Ampliar `src/components/ticket-form.js` con `#ticket-subject` obligatorio (recorte, máximo 120, error asociado), `#ticket-folio` de solo lectura en edición, estado inicial `Nuevo` en `setStatusDisplay`, limpieza y carga en `clearTicketForm`/`startTicketEdit`, inclusión en `collectTicketPayload` y mapeo en `showTicketErrors` con `aria-invalid`.
- [ ] T037 [US26] Agregar a `index.html` los campos `#ticket-folio` (texto de solo lectura, no enviado) y `#ticket-subject` con etiqueta, `aria-required="true"`, `maxlength="120"` y `#error-ticket-subject aria-live="polite"`, junto al formulario de ticket existente.
- [ ] T038 [US26] Mostrar folio y asunto en el modo embebido de `src/components/ticket-list.js` y en los eventos de ticket de `src/crm-timeline.js`, conservando la descripción como campo separado y sin ejecutar HTML.
- [ ] T039 [US26] Mostrar `#ticket-detail-folio` y `#ticket-detail-subject` en `src/components/ticket-detail.js` y enlazar la lista embebida del cliente con el detalle global, sin eliminar la vista actual.

**Checkpoint**: Folio y asunto operativos y visibles; el alta desde la bandeja ya puede completarse con asunto.

---

## Phase 5: User Story 27 - Solicitante, canal y responsable (Priority: P1)

**Goal**: Contacto solicitante con respaldo, canal obligatorio en altas, técnico y equipo opcionales con reasignación, garantía y vínculo de origen.

**Independent Test**: crear un ticket con un contacto del cliente y comprobar que se copian nombre, correo y teléfono; reasignar a otro técnico y equipo; verificar solicitante, canal y responsable en bandeja y detalle; comprobar las etiquetas de garantía y “Venta de origen no disponible”; recargar y confirmar persistencia.

**Dependencies**: US-25 y US-26 (según `spec.md`).

### Tests for User Story 27

- [ ] T040 [US27] Ampliar `tests/integration/tickets.test.js` y `tests/integration/tickets-inbox.test.js` con: alta desde la bandeja con cliente, asunto, descripción, producto, motivo, prioridad y canal (cierra CA-25-03/CA-25-04); selector de contacto limitado al cliente; copia de respaldo `requesterName/Email/Phone`; rechazo de contacto/documento de otro cliente o inexistente; canal/técnico/equipo fuera de catálogo; reasignación con historial; garantía “En garantía”/“Fuera de garantía”/“Garantía no registrada”; documento eliminado muestra “Venta de origen no disponible” y persiste tras recargar (CA-27-01…CA-27-09, FR-053…FR-055, FR-069, FR-070). Ampliar `tests/unit/security-render.test.js` con `requesterName`, `requesterEmail`, `requesterPhone`, `equipmentReference` y `warrantyEndsAt` renderizados como texto seguro (FR-073, NFR-014).

### Implementation for User Story 27

- [ ] T041 [US27] Ampliar `src/components/ticket-form.js` con `#ticket-contact`, `#ticket-requester-name`, `#ticket-requester-email`, `#ticket-requester-phone`, `#ticket-channel`, `#ticket-assignee`, `#ticket-team`, `#ticket-warranty` y `#ticket-document`: llenar catálogos, filtrar contactos y documentos por cliente, copiar el respaldo al elegir contacto, limpiar selecciones incompatibles al cambiar de cliente, incluir todo en `collectTicketPayload` y en `showTicketErrors`.
- [ ] T042 [US27] Agregar a `index.html` los controles de T041 con etiquetas asociadas, `aria-describedby` hacia `#error-ticket-<campo>`, `aria-required="true"` en canal y opciones “Sin contacto”, “Sin asignar” y “Sin vínculo” donde corresponda.
- [ ] T043 [US27] En `src/app.js`, poblar contactos y documentos según el cliente seleccionado, conservar el respaldo del solicitante al editar y agregar el handler de “Asignar” con `assignTicket` usando un diálogo de `ui-overlay` (`#assign-ticket-assignee`, `#assign-ticket-team`); refrescar bandeja y detalle tras guardar.
- [ ] T044 [US27] Completar en el modo global de `src/components/ticket-list.js` las columnas Solicitante, Canal y Técnico con “Solicitante no registrado”, “Canal no registrado” y “Sin asignar”, y reflejar técnico/equipo en el modo embebido.
- [ ] T045 [US27] Ampliar `src/components/ticket-detail.js` con `#ticket-detail-requester`, `#ticket-detail-channel`, `#ticket-detail-assignee`, `#ticket-detail-team`, `#ticket-detail-product`, `#ticket-detail-equipment`, `#ticket-detail-warranty` y `#ticket-detail-document`, con las etiquetas de ausencia y garantía definidas en `contracts/ticket-ui.md`.

**Checkpoint**: Ticket identificable, atribuible y con contexto de post-venta; alta completa desde la bandeja.

---

## Phase 6: User Story 28 - Ciclo de vida y cierre (Priority: P1)

**Goal**: Ciclo `Nuevo → En proceso → En espera → En proceso → Resuelto → Cerrado`, con acciones por estado, resolución con solución, cierre terminal y eliminación individual confirmada.

**Independent Test**: crear un ticket, pasarlo a “En proceso”, “En espera”, reanudarlo, resolverlo con solución y cerrarlo; intentar reabrirlo y comprobar el rechazo; eliminar un ticket y verificar que el cliente permanece; recargar y comprobar que el resultado persiste.

**Dependencies**: US-25 a US-27.

### Tests for User Story 28

- [ ] T046 [US28] Crear `tests/integration/ticket-lifecycle-ui.test.js` con: alta en `Nuevo`; cambio a `En proceso` y generación de `firstResponseAt`; `En espera` con nota en el historial y SLA corriendo; reanudación; resolución con resumen obligatorio y `resolvedAt`; cierre con `closedAt` y solo lectura; acciones no ofrecidas y almacenamiento que rechaza `Nuevo → Resuelto`, `Nuevo → Cerrado`, `En espera → Nuevo`, reapertura de `Resuelto` y cualquier salida de `Cerrado`; edición permitida en `Resuelto` solo para campos descriptivos; eliminación con confirmación que indica folio/asunto, conserva al cliente y no reaparece tras recargar; cancelar no modifica nada (CA-28-01…CA-28-11, FR-056…FR-061, FR-063, FR-068). Comprobar que el detalle muestra primera respuesta, resolución, `resolvedAt` y `closedAt` después de resolver y cerrar, y “Sin datos” antes de esos hitos (`#ticket-detail-first-response`, `#ticket-detail-resolution`, `#ticket-detail-resolved-at`, `#ticket-detail-closed-at`).

### Implementation for User Story 28

- [ ] T047 [US28] Implementar en `src/components/ticket-detail.js` las acciones por estado con los IDs de `contracts/ticket-ui.md`: “Editar” (`startTicketEdit`), “Cambiar estado” con `nextTicketStatuses` y nota opcional para `En espera`, “Resolver” con resumen obligatorio, “Cerrar” y “Eliminar”; cada diálogo conserva lo escrito ante error, cierra solo al confirmar y devuelve el foco; “Eliminar” y “Cerrar” usan la confirmación de T022.
- [ ] T048 [US28] Conectar en `src/app.js` los handlers del detalle: `changeTicketStatus`, `resolveTicket`, `closeTicket` y `deleteTicket`, refresco de bandeja/detalle/ficha tras cada operación, mensajes de `contracts/ticket-ui.md` y bloqueo del doble envío; no mostrar éxito si la escritura falla.
- [ ] T049 [US28] Actualizar `src/crm-timeline.js` y el modo embebido de `src/components/ticket-list.js` para los cinco estados (`status-new`, `status-in-progress`, `status-waiting`, `status-resolved`, `status-closed`), ocultar “Resolver” fuera de `En proceso`/`En espera` y no ofrecer acciones sobre `Cerrado`; agregar a `src/styles.css` los badges de estado con contraste AA.
- [ ] T050 [US28] Ampliar `tests/integration/accessibility.test.js` con el detalle y sus diálogos: foco atrapado, `Escape`, devolución del foco, `aria-modal`, errores anunciados, acciones por teclado y recorrido completo sin ratón (SC-026).

**Checkpoint**: Ciclo de vida completo y cierre terminal operativos. La rebanada P1 queda funcional de punta a punta.

---

## Phase 7: User Story 29 - SLA por prioridad (Priority: P1)

**Goal**: Semáforo `En plazo`/`Por vencer`/`Vencido`/`Sin datos` derivado de `createdAt` y prioridad, visible en bandeja y detalle, congelado al resolver.

**Independent Test**: crear tickets Alta, Media y Baja con fechas controladas y comprobar objetivos y tres semáforos; cambiar la prioridad y verificar recálculo sin reiniciar el reloj; resolver y comprobar el resultado final; intentar cambiar la prioridad después de resolver y verificar el rechazo.

**Dependencies**: US-25, US-26 y US-28.

### Tests for User Story 29

- [ ] T051 [US29] Ampliar `tests/integration/tickets-inbox.test.js` y `tests/integration/ticket-lifecycle-ui.test.js` con el semáforo en bandeja y detalle (texto e icono, no solo color), recálculo al cambiar prioridad, resultado congelado con `resolvedAt`, `Sin datos` sin fecha verificable y rechazo de cambio de prioridad en `Resuelto`/`Cerrado` (CA-29-02…CA-29-07, FR-062).

### Implementation for User Story 29

- [ ] T052 [US29] Agregar a `src/components/ui.js` un helper de semáforo reutilizable (`sla-on-time`, `sla-due-soon`, `sla-overdue`, `Sin datos`) con texto e icono accesible y, en `src/styles.css`, los estilos de contraste AA correspondientes.
- [ ] T053 [US29] Usar el helper de T052 en la columna SLA del modo global y embebido de `src/components/ticket-list.js`, calculando `getSlaStatus` en el render y sin leer `slaDueAt` materializado como verdad.
- [ ] T054 [US29] Mostrar `#ticket-detail-sla` en `src/components/ticket-detail.js` y, en `Resuelto`/`Cerrado`, el resultado final comparando `resolvedAt` con el objetivo vigente; sin pausas por `En espera` ni lecturas persistidas.

**Checkpoint**: SLA visible, recalculado y congelado al resolver.

---

## Phase 8: User Story 30 - Historial de cambios (Priority: P1)

**Goal**: Historial embebido, append-only y atómico visible en el detalle, con tipo, fecha, actor y valores anterior/nuevo.

**Independent Test**: crear un ticket, cambiar estado, prioridad y técnico, resolverlo y cerrarlo; abrir el detalle y comprobar una entrada por cambio, en orden descendente y con valores anterior/nuevo; simular un fallo de guardado y verificar que no queda una entrada parcial.

**Dependencies**: US-27 a US-29.

### Tests for User Story 30

- [ ] T055 [US30] Ampliar `tests/integration/ticket-lifecycle-ui.test.js` con el historial del detalle: entrada `creacion` con folio, `estado`, `prioridad`, `asignacion`, `equipo`, `resolucion`, `cierre` y `satisfaccion`; orden descendente con desempate por inserción; “Sin cambios registrados” sin eventos; persistencia tras recargar sin duplicados; fallo de cuota inyectado que no modifica el ticket ni deja evento parcial (CA-30-01…CA-30-08, FR-064, FR-065). Incluir en `tests/unit/security-render.test.js` el renderizado seguro de `from`, `to`, `note` y `actor` del historial con HTML inyectado (CA-30-06, FR-073).

### Implementation for User Story 30

- [ ] T056 [US30] Implementar `#ticket-detail-history` con `role="list"` en `src/components/ticket-detail.js`: eventos descendentes por `at`, tipo legible, fecha, actor y `from`/`to`/`note`, estado vacío “Sin cambios registrados” y renderizado con `textContent`; agregar los estilos del historial a `src/styles.css`.

**Checkpoint**: Trazabilidad completa y atómica visible en el detalle.

---

## Phase 9: User Story 32 - Satisfacción del cliente (Priority: P2)

**Goal**: CSAT entero 1–5 con comentario opcional de hasta 500 caracteres, registrado al resolver o en `Resuelto`, visible en detalle y promedio en la ficha del cliente.

**Independent Test**: resolver un ticket con nota 4 y comentario y otro con nota 2; comprobar el promedio en la ficha del cliente; intentar 0, 6, decimal y texto y verificar el rechazo; registrar satisfacción desde el detalle de un `Resuelto` sin alterar estado ni fechas; cerrar y comprobar solo lectura; recargar y confirmar persistencia.

**Dependencies**: US-28 (resolución). La tarjeta del panel se completa en US-31.

### Tests for User Story 32

- [ ] T057 [P] [US32] Crear `tests/unit/ticket-metrics.test.js` con la parte de `averageSatisfaction(tickets)`: promedio de notas válidas 1–5 con un decimal, exclusión de valores inválidos y `null` → “Sin datos” sin división por cero; se ampliará en US-31 con el resto de indicadores (CA-31-07, CA-32-07).
- [ ] T058 [US32] Implementar `averageSatisfaction` en `src/crm-metrics.js` junto a un helper de formato de una cifra decimal reutilizable por panel y ficha (depende de T057).
- [ ] T059 [US32] Crear `tests/integration/ticket-satisfaction.test.js`: nota opcional en el diálogo de resolución; registro desde el detalle de un `Resuelto`; rechazo de 0, 6, 1.5, texto y comentario de 501 con mensaje y conservación de lo escrito; recorte de espacios; no cambia estado, `resolvedAt` ni `closedAt`; entrada `satisfaccion`; solo lectura en `Cerrado`; “Sin satisfacción registrada”; persistencia tras recargar; promedio en la ficha del cliente (CA-32-01…CA-32-08, FR-067). Verificar que `satisfactionComment` con HTML se muestra como texto seguro (`tests/unit/security-render.test.js`, NFR-014).
- [ ] T060 [US32] Implementar en `src/components/ticket-detail.js` `#ticket-detail-satisfaction` (nota, comentario y fecha del evento `satisfaccion` más reciente) y la acción `#ticket-detail-satisfaction-action` con su diálogo (`#ticket-satisfaction-score`, `#ticket-satisfaction-comment`), visible solo en `Resuelto` sin nota; usar `registerSatisfaction` y refrescar el detalle.
- [ ] T061 [US32] Ampliar el diálogo “Resolver” de `src/components/ticket-detail.js` con `#ticket-resolution-score` (1–5, opcional) y `#ticket-resolution-comment` (opcional, 500), enviados a `resolveTicket` en la misma operación atómica y con evento `satisfaccion` separado.
- [ ] T062 [US32] Mostrar el promedio CSAT del cliente en `src/components/entity-detail.js` reutilizando `averageSatisfaction` sobre los tickets del cliente, con “Sin datos” sin notas y sin persistir el agregado.

**Checkpoint**: Voz del cliente registrada y promediada en la ficha.

---

## Phase 10: User Story 31 - Indicadores de soporte (Priority: P2)

**Goal**: Seis indicadores de soporte en el panel, recalculados en cada render y sin agregados persistidos, conservando los seis comerciales y las tarjetas de actividades.

**Independent Test**: con la muestra de control de `quickstart.md` (tickets A–F), abrir el panel y comparar cada indicador con el cálculo manual (abiertos 3, vencidos 1, prioridades Alta 2 / Media 1 / Baja 0, resolución media 80.0 h, cumplimiento 66.7 %, CSAT 4.0); cambiar un ticket, volver al panel y comprobar el recálculo; probar con almacenamiento vacío.

**Dependencies**: US-25 a US-30 y US-32 (según `spec.md`).

### Tests for User Story 31

- [ ] T063 [US31] Ampliar `tests/unit/ticket-metrics.test.js` con `countOpenTickets`, `countOverdueTickets`, `ticketPriorityDistribution`, `averageResolutionHours` y `slaCompliance`: fórmulas exactas de la muestra de control, exclusión de `Resuelto`/`Cerrado` de abiertos y vencidos, ceros visibles en prioridades, `null` → “Sin datos”, exclusión de fechas inválidas y ausencia de división por cero (CA-31-02…CA-31-07, SC-021).
- [ ] T064 [US31] Implementar en `src/crm-metrics.js` `countOpenTickets`, `countOverdueTickets`, `ticketPriorityDistribution`, `averageResolutionHours` y `slaCompliance`, reutilizando `computeSlaDueAt` de `src/crm-rules.js` y sin persistir agregados (depende de T063).
- [ ] T065 [US31] Crear `tests/integration/dashboard-tickets.test.js` con la muestra de control, recálculo tras cambiar un ticket, “Sin datos”/cero en almacenamiento vacío y conservación de los seis indicadores comerciales y las tarjetas de actividades (CA-31-01, CA-31-08, CA-31-09).

### Implementation for User Story 31

- [ ] T066 [US31] Agregar a `src/components/dashboard.js` las seis tarjetas de soporte (“Tickets abiertos”, “Tickets vencidos de SLA”, “Tickets por prioridad”, “Tiempo medio de resolución”, “Cumplimiento de SLA”, “Satisfacción promedio”), usando las funciones de T064 y T058, con “Sin datos” donde corresponda; agregar los estilos a `src/styles.css` y verificar que `renderDashboard` se invoca en cada visita sin leer totales persistidos.

**Checkpoint**: Panel completo: seis indicadores comerciales, dos de actividades y seis de soporte.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Documentación, regresión, accesibilidad global y evidencias reales.

- [ ] T067 [P] Actualizar `specs/001-crm-module/spec.md` (referencia a esta iteración, ampliación de FR-025/FR-026 y nota del esquema v4) y `specs/001-crm-module/tasks.md` (fase de tickets de post-venta) para reflejar el alcance implementado.
- [ ] T068 [P] Actualizar `specs/001-crm-module/quickstart.md` y `README.md` con el recorrido de bandeja, SLA, historial, satisfacción, migración/restauración, límites conocidos (concurrencia entre pestañas, folio 9999/año, migrados vencidos) y el procedimiento de recuperación.
- [ ] T069 Ejecutar `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build`; corregir cualquier fallo y registrar en `README.md` el total real de archivos/pruebas, la duración, la fecha y el resultado de cada comando, sin declarar pruebas no ejecutadas.
- [ ] T070 Recorrer `specs/004-ticket-postventa/quickstart.md` (secciones 2–15) en Chrome o Firefox actuales y registrar en `README.md` navegador, versión, sistema, equipo, escenarios manuales y las 20 mediciones de rendimiento con 1000 tickets (≥ 19 bajo 500 ms) o la desviación real.
- [ ] T071 Revisar coherencia y seguridad: textos en español, `textContent` en todo dato ingresado, ausencia de `window.confirm()` en flujos nuevos, misma descripción de entidades/reglas en `spec.md`, `plan.md`, `data-model.md`, `contracts/`, `quickstart.md`, `specs/001-crm-module/` y `README.md`; validar la Definición de Terminado y que US-01 a US-16 siguen en verde sin pérdida de cobertura.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias; T001 y T002 pueden ir en paralelo salvo que T001 requiera el informe final.
- **Foundational (Phase 2)**: depende de Setup y **bloquea** todas las historias. Orden interno:
  `T003–T012 (tests) → T013–T016 (reglas) → T017 → T018/T019 → T020 → T021 → T022 → T023 → T024 → T025 → T026`.
- **Historias P1 (Fases 3–8)**: dependen de Foundational y se ejecutan en el orden US-25 → US-26 → US-27 → US-28 → US-29 → US-30.
- **Historias P2 (Fases 9–10)**: US-32 después de US-28; US-31 después de US-25 a US-30 y US-32.
- **Polish (Phase 11)**: depende de todas las historias entregadas.

### User Story Dependencies

- **US-25 (P1)**: sin dependencia de otras historias; usa los tickets existentes de US-03/US-11.
- **US-26 (P1)**: depende de US-25 para el alta y la bandeja.
- **US-27 (P1)**: depende de US-25 y US-26 (contacto, canal y responsable en el formulario y el detalle).
- **US-28 (P1)**: depende de US-25 a US-27 (acciones del detalle sobre un ticket completo).
- **US-29 (P1)**: depende de US-25, US-26 y US-28 (semáforo y congelamiento al resolver).
- **US-30 (P1)**: depende de US-27 a US-29 (historial de todos los cambios).
- **US-32 (P2)**: depende de US-28 (resolución).
- **US-31 (P2)**: depende de US-25 a US-30 y US-32 (indicadores sobre tickets y CSAT).

### Within Each User Story

- Tests primero: escribir y comprobar que fallan antes de implementar.
- Reglas/dominio antes que componentes; componentes antes que handlers de `src/app.js`.
- `ticket-detail.js` se crea en US-25 y se amplía en US-26, US-27, US-28, US-29, US-30 y US-32; sus tareas son secuenciales entre fases.
- `src/app.js`, `src/styles.css`, `index.html` y `src/components/ticket-list.js` se tocan en varias fases: nunca marcar dos tareas de archivos iguales como `[P]`.

### Parallel Opportunities

- T003–T012: diez archivos de prueba distintos en paralelo.
- T018 y T022: `storage-recovery.js` y `ui-overlay.js` no dependen entre sí.
- T024 y T026: prueba de integración de migración y documentación de `001` en paralelo tras T023.
- En cada historia, los tests marcados `[P]` pueden escribirse junto con otros archivos de prueba.
- T057 y T067/T068: archivos independientes; pueden ejecutarse en paralelo dentro de su fase.
- Con varios desarrolladores: US-25 y US-26 pueden solaparse solo después de T031/T036; US-27 y US-28 requieren coordinación por `ticket-form.js`, `ticket-detail.js` y `app.js`.

---

## Parallel Example: User Story 25

```text
# Pruebas de la historia (archivo propio, escrita antes de la implementación):
Task: "T027 [US25] tests/integration/tickets-inbox.test.js"

# Implementación base (secuencial por dependencias):
Task: "T028 [US25] index.html: navegación y estructura de la vista"
Task: "T029 [US25] shell.js: estado activo de Tickets"
Task: "T030 [US25] app.js: ruta, filtros, orden y render"
Task: "T031 [US25] ticket-list.js: modo global"
Task: "T032 [US25] ticket-detail.js: drawer de solo lectura"

# Con la bandeja implementada:
Task: "T033 [US25] presupuesto de 1000 tickets"
Task: "T034 [US25] accesibilidad de la bandeja"
```

## Parallel Example: Foundational

```text
# Tests de reglas en paralelo (archivos distintos):
Task: "T004 ticket-lifecycle.test.js"
Task: "T005 ticket-folio.test.js"
Task: "T006 ticket-sla.test.js"
Task: "T007 ticket-history.test.js"
Task: "T008 ticket-satisfaction.test.js"

# Infraestructura independiente:
Task: "T018 storage-recovery.js: clave de respaldo"
Task: "T022 ui-overlay.js: confirmación accesible"
```

---

## Implementation Strategy

### MVP First (User Story 25 Only)

1. Completar Phase 1 (Setup).
2. Completar Phase 2 (Foundational) — **bloquea todo**.
3. Completar Phase 3 (US-25).
4. **DETENERSE y VALIDAR**: abrir `#/tickets`, filtrar, ordenar, limpiar filtros, comprobar estados vacíos y apertura del detalle con teclado.
5. Demostrar la bandeja como MVP; el alta completa del ticket requiere US-26 y US-27.

### Incremental Delivery

1. Setup + Foundational → reglas, persistencia y migración verificadas.
2. US-25 → bandeja global (MVP).
3. US-26 → folio y asunto; el alta desde la bandeja queda identificable.
4. US-27 → solicitante, canal y responsable; alta completa.
5. US-28 → ciclo de vida, cierre y eliminación; rebanada P1 operable de punta a punta.
6. US-29 → SLA visible y congelado.
7. US-30 → historial auditable.
8. US-32 → satisfacción del cliente.
9. US-31 → indicadores del panel; iteración funcional completa.
10. Polish → documentación, regresión, accesibilidad global y evidencias.

### Notas de ejecución

- Cada incremento actualiza su documentación en la misma tarea (R-20), no al final.
- No se agregan dependencias, router, store, colección nueva ni formulario paralelo.
- No se declara éxito si una escritura falla; el historial y el ticket se confirman juntos o no se confirman.
- Cualquier desviación (rendimiento, navegador, contraste) se registra como resultado real en `README.md`.

---

## Trazabilidad

| Historia | Prioridad | Requisitos | Criterios | Fases / tareas |
|---|---|---|---|---|
| US-25 | P1 | FR-046…FR-050 | CA-25-01…CA-25-08 | Phase 3 (T027–T034) |
| US-26 | P1 | FR-051, FR-052 | CA-26-01…CA-26-07 | Phase 4 (T035–T039) |
| US-27 | P1 | FR-053…FR-055, FR-069, FR-070 | CA-27-01…CA-27-09 | Phase 5 (T040–T045) |
| US-28 | P1 | FR-056…FR-061, FR-063, FR-068 | CA-28-01…CA-28-11 | Phase 6 (T046–T050) |
| US-29 | P1 | FR-062, FR-075 | CA-29-01…CA-29-08 | Phase 2 (T006) + Phase 7 (T051–T054) + T033 |
| US-30 | P1 | FR-064, FR-065 | CA-30-01…CA-30-08 | Phase 2 (T007) + Phase 8 (T055–T056) |
| US-31 | P2 | FR-066 | CA-31-01…CA-31-09 | Phase 10 (T063–T066) |
| US-32 | P2 | FR-067 | CA-32-01…CA-32-08 | Phase 9 (T057–T062) |
| Migración | Transversal | FR-071, FR-072, FR-077 | SC-024, SC-025 | Phase 2 (T012, T017–T026) + T024 |

## Format Validation

- Todas las tareas usan `- [ ] T### [P?] [US##?] descripción con ruta`.
- Fases de setup, fundamentos y polish no llevan etiqueta de historia.
- Toda tarea de historia (Fases 3–10) lleva `[US25]`…`[US32]`.
- Ninguna tarea comparte archivo con otra marcada `[P]` en la misma fase.
