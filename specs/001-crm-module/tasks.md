---

description: "Lista de tareas ejecutables para el módulo CRM (Clientes y Oportunidades)"
---

# Tareas: Módulo CRM (Clientes y Oportunidades)

**Entrada**: Documentos de diseño en `/specs/001-crm-module/`

**Prerrequisitos**: `plan.md` (obligatorio), `spec.md` (obligatorio para las historias), `research.md`, `data-model.md`, `contracts/entity-storage.md`, `quickstart.md`, `.specify/memory/constitution.md`

**Pruebas**: la especificación (`spec.md`, sección “Estrategia de pruebas”, regla test-first) y la constitución (Principio II) **exigen** pruebas automatizadas, por lo que se incluyen tareas de prueba. Deben escribirse **antes** de la implementación correspondiente y fallar primero.

**Organización**: las tareas se agrupan por fase y por historia de usuario para permitir implementación y validación independientes.

**Alcance de la ampliación**: las tareas T001–T070 cubren US1–US7. Las historias **US-08 a US-16** de `spec.md` no tenían tareas; se agregan en T071–T145 sin renumerar ni reescribir las anteriores. US-17 a US-22 pertenecen a `specs/003-crm-campanas/` y quedan fuera de este archivo.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: puede ejecutarse en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece la tarea (`US1`…`US16`; `US8` corresponde a `US-08` de `spec.md`)
- **Rutas**: proyecto único, `src/` y `tests/` en la raíz del repositorio

## Convenciones de rutas

- Código de aplicación: `src/` y `index.html` (restaurados desde `dea57da`)
- Reglas puras: `src/crm-rules.js`, `src/crm-metrics.js`
- Persistencia: `src/storage.js`
- Configuración: `src/module-config.js`
- Interfaz: `src/components/*.js` y `src/app.js`
- Pruebas: `tests/unit/`, `tests/integration/`, `tests/performance/`

---

## Fase 1: Setup (infraestructura compartida)

**Propósito**: recuperar el template ERP base y dejar el entorno de desarrollo y pruebas ejecutando de verdad.

- [X] T001 Restaurar el código base con `git checkout dea57da -- src index.html` y verificar que el árbol coincide con la estructura de `specs/001-crm-module/plan.md`
- [X] T002 Restaurar las pruebas base desde la rama `borrador` hacia `tests/` (`git checkout borrador -- tests`) y revisar que no arrastren supuestos del módulo ERP
- [X] T003 [P] Ejecutar `npm install`, `npx vitest run` y `npm run build` sobre la base sin modificar y registrar fecha, comando y resultado real en `README.md` (sección “Evidencias y registro de cambios”)
- [X] T004 [P] Configurar el entorno DOM de pruebas en `vitest.config.mjs` (`environment: 'jsdom'`) y crear `tests/setup.js` con limpieza de `localStorage` entre pruebas
- [X] T004A [P] Configurar ESLint + Prettier (`eslint.config.mjs`, `.prettierignore`, `.prettierrc.json`) y los scripts `lint` y `format:check`; verificar que `npm run lint` y `npm run format:check` pasan sobre la base restaurada antes de iniciar las historias

---

## Fase 2: Foundational (prerrequisitos bloqueantes)

**Propósito**: núcleo de almacenamiento, configuración, reglas compartidas y esqueleto de navegación que **todas** las historias necesitan.

**⚠️ CRÍTICO**: ninguna historia puede implementarse hasta completar esta fase.

- [X] T005 [P] Escribir las pruebas unitarias base de persistencia en `tests/unit/storage.test.js`: generación de `id`/`entity_id`, marcas ISO, versión de esquema, JSON corrupto y cuota agotada sin reinicio silencioso (deben fallar primero)
- [X] T006 Refactorizar `src/storage.js`: constantes `erp_base_module:entities`, `erp_base_module:documents`, `erp_base_module:schemaVersion`, generación de identidad y marcas de tiempo, y lectura de JSON corrupto que informa el error sin borrar datos
- [X] T007 Implementar en `src/storage.js` la escritura atómica sobre una instantánea validada mediante el helper interno `saveSnapshot` y las operaciones `loadEntities`, `saveEntities`, `addEntity`, `updateEntity`, `deleteEntity`, `loadDocuments`, `saveDocuments`, `addDocument`, `updateDocument`, `deleteDocument` que propagan el fallo de cuota al llamador
- [X] T008 Implementar en `src/storage.js` la cascada atómica de `deleteEntity` (cliente + documentos en una sola escritura) y `deleteDocumentsForEntity` para `contracts/entity-storage.md`; la extensión a tickets se implementa en T051
- [X] T009 Escribir el perfil CRM en `src/module-config.js`: `moduleName`, `labels` (Cliente/Clientes, Oportunidad/Oportunidades), `customFields` (`contactName`, `accountOwner`, `acquisitionSource`, `opportunityTitle`, `opportunityOwner`, `lossReason`), catálogos (`category`, `accountOwner`/`opportunityOwner`, `acquisitionSource`, `priority`, `reason`), `statusLifecycle` y `theme.accentColor: '#0F766E'`
- [X] T010 Reforzar el cargador de `src/module-config.js` (`getConfig`) para exponer errores de configuración (tipos, colisiones con campos base, opciones de `select`, estados y color) y conservar el respaldo genérico, con pruebas en `tests/unit/module-config.test.js`
- [X] T011 [P] Crear `src/crm-rules.js` con los helpers puros compartidos: `normalizeCode`, `normalizeText` (trim + minúsculas + sin diacríticos), `isValidEmail`, `isValidCatalogValue`, `isValidCalendarDate`, `compareCalendarDates` y `todayLocal` (fechas `YYYY-MM-DD` sin pasar por UTC)
- [X] T012 [P] Adaptar `src/components/custom-fields.js` para renderizar los `customFields` del perfil CRM con `label` asociado, `required` visible y mensajes de error accesibles
- [X] T013 [P] Definir tokens de diseño y color de acento en `src/styles.css` (`--accent: #0F766E`), foco visible y estilos de estados vacíos/error reutilizables
- [X] T014 Implementar en `src/components/shell.js` la barra superior y lateral con Clientes, Oportunidades y Buscar, resaltado de la vista activa y `labelFor(kind)` alimentado por `ModuleConfig`; la entrada Panel se agrega en T058 (P2)
- [X] T015 Implementar en `src/app.js` el enrutador interno, el ciclo de render por vista, la restauración de una vista válida desde enlace directo o botón Atrás con Clientes como respaldo en P1 (Panel en P2), la suscripción al evento `storage` (pestaña obsoleta) y el guardián de cambios sin guardar

**Punto de control**: la base corre, persiste, navega y aplica la configuración; las historias pueden empezar.

---

## Fase 3: Historia de Usuario 1 — Registrar clientes y prospectos (Prioridad: P1) 🎯 MVP

**Objetivo**: dar de alta, editar y eliminar clientes y prospectos con identificación, clasificación, responsable, origen y contacto principal opcional.

**Prueba independiente**: registrar una empresa ficticia con `name`, `code`, `category`, `accountOwner` y `acquisitionSource`, encontrarla en la lista, editarla y recargar la aplicación conservando `id` y `entity_id`. Se puede probar sin crear oportunidades.

### Pruebas de la Historia 1

- [X] T016 [P] [US1] Escribir `tests/unit/crm-rules.test.js` con `validateClient`, `normalizeCode`, `isValidEmail`, `isValidCatalogValue`, `getTargetDateStatus`, `isValidCalendarDate`, `compareCalendarDates` y `todayLocal` (incluye código duplicado con espacios y minúsculas, campos solo con espacios, contacto incompleto, fechas imposibles y el límite del día local)
- [X] T017 [P] [US1] Escribir `tests/integration/create-edit-delete-client.test.js`: alta válida, rechazo de duplicados, edición preservando identificadores, el cliente visible en la lista tras guardar y tras recargar, eliminación con confirmación (cascada solo de oportunidades en esta fase) y cancelación, y persistencia tras recarga

### Implementación de la Historia 1

- [X] T018 [US1] Implementar en `src/crm-rules.js` `validateClient(client, context)`: obligatorios `name`, `code`, `category`, `accountOwner`, `acquisitionSource`; `email` válido si existe; catálogos desde `ModuleConfig`; código único normalizado con exclusión del registro actual; `targetDate` opcional válida
- [X] T019 [US1] Implementar `src/components/entity-form.js`: formulario de alta/edición con obligatorios marcados, errores por campo asociados con `aria-describedby`, conservación de lo ingresado y bloqueo de guardado inválido
- [X] T020 [US1] Implementar `src/components/entity-list.js`: selector de clientes, resumen (código, tipo, responsable, origen, próximo contacto) con los estados “Vencido”, “Para hoy”, “Programado” y “Sin programar” calculados por `getTargetDateStatus`, y estado vacío “No hay clientes registrados” con acción para crear
- [X] T021 [US1] Conectar en `src/app.js` la vista Clientes: alta desde “Nuevo cliente”, edición conservando `id`/`entity_id`, eliminación con confirmación que informa cuántas oportunidades se eliminarán y, cuando la colección de tickets exista, cuántos tickets; cascada atómica, mensaje de éxito solo tras persistir y error de almacenamiento con formulario conservado
- [X] T022 [US1] Hacer que `src/storage.js` invoque `validateClient` antes de `addEntity`/`updateEntity` y rechace códigos duplicados tras `normalizeCode`, sin alterar el registro existente

