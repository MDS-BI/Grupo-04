---

description: "Lista de tareas ejecutables para el módulo CRM (Clientes y Oportunidades)"
---

# Tareas: Módulo CRM (Clientes y Oportunidades)

**Entrada**: Documentos de diseño en `/specs/001-crm-module/`

**Prerrequisitos**: `plan.md` (obligatorio), `spec.md` (obligatorio para las historias), `research.md`, `data-model.md`, `contracts/entity-storage.md`, `quickstart.md`, `.specify/memory/constitution.md`

**Pruebas**: la especificación (`spec.md`, sección “Estrategia de pruebas”, regla test-first) y la constitución (Principio II) **exigen** pruebas automatizadas, por lo que se incluyen tareas de prueba. Deben escribirse **antes** de la implementación correspondiente y fallar primero.

**Organización**: las tareas se agrupan por fase y por historia de usuario para permitir implementación y validación independientes.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: puede ejecutarse en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece la tarea (`US1`…`US7`)
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

- [ ] T001 Restaurar el código base con `git checkout dea57da -- src index.html` y verificar que el árbol coincide con la estructura de `specs/001-crm-module/plan.md`
- [ ] T002 Restaurar las pruebas base desde la rama `borrador` hacia `tests/` (`git checkout borrador -- tests`) y revisar que no arrastren supuestos del módulo ERP
- [ ] T003 [P] Ejecutar `npm install`, `npx vitest run` y `npm run build` sobre la base sin modificar y registrar fecha, comando y resultado real en `README.md` (sección “Evidencias y registro de cambios”)
- [ ] T004 [P] Configurar el entorno DOM de pruebas en `vitest.config.mjs` (`environment: 'jsdom'`) y crear `tests/setup.js` con limpieza de `localStorage` entre pruebas
- [ ] T004A [P] Configurar ESLint + Prettier (`eslint.config.mjs`, `.prettierignore`, `.prettierrc.json`) y los scripts `lint` y `format:check`; verificar que `npm run lint` y `npm run format:check` pasan sobre la base restaurada antes de iniciar las historias

---

## Fase 2: Foundational (prerrequisitos bloqueantes)

**Propósito**: núcleo de almacenamiento, configuración, reglas compartidas y esqueleto de navegación que **todas** las historias necesitan.

**⚠️ CRÍTICO**: ninguna historia puede implementarse hasta completar esta fase.

- [ ] T005 [P] Escribir las pruebas unitarias base de persistencia en `tests/unit/storage.test.js`: generación de `id`/`entity_id`, marcas ISO, versión de esquema, JSON corrupto y cuota agotada sin reinicio silencioso (deben fallar primero)
- [ ] T006 Refactorizar `src/storage.js`: constantes `erp_base_module:entities`, `erp_base_module:documents`, `erp_base_module:schemaVersion`, generación de identidad y marcas de tiempo, y lectura de JSON corrupto que informa el error sin borrar datos
- [ ] T007 Implementar en `src/storage.js` la escritura atómica sobre una instantánea validada mediante el helper interno `saveSnapshot` y las operaciones `loadEntities`, `saveEntities`, `addEntity`, `updateEntity`, `deleteEntity`, `loadDocuments`, `saveDocuments`, `addDocument`, `updateDocument`, `deleteDocument` que propagan el fallo de cuota al llamador
- [ ] T008 Implementar en `src/storage.js` la cascada atómica de `deleteEntity` (cliente + documentos en una sola escritura) y `deleteDocumentsForEntity` para `contracts/entity-storage.md`; la extensión a tickets se implementa en T051
- [ ] T009 Escribir el perfil CRM en `src/module-config.js`: `moduleName`, `labels` (Cliente/Clientes, Oportunidad/Oportunidades), `customFields` (`contactName`, `accountOwner`, `acquisitionSource`, `opportunityTitle`, `opportunityOwner`, `lossReason`), catálogos (`category`, `accountOwner`/`opportunityOwner`, `acquisitionSource`, `priority`, `reason`), `statusLifecycle` y `theme.accentColor: '#0F766E'`
- [ ] T010 Reforzar el cargador de `src/module-config.js` (`getConfig`) para exponer errores de configuración (tipos, colisiones con campos base, opciones de `select`, estados y color) y conservar el respaldo genérico, con pruebas en `tests/unit/module-config.test.js`
- [ ] T011 [P] Crear `src/crm-rules.js` con los helpers puros compartidos: `normalizeCode`, `normalizeText` (trim + minúsculas + sin diacríticos), `isValidEmail`, `isValidCatalogValue`, `isValidCalendarDate`, `compareCalendarDates` y `todayLocal` (fechas `YYYY-MM-DD` sin pasar por UTC)
- [ ] T012 [P] Adaptar `src/components/custom-fields.js` para renderizar los `customFields` del perfil CRM con `label` asociado, `required` visible y mensajes de error accesibles
- [ ] T013 [P] Definir tokens de diseño y color de acento en `src/styles.css` (`--accent: #0F766E`), foco visible y estilos de estados vacíos/error reutilizables
- [ ] T014 Implementar en `src/components/shell.js` la barra superior y lateral con Clientes, Oportunidades y Buscar, resaltado de la vista activa y `labelFor(kind)` alimentado por `ModuleConfig`; la entrada Panel se agrega en T058 (P2)
- [ ] T015 Implementar en `src/app.js` el enrutador interno, el ciclo de render por vista, la restauración de una vista válida desde enlace directo o botón Atrás con Clientes como respaldo en P1 (Panel en P2), la suscripción al evento `storage` (pestaña obsoleta) y el guardián de cambios sin guardar