**Punto de control**: US1 completa y verificable por sí sola.

---

## Fase 4: Historia de Usuario 2 — Buscar clientes y consultar su ficha (Prioridad: P1)

**Objetivo**: buscar por nombre o código con normalización de mayúsculas y tildes, filtrar por tipo/responsable/origen y consultar la ficha del cliente sin modificar datos.

**Prueba independiente**: con clientes registrados, buscar por nombre completo, parte del nombre, código y texto sin tildes; abrir la ficha; comprobar “Ingresa un criterio”, “Sin coincidencias”, “sin información” y “Sin programar”; comparar el almacenamiento antes y después de buscar.

### Pruebas de la Historia 2

- [X] T023 [P] [US2] Escribir `tests/unit/search.test.js` para `searchClients` (nombre y código, insensible a mayúsculas y diacríticos) y `searchOpportunities` (asunto y folio con cliente asociado), incluidos filtros combinados con AND
- [X] T024 [P] [US2] Escribir `tests/integration/search-clients.test.js`: resultados múltiples de clientes y de oportunidades por asunto/folio, cliente vinculado visible, selección de resultado, ficha con campos vacíos, prospectos incluidos y prueba de no mutación del almacenamiento

### Implementación de la Historia 2

- [X] T025 [US2] Implementar en `src/crm-rules.js` `searchClients(criterion, filters)` y `searchOpportunities(criterion, filters)` con normalización `trim → minúsculas → sin diacríticos` y filtros AND por `category`, `accountOwner`, `acquisitionSource`
- [X] T026 [US2] Implementar `src/components/search-bar.js`: criterio único, actualización automática al escribir, filtros de tipo/responsable/origen y acción “Limpiar filtros”
- [X] T027 [US2] Crear `src/components/search-results.js` para renderizar resultados de clientes y una sección identificada de oportunidades (asunto, folio, cliente vinculado), con los estados “Ingresa un criterio” y “Sin coincidencias”, sin escrituras en `localStorage`; no cargar esta responsabilidad en `entity-list.js`
- [X] T028 [US2] Crear `src/components/entity-detail.js` con la ficha de cliente (`name`, `code`, `category`, `accountOwner`, `acquisitionSource`, `email`, `phone`, `contactName`, `description`, `targetDate`, `createdAt`), “sin información” por campo, “Contacto incompleto” cuando correo y teléfono están ambos vacíos, el estado correspondiente de `targetDate` (“Vencido”, “Para hoy”, “Programado” o “Sin programar”) y la lista de oportunidades asociadas en solo lectura
- [X] T029 [US2] Conectar en `src/app.js` la vista Buscar: criterio, resultados de clientes y oportunidades, selección, ficha y mensajes de estado, garantizando que buscar y consultar no mutan el almacenamiento; al seleccionar una oportunidad se muestra un detalle de solo lectura con asunto, folio, etapa, monto, responsable, fechas y cliente vinculado, renderizado por `search-results.js`/`entity-detail.js` sin abrir el formulario de edición de US4/US5

**Punto de control**: US1 y US2 funcionan por separado y en conjunto.

---

## Fase 5: Historia de Usuario 4 — Registrar una oportunidad comercial (Prioridad: P1)

**Objetivo**: registrar una oportunidad vinculada a un cliente existente con folio único `OPP/folio`, monto CLP entero, fechas válidas y etapa inicial Nueva.

**Prueba independiente**: con `Empresa Demo 1` (`CLI-DEMO-003`) precargada, crear OPP/3001 con los datos de `spec.md`, comprobar el mensaje de éxito, recargar, repetir el folio (debe fallar), y probar monto cero, campos vacíos, fechas invertidas y cancelación.

### Pruebas de la Historia 4

- [X] T030 [P] [US4] Escribir `tests/unit/opportunity-rules.test.js`: `validateOpportunity`, `isFolioUnique` (excluyendo el registro actual), monto entero ≥ 0 con cero válido, fechas reales y `endDate >= startDate`, responsable de catálogo y rechazo de etapa inicial distinta de Nueva
- [X] T031 [P] [US4] Escribir `tests/integration/create-opportunity.test.js`: alta válida OPP/3001, folio duplicado, cliente inexistente, ausencia de clientes, doble clic y persistencia tras recarga

### Implementación de la Historia 4

- [X] T032 [US4] Implementar en `src/crm-rules.js` `validateOpportunity(opportunity, context)`, `isFolioUnique(series, folio, documents, currentId)`, `validateAmount`, `validateOpportunityDates` (comparación de cadenas `YYYY-MM-DD`) y la fijación forzada de `series = OPP`, `currency = CLP` y `status = Nueva` al crear
- [X] T033 [US4] Implementar `src/components/document-form.js` en modo alta: selector de cliente por nombre y código, asunto, folio, fechas, monto, responsable, notas, serie/moneda/etapa fijas y visibles como no editables, mensajes de error accesibles
- [X] T034 [US4] Implementar `src/components/document-list.js` con la lista de oportunidades (asunto, folio, etapa, monto, responsable, fechas) y estado vacío “No se encontraron oportunidades”
- [X] T035 [US4] Conectar en `src/app.js` la vista Oportunidades y los accesos “Nueva oportunidad” desde el área Oportunidades y la ficha del cliente (el acceso desde el panel se agrega en T058, P2); bloquear el alta sin clientes con acceso a crear cliente; mostrar “Oportunidad registrada correctamente” solo después de persistir
- [X] T036 [US4] Reforzar en `src/storage.js` `addDocument`: exigir `entity_id` existente (sin reasignar cliente), validar folio único por `series + folio`, forzar `status = Nueva` en creación y evitar registros duplicados ante envío repetido

**Punto de control**: US4 completa; US2 puede mostrar oportunidades asociadas.

---

## Fase 6: Historia de Usuario 5 — Gestionar oportunidades y ciclo de vida (Prioridad: P1)

**Objetivo**: editar oportunidades, avanzar por el ciclo `Nueva → Contactada → Propuesta → Negociación → Ganada`, cerrar como Perdida con motivo y eliminar con confirmación.

**Prueba independiente**: recorrer las transiciones válidas de una oportunidad, rechazar saltos y reaperturas, exigir `lossReason` al perder, editar conservando estado final y eliminar sin afectar al cliente.

### Pruebas de la Historia 5

- [X] T037 [P] [US5] Escribir `tests/unit/lifecycle.test.js`: `canTransition` y `nextStatuses` para toda la matriz, estados finales, rechazo de `Propuesta → Ganada`, `lossReason` obligatorio al entrar en Perdida y rechazo de reapertura
- [X] T038 [P] [US5] Escribir `tests/integration/opportunity-lifecycle.test.js`: avance completo, pérdida con y sin motivo, salto no permitido, edición conservando estado, eliminación con y sin confirmación y persistencia tras recarga

### Implementación de la Historia 5

- [X] T039 [US5] Implementar en `src/crm-rules.js` `canTransition(from, to)`, `nextStatuses(status)` y `validateStatusChange(from, to, lossReason)` leyendo `statusLifecycle` de `ModuleConfig`
- [X] T040 [US5] Extender `src/components/document-form.js` a modo edición: selector de etapa limitado a `nextStatuses`, campo `lossReason` visible y obligatorio solo al elegir Perdida, conservación de `id`/`entity_id` y bloqueo de cambios sin guardar
- [X] T041 [US5] Hacer que `src/storage.js` `updateDocument` rechace transiciones no declaradas, reaperturas de estados finales y pérdidas sin motivo, y que `deleteDocument` elimine solo la oportunidad
- [X] T042 [US5] Añadir en `src/components/document-list.js` las acciones editar y eliminar con confirmación explícita, sin borrar el cliente asociado

**Punto de control**: US5 completa; el ciclo comercial es verificable de punta a punta.

---

## Fase 7: Historia de Usuario 6 — Terminología comercial consistente (Prioridad: P1)

**Objetivo**: aplicar Cliente/Clientes y Oportunidad/Oportunidades en gestión, formularios, búsqueda, detalle, mensajes y estados vacíos; en P2, también en el panel, con respaldo genérico cuando no haya perfil.