**Punto de control**: la base corre, persiste, navega y aplica la configuración; las historias pueden empezar.

---

## Fase 3: Historia de Usuario 1 — Registrar clientes y prospectos (Prioridad: P1) 🎯 MVP

**Objetivo**: dar de alta, editar y eliminar clientes y prospectos con identificación, clasificación, responsable, origen y contacto principal opcional.

**Prueba independiente**: registrar una empresa ficticia con `name`, `code`, `category`, `accountOwner` y `acquisitionSource`, encontrarla en la lista, editarla y recargar la aplicación conservando `id` y `entity_id`. Se puede probar sin crear oportunidades.

### Pruebas de la Historia 1

- [ ] T016 [P] [US1] Escribir `tests/unit/crm-rules.test.js` con `validateClient`, `normalizeCode`, `isValidEmail`, `isValidCatalogValue`, `getTargetDateStatus`, `isValidCalendarDate`, `compareCalendarDates` y `todayLocal` (incluye código duplicado con espacios y minúsculas, campos solo con espacios, contacto incompleto, fechas imposibles y el límite del día local)
- [ ] T017 [P] [US1] Escribir `tests/integration/create-edit-delete-client.test.js`: alta válida, rechazo de duplicados, edición preservando identificadores, el cliente visible en la lista tras guardar y tras recargar, eliminación con confirmación (cascada solo de oportunidades en esta fase) y cancelación, y persistencia tras recarga

### Implementación de la Historia 1

- [ ] T018 [US1] Implementar en `src/crm-rules.js` `validateClient(client, context)`: obligatorios `name`, `code`, `category`, `accountOwner`, `acquisitionSource`; `email` válido si existe; catálogos desde `ModuleConfig`; código único normalizado con exclusión del registro actual; `targetDate` opcional válida
- [ ] T019 [US1] Implementar `src/components/entity-form.js`: formulario de alta/edición con obligatorios marcados, errores por campo asociados con `aria-describedby`, conservación de lo ingresado y bloqueo de guardado inválido
- [ ] T020 [US1] Implementar `src/components/entity-list.js`: selector de clientes, resumen (código, tipo, responsable, origen, próximo contacto) con los estados “Vencido”, “Para hoy”, “Programado” y “Sin programar” calculados por `getTargetDateStatus`, y estado vacío “No hay clientes registrados” con acción para crear
- [ ] T021 [US1] Conectar en `src/app.js` la vista Clientes: alta desde “Nuevo cliente”, edición conservando `id`/`entity_id`, eliminación con confirmación que informa cuántas oportunidades se eliminarán y, cuando la colección de tickets exista, cuántos tickets; cascada atómica, mensaje de éxito solo tras persistir y error de almacenamiento con formulario conservado
- [ ] T022 [US1] Hacer que `src/storage.js` invoque `validateClient` antes de `addEntity`/`updateEntity` y rechace códigos duplicados tras `normalizeCode`, sin alterar el registro existente

**Punto de control**: US1 completa y verificable por sí sola.

---

## Fase 4: Historia de Usuario 2 — Buscar clientes y consultar su ficha (Prioridad: P1)