**Prueba independiente**: recorrer Clientes, Oportunidades y Buscar y, en P2, Panel, comprobando singular y plural, mensajes, estados vacíos y navegación; recargar y confirmar que los términos se mantienen sin alterar los datos.

### Pruebas de la Historia 6

- [X] T043 [P] [US6] Escribir `tests/integration/relabeling.test.js`: etiquetas desde `ModuleConfig` en todas las vistas, singular/plural, estados vacíos, mensajes y respaldo genérico entidad/documento sin perfil

### Implementación de la Historia 6

- [X] T044 [US6] Reemplazar en `src/components/shell.js`, `src/components/entity-form.js`, `src/components/entity-list.js`, `src/components/document-form.js`, `src/components/document-list.js` y `src/components/entity-detail.js` todo texto fijo de dominio por `labelFor(kind)` con singular y plural correctos
- [X] T045 [US6] Unificar en `src/app.js` y los componentes los mensajes de confirmación, error de validación, eliminación y estados vacíos con la terminología CRM, incluido “No hay clientes registrados” y “No se encontraron oportunidades”
- [X] T046 [US6] Mostrar en `src/app.js` un aviso no bloqueante cuando `getConfig()` reporte configuración inválida o colisión de claves, preservando los valores desconocidos ya guardados, bloqueando su reinterpretación silenciosa y exigiendo migración explícita, sin sobrescribir datos
- [X] T047 [US6] Completar en `src/components/shell.js` los nombres accesibles de los iconos con la barra lateral contraída y la identificación de la vista activa

**Punto de control**: la terminología es coherente y configurable; el módulo base sigue funcionando sin perfil.

---

## Fase 8: Historia de Usuario 3 — Registrar tickets de soporte (Prioridad: P2)

**Objetivo**: registrar tickets asociados a cliente y producto con motivo, descripción, prioridad y estado `En proceso → Resuelto`.

**Prueba independiente**: elegir un cliente, registrar un ticket con motivo y descripción, verlo en la lista con estado “En proceso”, pasarlo a “Resuelto” y comprobar que no se reabre tras recargar.

### Pruebas de la Historia 3

- [X] T048 [P] [US3] Escribir `tests/unit/ticket-rules.test.js`: `validateTicket` (cliente y producto obligatorios, motivo del catálogo, descripción no vacía, prioridad Alta/Media/Baja), transición `En proceso → Resuelto` sin reapertura y edición de campos conservando el estado
- [X] T049 [P] [US3] Escribir `tests/integration/tickets.test.js`: alta, cliente sin producto, prioridad inválida, cambio a Resuelto, rechazo de reapertura, edición de descripción y prioridad de un ticket Resuelto sin cambiar estado, tickets en la ficha del cliente, cascada cliente + tickets al eliminar y persistencia tras recarga

### Implementación de la Historia 3

- [X] T050 [US3] Implementar en `src/crm-rules.js` `validateTicket(ticket)` y `canTransitionTicket(from, to)`, exigiendo `productName` cuando no exista `productId` y fijando `status = En proceso` al crear; la resolución con resumen obligatorio y `resolvedAt` se completa en T127
- [X] T051 [US3] Implementar en `src/storage.js` la colección de tickets en `erp_base_module:tickets`: `loadTickets`, `saveTickets`, `addTicket`, `updateTicket`, `deleteTicketsForEntity`, con validación previa y escritura atómica; extender `deleteEntity` para incluir los tickets en la misma instantánea
- [X] T052 [US3] Implementar `src/components/ticket-form.js` con cliente, producto (`productId` o `productName`), motivo, descripción, prioridad y errores accesibles
- [X] T053 [US3] Implementar `src/components/ticket-list.js` con motivo, prioridad, estado y fecha, y estado vacío de tickets
- [X] T054 [US3] Conectar en `src/app.js` la sección de tickets de la ficha del cliente y la acción “Marcar como resuelto”, sin permitir reapertura en el MVP; actualizar la confirmación de eliminación de cliente para informar cuántos tickets se eliminarán
- [X] T054A [US3] Implementar la edición de tickets en `src/components/ticket-form.js` (modo edición) y `src/app.js`: motivo, descripción y prioridad editables; estado no editable; `updateTicket` conserva `id`, `entity_id` y `status`; errores accesibles

**Punto de control**: US3 (segunda iteración) completa sin romper el MVP P1.

---

## Fase 9: Historia de Usuario 7 — Consultar el panel CRM (Prioridad: P2, transversal)

**Objetivo**: mostrar seis indicadores recalculados en cada visita al panel, sin persistir totales derivados.

**Prueba independiente**: con datos sintéticos, abrir el panel, revisar los seis indicadores y comprobar que cambian al crear, editar, ganar o perder oportunidades.

### Pruebas de la Historia 7

- [X] T055 [P] [US7] Escribir `tests/unit/crm-metrics.test.js`: `countClients`, `countOpenOpportunities`, `sumOpenAmount`, `overdueFollowUps`, `todayContacts`, `closeRate` (incluido “Sin datos” con denominador cero y exclusión de clientes Inactivo)
- [X] T056 [P] [US7] Escribir `tests/integration/dashboard.test.js`: panel con almacenamiento vacío, monto abierto 300000 CLP con dos abiertas y una ganada de 50000 CLP, pérdida que resta del monto y recálculo al volver al panel

### Implementación de la Historia 7

- [X] T057 [US7] Implementar las seis funciones puras en `src/crm-metrics.js` según las fórmulas de `data-model.md`, usando `todayLocal` para vencimientos y contactos del día
- [X] T058 [US7] Implementar `src/components/dashboard.js` con tarjetas de los seis indicadores, acciones “Nuevo cliente”, “Nueva oportunidad”, “Gestionar clientes” y “Buscar”, y estado vacío con indicadores en cero y explicación de cómo comenzar; agregar la entrada Panel a `src/components/shell.js`
- [X] T059 [US7] Conectar en `src/app.js` el recálculo del panel en cada render, tras cada mutación y al volver al panel, sin leer ni guardar totales en `localStorage`

**Punto de control**: las siete historias están implementadas y son verificables.

---

## Fase 10: Polish y aspectos transversales

**Propósito**: cerrar requisitos no funcionales, evidencia y documentación.

- [X] T060 [P] Escribir `tests/unit/security-render.test.js`: asunto, notas, descripción y nombre con etiquetas HTML o texto tipo script se muestran como texto (`textContent`), sin ejecución
- [X] T061 [P] Escribir `tests/integration/storage-risks.test.js`: cuota agotada, JSON corrupto, versión de esquema incompatible y pestaña obsoleta (evento `storage`) sin éxito falso ni sobrescritura
- [X] T062 [P] Escribir `tests/integration/accessibility.test.js`: etiquetas asociadas, `aria-describedby` en errores, foco visible, orden de tabulación, contraste suficiente y mensajes de estado legibles en formularios y listas; incluir una comprobación en pantalla estrecha y registrar el navegador usado
- [X] T063 [P] Crear `tests/performance/search-performance.test.js` con 500 clientes y 1000 oportunidades: medir de la entrada a los resultados renderizados 20 búsquedas y 20 recálculos del panel, validando en cada medición que el resultado sea correcto, y registrar navegador, equipo y resultado (meta: 19 de 20 bajo 500 ms) en `README.md`
- [X] T064 Auditar y corregir `src/app.js` y `src/components/` para cumplir privacidad y minimización: sin exportación masiva del listado y sin ordenar ni priorizar por ubicación geográfica (`FR-027`, `FR-028`, `NFR-005`)
- [X] T065 Actualizar `README.md` con integrantes responsables por historia, instrucciones de ejecución, comandos de prueba, tabla de evidencias y registro del uso de IA
- [ ] T066 Ejecutar manualmente los escenarios 1 a 4 y 6 de `specs/001-crm-module/quickstart.md` para el MVP P1; validar los escenarios 5 y 7 al cerrar la segunda iteración. Ejecutar la tabla de validaciones transversales, probar Chrome y Firefox actuales (y Edge/Safari si están disponibles), crear los datos semilla sintéticos de la demo y anotar resultados reales (incluidos los pendientes) en `README.md`
- [X] T067 Ejecutar `npm test -- --run`, `npm run build`, `npm run lint` y `npm run format:check`, corregir fallos y registrar fecha, comando y resultado real en `README.md`
- [X] T068 Verificar coherencia documental entre `specs/001-crm-module/spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/entity-storage.md` y el MER Mermaid, corrigiendo divergencias de campos, estados e indicadores (reabierta el 2026-11-28: se cierra después de T071–T074)
- [ ] T069 Ejecutar el protocolo de usabilidad de `plan.md`: 5 participantes, 4 tareas (crear, editar, eliminar, buscar) y medición de SC-001 a SC-004 (tiempos de SC-001 a SC-003 y tasa de éxito de SC-004); registrar participantes anonimizados, tiempos, tasa de éxito y resultados reales o declarar la medición como pendiente en `README.md` (meta SC-004: al menos 18 de 20 tareas completadas)
- [X] T070 [P] Escribir `tests/integration/critical-journey.test.js`: recorrido completo del MVP P1 (cliente → oportunidad → avance de etapa → búsqueda → recarga), arrancando la app real en jsdom y verificando persistencia; el panel se verifica en T056 (P2)