**Objetivo**: buscar por nombre o código con normalización de mayúsculas y tildes, filtrar por tipo/responsable/origen y consultar la ficha del cliente sin modificar datos.

**Prueba independiente**: con clientes registrados, buscar por nombre completo, parte del nombre, código y texto sin tildes; abrir la ficha; comprobar “Ingresa un criterio”, “Sin coincidencias”, “sin información” y “Sin programar”; comparar el almacenamiento antes y después de buscar.

### Pruebas de la Historia 2

- [ ] T023 [P] [US2] Escribir `tests/unit/search.test.js` para `searchClients` (nombre y código, insensible a mayúsculas y diacríticos) y `searchOpportunities` (asunto y folio con cliente asociado), incluidos filtros combinados con AND
- [ ] T024 [P] [US2] Escribir `tests/integration/search-clients.test.js`: resultados múltiples de clientes y de oportunidades por asunto/folio, cliente vinculado visible, selección de resultado, ficha con campos vacíos, prospectos incluidos y prueba de no mutación del almacenamiento

### Implementación de la Historia 2

- [ ] T025 [US2] Implementar en `src/crm-rules.js` `searchClients(criterion, filters)` y `searchOpportunities(criterion, filters)` con normalización `trim → minúsculas → sin diacríticos` y filtros AND por `category`, `accountOwner`, `acquisitionSource`
- [ ] T026 [US2] Implementar `src/components/search-bar.js`: criterio único, actualización automática al escribir, filtros de tipo/responsable/origen y acción “Limpiar filtros”
- [ ] T027 [US2] Crear `src/components/search-results.js` para renderizar resultados de clientes y una sección identificada de oportunidades (asunto, folio, cliente vinculado), con los estados “Ingresa un criterio” y “Sin coincidencias”, sin escrituras en `localStorage`; no cargar esta responsabilidad en `entity-list.js`
- [ ] T028 [US2] Crear `src/components/entity-detail.js` con la ficha de cliente (`name`, `code`, `category`, `accountOwner`, `acquisitionSource`, `email`, `phone`, `contactName`, `description`, `targetDate`, `createdAt`), “sin información” por campo, “Contacto incompleto” cuando correo y teléfono están ambos vacíos, el estado correspondiente de `targetDate` (“Vencido”, “Para hoy”, “Programado” o “Sin programar”) y la lista de oportunidades asociadas en solo lectura
- [ ] T029 [US2] Conectar en `src/app.js` la vista Buscar: criterio, resultados de clientes y oportunidades, selección, ficha y mensajes de estado, garantizando que buscar y consultar no mutan el almacenamiento; al seleccionar una oportunidad se muestra un detalle de solo lectura con asunto, folio, etapa, monto, responsable, fechas y cliente vinculado, renderizado por `search-results.js`/`entity-detail.js` sin abrir el formulario de edición de US4/US5

**Punto de control**: US1 y US2 funcionan por separado y en conjunto.

---

## Fase 5: Historia de Usuario 4 — Registrar una oportunidad comercial (Prioridad: P1)

**Objetivo**: registrar una oportunidad vinculada a un cliente existente con folio único `OPP/folio`, monto CLP entero, fechas válidas y etapa inicial Nueva.

**Prueba independiente**: con `Empresa Demo 1` (`CLI-DEMO-003`) precargada, crear OPP/3001 con los datos de `spec.md`, comprobar el mensaje de éxito, recargar, repetir el folio (debe fallar), y probar monto cero, campos vacíos, fechas invertidas y cancelación.

### Pruebas de la Historia 4

- [ ] T030 [P] [US4] Escribir `tests/unit/opportunity-rules.test.js`: `validateOpportunity`, `isFolioUnique` (excluyendo el registro actual), monto entero ≥ 0 con cero válido, fechas reales y `endDate >= startDate`, responsable de catálogo y rechazo de etapa inicial distinta de Nueva
- [ ] T031 [P] [US4] Escribir `tests/integration/create-opportunity.test.js`: alta válida OPP/3001, folio duplicado, cliente inexistente, ausencia de clientes, doble clic y persistencia tras recarga

### Implementación de la Historia 4

- [ ] T032 [US4] Implementar en `src/crm-rules.js` `validateOpportunity(opportunity, context)`, `isFolioUnique(series, folio, documents, currentId)`, `validateAmount`, `validateOpportunityDates` (comparación de cadenas `YYYY-MM-DD`) y la fijación forzada de `series = OPP`, `currency = CLP` y `status = Nueva` al crear
- [ ] T033 [US4] Implementar `src/components/document-form.js` en modo alta: selector de cliente por nombre y código, asunto, folio, fechas, monto, responsable, notas, serie/moneda/etapa fijas y visibles como no editables, mensajes de error accesibles
- [ ] T034 [US4] Implementar `src/components/document-list.js` con la lista de oportunidades (asunto, folio, etapa, monto, responsable, fechas) y estado vacío “No se encontraron oportunidades”
- [ ] T035 [US4] Conectar en `src/app.js` la vista Oportunidades y los accesos “Nueva oportunidad” desde el área Oportunidades y la ficha del cliente (el acceso desde el panel se agrega en T058, P2); bloquear el alta sin clientes con acceso a crear cliente; mostrar “Oportunidad registrada correctamente” solo después de persistir
- [ ] T036 [US4] Reforzar en `src/storage.js` `addDocument`: exigir `entity_id` existente (sin reasignar cliente), validar folio único por `series + folio`, forzar `status = Nueva` en creación y evitar registros duplicados ante envío repetido

**Punto de control**: US4 completa; US2 puede mostrar oportunidades asociadas.

---

## Fase 6: Historia de Usuario 5 — Gestionar oportunidades y ciclo de vida (Prioridad: P1)

**Objetivo**: editar oportunidades, avanzar por el ciclo `Nueva → Contactada → Propuesta → Negociación → Ganada`, cerrar como Perdida con motivo y eliminar con confirmación.

**Prueba independiente**: recorrer las transiciones válidas de una oportunidad, rechazar saltos y reaperturas, exigir `lossReason` al perder, editar conservando estado final y eliminar sin afectar al cliente.

### Pruebas de la Historia 5

- [ ] T037 [P] [US5] Escribir `tests/unit/lifecycle.test.js`: `canTransition` y `nextStatuses` para toda la matriz, estados finales, rechazo de `Propuesta → Ganada`, `lossReason` obligatorio al entrar en Perdida y rechazo de reapertura
- [ ] T038 [P] [US5] Escribir `tests/integration/opportunity-lifecycle.test.js`: avance completo, pérdida con y sin motivo, salto no permitido, edición conservando estado, eliminación con y sin confirmación y persistencia tras recarga

### Implementación de la Historia 5

- [ ] T039 [US5] Implementar en `src/crm-rules.js` `canTransition(from, to)`, `nextStatuses(status)` y `validateStatusChange(from, to, lossReason)` leyendo `statusLifecycle` de `ModuleConfig`
- [ ] T040 [US5] Extender `src/components/document-form.js` a modo edición: selector de etapa limitado a `nextStatuses`, campo `lossReason` visible y obligatorio solo al elegir Perdida, conservación de `id`/`entity_id` y bloqueo de cambios sin guardar
- [ ] T041 [US5] Hacer que `src/storage.js` `updateDocument` rechace transiciones no declaradas, reaperturas de estados finales y pérdidas sin motivo, y que `deleteDocument` elimine solo la oportunidad
- [ ] T042 [US5] Añadir en `src/components/document-list.js` las acciones editar y eliminar con confirmación explícita, sin borrar el cliente asociado

**Punto de control**: US5 completa; el ciclo comercial es verificable de punta a punta.

---

## Fase 7: Historia de Usuario 6 — Terminología comercial consistente (Prioridad: P1)

**Objetivo**: aplicar Cliente/Clientes y Oportunidad/Oportunidades en gestión, formularios, búsqueda, detalle, mensajes y estados vacíos; en P2, también en el panel, con respaldo genérico cuando no haya perfil.

**Prueba independiente**: recorrer Clientes, Oportunidades y Buscar y, en P2, Panel, comprobando singular y plural, mensajes, estados vacíos y navegación; recargar y confirmar que los términos se mantienen sin alterar los datos.

### Pruebas de la Historia 6

- [ ] T043 [P] [US6] Escribir `tests/integration/relabeling.test.js`: etiquetas desde `ModuleConfig` en todas las vistas, singular/plural, estados vacíos, mensajes y respaldo genérico entidad/documento sin perfil

### Implementación de la Historia 6