---

## Dependencias y orden de ejecución

### Dependencias por fase

- **Setup (Fase 1)**: sin dependencias; inicia de inmediato.
- **Foundational (Fase 2)**: depende de la Fase 1 y **bloquea** todas las historias.
- **Historias (Fases 3 a 9)**: dependen de la Fase 2.
- **Polish (Fase 10)**: depende de las historias que se quieran entregar.
- **Tareas con sufijo**: T004A (lint/formato) se ejecuta dentro de la Fase 1, después de T004 y antes de T005; T054A pertenece a US3 (P2) y depende de T051–T054. Los sufijos no alteran el orden numérico del resto.

### Dependencias entre historias

- **US1 (P1)**: arranca tras la Fase 2; no depende de otras historias.
- **US2 (P1)**: arranca tras la Fase 2 y no depende de componentes de US4. T028 renderiza su propia lista de oportunidades en solo lectura desde `loadDocuments()` y `search-results.js` muestra la sección de oportunidades con su cliente vinculado; el detalle de una oportunidad también se renderiza en modo lectura propio, sin reutilizar `document-form.js`. Ambas vistas muestran un estado vacío mientras no existan oportunidades.
- **US4 (P1)**: arranca tras la Fase 2; requiere clientes de **US1** para la prueba de punta a punta (puede precargarse un cliente sintético).
- **US5 (P1)**: requiere `document-form.js` y `document-list.js` de **US4**.
- **US6 (P1)**: puede avanzar en paralelo con US1/US2/US4, pero su validación final requiere las vistas existentes.
- **US3 (P2)**: requiere clientes de **US1** y la ficha de **US2** para mostrar tickets.
- **US7 (P2)**: requiere `entity_id`, estados y montos de **US1**, **US4** y **US5**.

### Orden recomendado

`Fase 1 → Fase 2 → US1 → US2 → US4 → US5 → US6 → US3 → US7 → Polish`

### Dentro de cada historia

1. Las pruebas se escriben primero y deben **fallar**.
2. Reglas puras (`crm-rules.js`) antes de componentes.
3. Componentes antes de la integración en `app.js`.
4. La historia se completa y valida antes de pasar a la siguiente prioridad.

### Oportunidades de paralelización

- T003 y T004 en Fase 1.
- T005, T011, T012 y T013 en Fase 2 (archivos distintos).
- Los pares de pruebas por historia: T016/T017, T023/T024, T030/T031, T037/T038, T048/T049, T055/T056.
- T060 a T063 y T070 en Polish.
- Con equipo de 2 a 3 personas: US1, US2 y US6 pueden trabajarse en paralelo tras la Fase 2; US4/US5 en una sola línea por compartir `document-form.js` y `document-list.js`.

---

## Ejemplo de ejecución en paralelo: Historia 1

```bash
# Pruebas de US1 en paralelo (archivos distintos)
Task: "Escribir tests/unit/crm-rules.test.js con validateClient y normalizeCode"
Task: "Escribir tests/integration/create-edit-delete-client.test.js con alta, edición y cascada"

# Implementación sin solapamiento de archivos
Task: "Implementar validateClient en src/crm-rules.js"
Task: "Implementar src/components/entity-form.js"
Task: "Implementar src/components/entity-list.js"
```

No ejecutar en paralelo tareas que editan el mismo archivo: `src/crm-rules.js` (T018, T025, T032, T039, T050), `src/storage.js` (T006–T008, T022, T036, T041, T051), `src/app.js` (T015, T021, T029, T035, T046, T054, T059) y `src/components/shell.js` (T014, T044, T047).

---

## Estrategia de implementación

### Primer incremento demostrable (US1 + US2)

1. Completar Fase 1 (Setup).
2. Completar Fase 2 (Foundational) — bloqueante.
3. Implementar US1 (T016–T022).
4. **DETENERSE y VALIDAR**: alta, edición, búsqueda mínima y persistencia de clientes.
5. Demostrar el registro de clientes como primer incremento entregable.
   El MVP P1 completo se alcanza al cerrar US-06 (Fase 7); US-03 y US-07 son P2.

### Entrega incremental

1. Setup + Foundational → base operativa con evidencia de pruebas.
2. US1 → clientes registrados (MVP mínimo demostrable).
3. US2 → búsqueda y ficha del cliente.
4. US4 → oportunidades registradas.
5. US5 → ciclo de vida comercial completo.
6. US6 → terminología y accesibilidad consistentes.
7. US3 → tickets de posventa (P2, segunda iteración).
8. US7 → panel con indicadores (P2, segunda iteración).
9. Polish → requisitos transversales, evidencia y documentación.

Cada incremento debe terminar con `npm run lint`, `npm run format:check`, `npm test -- --run` y `npm run build` en verde, y con el resultado registrado en `README.md`. No se declara una historia terminada sin pruebas ejecutadas.

---

## Notas

- `[P]` indica archivos distintos y sin dependencia pendiente; no implica paralelismo entre tareas del mismo archivo.
- La etiqueta `[US#]` mantiene la trazabilidad con `spec.md`.
- Los tickets (US3) y el panel (US7) son P2: no bloquean el MVP P1. La cascada con tickets pertenece a US3 (T051), no a la Fase 2.
- Se trabaja siempre sobre `main`, sin ramas secundarias.
- Los commits se hacen manualmente desde GitHub Desktop; no se solicita a la IA que suba archivos.
- Los datos de demostración son exclusivamente sintéticos.
- Confirmar que cada prueba falla antes de implementar la funcionalidad correspondiente.
- Registrar en `README.md` fecha, comando y resultado real de cada verificación.

## Integración visual del CRM — 15/11/2026

Se incorporan las mejoras visuales preparadas tras el feedback «casi idéntico al template» sobre `ad0f421`, conservando la implementación P1/P2 del equipo: tickets, seis indicadores, reglas, persistencia y pruebas. No se aplica la instantánea de almacenamiento alternativa del borrador local.

- Embudo de seis etapas con cantidad, monto agregado y tarjetas por oportunidad. Cada tarjeta abre el formulario de edición existente.
- Identidad visual verde, tarjetas comerciales y distribución adaptable a pantallas pequeñas.
- Imagen del MER vigente: [crm-mer.svg](assets/crm-mer.svg).
- Pruebas de interacción del tablero, representación segura del texto y fallback genérico.
- Continúan pendientes el ensayo visual en navegadores y la validación de usabilidad; no se declaran realizados.

---

# Ampliación: tareas de las historias sin tareas (US-08 a US-16)

**Estado**: pendiente de implementación · **Creada**: 2026-11-28
**Fuente**: `spec.md` (US-08 a US-16), `data-model.md`, `contracts/entity-storage.md`, `quickstart.md`, `.specify/memory/constitution.md`

**Reglas de la ampliación**:

- Las colecciones `erp_base_module:entities`, `:documents` y `:tickets` **no se reemplazan**. Contactos, actividades y papelera viven en una capa CRM adicional.
- Sin migraciones destructivas ni conversiones silenciosas; toda migración se confirma y conserva una versión recuperable (US-08, NFR-008).
- Test-first: cada tarea de prueba se escribe y **falla** antes de su implementación correspondiente.
- Todo texto ingresado se renderiza con `textContent` (NFR-004) y toda interacción nueva debe ser operable con teclado (NFR-001).

## Claves y módulos de trabajo

| Clave nueva | Contenido |
|---|---|
| `erp_base_module:crmContacts` | Contactos por cliente (`entity_id`) |
| `erp_base_module:crmActivities` | Actividades y tareas |
| `erp_base_module:crmTrash` | Elementos de papelera (máximo 50) |
| `erp_base_module:crmRecovery` | Marcador y versión recuperable de US-08 |

Módulos nuevos previstos: `src/storage-recovery.js` (US-08), `src/crm-timeline.js` (US-14), `src/crm-trash.js` (US-16), `src/components/contact-form.js` y `contact-list.js` (US-12), `activity-form.js` y `activity-list.js` (US-13), `timeline.js` (US-14) y `trash-list.js` (US-16).

---

## Fase 11: Foundational de la ampliación (prerrequisitos bloqueantes)

**Propósito**: actualizar modelo, contrato y documentación, y preparar la instantánea de cinco colecciones y la navegación que necesitan todas las historias US-08 a US-16.