- [ ] T044 [US6] Reemplazar en `src/components/shell.js`, `src/components/entity-form.js`, `src/components/entity-list.js`, `src/components/document-form.js`, `src/components/document-list.js` y `src/components/entity-detail.js` todo texto fijo de dominio por `labelFor(kind)` con singular y plural correctos
- [ ] T045 [US6] Unificar en `src/app.js` y los componentes los mensajes de confirmación, error de validación, eliminación y estados vacíos con la terminología CRM, incluido “No hay clientes registrados” y “No se encontraron oportunidades”
- [ ] T046 [US6] Mostrar en `src/app.js` un aviso no bloqueante cuando `getConfig()` reporte configuración inválida o colisión de claves, preservando los valores desconocidos ya guardados, bloqueando su reinterpretación silenciosa y exigiendo migración explícita, sin sobrescribir datos
- [ ] T047 [US6] Completar en `src/components/shell.js` los nombres accesibles de los iconos con la barra lateral contraída y la identificación de la vista activa

**Punto de control**: la terminología es coherente y configurable; el módulo base sigue funcionando sin perfil.

---

## Fase 8: Historia de Usuario 3 — Registrar tickets de soporte (Prioridad: P2)

**Objetivo**: registrar tickets asociados a cliente y producto con motivo, descripción, prioridad y estado `En proceso → Resuelto`.

**Prueba independiente**: elegir un cliente, registrar un ticket con motivo y descripción, verlo en la lista con estado “En proceso”, pasarlo a “Resuelto” y comprobar que no se reabre tras recargar.

### Pruebas de la Historia 3

- [ ] T048 [P] [US3] Escribir `tests/unit/ticket-rules.test.js`: `validateTicket` (cliente y producto obligatorios, motivo del catálogo, descripción no vacía, prioridad Alta/Media/Baja), transición `En proceso → Resuelto` sin reapertura y edición de campos conservando el estado
- [ ] T049 [P] [US3] Escribir `tests/integration/tickets.test.js`: alta, cliente sin producto, prioridad inválida, cambio a Resuelto, rechazo de reapertura, edición de descripción y prioridad de un ticket Resuelto sin cambiar estado, tickets en la ficha del cliente, cascada cliente + tickets al eliminar y persistencia tras recarga

### Implementación de la Historia 3

- [ ] T050 [US3] Implementar en `src/crm-rules.js` `validateTicket(ticket)` y `canTransitionTicket(from, to)`, exigiendo `productName` cuando no exista `productId` y fijando `status = En proceso` al crear
- [ ] T051 [US3] Implementar en `src/storage.js` la colección de tickets en `erp_base_module:tickets`: `loadTickets`, `saveTickets`, `addTicket`, `updateTicket`, `deleteTicketsForEntity`, con validación previa y escritura atómica; extender `deleteEntity` para incluir los tickets en la misma instantánea
- [ ] T052 [US3] Implementar `src/components/ticket-form.js` con cliente, producto (`productId` o `productName`), motivo, descripción, prioridad y errores accesibles
- [ ] T053 [US3] Implementar `src/components/ticket-list.js` con motivo, prioridad, estado y fecha, y estado vacío de tickets
- [ ] T054 [US3] Conectar en `src/app.js` la sección de tickets de la ficha del cliente y la acción “Marcar como resuelto”, sin permitir reapertura en el MVP; actualizar la confirmación de eliminación de cliente para informar cuántos tickets se eliminarán
- [ ] T054A [US3] Implementar la edición de tickets en `src/components/ticket-form.js` (modo edición) y `src/app.js`: motivo, descripción y prioridad editables; estado no editable; `updateTicket` conserva `id`, `entity_id` y `status`; errores accesibles

**Punto de control**: US3 (segunda iteración) completa sin romper el MVP P1.

---

## Fase 9: Historia de Usuario 7 — Consultar el panel CRM (Prioridad: P2, transversal)

**Objetivo**: mostrar seis indicadores recalculados en cada visita al panel, sin persistir totales derivados.

**Prueba independiente**: con datos sintéticos, abrir el panel, revisar los seis indicadores y comprobar que cambian al crear, editar, ganar o perder oportunidades.

### Pruebas de la Historia 7

- [ ] T055 [P] [US7] Escribir `tests/unit/crm-metrics.test.js`: `countClients`, `countOpenOpportunities`, `sumOpenAmount`, `overdueFollowUps`, `todayContacts`, `closeRate` (incluido “Sin datos” con denominador cero y exclusión de clientes Inactivo)
- [ ] T056 [P] [US7] Escribir `tests/integration/dashboard.test.js`: panel con almacenamiento vacío, monto abierto 300000 CLP con dos abiertas y una ganada de 50000 CLP, pérdida que resta del monto y recálculo al volver al panel

### Implementación de la Historia 7

- [ ] T057 [US7] Implementar las seis funciones puras en `src/crm-metrics.js` según las fórmulas de `data-model.md`, usando `todayLocal` para vencimientos y contactos del día
- [ ] T058 [US7] Implementar `src/components/dashboard.js` con tarjetas de los seis indicadores, acciones “Nuevo cliente”, “Nueva oportunidad”, “Gestionar clientes” y “Buscar”, y estado vacío con indicadores en cero y explicación de cómo comenzar; agregar la entrada Panel a `src/components/shell.js`
- [ ] T059 [US7] Conectar en `src/app.js` el recálculo del panel en cada render, tras cada mutación y al volver al panel, sin leer ni guardar totales en `localStorage`

**Punto de control**: las siete historias están implementadas y son verificables.

---

## Fase 10: Polish y aspectos transversales

**Propósito**: cerrar requisitos no funcionales, evidencia y documentación.

- [ ] T060 [P] Escribir `tests/unit/security-render.test.js`: asunto, notas, descripción y nombre con etiquetas HTML o texto tipo script se muestran como texto (`textContent`), sin ejecución
- [ ] T061 [P] Escribir `tests/integration/storage-risks.test.js`: cuota agotada, JSON corrupto, versión de esquema incompatible y pestaña obsoleta (evento `storage`) sin éxito falso ni sobrescritura
- [ ] T062 [P] Escribir `tests/integration/accessibility.test.js`: etiquetas asociadas, `aria-describedby` en errores, foco visible, orden de tabulación, contraste suficiente y mensajes de estado legibles en formularios y listas; incluir una comprobación en pantalla estrecha y registrar el navegador usado
- [ ] T063 [P] Crear `tests/performance/search-performance.test.js` con 500 clientes y 1000 oportunidades: medir de la entrada a los resultados renderizados 20 búsquedas y 20 recálculos del panel, validando en cada medición que el resultado sea correcto, y registrar navegador, equipo y resultado (meta: 19 de 20 bajo 500 ms) en `README.md`
- [ ] T064 Auditar y corregir `src/app.js` y `src/components/` para cumplir privacidad y minimización: sin exportación masiva del listado y sin ordenar ni priorizar por ubicación geográfica (`FR-027`, `FR-028`, `NFR-005`)
- [ ] T065 Actualizar `README.md` con integrantes responsables por historia, instrucciones de ejecución, comandos de prueba, tabla de evidencias y registro del uso de IA
- [ ] T066 Ejecutar manualmente los escenarios 1 a 4 y 6 de `specs/001-crm-module/quickstart.md` para el MVP P1; validar los escenarios 5 y 7 al cerrar la segunda iteración. Ejecutar la tabla de validaciones transversales, probar Chrome y Firefox actuales (y Edge/Safari si están disponibles), crear los datos semilla sintéticos de la demo y anotar resultados reales (incluidos los pendientes) en `README.md`
- [ ] T067 Ejecutar `npm test -- --run`, `npm run build`, `npm run lint` y `npm run format:check`, corregir fallos y registrar fecha, comando y resultado real en `README.md`
- [ ] T068 Verificar coherencia documental entre `specs/001-crm-module/spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/entity-storage.md` y el MER Mermaid, corrigiendo divergencias de campos, estados e indicadores
- [ ] T069 Ejecutar el protocolo de usabilidad de `plan.md`: 5 participantes, 4 tareas (crear, editar, eliminar, buscar) y medición de SC-001 a SC-004 (tiempos de SC-001 a SC-003 y tasa de éxito de SC-004); registrar participantes anonimizados, tiempos, tasa de éxito y resultados reales o declarar la medición como pendiente en `README.md` (meta SC-004: al menos 18 de 20 tareas completadas)
- [ ] T070 [P] Escribir `tests/integration/critical-journey.test.js`: recorrido completo del MVP P1 (cliente → oportunidad → avance de etapa → búsqueda → recarga), arrancando la app real en jsdom y verificando persistencia; el panel se verifica en T056 (P2)

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