**⚠️ CRÍTICO**: ninguna tarea de T080–T145 puede iniciarse sin cerrar esta fase.

- [X] T071 [P] Actualizar `specs/001-crm-module/data-model.md` con las entidades Contacto (`id`, `entity_id`, `name`, `role`, `email`, `phone`, `isPrimary`, `createdAt`, `updatedAt`), Actividad (`id`, `entity_id`, `type`, `subject`, `notes`, `dueDate`, `owner`, `contactId`, `documentId`, `status`, `completedAt`) y Elemento de papelera; agregar los campos de Ticket de US-11 (`equipmentReference`, `resolutionSummary`, `resolvedAt`, `legacyResolutionIncomplete`), las fórmulas de actividades para hoy/vencidas y el MER actualizado
- [X] T072 [P] Actualizar `specs/001-crm-module/contracts/entity-storage.md` con las claves `erp_base_module:crmContacts`, `:crmActivities`, `:crmTrash` y `:crmRecovery`, las operaciones nuevas (contactos, actividades, papelera, recuperación) y las invariantes de cascada y papelera, declarando `SCHEMA_VERSION = 2`
- [X] T073 [P] Documentar en `specs/001-crm-module/research.md` las decisiones de la ampliación: capa CRM separada, papelera de 50 elementos como agregado atómico, migración explícita de `contactName`, recuperación previa a toda escritura y Kanban apoyado en `canTransition`
- [X] T074 [P] Actualizar `specs/001-crm-module/plan.md` con la estructura de archivos, el orden de incrementos y la validación de US-08 a US-16
- [X] T075 [P] Agregar en `specs/001-crm-module/quickstart.md` los escenarios 8 a 16 (recuperación, integridad, alta rápida, contactos, actividades, timeline, Kanban editable, resolución de tickets y papelera) con datos sintéticos y resultados esperados
- [X] T076 [P] Extender `tests/unit/storage.test.js` con la instantánea de cinco colecciones, `SCHEMA_VERSION = 2` y el rechazo de migración silenciosa (debe fallar antes de T077)
- [X] T077 Extender `src/storage.js` con las constantes de las claves nuevas, la inclusión de `contacts`, `activities` y `trash` en `saveSnapshot`, `SCHEMA_VERSION = 2` y el helper `isCrmStorageKey(key)`
- [X] T078 Extender `src/module-config.js` con las etiquetas `contact`/`contacts`, `activity`/`activities`, `trash` y el catálogo `activityTypes` (`llamada`, `correo`, `reunion`, `nota`, `tarea`)
- [X] T079 Agregar en `index.html` y `src/components/shell.js` las secciones y entradas de navegación “Actividades” y “Papelera” (`nav-activities`, `nav-trash`), con `aria-current` y resaltado de la vista activa

**Punto de control**: la aplicación compila con la instantánea extendida, las etiquetas nuevas y la navegación disponible; las historias pueden empezar.

---

## Fase 12: Historia de Usuario 8 — Recuperar una operación de almacenamiento interrumpida (Prioridad: P1)

**Objetivo**: conservar una versión completa recuperable antes de sustituir datos, detectar operaciones interrumpidas al iniciar, completar la recuperación antes de habilitar escrituras y exigir confirmación en migraciones.

**Prueba independiente**: registrar un cliente con una oportunidad y un ticket, simular fallos durante el guardado, la eliminación y la recuperación, reiniciar la app y comprobar que nunca se acepta una combinación parcial de versiones.

### Pruebas de la Historia 8

- [X] T080 [P] [US8] Escribir `tests/unit/storage-recovery.test.js`: versión recuperable antes de reemplazar, confirmación solo tras persistir el conjunto, detección de operación pendiente, bloqueo de escrituras cuando no puede verificarse la integridad y cuota agotada sin perder la versión anterior (CA-08-01 a CA-08-05, CA-08-08)
- [X] T081 [P] [US8] Escribir `tests/unit/storage-migration.test.js`: migración explícita con confirmación, cancelación que conserva el formato original, respaldo previo obligatorio y bloqueo de operaciones incompatibles con el formato cancelado (CA-08-06, CA-08-07)
- [X] T082 [P] [US8] Escribir `tests/integration/storage-recovery.test.js`: interrupción a mitad de un alta y de una cascada, reinicio de la aplicación, recuperación antes de habilitar escrituras y fallo durante la propia recuperación sin éxito falso (CA-08-02, CA-08-03, CA-08-04)

### Implementación de la Historia 8

- [X] T083 [US8] Crear `src/storage-recovery.js` con `prepareSnapshot`, `commitSnapshot`, `restorePreviousSnapshot`, `detectPendingRecovery` y `canWrite`, usando `erp_base_module:crmRecovery` y una instantánea serializada completa
- [X] T084 [US8] Integrar la recuperación en `src/storage.js`: `saveSnapshot` prepara la versión recuperable, confirma y limpia el marcador; `recoverPendingOperation()` se ejecuta al cargar; `isWriteBlocked()` expone el bloqueo, sin cambiar las firmas públicas existentes
- [X] T085 [US8] Implementar en `src/storage.js` el protocolo de migración `requestMigration(from, to)`, `applyMigration()` y `cancelMigration()` con respaldo recuperable, explicación del cambio y sin conversión silenciosa
- [X] T086 [US8] Conectar en `src/app.js` la recuperación y el estado de bloqueo antes del primer render, con aviso recuperable en `src/components/ui.js` y deshabilitación de los guardados mientras no se verifique una versión íntegra

**Punto de control**: US8 verificable de forma aislada; ninguna escritura se confirma sin versión recuperable.

---

## Fase 13: Historia de Usuario 9 — Verificar la integridad de la cartera almacenada (Prioridad: P1)

**Objetivo**: validar estructura, versión, obligatorios, tipos, unicidad de identificadores y códigos, `series+folio` y referencias huérfanas antes de habilitar modificaciones, sin corregir datos automáticamente.

**Prueba independiente**: preparar datos sintéticos con huérfanos, identificadores repetidos, códigos duplicados y valores inválidos; comprobar que se detectan sin borrar ni corregir los originales.

### Pruebas de la Historia 9

- [X] T087 [P] [US9] Escribir `tests/unit/integrity.test.js`: estructura, versión, obligatorios y tipos; ids y códigos duplicados; `series+folio` repetido; referencias huérfanas; campos históricos desconocidos conservados; transiciones comparadas con la versión anterior (CA-09-01 a CA-09-08)
- [X] T088 [P] [US9] Escribir `tests/integration/integrity.test.js`: validación al iniciar, huérfanos detectados sin reasignación automática, conjunto inválido no persistido parcialmente y almacenamiento idéntico tras el rechazo (CA-09-02, CA-09-06, CA-09-10)

### Implementación de la Historia 9

- [X] T089 [US9] Implementar `validateIntegrity(snapshot)` en `src/crm-rules.js`, con incidencias que identifiquen el registro por código de cliente o `series/folio`
- [X] T090 [US9] Implementar en `src/crm-rules.js` `assertImmutableIdentity(previous, next)` y `assertStatusTransition(previous, next)` para proteger `id`, `entity_id`, estados finales y saltos no declarados
- [X] T091 [US9] Invocar `validateIntegrity` desde `loadSnapshot` y `saveSnapshot` en `src/storage.js`, rechazando el conjunto completo sin escritura parcial y conservando oportunidades cerradas válidas sin reconstruir transiciones (CA-09-09)
- [X] T092 [US9] Conectar en `src/app.js` la verificación de integridad al iniciar, antes de habilitar modificaciones, mostrando las incidencias y bloqueando escrituras hasta resolverlas (depende de T086)

**Punto de control**: US9 se valida con datos corruptos sintéticos; ninguna escritura acepta un conjunto inválido.

---

## Fase 14: Historia de Usuario 10 — Proteger el trabajo en el alta rápida de clientes (Prioridad: P1)

**Objetivo**: conservar el formulario de oportunidad mientras se usa el alta rápida, confirmar el descarte, seleccionar el cliente recién creado sin borrar campos, bloquear formularios obsoletos y mantener el foco dentro de la ventana superior.

**Prueba independiente**: completar parcialmente una oportunidad, abrir el alta rápida y modificar ambos formularios; probar guardar, cancelar, cerrar con teclado y recibir un cambio relevante desde otra pestaña.

### Pruebas de la Historia 10

- [X] T093 [P] [US10] Escribir `tests/unit/quick-create-state.test.js`: detección de cambios reales, confirmación solo cuando hay cambios, filtro de claves ajenas al CRM e invalidación por cambio relevante (CA-10-09, CA-10-12)
- [X] T094 [P] [US10] Ampliar `tests/integration/quick-create-client.test.js`: conservación del borrador de oportunidad, descarte con Cancelar/Escape/clic fuera, cliente creado seleccionado sin borrar campos, cancelación de la oportunidad conserva el cliente, pestaña obsoleta, foco atrapado/devuelto, error de validación y de almacenamiento (CA-10-01 a CA-10-11)

### Implementación de la Historia 10

- [X] T095 [US10] Implementar en `src/components/quick-create-client.js` el registro de cambios reales (`hasUnsavedChanges()`), la confirmación “Descartar/Seguir editando” y la reutilización de `validateClient` y `addEntity`
- [X] T096 [US10] Ajustar en `src/components/ui-overlay.js` la trampa de foco, el cierre con Escape y la devolución del foco al control que abrió el alta rápida
- [X] T097 [US10] Implementar en `src/storage.js` y `src/app.js` la detección de obsolescencia limitada a `isCrmStorageKey` y al borrado total del almacenamiento, ignorando claves de otras funcionalidades
- [X] T098 [US10] Conectar en `src/app.js` el alta rápida con la oportunidad: conservar el borrador en memoria, seleccionar el cliente recién guardado sin limpiar campos y aclarar que cancelar la oportunidad no elimina al cliente

**Punto de control**: US10 no pierde datos ni crea clientes inexistentes en la oportunidad.

---

## Fase 15: Historia de Usuario 12 — Contactos múltiples por cliente (Prioridad: P1)

**Objetivo**: registrar varios contactos por cliente con exactamente un principal, migrar `contactName` sin duplicar, permitir eliminarlos con reasignación o confirmación y buscarlos por nombre, correo o teléfono.

**Prueba independiente**: crear un cliente con dos contactos, marcar el segundo como principal, buscar por el correo del primero y verificar que ambos aparecen en la ficha y pueden asociarse a una oportunidad.

### Pruebas de la Historia 12

- [X] T099 [P] [US12] Escribir `tests/unit/contact-rules.test.js`: nombre obligatorio, correo válido cuando existe, exactamente un principal, correo repetido permitido y migración idempotente de `contactName` (CA-12-01 a CA-12-03)
- [X] T100 [P] [US12] Escribir `tests/integration/contacts.test.js`: alta y edición de contactos en la ficha, cambio de principal, migración del contacto heredado sin pérdida, eliminación con reasignación o confirmación, cliente sin contactos y borrado del cliente con contactos (CA-12-04)

### Implementación de la Historia 12

- [X] T101 [US12] Implementar en `src/crm-rules.js` `validateContact`, `ensureSinglePrimary` y `migrateLegacyContactName(entity, contacts)`
- [X] T102 [US12] Implementar en `src/storage.js` `loadContacts`, `saveContacts`, `addContact`, `updateContact`, `deleteContact` y `deleteContactsForEntity`, con validación previa a la escritura y cascada atómica dentro de la instantánea
- [X] T103 [US12] Crear `src/components/contact-form.js` con nombre, cargo, correo, teléfono y marca de principal, errores accesibles y conservación de lo ingresado
- [X] T104 [US12] Crear `src/components/contact-list.js` con los contactos de la ficha, distintivo de principal, acciones editar/eliminar y estado vacío
- [X] T105 [US12] Extender `searchClients` en `src/crm-rules.js` y `src/components/search-results.js` para que nombre, correo o teléfono de un contacto devuelvan el cliente asociado (CA-12-05)
- [X] T106 [US12] Conectar en `src/app.js` y `src/components/entity-detail.js` la sección Contactos, la migración única de `contactName` al abrir la ficha y la eliminación del contacto con reasignación o confirmación

**Punto de control**: US12 completa; la ficha del cliente conserva su comportamiento anterior cuando no hay contactos.

---

## Fase 16: Historia de Usuario 13 — Actividades y tareas (Prioridad: P1)

**Objetivo**: registrar llamadas, correos, reuniones, notas y tareas con vencimiento y responsable, completarlas y mostrarlas como pendientes, para hoy o vencidas en la ficha y el panel.

**Prueba independiente**: crear una tarea con vencimiento para un cliente, completarla y verificar que desaparece de pendientes y que las vencidas se muestran como tales.

### Pruebas de la Historia 13

- [X] T107 [P] [US13] Escribir `tests/unit/activity-rules.test.js`: tipos válidos, vencimiento obligatorio solo en `tarea`, `completedAt` al completar, cálculo de vencidas con `todayLocal`, vínculos a contacto u oportunidad existentes o nulos (CA-13-01 a CA-13-04)
- [X] T108 [P] [US13] Escribir `tests/integration/activities.test.js`: alta, edición, completar, eliminar, tarea sin vencimiento rechazada, actividad vinculada a una oportunidad eliminada y conservación en papelera al borrar el cliente (CA-13-05)

### Implementación de la Historia 13

- [X] T109 [US13] Implementar en `src/crm-rules.js` `validateActivity`, `isActivityOverdue` y `completeActivity`, validando tipo, vencimiento y vínculos
- [X] T110 [US13] Implementar en `src/storage.js` `loadActivities`, `saveActivities`, `addActivity`, `updateActivity`, `deleteActivity` y `deleteActivitiesForEntity`, con inclusión en la instantánea y cascada atómica
- [X] T111 [US13] Crear `src/components/activity-form.js` con tipo, asunto, notas, fecha, responsable y vínculos opcionales a contacto y oportunidad
- [X] T112 [US13] Crear `src/components/activity-list.js` con pendientes, para hoy, vencidas y completadas, orden cronológico y estado vacío con acción para registrar la primera actividad
- [X] T113 [US13] Agregar `activitiesToday` y `overdueActivities` en `src/crm-metrics.js` y la tarjeta correspondiente en `src/components/dashboard.js` sin persistir totales (FR-041)
- [X] T114 [US13] Conectar en `src/app.js` la vista Actividades, las acciones de completar y eliminar, la sección de actividades de la ficha y el recálculo del panel tras cada mutación

**Punto de control**: US13 completa y verificable; el panel conserva los seis indicadores originales y agrega el de actividades.

---

## Fase 17: Historia de Usuario 14 — Timeline por cliente y oportunidad (Prioridad: P1)

**Objetivo**: mostrar en orden descendente las actividades y tickets de un cliente o las actividades de una oportunidad, con filtros por tipo y fecha, sin eventos de sistema ni cambios de etapa.

**Prueba independiente**: abrir un cliente con dos actividades y un ticket, verificar el orden descendente, filtrar por tipo y comprobar que el detalle de cada evento es legible y de solo lectura.

### Pruebas de la Historia 14

- [X] T115 [P] [US14] Escribir `tests/unit/timeline.test.js`: unión de actividades y tickets, orden descendente, filtros por tipo y fecha, exclusión de eventos de sistema y fechas inválidas (CA-14-01 a CA-14-03)
- [X] T116 [P] [US14] Escribir `tests/integration/timeline.test.js`: cliente con dos actividades y un ticket, timeline de oportunidad solo con sus actividades, filtros combinados, estado vacío con acción y detalle no editable (CA-14-04, CA-14-05)

### Implementación de la Historia 14

- [X] T117 [US14] Crear `src/crm-timeline.js` con `buildTimeline({ activities, tickets, entityId, documentId }, filters)`, función pura que devuelve eventos ordenados y normalizados
- [X] T118 [US14] Crear `src/components/timeline.js` con lista accesible, filtros por tipo y fecha, detalle de solo lectura y estado vacío con acción para registrar la primera actividad
- [X] T119 [US14] Conectar en `src/app.js` y `src/components/entity-detail.js` el timeline del cliente y de la oportunidad, recalculado tras cada mutación y sin entradas de edición

**Punto de control**: US14 completa; el timeline no duplica información ni permite mutaciones.

---

## Fase 18: Historia de Usuario 15 — Kanban editable con transiciones validadas (Prioridad: P1)

**Objetivo**: mover oportunidades entre etapas válidas arrastrando o con el teclado, recalcular totales, rechazar saltos y solicitar `lossReason` al pasar a Perdida.

**Prueba independiente**: arrastrar una oportunidad de “Nueva” a “Contactada”, verificar la actualización; intentar un salto inválido y comprobar que la tarjeta vuelve a su columna.

### Pruebas de la Historia 15

- [X] T120 [P] [US15] Escribir `tests/unit/kanban.test.js`: destinos derivados de `canTransition`, rechazo de `Nueva → Ganada`, motivo obligatorio al perder, recálculo de conteos y montos por columna y estado final bloqueado (CA-15-01 a CA-15-03)
- [X] T121 [P] [US15] Escribir `tests/integration/kanban.test.js`: arrastre válido, tarjeta devuelta tras salto inválido, solicitud de `lossReason` con cancelación sin cambios, menú de movimiento por teclado y columnas vacías (CA-15-04)

### Implementación de la Historia 15

- [X] T122 [US15] Extender `src/components/commercial-board.js` para ser editable: tarjetas arrastrables, destinos válidos resaltados, menú “Mover a…” accesible por teclado y anuncios `aria-live`
- [X] T123 [US15] Implementar `moveOpportunity(id, to, lossReason)` en `src/app.js` usando `validateStatusChange`, `updateDocument` y el recálculo de totales por columna, revirtiendo la tarjeta si la escritura falla
- [X] T124 [US15] Implementar en `src/components/ui-overlay.js` el diálogo de `lossReason` al soltar en Perdida, con cancelación que no modifique datos y foco devuelto a la tarjeta

**Punto de control**: US15 completa; ninguna transición inválida se acepta desde el tablero.

---

## Fase 19: Historia de Usuario 11 — Registrar la solución del ticket y distinguir el equipo atendido (Prioridad: P2)

**Objetivo**: registrar una referencia opcional del equipo, exigir un resumen de solución al resolver, generar `resolvedAt`, conservar esos datos en ediciones posteriores y migrar tickets históricos sin inventar información.

**Prueba independiente**: crear dos tickets de una empresa ficticia para equipos del mismo producto con referencias distintas, resolverlos con soluciones diferentes y comprobar que los datos permanecen tras recargar.

### Pruebas de la Historia 11

- [X] T125 [P] [US11] Escribir `tests/unit/ticket-resolution.test.js`: `equipmentReference` opcional y recortado, `resolutionSummary` obligatorio al resolver, `resolvedAt` generado por el sistema, edición sin pérdida de resolución y `legacyResolutionIncomplete` no editable (CA-11-03 a CA-11-05, CA-11-10)
- [X] T126 [P] [US11] Escribir `tests/integration/ticket-resolution.test.js`: dos equipos del mismo producto con referencias distintas, resolución válida, resumen vacío rechazado, “Equipo no individualizado”, persistencia, migración de tickets históricos, error de escritura y renderizado seguro (CA-11-01, CA-11-02, CA-11-06 a CA-11-09, CA-11-11, CA-11-12)

### Implementación de la Historia 11

- [X] T127 [US11] Extender en `src/crm-rules.js` `validateTicket`, `canTransitionTicket` y `resolveTicket(ticket, summary)` con la referencia del equipo, el resumen obligatorio y la generación de `resolvedAt`
- [X] T128 [US11] Extender `src/storage.js` con `updateTicket`/`resolveTicket` atómicos (estado, resumen y fecha), conservación de la resolución en ediciones, migración explícita que marca `legacyResolutionIncomplete` y `SCHEMA_VERSION = 3`
- [X] T129 [US11] Extender `src/components/ticket-form.js` (referencia del equipo y diálogo de resolución con resumen) y `src/components/ticket-list.js` (referencia, solución, fecha de resolución y “Equipo no individualizado”)
- [X] T130 [US11] Conectar en `src/app.js` la acción “Resolver” con validación previa, conservación del resumen ante error y actualización de la ficha del cliente

**Punto de control**: US11 completa sin reabrir tickets ni alterar el comportamiento P1.

---

## Fase 20: Historia de Usuario 16 — Papelera de clientes con cascada (Prioridad: P2)

**Objetivo**: mover un cliente eliminado y todas sus relaciones a una papelera limitada a 50 elementos, restaurarlo completo detectando conflictos de identificadores y purgarlo con confirmación.

**Prueba independiente**: eliminar un cliente con una oportunidad, un ticket, un contacto y una actividad, verificar que el conjunto aparece en la papelera y restaurarlo completo.

### Pruebas de la Historia 16

- [X] T131 [P] [US16] Escribir `tests/unit/trash.test.js`: agregado con cliente y relaciones, límite FIFO de 50, detección de conflictos de identificadores al restaurar, purga con confirmación y cliente sin relaciones (CA-16-02 a CA-16-05)
- [X] T132 [P] [US16] Escribir `tests/integration/trash.test.js`: eliminación con oportunidad, ticket, contacto y actividad; restauración completa; conflicto de `id` al restaurar; purga definitiva; papelera llena que descarta el más antiguo y advierte su límite local (CA-16-01 a CA-16-05)

### Implementación de la Historia 16

- [X] T133 [US16] Crear `src/crm-trash.js` con `createTrashEntry`, `restoreTrashEntry`, `purgeTrashEntry`, `trimTrash` y `detectRestoreConflicts`, funciones puras sobre el agregado eliminado
- [X] T134 [US16] Implementar en `src/storage.js` `loadTrash`, `moveEntityToTrash`, `restoreFromTrash` y `purgeTrashEntry`, y hacer que `deleteEntity` mueva el agregado a la papelera en una sola instantánea atómica
- [X] T135 [US16] Crear `src/components/trash-list.js` con tipo, fecha de eliminación, cantidad de registros asociados, acciones restaurar/purgar con confirmación y aviso de papelera local limitada
- [X] T136 [US16] Conectar en `src/app.js` y `src/components/shell.js` la vista Papelera, la acción “Ver papelera” tras eliminar y el refresco de clientes y panel al restaurar
- [X] T137 [US16] Actualizar `tests/integration/create-edit-delete-client.test.js` y `tests/integration/tickets.test.js` para el nuevo comportamiento de eliminación con papelera, manteniendo la cascada atómica y sin referencias huérfanas

**Punto de control**: US16 completa; eliminar y restaurar conserva el 100% de registros y relaciones.

---

## Fase 21: Polish y aspectos transversales de la ampliación

**Propósito**: cubrir accesibilidad, seguridad, rendimiento, evidencia y coherencia documental de las historias nuevas.

- [X] T138 [P] Ampliar `tests/integration/accessibility.test.js` con contactos, actividades, timeline, Kanban (arrastre y menú por teclado), diálogo de motivo de pérdida, papelera y foco devuelto tras cerrar overlays
- [X] T139 [P] Ampliar `tests/unit/security-render.test.js` con nombre, cargo y notas de contacto, asunto y notas de actividad, resumen de solución y textos de papelera renderizados como texto
- [X] T140 [P] Ampliar `tests/performance/search-performance.test.js` con búsqueda por contacto, timeline extenso y recálculo del panel con actividades: 20 mediciones y al menos 19 bajo 500 ms, registrando navegador y equipo
- [X] T141 [P] Actualizar `README.md` con responsables de US-08 a US-16, comandos, tabla de evidencias, uso de IA y resultados reales o pendientes declarados
- [ ] T142 Ejecutar manualmente los escenarios 8 a 16 de `quickstart.md` con datos sintéticos, incluidos reinicio, dos pestañas, cuota agotada y navegación solo por teclado, y anotar los resultados reales
- [X] T143 Verificar coherencia documental entre `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/entity-storage.md`, `quickstart.md`, `tasks.md` y el MER para Contacto, Actividad, Ticket ampliado y Elemento de papelera
- [X] T144 Ejecutar `npm run lint`, `npm run format:check`, `npm test -- --run` y `npm run build`, corregir fallos y registrar fecha, comando y resultado en `README.md`
- [X] T145 Confirmar con `npm test -- --run` que la suite existente de `tests/` (T001–T070) sigue en verde y que `src/storage.js` no aplicó ninguna migración destructiva sobre `entities`, `documents` ni `tickets`

---

## Dependencias y orden de ejecución de la ampliación

### Dependencias por fase

- **Fase 11 (Foundational)**: no depende de historias nuevas; **bloquea** T080–T145. Requiere la base T001–T070 cerrada.
- **Fase 12 (US8)**: depende de la Fase 11. No depende de otras historias nuevas.
- **Fase 13 (US9)**: depende de la Fase 11 y reutiliza el bloqueo de escrituras de T086.
- **Fase 14 (US10)**: depende de la Fase 11 y de US1/US4 ya implementadas (T019, T033); reutiliza `quick-create-client.js` y `ui-overlay.js` existentes.
- **Fase 15 (US12)**: depende de la Fase 11 y de US1.
- **Fase 16 (US13)**: depende de la Fase 11, de US1 y de US12 (contacto opcional de la actividad).
- **Fase 17 (US14)**: depende de US13 y de US3 (tickets).
- **Fase 18 (US15)**: depende de US5 (`canTransition`, `updateDocument`).
- **Fase 19 (US11)**: depende de US3 y de la migración explícita de US8 (T085).
- **Fase 20 (US16)**: depende de US12 y US13; modifica la cascada de US1/US3, por lo que T137 actualiza las pruebas afectadas.
- **Fase 21 (Polish)**: depende de las historias que se entreguen.

### Orden recomendado

`Fase 11 → US8 → US9 → US10 → US12 → US13 → US14 → US15 → US11 → US16 → Polish`

Motivo: las protecciones de almacenamiento (US8/US9) deben existir antes de agregar colecciones nuevas; contactos y actividades son la base del timeline y de la papelera; el Kanban solo depende del ciclo de vida ya existente.

### Archivos compartidos (no paralelizar entre sí)

- `src/storage.js`: T077, T084, T085, T091, T097, T102, T110, T123, T128, T134.
- `src/crm-rules.js`: T089, T090, T101, T105, T109, T123, T127.
- `src/app.js`: T086, T092, T097, T098, T106, T114, T119, T123, T130, T136.
- `src/components/ui-overlay.js`: T096, T124.
- `src/components/entity-detail.js`: T106, T119.
- `src/crm-metrics.js`: T113.
- `src/components/dashboard.js`: T113.
- `index.html` y `src/components/shell.js`: T079, T136.

### Oportunidades de paralelización

- Documentación de Fase 11: T071, T072, T073, T074 y T075 (archivos distintos).
- Pruebas por historia: T080/T081/T082, T087/T088, T093/T094, T099/T100, T107/T108, T115/T116, T120/T121, T125/T126, T131/T132.
- Componentes de una misma historia: T103/T104 (contactos), T111/T112 (actividades), T117/T118 (timeline, si T117 se cierra primero).
- Polish: T138, T139, T140 y T141 en paralelo.
- Con dos personas: una cierra US8/US9/US16 (persistencia) y otra US12/US13/US14 (interfaz); US10 y US15 pueden ir en paralelo porque tocan componentes distintos.

---

## Ejemplo de ejecución en paralelo: Historia 12

```bash
# Pruebas de US12 en paralelo (archivos distintos)
Task: "Escribir tests/unit/contact-rules.test.js con validateContact y ensureSinglePrimary"
Task: "Escribir tests/integration/contacts.test.js con alta, principal y migración de contactName"

# Componentes sin solapamiento de archivos
Task: "Crear src/components/contact-form.js"
Task: "Crear src/components/contact-list.js"
```

---

## Estrategia de implementación de la ampliación

### MVP de la ampliación

1. Completar la Fase 11 (Foundational) — bloqueante.
2. Implementar US8 y US9 (T080–T092): sin versión recuperable ni verificación de integridad no se agregan colecciones nuevas.
3. Implementar US12 (T099–T106) como primer incremento visible: contactos múltiples en la ficha.
4. **DETENERSE y VALIDAR** con el escenario 11 de `quickstart.md`: dos contactos, cambio de principal, búsqueda por correo y persistencia tras recargar.

### Entrega incremental

1. Fase 11 → instantánea de cinco colecciones, etiquetas y navegación.
2. US8 + US9 → recuperación e integridad verificadas con fallos simulados.
3. US10 → alta rápida protegida sobre la oportunidad.
4. US12 → contactos múltiples (primer valor visible).
5. US13 → actividades y tarjeta del panel.
6. US14 → timeline por cliente y oportunidad.
7. US15 → Kanban editable con transiciones validadas.
8. US11 → resolución de tickets con solución y equipo (P2).
9. US16 → papelera con cascada y restauración (P2).
10. Polish → accesibilidad, seguridad, rendimiento, evidencia y coherencia documental.

Cada incremento termina con `npm run lint`, `npm run format:check`, `npm test -- --run` y `npm run build` en verde, con el resultado registrado en `README.md`. No se declara una historia terminada sin pruebas ejecutadas.

---

## Fase 22: Convergence

**Propósito**: cerrar las brechas detectadas entre `spec.md`, `plan.md`, `tasks.md` y el código actual. Cada tarea traza su origen; no reescribe ni renumera tareas existentes.

- [X] T146 Ampliar en `src/app.js` la confirmación de eliminación de cliente para informar cuántos contactos y actividades se moverán a la papelera, reutilizando `countContactsForEntity` y `countActivitiesForEntity`, y cubrirlo en `tests/integration/create-edit-delete-client.test.js` per FR-007/CA-01-12 (partial)
- [X] T147 Corregir el mensaje de eliminación de cliente en `src/app.js` para no afirmar que la acción es irreversible: explicar que el agregado queda recuperable en la Papelera y que la purga definitiva exige una segunda confirmación, actualizando las pruebas afectadas per FR-007/CA-01-12 (contradicts)
- [X] T148 Asociar contactos a oportunidades: agregar `contactId` al modelo `Document`, selector de contacto en `src/components/document-form.js`, validación en `src/crm-rules.js` y `src/storage.js`, visualización en la ficha de la oportunidad y actualización de `data-model.md` y `contracts/entity-storage.md`, con pruebas unitarias e integración per FR-037/CA-12-01 (missing)
- [X] T149 Implementar el detalle de solo lectura de cada evento del timeline (tipo, fecha, responsable y resumen) al seleccionarlo, cableando `onSelect` en `src/app.js` y renderizando `event.summary` con anuncio accesible en `src/components/timeline.js`, con pruebas de cliente y oportunidad per CA-14-04 (missing)
- [X] T150 Completar `validateIntegrity` en `src/crm-rules.js` para aplicar a la instantánea completa las mismas reglas de los formularios: obligatorios y catálogos de cliente, `opportunityTitle`/`opportunityOwner`/estado, `endDate >= startDate`, monto entero, motivo y prioridad de ticket y correo de contacto; rechazar la carga sin escritura parcial y ampliar `tests/unit/integrity.test.js` e `tests/integration/integrity.test.js` per FR-09-01/FR-09-04/CA-09-01/CA-09-04 (partial)
- [X] T151 Permitir reasignar el contacto vinculado antes de eliminarlo: selector de destino en la ficha, paso de `reassignTo` a `deleteContact` y actualización de referencias en actividades y oportunidades, con advertencia de registros afectados y pruebas per CA-12-04 (partial)
- [X] T152 Derivar la fila “Contacto principal” de la ficha desde el contacto marcado `isPrimary` en `crmContacts` (usar `contactName` solo como respaldo cuando no haya contactos) para no mostrar como principal a un contacto heredado que dejó de serlo, con pruebas de ficha per FR-038/CA-12-02 (contradicts)
- [X] T153 Agregar al estado vacío del timeline una acción para registrar la primera actividad, conectada al formulario de actividades con el cliente u oportunidad preseleccionado, y cubrirla en `tests/integration/timeline.test.js` per CA-14-05 (missing)

---

---

## Fase 23: Ticket de post-venta completo (iteración 004)

**Propósito**: reflejar el alcance implementado en `specs/004-ticket-postventa/` sin reescribir las tareas anteriores. El plan detallado, contratos y pruebas viven en esa carpeta.

- [X] T154 Ampliar `ModuleConfig` con los catálogos `channel`, `assignee` y `team`, conservando `priority` y `reason`, y registrarlos en `catalogs` (US-27).
- [X] T155 Implementar en `src/crm-rules.js` los cinco estados, `TICKET_TRANSITIONS`, `canTransitionTicket`, `nextTicketStatuses`, folio `TKT-AAAA-####`, SLA 24/72/168 h, historial append-only, validación de satisfacción y garantía, y ampliar `validateTicket` (US-26 a US-32).
- [X] T156 Subir `SCHEMA_VERSION` a 4, ampliar `buildTicket`, `addTicket` y `updateTicket`, agregar `assignTicket`, `changeTicketStatus`, `resolveTicket`, `closeTicket`, `deleteTicket` y `registerSatisfaction`, con historial y ticket en una sola instantánea atómica (US-25 a US-32).
- [X] T157 Implementar la migración explícita `v3 → v4` con respaldo `erp_base_module:crmBackup:v3`, folio determinista por año, asunto copiado de la descripción, entrada `migracion`, cancelación sin escritura y restauración verificada (FR-071).
- [X] T158 Agregar la vista `#/tickets`, la navegación, la bandeja con filtros AND, orden estable, estados vacíos y filas operables con teclado; reutilizar `data-table`, `ticket-form`, `ui-overlay` y los badges existentes (US-25, US-26).
- [X] T159 Crear `src/components/ticket-detail.js` con detalle de solo lectura, acciones por estado, satisfacción e historial; conectar asignación, cambio de estado, resolución, cierre y eliminación confirmada en `src/app.js` (US-28 a US-30, US-32).
- [X] T160 Agregar los seis indicadores de soporte al panel y el promedio CSAT en la ficha del cliente, recalculados en cada render y sin agregados persistidos (US-31, US-32).
- [X] T161 Ampliar las pruebas unitarias, de integración, de accesibilidad, de seguridad de renderizado y de rendimiento (1000 tickets) y registrar los resultados reales en `README.md`.
- [ ] T162 Validación manual en navegadores de `specs/004-ticket-postventa/quickstart.md` (secciones 2–15) con navegador, equipo y mediciones reales; pendiente porque el agente no dispone de navegador interactivo. No se declara ejecutada.
