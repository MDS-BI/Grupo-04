# Especificación de la funcionalidad: Ticket de post-venta completo

**Rama de la funcionalidad**: `main` (sin ramas secundarias, según la instrucción del curso)
**Creada**: 2026-11-28
**Estado**: Borrador para planificación
**Iteración**: quinta iteración funcional del CRM, sobre el esquema de datos `v3`
**Especificaciones relacionadas**: [Módulo CRM](../001-crm-module/spec.md), [Rediseño de interfaz](../002-crm-ui-refresh/spec.md), [Campañas y partidas](../003-crm-campanas/spec.md)
**Contrato vigente**: [entity-storage](../001-crm-module/contracts/entity-storage.md)

**Entrada**: Descripción del usuario: “Ampliar el módulo de tickets existente para que un ticket de post-venta pueda gestionarse de punta a punta: identificarse, asignarse, priorizarse, seguirse, resolverse, cerrarse y medirse.”

## Propósito

Hoy el ticket sirve para dejar constancia de una falla, pero no para operar el soporte post-venta. No existe una cola única de trabajo, el ticket no tiene folio visible ni asunto propio, nadie queda formalmente a cargo, el ciclo de vida termina en “Resuelto”, no hay compromiso de tiempo, no se registra qué cambió ni quién lo cambió, y el panel no muestra carga ni desempeño de soporte.

Esta iteración convierte el ticket en una unidad de trabajo completa: se identifica con folio y asunto, se asigna a un técnico y a un equipo, se prioriza con un SLA simple, se sigue con historial, se resuelve con solución y satisfacción, se cierra de forma terminal y se mide en el panel. Todo ocurre en el mismo navegador, con datos sintéticos y sin backend.

## Alcance y decisiones de alcance

### Incluido

- **Bandeja global de tickets** con vista, ruta y entrada de navegación propias; alta desde la bandeja; filtros por estado, prioridad y técnico; orden por prioridad y vencimiento de SLA.
- **Folio y asunto**: folio único, generado e inmutable con formato `TKT-AAAA-####`; asunto corto obligatorio y separado de la descripción.
- **Solicitante, canal y responsable**: contacto opcional de la colección existente, respaldo de nombre, correo y teléfono, canal de entrada, técnico asignado y equipo/cola con reasignación.
- **Ciclo de vida ampliado**: `Nuevo`, `En proceso`, `En espera`, `Resuelto` y `Cerrado`, con transiciones validadas por una función pura compartida entre interfaz y almacenamiento. `Cerrado` es terminal y se mantiene la prohibición de reapertura desde `Resuelto`.
- **SLA simple por prioridad**: objetivo calculado desde `createdAt` y la prioridad; semáforo `En plazo`, `Por vencer` y `Vencido`. Sin horarios laborales ni automatizaciones.
- **Historial embebido**: cambios de estado, prioridad, técnico, resolución, cierre y satisfacción, guardados en la misma operación atómica que el cambio.
- **Indicadores de soporte en el panel**: tickets abiertos, vencidos, por prioridad, tiempo medio de resolución, cumplimiento de SLA y promedio de satisfacción.
- **Satisfacción del cliente (CSAT)**: nota entera de 1 a 5 y comentario opcional, registrada al resolver o mientras el ticket está `Resuelto`.
- **Vínculo mínimo de post-venta industrial**: `warrantyEndsAt` opcional y `documentId` opcional hacia la oportunidad o venta de origen. No se crea módulo Producto ni Inventario.
- **Eliminación individual** de un ticket con confirmación explícita, sin eliminar al cliente.
- **Migración aditiva a `SCHEMA_VERSION = 4`** desde la versión 3, con respaldo recuperable y sin inventar datos históricos.

### Fuera de alcance

- Backend, API, base de datos externa o autenticación real.
- Ingesta de correo, WhatsApp, chat en vivo o portal de cliente. El canal solo registra por dónde llegó el caso.
- IA, triage automático, chatbot, respuestas generadas o clasificación automática.
- Adjuntos pesados o archivos binarios en `localStorage`.
- Módulo Producto, Inventario, Facturación o Field Service completo.
- Fusión de tickets, tickets padre-hijo, macros, base de conocimiento o notificaciones reales.
- Permisos por rol, multiusuario, asignación automática por carga o rondas de turno.
- Calendarios laborales, pausas de SLA, feriados o automatizaciones programadas.
- Exportación, reportes descargables o respaldos administrados desde la interfaz.

Estas ideas quedan como **trabajo futuro** al final del documento.

### Roles

- **Técnico de soporte**: crea, atiende, actualiza y resuelve tickets.
- **Supervisor de soporte**: asigna, reasigna, prioriza, controla SLA y cierra tickets.
- **Gerente o jefe comercial**: consulta los indicadores de soporte del panel.
- **Responsable de calidad**: registra y revisa la satisfacción del cliente.

Los roles describen personas de diseño, no permisos. La demo no implementa autenticación ni restringe vistas. Por eso cualquier persona que use la aplicación puede ejecutar las acciones descritas.

## Relación con la línea base

Esta iteración **no reemplaza** la especificación del módulo CRM: la amplía de forma aditiva. Las historias US-01 a US-16 y sus requisitos siguen vigentes.

| Elemento vigente | Efecto de esta iteración |
|---|---|
| US-03 (registrar tickets) y US-11 (resolución y equipo atendido) | Se amplían; sus criterios siguen siendo válidos salvo las precisiones indicadas en esta especificación. |
| Estados `En proceso` y `Resuelto` | Se conservan y se insertan en un ciclo más amplio. Los tickets históricos mantienen su estado actual. |
| FR-025 y FR-026 | Se amplían con folio, asunto, solicitante, canal, técnico, equipo, espera, cierre, SLA e historial. La obligatoriedad del producto se mantiene. FR-026 permitía editar la prioridad conservando el estado `Resuelto`; esta iteración congela la prioridad desde `Resuelto` para no alterar la medición histórica del SLA. |
| Prohibición de reapertura | Se mantiene: `Resuelto` no vuelve a `En proceso` ni a `En espera`; solo avanza a `Cerrado`. |
| Panel con seis indicadores | Se conservan y se agregan los indicadores de soporte; no se elimina ninguno. |
| Contactos, actividades y papelera | No se modifican. Solo se referencia un contacto existente y se conserva el vínculo con la papelera de clientes. |
| Persistencia | Se mantiene atómica; se sube la versión de esquema a 4 con migración explícita y respaldo. |

### Nota sobre la numeración de historias

La propuesta original de esta iteración usa los identificadores **US-17 a US-24**. En el repositorio esos identificadores ya están asignados a las historias de campañas y partidas de [`003-crm-campanas`](../003-crm-campanas/spec.md) y a la ampliación comercial declarada en la línea base. Para no romper la trazabilidad existente, esta especificación usa **US-25 a US-32** y mantiene la siguiente equivalencia:

| Propuesta original | Identificador en este documento |
|---|---|
| US-17 Bandeja global de tickets | US-25 |
| US-18 Folio y asunto | US-26 |
| US-19 Solicitante, canal y responsable | US-27 |
| US-20 Ciclo de vida y cierre | US-28 |
| US-21 SLA por prioridad | US-29 |
| US-22 Historial de cambios | US-30 |
| US-23 Indicadores de soporte | US-31 |
| US-24 Satisfacción del cliente | US-32 |

## Organización por integrante

Cada historia tiene un responsable de documentación y de implementación. Completar los nombres al iniciar la iteración; no se inventan integrantes.

| Historia | Tema | Prioridad | Requisitos | Criterios |
|---|---|---|---|---|
| US-25 | Bandeja global de tickets | P1 | FR-046…FR-050 | CA-25-01…CA-25-08 |
| US-26 | Folio y asunto | P1 | FR-051, FR-052 | CA-26-01…CA-26-07 |
| US-27 | Solicitante, canal y responsable | P1 | FR-053…FR-055, FR-069, FR-070 | CA-27-01…CA-27-09 |
| US-28 | Ciclo de vida y cierre | P1 | FR-056…FR-061, FR-063, FR-068 | CA-28-01…CA-28-11 |
| US-29 | SLA por prioridad | P1 | FR-062, FR-075 | CA-29-01…CA-29-08 |
| US-30 | Historial de cambios | P1 | FR-064, FR-065 | CA-30-01…CA-30-08 |
| US-31 | Indicadores de soporte | P2 | FR-066 | CA-31-01…CA-31-09 |
| US-32 | Satisfacción del cliente | P2 | FR-067 | CA-32-01…CA-32-08 |

> La prioridad P1 identifica la rebanada mínima operable de soporte; P2 completa la medición y la voz del cliente. La iteración se considera terminada solo con las ocho historias verificadas.

## Escenarios de usuario y pruebas

### Historia de Usuario 25 — Bandeja global de tickets (Prioridad: P1)

**Como** técnico de soporte, **quiero** ver todos los tickets en una cola única y filtrarlos, **para** priorizar mi trabajo sin recorrer cliente por cliente.

**Por qué esta prioridad**: sin una cola global no existe operación de soporte; el ticket solo se descubre entrando a la ficha de un cliente.

**Prueba independiente**: con al menos tres clientes y cinco tickets en distintos estados, abrir la vista Tickets, comprobar que aparecen todos, aplicar filtros y ordenar por prioridad y vencimiento. No requiere crear ni modificar tickets.

**Dependencias**: tickets existentes (US-03, US-11). La vista puede probarse con datos sintéticos precargados.

**Escenarios de aceptación**:

1. **CA-25-01** — Dado que el usuario está en la aplicación, cuando activa “Tickets” en la navegación, entonces se abre una vista propia con ruta estable, el título “Tickets” y la lista de todos los tickets de todos los clientes.
2. **CA-25-02** — Dado que existen tickets de varios clientes, cuando se abre la bandeja, entonces cada fila muestra al menos folio, asunto, cliente, técnico, prioridad, estado y semáforo de SLA; cuando falta un dato opcional se muestra “Sin asignar”, “Solicitante no registrado” o el equivalente definido, sin celdas vacías ambiguas.
3. **CA-25-03** — Dado que el usuario está en la bandeja, cuando selecciona “Nuevo ticket”, entonces se abre el drawer de creación existente, vacío, con el cliente como primer dato obligatorio y sin abandonar la vista.
4. **CA-25-04** — Dado un ticket creado desde la bandeja, cuando se guarda correctamente, entonces la bandeja se actualiza y el ticket aparece según los filtros y el orden vigentes, sin exigir recargar la página.
5. **CA-25-05** — Dados los filtros de estado, prioridad y técnico, cuando se combinan dos o más, entonces se aplican con AND y la lista muestra solo los tickets que cumplen todos; cuando se elige “Todos” en un filtro, este deja de restringir.
6. **CA-25-06** — Dado que hay filtros activos, cuando el usuario selecciona “Limpiar filtros”, entonces se restauran todos los tickets y el orden por defecto, y se anuncia el cambio a lectores de pantalla.
7. **CA-25-07** — Dado un conjunto de tickets con prioridades y vencimientos distintos, cuando se ordena por prioridad y vencimiento SLA, entonces se muestra primero `Alta`, luego `Media` y luego `Baja`; dentro de cada prioridad se ordena por `slaDueAt` ascendente y los empates se resuelven por `createdAt` y `folio` para obtener un orden estable.
8. **CA-25-08** — Dado que no existen tickets o que los filtros no arrojan coincidencias, cuando se consulta la bandeja, entonces se muestra un estado vacío distinto en cada caso: uno invita a crear el primer ticket y el otro ofrece limpiar los filtros.

**Notas técnicas**: la vista se registra como `tickets` en `VIEW_IDS` de `src/app.js`, con respaldo de ruta válido. La tabla reutiliza `src/components/data-table.js` y `src/components/ticket-list.js` en modo global; los filtros y el orden viven en el estado de la vista y no se persisten. La fila es accesible con teclado (`Enter` o `Espacio`) y abre el detalle.

---

### Historia de Usuario 26 — Folio y asunto (Prioridad: P1)

**Como** usuario del CRM, **quiero** que cada ticket tenga un folio único y un asunto corto, **para** referirme a él sin ambigüedad en conversaciones, correos internos y reportes.

**Por qué esta prioridad**: sin folio no se puede citar un caso de forma inequívoca; sin asunto, la descripción larga se usa como identificador y la bandeja se vuelve ilegible.

**Prueba independiente**: crear dos tickets el mismo año y comprobar que reciben folios consecutivos distintos con formato `TKT-AAAA-####`; intentar editar el folio y comprobar que no se permite. Verificar que el asunto es obligatorio y que se conserva al recargar.

**Dependencias**: US-25 para el alta desde la bandeja. La generación de folio pertenece a la capa de persistencia.

**Escenarios de aceptación**:

1. **CA-26-01** — Dado un alta de ticket válida, cuando se guarda, entonces el sistema genera un folio con formato `TKT-AAAA-####`, donde `AAAA` es el año local de `createdAt` y `####` es un correlativo de cuatro dígitos con ceros a la izquierda.
2. **CA-26-02** — Dados dos tickets creados el mismo año, cuando se guardan, entonces reciben folios distintos y el segundo es mayor que el primero; el correlativo se calcula sobre el mayor folio existente de ese año, incluidos los migrados, y la unicidad se verifica contra toda la colección.
3. **CA-26-03** — Dado un ticket existente, cuando se intenta modificar el folio desde el formulario, la interfaz no lo ofrece como campo editable y la capa de almacenamiento rechaza cualquier cambio; el folio se muestra como texto de solo lectura.
4. **CA-26-04** — Dado un formulario de ticket, cuando falta el asunto o contiene solo espacios, entonces se impide guardar, se identifica el campo y se conserva lo escrito.
5. **CA-26-05** — Dado un asunto con espacios al inicio o al final, cuando se guarda, entonces se almacena recortado; si supera 120 caracteres, se rechaza con un mensaje que indica el máximo.
6. **CA-26-06** — Dado un ticket guardado, cuando se consulta en la bandeja, el detalle o la ficha del cliente, entonces se muestran folio y asunto en todos esos lugares, y el asunto no reemplaza a la descripción.
7. **CA-26-07** — Dado un intento de guardar dos tickets con el mismo folio, incluso por doble envío o por escritura directa en la capa de almacenamiento, entonces se conserva como máximo un ticket con ese folio y se informa el conflicto sin mostrar éxito.

**Notas técnicas**: `formatTicketFolio(year, sequence)` y `nextTicketFolio(tickets, createdAt)` en `src/crm-rules.js`; la asignación ocurre dentro de `addTicket` en `src/storage.js` y no se acepta desde el formulario. El folio es inmutable: `buildTicket` conserva el valor anterior y `updateTicket` rechaza un cambio explícito. La unicidad se verifica antes de escribir. Si el correlativo anual supera 9999, se rechaza el alta con un mensaje claro y se documenta como límite de la demo.

---

### Historia de Usuario 27 — Solicitante, canal y responsable (Prioridad: P1)

**Como** técnico de soporte, **quiero** saber quién reportó el caso, por qué canal llegó y quién lo atiende, **para** contactar a la persona correcta y evitar tickets sin dueño.

**Por qué esta prioridad**: un ticket sin solicitante ni responsable no se puede atender; el canal permite interpretar la urgencia y el contexto de la comunicación.

**Prueba independiente**: crear un ticket seleccionando un contacto del cliente, comprobar que se copian nombre, correo y teléfono; reasignarlo a otro técnico; verificar que la bandeja y el detalle reflejan solicitante, canal y responsable, y que todo persiste al recargar.

**Dependencias**: US-12 (contactos múltiples), US-25 y US-26.

**Escenarios de aceptación**:

1. **CA-27-01** — Dado un ticket en creación, cuando se elige un cliente, entonces el selector de contacto ofrece únicamente los contactos de ese cliente y una opción “Sin contacto”.
2. **CA-27-02** — Dado un contacto seleccionado, cuando se guarda el ticket, entonces se almacena su `contactId` y una copia de respaldo de nombre, correo y teléfono en `requesterName`, `requesterEmail` y `requesterPhone`; si el contacto cambia después, el ticket conserva el respaldo histórico hasta que se edite explícitamente.
3. **CA-27-03** — Dado que no se selecciona contacto, cuando se informan nombre, correo o teléfono de respaldo, entonces se guardan esos valores; el correo se valida con el mismo criterio del CRM cuando está presente y el teléfono se acepta como texto no vacío.
4. **CA-27-04** — Dado un `contactId` que pertenece a otro cliente o que ya no existe, cuando se intenta guardar, entonces se rechaza la operación y se solicita elegir un contacto del cliente del ticket.
5. **CA-27-05** — Dado un ticket nuevo, cuando se intenta guardar sin canal o con un canal ajeno al catálogo, entonces se rechaza la operación con un mensaje que solicita elegir `Teléfono`, `Correo`, `WhatsApp`, `Presencial` o `Portal`; los valores provienen de `ModuleConfig`.
6. **CA-27-06** — Dado un ticket en creación, cuando se elige técnico y equipo, entonces solo se aceptan valores de los catálogos configurados; ambos pueden quedar sin asignar y la bandeja los muestra como “Sin asignar”.
7. **CA-27-07** — Dado un ticket existente, cuando se reasigna a otro técnico o equipo, entonces el cambio se guarda y se registra en el historial con valor anterior, valor nuevo y fecha; no se requiere abrir el modo de edición completo.
8. **CA-27-08** — Dado un ticket con `warrantyEndsAt`, cuando se consulta, entonces se muestra “En garantía”, “Fuera de garantía” o “Garantía no registrada” según la fecha local, sin bloquear la atención ni calcular coberturas.
9. **CA-27-09** — Dado un ticket con `documentId`, cuando se guarda, entonces el documento debe existir y pertenecer al mismo cliente; si el documento se elimina después, el ticket conserva la referencia y muestra “Venta de origen no disponible”, sin borrar ni reasignar el ticket.

**Notas técnicas**: catálogos `channel`, `assignee` y `team` en `src/module-config.js`. `validateTicket` recibe `contacts` y `documents` en el contexto. La copia de respaldo se realiza en el formulario y se confirma en `buildTicket`; no se guardan datos del contacto fuera del ticket. La reasignación usa una operación específica (`assignTicket`) para que el historial y el cambio se escriban juntos.

---

### Historia de Usuario 28 — Ciclo de vida y cierre (Prioridad: P1)

**Como** supervisor de soporte, **quiero** estados de espera y cierre además de la resolución, **para** reflejar la realidad del trabajo y terminar los casos de forma controlada.

**Por qué esta prioridad**: el ciclo actual solo distingue “En proceso” y “Resuelto”; no representa esperas ni permite cerrar un caso confirmado, y la bandeja no puede reflejar la carga real.

**Prueba independiente**: crear un ticket, pasarlo a “En proceso”, luego a “En espera”, volver a “En proceso”, resolverlo con solución y cerrarlo. Intentar reabrirlo y comprobar que se rechaza. Eliminar un ticket y verificar que el cliente permanece.

**Dependencias**: US-25 a US-27; reglas puras compartidas de transición.

**Escenarios de aceptación**:

1. **CA-28-01** — Dado un ticket nuevo, cuando se guarda, entonces queda en estado `Nuevo` con `resolvedAt` y `closedAt` vacíos y una entrada de creación en el historial.
2. **CA-28-02** — Dado un ticket en `Nuevo`, cuando se inicia la atención, entonces puede pasar a `En proceso`; si es la primera vez que abandona `Nuevo`, se genera `firstResponseAt` con la fecha y hora del sistema.
3. **CA-28-03** — Dado un ticket en `En proceso`, cuando se pasa a `En espera`, entonces se solicita opcionalmente una nota de espera (por ejemplo, “Cliente” o “Repuesto o proveedor”), se guarda el estado y la nota queda en el historial; el SLA continúa corriendo porque no hay pausas en esta iteración.
4. **CA-28-04** — Dado un ticket en `En espera`, cuando se reanuda la atención, entonces puede volver a `En proceso` y el cambio queda registrado.
5. **CA-28-05** — Dado un ticket en `En proceso` o `En espera`, cuando se resuelve, entonces se exige un resumen de solución no vacío, se guarda `resolutionSummary`, se genera `resolvedAt` y el estado pasa a `Resuelto` en una sola operación.
6. **CA-28-06** — Dado un ticket en `Resuelto`, cuando se confirma el cierre, entonces se genera `closedAt` y el estado pasa a `Cerrado`; el cierre no exige un motivo adicional.
7. **CA-28-07** — Dado un ticket en `Resuelto`, cuando se intenta volver a `En proceso`, `En espera` o `Nuevo`, entonces la interfaz no ofrece la acción y la capa de almacenamiento rechaza la transición con un mensaje que explica la prohibición de reapertura.
8. **CA-28-08** — Dado un ticket en `Cerrado`, cuando se intenta cualquier cambio de estado o de datos operativos, entonces se rechaza; el ticket queda de solo lectura y conserva su solución, fechas e historial.
9. **CA-28-09** — Dado un ticket en `Resuelto`, cuando se editan asunto, descripción, solicitante, canal, equipo, garantía o vínculo de origen, entonces se permite guardar conservando estado, solución, `resolvedAt`, prioridad y fechas de SLA.
10. **CA-28-10** — Dado un ticket existente, cuando se solicita eliminarlo, entonces se pide confirmación indicando folio y asunto, se aclara que el cliente no se elimina y que la acción es definitiva; al confirmar se elimina solo el ticket y su historial, y el cliente permanece intacto.
11. **CA-28-11** — Dado un cambio de estado, resolución, cierre o eliminación, cuando se recarga la aplicación, entonces el resultado confirmado permanece y no reaparece el estado anterior.

**Notas técnicas**: `TICKET_STATUSES` y `TICKET_TRANSITIONS` en `src/crm-rules.js`; `canTransitionTicket(from, to)` y `nextTicketStatuses(status)` son la única fuente de verdad para interfaz y almacenamiento. `resolveTicketRecord`, `closeTicketRecord` y `deleteTicket` en `src/storage.js` escriben en una sola instantánea. La creación deja de forzar `En proceso`: ahora fuerza `Nuevo` para tickets nuevos del esquema 4, sin alterar los históricos.

**Máquina de estados**:

| Desde | Hacia permitido |
|---|---|
| `Nuevo` | `En proceso` |
| `En proceso` | `En espera`, `Resuelto` |
| `En espera` | `En proceso`, `Resuelto` |
| `Resuelto` | `Cerrado` |
| `Cerrado` | — (terminal) |

Cualquier otra combinación se rechaza, incluidos los saltos `Nuevo → Resuelto`, `Nuevo → Cerrado`, `En espera → Nuevo` y cualquier salida desde `Cerrado`.

---

### Historia de Usuario 29 — SLA por prioridad (Prioridad: P1)

**Como** supervisor de soporte, **quiero** ver qué tickets están por vencer o vencidos según su prioridad, **para** cumplir los tiempos comprometidos y ordenar la cola.

**Por qué esta prioridad**: sin un objetivo de tiempo, la prioridad es solo una etiqueta y no permite distinguir un caso urgente de uno abandonado.

**Prueba independiente**: crear tickets Alta, Media y Baja con fechas de creación controladas, comprobar el objetivo calculado y los tres semáforos; cambiar la prioridad y verificar que el objetivo se recalcula; resolver un ticket y comprobar el resultado de SLA congelado.

**Dependencias**: US-25, US-26 y US-28.

**Escenarios de aceptación**:

1. **CA-29-01** — Dado un ticket nuevo, cuando se guarda, entonces su objetivo de SLA se calcula como `createdAt + objetivo(priority)` con los valores iniciales: Alta 24 horas, Media 72 horas y Baja 168 horas (7 días).
2. **CA-29-02** — Dado un ticket abierto, cuando se calcula su semáforo, entonces se muestra `Vencido` si el instante actual es igual o posterior al objetivo, `Por vencer` si queda un 25% o menos del objetivo, y `En plazo` en el resto de los casos.
3. **CA-29-03** — Dado un ticket con prioridad modificada mientras está abierto, cuando se guarda, entonces el objetivo se recalcula desde el `createdAt` original con la nueva prioridad y el cambio queda en el historial; no se reinicia el reloj.
4. **CA-29-04** — Dado un ticket resuelto o cerrado, cuando se muestra su SLA, entonces se compara `resolvedAt` con el objetivo vigente y se muestra `En plazo` o `Vencido` como resultado final; si no existe `resolvedAt` verificable, se muestra `Sin datos`.
5. **CA-29-05** — Dado un ticket en `Resuelto` o `Cerrado`, cuando se intenta cambiar la prioridad, entonces se rechaza para no alterar la medición histórica del SLA.
6. **CA-29-06** — Dado un ticket migrado con prioridad y `createdAt` válidos, cuando se consulta, entonces el SLA se calcula con esos datos reales; no se inventan fechas ni prioridades.
7. **CA-29-07** — Dado que el SLA se muestra en la bandeja y en el detalle, cuando cambia el día o la hora local, entonces el semáforo se recalcula al volver a la vista y no se lee un total persistido.
8. **CA-29-08** — Dado un conjunto de 1000 tickets, cuando se abre la bandeja y se aplican filtros y orden por SLA, entonces la vista se actualiza en menos de 500 ms en al menos 19 de 20 mediciones, registrando navegador y equipo.

**Notas técnicas**: `computeSlaDueAt(createdAt, priority)` y `getSlaStatus(ticket, now)` en `src/crm-rules.js`; la política `SLA_HOURS_BY_PRIORITY` es una constante exportada. El campo `slaDueAt` es derivado: se puede materializar al guardar, pero nunca se acepta como entrada del usuario y se recalcula en cada lectura. No hay pausa en `En espera`, fines de semana ni feriados. El semáforo se comunica con texto e icono, no solo con color.

---

### Historia de Usuario 30 — Historial de cambios (Prioridad: P1)

**Como** auditor de soporte, **quiero** saber qué cambió en un ticket, cuándo y con qué valores, **para** reconstruir la atención y resolver discrepancias.

**Por qué esta prioridad**: sin trazabilidad no se puede auditar una resolución, explicar una reasignación ni distinguir un cambio legítimo de una edición posterior.

**Prueba independiente**: crear un ticket, cambiar estado, prioridad y técnico, resolverlo y cerrarlo; abrir el detalle y comprobar una entrada por cambio, en orden, con valores anterior y nuevo. Simular un fallo de guardado y verificar que no queda una entrada parcial.

**Dependencias**: US-27 a US-29.

**Escenarios de aceptación**:

1. **CA-30-01** — Dado un ticket nuevo, cuando se guarda, entonces el historial contiene una entrada de tipo `creacion` con fecha, actor y folio asignado.
2. **CA-30-02** — Dado un ticket existente, cuando cambia de estado, entonces se agrega una entrada `estado` con valor anterior, valor nuevo, fecha y actor; la entrada se escribe en la misma operación que el cambio.
3. **CA-30-03** — Dado un ticket existente, cuando cambia de prioridad, de técnico o de equipo, entonces se agrega una entrada por cada cambio, identificando el campo y los valores anterior y nuevo.
4. **CA-30-04** — Dado un ticket que se resuelve, entonces se agrega una entrada `resolucion` con la fecha del cambio y un resumen legible de la solución, sin duplicar el texto completo si este ya está en `resolutionSummary`; si se registra satisfacción, se agrega una entrada `satisfaccion` separada.
5. **CA-30-05** — Dado un ticket que se cierra, entonces se agrega una entrada `cierre` con la fecha y el estado anterior.
6. **CA-30-06** — Dado el detalle de un ticket, cuando se consulta el historial, entonces se muestran los eventos del más reciente al más antiguo, con tipo, fecha, actor y detalle; si no hay eventos, se muestra “Sin cambios registrados”.
7. **CA-30-07** — Dado un ticket guardado, cuando se recarga la aplicación, entonces el historial se conserva íntegro y en el mismo orden, sin entradas duplicadas ni reconstruidas.
8. **CA-30-08** — Dado un error de almacenamiento durante un cambio, entonces no se modifica el ticket ni se agrega una entrada parcial; se informa el error y se conserva lo ingresado para reintentar.

**Notas técnicas**: historial embebido `history[]`, sin colección nueva. Entrada `{ id, at, type, field, from, to, note, actor }`, donde `type ∈ {creacion, estado, prioridad, asignacion, equipo, resolucion, cierre, satisfaccion, migracion}`. `appendTicketHistory(ticket, event, now)` es pura y `updateTicket` la aplica antes de la escritura única. El historial es de solo lectura desde la interfaz. `actor` se toma del catálogo de técnicos o de “Sistema” cuando no hay sesión; no se inventa un usuario autenticado.

---

### Historia de Usuario 31 — Indicadores de soporte (Prioridad: P2)

**Como** gerente, **quiero** ver la carga y el desempeño del soporte en el panel, **para** detectar acumulación, prioridades desatendidas y cumplimiento de los tiempos.

**Por qué esta prioridad**: completa la operación con medición; el panel actual no distingue tickets abiertos, vencidos ni tiempos de resolución.

**Prueba independiente**: con un conjunto sintético de tickets abiertos, vencidos y resueltos, abrir el panel y comparar cada indicador con un cálculo manual. Cambiar un ticket y volver al panel para comprobar el recálculo, sin recargar totales persistidos.

**Dependencias**: US-25 a US-30 y US-32. Los seis indicadores comerciales existentes se conservan.

**Escenarios de aceptación**:

1. **CA-31-01** — Dado que existen tickets, cuando se abre el panel, entonces se muestran los indicadores “Tickets abiertos”, “Tickets vencidos de SLA”, “Tickets por prioridad”, “Tiempo medio de resolución”, “Cumplimiento de SLA” y “Satisfacción promedio”, además de los seis indicadores comerciales vigentes.
2. **CA-31-02** — Dado un conjunto de tickets, cuando se cuenta “Tickets abiertos”, entonces se incluyen solo los estados `Nuevo`, `En proceso` y `En espera`; `Resuelto` y `Cerrado` no cuentan como abiertos.
3. **CA-31-03** — Dado un ticket abierto cuyo objetivo de SLA ya pasó, cuando se cuenta “Tickets vencidos de SLA”, entonces se incluye exactamente una vez; los resueltos o cerrados no se cuentan como vencidos abiertos.
4. **CA-31-04** — Dado un conjunto de tickets abiertos, cuando se muestra “Tickets por prioridad”, entonces se informa el conteo de Alta, Media y Baja, incluyendo los valores en cero; los tickets sin prioridad válida no se inventan y se agrupan como “Sin prioridad” solo si existieran datos históricos incompletos.
5. **CA-31-05** — Dado un conjunto de tickets con `resolvedAt`, cuando se calcula el tiempo medio de resolución, entonces se promedia la diferencia entre `resolvedAt` y `createdAt` en horas y se muestra con un decimal; los tickets sin `resolvedAt` verificable se excluyen del cálculo.
6. **CA-31-06** — Dado un conjunto de tickets resueltos con SLA calculable, cuando se calcula el cumplimiento, entonces se informa el porcentaje de tickets cuyo `resolvedAt` es igual o anterior al objetivo; si no hay denominador, se muestra “Sin datos”.
7. **CA-31-07** — Dado un conjunto de tickets con satisfacción, cuando se muestra el promedio, entonces se promedian solo las notas válidas de 1 a 5 y se muestra con un decimal; sin notas, se muestra “Sin datos”.
8. **CA-31-08** — Dado un cambio en cualquier ticket, cuando se vuelve al panel, entonces todos los indicadores se recalculan y coinciden con la muestra de control; no se leen totales persistidos.
9. **CA-31-09** — Dado un almacenamiento sin tickets, cuando se abre el panel, entonces los indicadores de soporte muestran cero o “Sin datos” según corresponda y se explica cómo registrar el primer ticket, sin errores de división por cero.

**Notas técnicas**: funciones puras en `src/crm-metrics.js`: `countOpenTickets`, `countOverdueTickets`, `ticketPriorityDistribution`, `averageResolutionHours`, `slaCompliance` y `averageSatisfaction`. Fórmulas exactas en la sección “Indicadores de la iteración”. El panel se recalcula en cada render; no se persisten agregados. Se conserva el comportamiento de los indicadores comerciales existentes.

---

### Historia de Usuario 32 — Satisfacción del cliente (Prioridad: P2)

**Como** responsable de calidad, **quiero** registrar la satisfacción del cliente al resolver un ticket, **para** medir la calidad percibida del soporte y detectar casos deficientes.

**Por qué esta prioridad**: completar el ciclo con la voz del cliente; sin ella, el cierre mide tiempos pero no resultado percibido.

**Prueba independiente**: resolver un ticket con nota 4 y comentario; resolver otro con nota 2; comprobar el promedio en el panel y en la ficha del cliente. Intentar guardar notas 0, 6 o un decimal y verificar el rechazo.

**Dependencias**: US-28 (resolución). El promedio se muestra en el panel de US-31.

**Escenarios de aceptación**:

1. **CA-32-01** — Dado un ticket que se va a resolver, cuando se confirma la resolución, entonces el formulario ofrece registrar una nota de satisfacción de 1 a 5 y un comentario opcional; la nota puede omitirse si el cliente aún no respondió.
2. **CA-32-02** — Dado un ticket en `Resuelto` sin nota, cuando se registra la satisfacción desde el detalle, entonces se guarda la nota y el comentario y se agrega una entrada `satisfaccion` al historial; no se modifica el estado ni las fechas de resolución. Si ya existe una nota, la acción no se ofrece y el almacenamiento rechaza un segundo registro.
3. **CA-32-03** — Dado un valor de nota vacío, cero, negativo, mayor que 5, decimal o no numérico, cuando se intenta guardar, entonces se rechaza con un mensaje que indica “nota entera de 1 a 5” y se conserva lo escrito.
4. **CA-32-04** — Dado un comentario de satisfacción, cuando supera 500 caracteres, entonces se rechaza con un mensaje que indica el máximo; los espacios al inicio y al final se recortan.
5. **CA-32-05** — Dado un ticket en `Cerrado`, cuando se consulta su satisfacción, entonces se muestra en modo de solo lectura y no se permite modificarla.
6. **CA-32-06** — Dado un ticket con satisfacción registrada, cuando se consulta el detalle, entonces se muestran la nota, el comentario y la fecha de registro; si no hay nota, se muestra “Sin satisfacción registrada”.
7. **CA-32-07** — Dado un conjunto de tickets con notas, cuando se consulta el panel o la ficha del cliente, entonces se muestra el promedio de las notas válidas con un decimal; sin notas, se muestra “Sin datos”.
8. **CA-32-08** — Dado un ticket con satisfacción guardada, cuando se recarga la aplicación, entonces la nota, el comentario y su promedio permanecen.

**Notas técnicas**: `validateSatisfaction(score, comment)` en `src/crm-rules.js`; la nota se guarda como entero y el comentario como texto seguro. La satisfacción se puede registrar en el diálogo de resolución o desde el detalle mientras el ticket esté `Resuelto`; una vez `Cerrado`, es inmutable. El promedio se calcula en `averageSatisfaction` y se reutiliza en el panel y en la ficha del cliente, sin persistirse.

---

## Reglas de negocio transversales

### Identificación

- **Folio**: generado por el sistema, único en toda la colección, formato `TKT-AAAA-####`, inmutable y no editable. La unicidad se verifica contra todos los tickets existentes.
- **Asunto**: obligatorio, recortado, entre 1 y 120 caracteres. No reemplaza a la descripción.
- **Descripción**: obligatoria y no vacía, como en el ticket actual.
- **Cliente**: debe existir al crear y al actualizar; no se permite un ticket huérfano.
- **Producto**: se mantiene la regla vigente: `productId` o `productName` debe estar informado. La referencia del equipo sigue siendo opcional.

### Referencias y catálogos

- `contactId` es opcional; si se informa, debe pertenecer al mismo `entity_id` del ticket.
- `requesterName`, `requesterEmail` y `requesterPhone` son el respaldo del solicitante. El correo se valida solo si está presente.
- `channel` proviene del catálogo `channel`; es obligatorio en tickets nuevos y opcional en tickets migrados que aún no lo tengan.
- `assignee` y `team` provienen de los catálogos `assignee` y `team`; son opcionales y se muestran como “Sin asignar” cuando faltan.
- `documentId` es opcional; si se informa, debe existir y pertenecer al mismo cliente. Una referencia posteriormente eliminada se conserva y se muestra como no disponible.
- `warrantyEndsAt` es una fecha de calendario opcional; no se calcula cobertura ni se crea un módulo de garantías. Se compara con el día local: si es igual o posterior a hoy, el equipo está “En garantía”; si es anterior, “Fuera de garantía”; si está vacía, “Garantía no registrada”.
- Los valores persistidos que dejen de existir en un catálogo no se reescriben en silencio: se muestran con una advertencia y se exige una nueva selección al editar.

### Ciclo de vida

- Los tickets nuevos comienzan en `Nuevo`.
- Las transiciones válidas son las de la tabla de US-28 y se validan con una función pura compartida.
- `En espera` no pausa el SLA.
- `Resuelto` exige resumen de solución y genera `resolvedAt`; no se reabre.
- `Cerrado` genera `closedAt`, es terminal y deja el ticket en solo lectura.
- La prioridad se puede cambiar mientras el ticket está abierto; queda congelada desde `Resuelto` para preservar la medición de SLA.
- La eliminación individual exige confirmación, borra solo el ticket y su historial, y nunca al cliente ni sus otras relaciones.

### Historial

- Cada cambio de estado, prioridad, técnico, equipo, resolución, cierre o satisfacción agrega una entrada en `history[]`.
- El historial es append-only y se escribe en la misma operación atómica que el cambio.
- No se registran entradas para ediciones de asunto, descripción, solicitante, canal, garantía o vínculo de origen, salvo que la implementación decida ampliar el catálogo de eventos; en tal caso debe documentarlo.
- La migración agrega una entrada `migracion` veraz; no reconstruye cambios que el sistema nunca registró.

### SLA

| Prioridad | Objetivo desde `createdAt` | Umbral “Por vencer” |
|---|---|---|
| Alta | 24 horas | 6 horas restantes o menos |
| Media | 72 horas | 18 horas restantes o menos |
| Baja | 168 horas (7 días) | 42 horas restantes o menos |

- `slaDueAt` se deriva de `createdAt` y la prioridad vigente; no se ingresa a mano.
- `Vencido` si `now >= slaDueAt`; `Por vencer` si `0 < slaDueAt - now <= 25%` del objetivo; `En plazo` en el resto.
- Para tickets resueltos o cerrados, el resultado se congela comparando `resolvedAt` con el objetivo vigente.
- Sin horarios laborales, feriados, pausas ni automatizaciones.

### Satisfacción

- Nota entera de 1 a 5; comentario opcional de hasta 500 caracteres.
- Se registra al resolver o mientras el ticket está `Resuelto`; una sola vez por ticket: una nota ya registrada no se reemplaza ni se elimina. Una vez `Cerrado`, es de solo lectura.
- El promedio usa solo notas válidas y muestra “Sin datos” cuando no hay ninguna.

## Modelo de datos de la iteración

La ampliación es **aditiva**: conserva todos los campos actuales del ticket y agrega los siguientes. La fuente de verdad del modelo es `specs/001-crm-module/data-model.md`, que debe actualizarse durante la planificación.

| Campo | Tipo | Clasificación | Regla |
|---|---|---|---|
| `id` | string | Obligatorio, generado | Identidad técnica existente; no cambia. |
| `folio` | string | Obligatorio, generado, inmutable | `TKT-AAAA-####`; único global; asignado por almacenamiento. |
| `entity_id` | string | Obligatorio | Cliente existente; no se reasigna. |
| `contactId` | string \| null | Opcional | Contacto del mismo cliente; se conserva aunque el contacto se elimine después. |
| `requesterName` | string \| null | Opcional | Respaldo del solicitante; se copia del contacto o se ingresa. |
| `requesterEmail` | string \| null | Opcional | Correo válido cuando está presente. |
| `requesterPhone` | string \| null | Opcional | Texto no vacío cuando está presente. |
| `subject` | string | Obligatorio | Recortado, 1–120 caracteres; separado de la descripción. |
| `description` | string | Obligatorio | Descripción del caso; se conserva el campo actual. |
| `productId` | string \| null | Opcional | Referencia externa; se mantiene la regla actual. |
| `productName` | string \| null | Condicional | Respaldo de demo; se exige si no hay `productId`. |
| `equipmentReference` | string \| null | Opcional | Referencia del equipo; sin catálogo de inventario. |
| `warrantyEndsAt` | string (`YYYY-MM-DD`) \| null | Opcional | Fecha de calendario válida; no se calcula cobertura. |
| `documentId` | string \| null | Opcional | Oportunidad o venta de origen del mismo cliente. |
| `reason` | string | Obligatorio | `soporte`, `reclamo` o `consulta`, según catálogo. |
| `channel` | string | Obligatorio en altas nuevas; opcional en históricos | Catálogo `channel`. |
| `priority` | string | Obligatorio | `Alta`, `Media` o `Baja`; congelada desde `Resuelto`. |
| `status` | string | Obligatorio | `Nuevo`, `En proceso`, `En espera`, `Resuelto` o `Cerrado`. |
| `assignee` | string \| null | Opcional | Técnico del catálogo; “Sin asignar” cuando falta. |
| `team` | string \| null | Opcional | Equipo o cola del catálogo; “Sin asignar” cuando falta. |
| `slaDueAt` | string ISO 8601 | Derivado | Calculado desde `createdAt` y `priority`; nunca editado a mano. Se puede materializar al guardar. |
| `firstResponseAt` | string ISO 8601 \| null | Generado | Se asigna al abandonar `Nuevo` por primera vez; no editable. |
| `resolutionSummary` | string \| null | Condicional | Obligatorio para resolver un ticket nuevo; no puede contener solo espacios. |
| `resolvedAt` | string ISO 8601 \| null | Generado | Lo asigna el sistema al resolver; inmutable después. |
| `closedAt` | string ISO 8601 \| null | Generado | Lo asigna el sistema al cerrar; inmutable. |
| `satisfactionScore` | integer 1–5 \| null | Opcional | Solo se registra al resolver o en estado `Resuelto`, una sola vez; no se reemplaza ni se elimina. |
| `satisfactionComment` | string \| null | Opcional | Hasta 500 caracteres; texto seguro. |
| `history` | array de eventos | Obligatorio | Append-only; todo ticket del esquema 4 tiene al menos una entrada. Se detalla abajo. |
| `legacyResolutionIncomplete` | boolean | Solo migración | Ya existe; marca tickets resueltos históricos sin resumen o fecha verificable. No editable. |
| `createdAt` | string ISO 8601 | Obligatorio, generado | Se conserva y es la base del SLA. |
| `updatedAt` | string ISO 8601 | Obligatorio, generado | Se actualiza en cada escritura. |

### Evento de historial

```text
TicketHistoryEvent {
  id,          // string único y estable dentro del ticket
  at,          // ISO 8601, generado por el sistema
  type,        // creacion | estado | prioridad | asignacion | equipo |
               // resolucion | cierre | satisfaccion | migracion
  field,       // opcional: campo afectado cuando corresponde
  from,        // opcional: valor anterior serializable
  to,          // opcional: valor nuevo serializable
  note,        // opcional: detalle legible (por ejemplo, motivo de espera)
  actor        // opcional: técnico del catálogo o "Sistema"
}
```

Reglas: se agrega al final; no se edita ni se elimina; no se guarda en una colección separada; el orden de la interfaz es descendente por `at` y desempata por el orden de inserción.

### Catálogos nuevos en `ModuleConfig`

| Catálogo | Valores iniciales |
|---|---|
| `channel` | `Teléfono`, `Correo`, `WhatsApp`, `Presencial`, `Portal` |
| `assignee` | `Técnico A`, `Técnico B`, `Técnico C` |
| `team` | `Soporte técnico`, `Terreno`, `Repuestos` |
| `reason` | `soporte`, `reclamo`, `consulta` (vigente) |
| `priority` | `Alta`, `Media`, `Baja` (vigente) |

Los catálogos son estáticos y de demostración. No representan usuarios autenticados ni turnos reales.

### Migración a `SCHEMA_VERSION = 4`

La migración es **explícita, aditiva y reversible mediante respaldo**. No se ejecuta al detectar la versión: se describe, se pide confirmación y se conserva una copia recuperable antes de escribir.

**Pasos propuestos**:

1. Leer la instantánea `v3` completa: clientes, oportunidades, tickets, contactos, actividades, papelera y marcador de recuperación.
2. Crear un respaldo recuperable en `erp_base_module:crmBackup:v3` con el JSON íntegro y metadatos `{ createdAt, schemaVersion: 3, collections }`. Si no hay espacio, abortar antes de modificar nada.
3. Ordenar los tickets históricos por `createdAt` ascendente y año local, y asignar `folio` con el correlativo anual que corresponda. La asignación es determinista y se documenta; no se inventan fechas.
4. Completar `subject` con la descripción recortada a 120 caracteres cuando falte. No se inventa un asunto nuevo: se copia el texto existente.
5. Dejar vacíos `contactId`, `requesterName`, `requesterEmail`, `requesterPhone`, `channel`, `assignee`, `team`, `warrantyEndsAt`, `documentId`, `closedAt`, `satisfactionScore` y `satisfactionComment` cuando no existan. La interfaz muestra “no registrado” o “sin asignar”.
6. Calcular `slaDueAt` desde `createdAt` y `priority` cuando ambos sean válidos; no se altera `createdAt`.
7. Mantener `status` y `resolutionSummary` sin cambios. Si un ticket `Resuelto` no tiene resumen o `resolvedAt` verificable, se marca `legacyResolutionIncomplete = true`, como ya ocurre en la migración vigente.
8. Agregar a cada ticket una entrada `migracion` con la fecha real de la migración y una nota que indique que los datos anteriores no fueron reconstruidos.
9. No crear `firstResponseAt` para históricos: no se puede inferir con certeza.
10. Confirmar la escritura completa y actualizar `erp_base_module:schemaVersion` a 4 solo después de verificar el conjunto.

**Garantías**:

- Cancelar la migración conserva la versión 3 y no habilita escrituras incompatibles.
- El respaldo no se borra automáticamente; se documenta cómo recuperarlo.
- Los tickets migrados no reciben soluciones, fechas de cierre, técnicos, canales ni notas de satisfacción inventados.
- Los tickets abiertos migrados pueden aparecer `Vencido` porque su fecha de creación es real y el SLA se calcula con ella; esto es un resultado veraz, no un error.
- La migración no modifica clientes, oportunidades, contactos, actividades ni papelera, salvo el marcador de versión.

## Entidades clave de la iteración

- **Ticket**: unidad de trabajo de post-venta. Conserva su identidad (`id`), pertenece a un cliente (`entity_id`) y concentra folio, asunto, solicitante, clasificación, responsable, ciclo de vida, SLA derivado, resolución, cierre, satisfacción e historial. Es la única entidad persistida que se amplía; no se crea una colección nueva para el historial.
- **Evento de historial**: valor embebido dentro del ticket, sin identidad global ni ciclo de vida propio. Registra un cambio con fecha, tipo, campo, valores anterior y nuevo, nota y actor. No se edita ni se elimina por separado.
- **Cliente**: entidad existente de la que depende el ticket. No se modifica su estructura; solo se valida su existencia y se conserva la relación en la papelera.
- **Contacto**: entidad existente que puede actuar como solicitante. El ticket guarda su identificador y una copia de respaldo de los datos de contacto.
- **Documento (oportunidad o venta de origen)**: entidad existente que puede vincularse mediante `documentId`; debe pertenecer al mismo cliente. No se crea un módulo de ventas ni de facturación.
- **Producto**: referencia externa opcional (`productId` o `productName`). No se implementa un catálogo de productos ni de inventario.
- **Catálogos de configuración**: canal, técnico y equipo son listas estáticas de `ModuleConfig`; no son entidades transaccionales ni representan usuarios autenticados.
- **Respaldo de migración**: artefacto de recuperación con la instantánea v3, no una entidad de negocio ni una colección consultable desde la interfaz.

## Requisitos de interfaz

- **Navegación**: nueva entrada “Tickets” en la barra lateral, con icono, nombre accesible y resaltado de la vista activa (`aria-current="page"`). La ruta es estable (`#/tickets`) y un enlace directo inválido cae en una vista válida.
- **Bandeja**: tabla densa con folio, asunto, cliente, solicitante, canal, técnico, prioridad, estado y SLA. En pantallas estrechas se priorizan folio, asunto, estado y SLA, sin perder el acceso al detalle.
- **Acciones**: “Nuevo ticket” visible en la cabecera de la bandeja; “Editar”, “Asignar”, “Cambiar estado”, “Resolver”, “Cerrar” y “Eliminar” en el detalle, según el estado.
- **Filtros**: estado, prioridad y técnico, cada uno con opción “Todos”; botón “Limpiar filtros”; el orden por prioridad y SLA es el predeterminado y se puede cambiar a “Vencimiento SLA” o “Más reciente”.
- **Drawer único**: el alta y la edición reutilizan el drawer y `src/components/ticket-form.js`; no se crea un formulario paralelo. El detalle puede ser un drawer de solo lectura con acciones, sin duplicar la edición.
- **Detalle**: folio, asunto, estado, prioridad, SLA, cliente, solicitante, canal, técnico, equipo, producto, referencia del equipo, garantía, vínculo de origen, descripción, primera respuesta, resolución, satisfacción e historial.
- **Ficha del cliente**: la lista existente de tickets se conserva y cada fila enlaza al detalle global; no se elimina la vista actual.
- **Estados vacíos**: “No hay tickets registrados” con acción de alta; “No hay tickets que coincidan con los filtros” con acción de limpieza; “Sin historial registrado”; “Sin satisfacción registrada”; “Sin datos” en indicadores sin denominador.
- **Accesibilidad**: foco visible, etiquetas asociadas, navegación completa con teclado, cierre de drawer con `Escape`, foco devuelto al control de origen, mensajes de error anunciados y semáforo con texto e icono además del color. Objetivo WCAG 2.1 AA.
- **Textos**: toda la interfaz en español, con la terminología “ticket” y “tickets”, y renderizado de textos como contenido seguro, sin ejecutar HTML ni scripts.
- **Confirmaciones**: la eliminación y el cierre usan diálogos existentes, con foco atrapado y acciones explícitas; cancelar no modifica nada.

## Requisitos funcionales

- **FR-046**: El sistema DEBE ofrecer una vista global “Tickets” con ruta propia, entrada en la navegación y lista de todos los tickets de todos los clientes.
- **FR-047**: El sistema DEBE mostrar en la bandeja folio, asunto, cliente, solicitante, canal, técnico, prioridad, estado y semáforo de SLA, con estados vacíos diferenciados para “sin tickets” y “sin coincidencias”.
- **FR-048**: El sistema DEBE permitir crear un ticket desde la bandeja reutilizando el drawer existente y seleccionando un cliente existente.
- **FR-049**: El sistema DEBE filtrar por estado, prioridad y técnico con lógica AND y ofrecer una acción para limpiar los filtros.
- **FR-050**: El sistema DEBE ordenar por prioridad (`Alta`, `Media`, `Baja`), luego por vencimiento de SLA ascendente y finalmente por `createdAt` y `folio`, con un orden estable.
- **FR-051**: El sistema DEBE generar un folio único e inmutable `TKT-AAAA-####` y rechazar cualquier intento de modificarlo o duplicarlo.
- **FR-052**: El sistema DEBE exigir asunto y descripción no vacíos, recortar el asunto y limitarlo a 120 caracteres.
- **FR-053**: El sistema DEBE permitir un contacto solicitante opcional del mismo cliente y conservar una copia de respaldo de nombre, correo y teléfono.
- **FR-054**: El sistema DEBE validar `channel` contra el catálogo `channel` y exigirlo en tickets nuevos; en históricos sin canal, la interfaz debe indicar “Canal no registrado”.
- **FR-055**: El sistema DEBE validar `assignee` y `team` contra sus catálogos, permitir dejarlos sin asignar y registrar cada reasignación en el historial.
- **FR-056**: El sistema DEBE crear los tickets nuevos en estado `Nuevo` y admitir los estados `Nuevo`, `En proceso`, `En espera`, `Resuelto` y `Cerrado`.
- **FR-057**: El sistema DEBE validar las transiciones de estado con una función pura compartida por la interfaz y el almacenamiento, rechazando cualquier transición no declarada.
- **FR-058**: El sistema DEBE permitir `En espera` con una nota opcional, mantener el SLA corriendo y permitir reanudar a `En proceso`.
- **FR-059**: El sistema DEBE exigir un resumen de solución no vacío al resolver, generar `resolvedAt` y guardar estado, resumen y fecha en una sola operación atómica.
- **FR-060**: El sistema DEBE generar `closedAt` al cerrar y tratar `Cerrado` como estado terminal y de solo lectura.
- **FR-061**: El sistema NO DEBE permitir que un ticket `Resuelto` vuelva a `Nuevo`, `En proceso` o `En espera`; solo puede avanzar a `Cerrado`.
- **FR-062**: El sistema DEBE calcular el SLA desde `createdAt` y la prioridad con los objetivos Alta 24 h, Media 72 h y Baja 168 h, y mostrar `En plazo`, `Por vencer` o `Vencido` sin persistir el semáforo como total derivado.
- **FR-063**: El sistema DEBE generar `firstResponseAt` la primera vez que un ticket abandona `Nuevo`, sin permitir su edición manual.
- **FR-064**: El sistema DEBE mantener un historial embebido, append-only y atómico de cambios de estado, prioridad, técnico, equipo, resolución, cierre y satisfacción, con fecha, actor y valores anterior y nuevo cuando corresponda.
- **FR-065**: El sistema DEBE mostrar el historial en el detalle del ticket en orden cronológico descendente y conservarlo tras recargar.
- **FR-066**: El sistema DEBE mostrar en el panel los indicadores de tickets abiertos, vencidos de SLA, distribución por prioridad, tiempo medio de resolución, cumplimiento de SLA y satisfacción promedio, recalculados en cada render.
- **FR-067**: El sistema DEBE permitir registrar una satisfacción entera de 1 a 5 y un comentario opcional de hasta 500 caracteres al resolver o mientras el ticket está `Resuelto`; la nota se registra una sola vez por ticket y un segundo registro se rechaza sin reescribir la medición. El sistema DEBE mostrar el promedio de las notas válidas.
- **FR-068**: El sistema DEBE eliminar un ticket individual solo con confirmación explícita, sin eliminar al cliente ni sus otras relaciones, y sin dejar historial huérfano.
- **FR-069**: El sistema DEBE aceptar `warrantyEndsAt` como fecha de calendario opcional y mostrar si el equipo está en garantía, fuera de garantía o sin garantía registrada.
- **FR-070**: El sistema DEBE aceptar `documentId` opcional, validar que el documento exista y pertenezca al cliente, y conservar la referencia si el documento se elimina después.
- **FR-071**: El sistema DEBE migrar de `SCHEMA_VERSION = 3` a `4` de forma explícita, aditiva y con respaldo recuperable, sin inventar solución, cierre, técnico, canal ni satisfacción en tickets históricos.
- **FR-072**: El sistema DEBE conservar la atomicidad de la instantánea: un cambio de ticket, su historial y su versión se confirman completos o no se confirman, sin mostrar éxito falso.
- **FR-073**: El sistema DEBE reutilizar el drawer, la tabla, los badges, los diálogos y el sistema visual existentes; los textos de interfaz deben estar en español y los datos ingresados deben mostrarse como texto seguro.
- **FR-074**: El sistema DEBE mantener la bandeja usable con teclado, con foco visible, etiquetas accesibles y semáforos que no dependan solo del color.
- **FR-075**: El sistema DEBE mantener el rendimiento de la bandeja con 1000 tickets, actualizando filtros y orden en menos de 500 ms en al menos 19 de 20 mediciones.
- **FR-076**: El sistema NO DEBE modificar clientes, oportunidades, contactos, actividades ni papelera, salvo las referencias necesarias del ticket y la migración de versión.
- **FR-077**: El sistema DEBE mantener en verde la suite existente y agregar cobertura unitaria e integración para folio, transiciones, SLA, historial, indicadores, satisfacción, migración y bandeja; las pruebas que fijaban el ciclo anterior se actualizan de forma justificada sin reducir la cobertura de las demás historias.

## Requisitos no funcionales adicionales

- **NFR-010 Accesibilidad**: la bandeja, el formulario, el detalle y los diálogos deben operarse con teclado, con foco visible, etiquetas asociadas, errores anunciados y contraste WCAG 2.1 AA. El semáforo debe incluir texto e icono.
- **NFR-011 Rendimiento**: con 1000 tickets, abrir la bandeja, filtrar, ordenar y recalcular los indicadores debe completarse sin bloquear la interfaz; la meta verificable es la de FR-075.
- **NFR-012 Integridad**: las transiciones, la resolución, el cierre, la reasignación, la satisfacción y el historial deben escribirse en una sola instantánea. Un fallo no debe dejar el ticket a medio actualizar.
- **NFR-013 Migración y recuperación**: la migración a v4 debe ser visible, confirmada y respaldada; un fallo o cancelación debe conservar la versión anterior íntegra.
- **NFR-014 Privacidad y minimización**: solo se guardan los datos de contacto necesarios para atender el ticket; no se agregan datos bancarios, credenciales ni adjuntos. El comentario de satisfacción se muestra como texto seguro y no se exporta.
- **NFR-015 Compatibilidad**: navegadores modernos de escritorio y móvil, como mínimo Chrome y Firefox actuales. Registrar los navegadores realmente probados.

## Casos límite

- **Sin clientes**: bloquear el alta de tickets y ofrecer crear un cliente; no permitir tickets huérfanos.
- **Contacto eliminado o de otro cliente**: rechazar la selección al guardar y pedir un contacto válido o usar los datos de respaldo.
- **Técnico, equipo o canal fuera del catálogo**: rechazar valores nuevos; si el valor ya estaba persistido y luego se retira del catálogo, conservarlo y advertir, sin reescribirlo en silencio.
- **Folio duplicado o agotado**: rechazar la escritura y verificar la unicidad contra todos los tickets existentes. Al superar 9999 en un año, informar el límite.
- **Doble envío o dos pestañas**: impedir tickets duplicados y bloquear el guardado obsoleto; no prometer concurrencia transaccional.
- **Cambio de año**: el correlativo se reinicia por año local y se calcula con el `createdAt` del nuevo ticket.
- **Ticket histórico sin folio, asunto o resolución**: la migración asigna folio y copia el asunto desde la descripción; no inventa solución, cierre, técnico, canal ni satisfacción.
- **Ticket histórico abierto y antiguo**: aparece vencido porque su fecha es real; se documenta como resultado esperado.
- **Prioridad cambiada después de resolver**: se rechaza para no alterar la medición de SLA.
- **Resolución sin resumen**: se rechaza y se conserva lo escrito.
- **Cierre de un ticket ya cerrado**: se rechaza sin efectos.
- **Satisfacción fuera de rango o posterior al cierre**: se rechaza.
- **Documento de origen eliminado**: conservar `documentId` y mostrar “Venta de origen no disponible”; no borrar el ticket.
- **Garantía vencida o futura**: mostrar el estado correspondiente; no bloquear la atención.
- **Eliminación de un ticket**: confirmar, borrar solo el ticket y su historial; el cliente, sus oportunidades, contactos y actividades permanecen.
- **Almacenamiento lleno, JSON corrupto o cuota agotada**: informar un error recuperable, conservar la versión anterior y no mostrar éxito.
- **Configuración modificada**: preservar valores desconocidos ya guardados y exigir una nueva selección al editar.
- **Enlace directo o botón Atrás**: restaurar una vista válida; si la ruta de tickets no es válida, usar el respaldo definido por el shell.
- **Historial extenso**: el detalle debe seguir siendo legible; no se exige paginación visible, pero el rendimiento no debe degradarse.
- **Datos personales en descripción o comentarios**: se muestran como texto seguro; no se usan para clasificar ni priorizar automáticamente.

## Indicadores de la iteración

Las fórmulas son descriptivas y se calculan en el render; no se persisten agregados.

| Indicador | Fórmula | Sin datos |
|---|---|---|
| Tickets abiertos | Conteo de tickets con estado `Nuevo`, `En proceso` o `En espera`. | `0` |
| Tickets vencidos de SLA | Conteo de tickets abiertos cuyo `slaDueAt` es anterior o igual al instante actual. | `0` |
| Tickets por prioridad | Conteo de tickets abiertos agrupados por `Alta`, `Media` y `Baja`; se muestran los tres valores, incluidos los ceros. | Tres valores en `0` |
| Tiempo medio de resolución | Promedio de `(resolvedAt - createdAt)` en horas sobre tickets con ambas fechas válidas; una cifra decimal. | “Sin datos” |
| Cumplimiento de SLA | `resueltos dentro del objetivo / resueltos con SLA calculable × 100`; una cifra decimal. | “Sin datos” |
| Satisfacción promedio | Promedio de `satisfactionScore` válidos (1–5); una cifra decimal. | “Sin datos” |

Reglas de cálculo:

- Un ticket `Resuelto` o `Cerrado` no cuenta como abierto ni como vencido abierto.
- El cumplimiento usa el objetivo vigente al momento de resolver y no se recalcula por cambios posteriores de prioridad, que están prohibidos.
- Las fechas inválidas o ausentes se excluyen y se informan como “Sin datos”; no se imputan valores.
- Los indicadores comerciales existentes se conservan y se calculan con sus fórmulas vigentes.

## Criterios de éxito

Son metas de aceptación pendientes de medir, no resultados obtenidos. No se inventan participantes ni mediciones.

| ID | Meta | Verificación |
|---|---|---|
| SC-016 | Crear y clasificar un ticket desde la bandeja global en menos de 2 minutos, con datos conocidos | Recorrido con cliente y catálogos precargados |
| SC-017 | 100% de los tickets nuevos tienen folio válido y único; 0 folios editados o duplicados | Pruebas de dominio, persistencia e integración |
| SC-018 | 0 transiciones inválidas aceptadas por la interfaz o el almacenamiento | Pruebas de la máquina de estados |
| SC-019 | 100% de los tickets resueltos con reglas v4 tienen resumen no vacío y `resolvedAt` generado; los tickets históricos marcados `legacyResolutionIncomplete` quedan fuera de esta meta | Pruebas de resolución y persistencia, incluido un ticket migrado `Resuelto` sin resumen |
| SC-020 | 100% de los cambios auditados generan su entrada de historial en la misma escritura; 0 entradas parciales | Pruebas unitarias e integración con fallo simulado |
| SC-021 | Los indicadores de soporte coinciden exactamente con la muestra de control y no producen división por cero | Cálculo manual contra el panel con fixture |
| SC-022 | 100% de los tickets con satisfacción válida se promedian correctamente; notas fuera de rango rechazadas | Pruebas de validación y panel |
| SC-023 | Los datos del ticket, su historial, SLA y satisfacción permanecen tras navegar y recargar el mismo navegador | Prueba de integración |
| SC-024 | La migración v3 → v4 conserva el 100% de los registros, asigna folio sin inventar resolución y deja un respaldo recuperable | Prueba de migración y restauración |
| SC-025 | Cero regresiones funcionales en clientes, oportunidades, contactos, actividades, búsqueda, panel y papelera | Suite completa y recorrido de humo |
| SC-026 | Un usuario completa el recorrido crear → espera → resolver → cerrar → consultar historial y satisfacción usando solo teclado | Prueba de accesibilidad |
| SC-027 | La bandeja responde en menos de 500 ms en al menos 19 de 20 mediciones con 1000 tickets | Prueba de rendimiento con navegador y equipo registrados |

## Suposiciones

- Una sola organización, un solo navegador y moneda CLP. Se usa la fecha y hora local del dispositivo.
- El técnico asignado y el equipo son etiquetas de demostración; no representan cuentas autenticadas ni permisos.
- Un ticket tiene como máximo un técnico asignado en esta iteración. La reasignación reemplaza al anterior y queda en el historial.
- El equipo/cola es una etiqueta organizativa; no hay reparto automático ni límite de carga.
- El canal registra el origen del caso; no hay ingesta real de correo, WhatsApp, llamadas ni portal.
- La satisfacción es opcional porque el cliente puede no responder; el promedio solo considera notas registradas.
- El SLA corre de forma continua, sin pausas por `En espera`, horarios laborales, fines de semana ni feriados.
- El folio usa el año local de `createdAt` y un correlativo anual de cuatro dígitos. Si se agota, el alta se rechaza.
- La migración asigna folio a los históricos y copia el asunto desde la descripción; cualquier otro dato ausente queda vacío y visible como no registrado.
- Los tickets abiertos migrados pueden aparecer vencidos; es un resultado veraz del SLA calculado con su fecha real.
- `Resuelto` permite editar campos descriptivos, pero no prioridad, solución, fechas ni satisfacción; `Cerrado` es de solo lectura.
- La eliminación de un ticket es definitiva y no usa la papelera de clientes. La papelera existente no se amplía en esta iteración.
- Los datos viven en `localStorage`: no hay control de acceso ni respaldo empresarial. Antes de un uso real se necesitarían autenticación, permisos, backend seguro, respaldo y política de retención.
- Los indicadores son descriptivos; no se usan para elaborar un ranking de técnicos ni para inferir causalidad.

## Trabajo futuro

- Ingesta real de correo, WhatsApp, llamadas o portal de cliente.
- Notificaciones y recordatorios de SLA.
- Calendarios laborales, pausas de SLA y feriados.
- Asignación automática por carga, especialidad o turno.
- Adjuntos y evidencias fotográficas con almacenamiento adecuado.
- Base de conocimiento, macros y respuestas sugeridas.
- Tickets padre-hijo, fusión de duplicados y vínculos entre casos.
- Módulo Producto, Inventario, Facturación y Field Service.
- Permisos por rol, autenticación y multiusuario.
- Exportación, reportes descargables y respaldos administrados.
- Encuestas de satisfacción enviadas al cliente y seguimiento de no respuesta.

## Anexo técnico

Esta sección satisface la exigencia del curso de incluir la parte técnica sin contaminar los criterios funcionales. Los criterios de aceptación siguen siendo la fuente de verdad para QA.

### Archivos y responsabilidades

| Archivo | Cambio esperado |
|---|---|
| `src/module-config.js` | Catálogos `channel`, `assignee` y `team`; constantes exportadas y etiquetas si corresponde. Mantener `priority` y `reason`. |
| `src/crm-rules.js` | `TICKET_STATUSES` ampliado, `TICKET_TRANSITIONS`, `canTransitionTicket`, `nextTicketStatuses`, `validateTicket` ampliado, `validateTicketStatusChange`, `computeSlaDueAt`, `getSlaStatus`, `formatTicketFolio`, `nextTicketFolio`, `appendTicketHistory`, `resolveTicketRecord`, `closeTicketRecord`, `validateSatisfaction`, `validateWarrantyDate`. |
| `src/crm-metrics.js` | `countOpenTickets`, `countOverdueTickets`, `ticketPriorityDistribution`, `averageResolutionHours`, `slaCompliance`, `averageSatisfaction`. |
| `src/storage.js` | `SCHEMA_VERSION = 4`; `buildTicket` ampliado; `addTicket` genera folio y estado `Nuevo`; `updateTicket` valida transiciones e historial; `assignTicket`, `changeTicketStatus`, `resolveTicket`, `closeTicket`, `deleteTicket`; migración v3 → v4 con respaldo. |
| `src/storage-recovery.js` | Registrar el marcador de versión y la clave de respaldo de migración dentro del mecanismo de recuperación existente, sin alterar su contrato. |
| `src/crm-timeline.js` | Mostrar folio y asunto del ticket y aceptar los nuevos estados; conservar el comportamiento del timeline sin agregar eventos de sistema. |
| `src/components/ticket-form.js` | Campos nuevos, validación compartida, resolución y satisfacción en el drawer existente. |
| `src/components/ticket-list.js` | Modo global con columnas, filtros, orden y acciones; conservar el modo embebido en la ficha del cliente. |
| `src/components/ticket-detail.js` | Nuevo detalle de solo lectura con resolución, satisfacción e historial y acciones por estado. |
| `src/components/dashboard.js` | Tarjetas de soporte y promedio CSAT sin eliminar las existentes. |
| `src/components/data-table.js` | Reutilización para la bandeja; sin cambios de contrato salvo los necesarios. |
| `src/app.js` | `VIEW_IDS.tickets`, ruta `#/tickets`, estado de filtros y orden, handlers de alta/detalle/acciones y enlace desde la ficha del cliente. |
| `index.html` | Entrada de navegación “Tickets”, contenedor de la vista y controles accesibles. |
| `src/styles.css` | Estilos de semáforo, badges de estado, tabla densa y detalle, con contraste suficiente. |

### Persistencia y contrato

- Claves existentes: `erp_base_module:entities`, `erp_base_module:documents`, `erp_base_module:tickets`, `erp_base_module:crmContacts`, `erp_base_module:crmActivities`, `erp_base_module:crmTrash`, `erp_base_module:crmRecovery` y `erp_base_module:schemaVersion`.
- Nueva clave de respaldo de migración: `erp_base_module:crmBackup:v3`.
- Operaciones nuevas o ampliadas: `addTicket`, `updateTicket`, `assignTicket`, `changeTicketStatus`, `resolveTicket`, `closeTicket`, `deleteTicket`, `loadMigrationBackup`, `restoreMigrationBackup` (recuperación explícita) y las consultas existentes.
- Toda escritura usa `saveSnapshot` y la verificación de recuperación vigente. El historial se agrega antes de guardar y forma parte de la misma instantánea.
- El contrato `specs/001-crm-module/contracts/entity-storage.md` debe documentar las nuevas operaciones, la forma del evento de historial y el protocolo de respaldo/restauración.

### Pruebas propuestas

- **Unitarias**: ampliar `tests/unit/ticket-rules.test.js` y `tests/unit/ticket-resolution.test.js`; agregar `tests/unit/ticket-lifecycle.test.js`, `tests/unit/ticket-sla.test.js`, `tests/unit/ticket-history.test.js`, `tests/unit/ticket-folio.test.js`, `tests/unit/ticket-metrics.test.js` y `tests/unit/ticket-satisfaction.test.js`.
- **Integración**: ampliar `tests/integration/tickets.test.js`; agregar `tests/integration/tickets-inbox.test.js`, `tests/integration/ticket-lifecycle-ui.test.js`, `tests/integration/ticket-migration-v4.test.js`, `tests/integration/ticket-satisfaction.test.js` y `tests/integration/dashboard-tickets.test.js`.
- **Accesibilidad y rendimiento**: ampliar `tests/integration/accessibility.test.js` con la bandeja y el detalle; agregar el caso de 1000 tickets al presupuesto de rendimiento existente.
- **Integridad**: `validateIntegrity` y las comprobaciones de almacenamiento deben aceptar los cinco estados nuevos y las referencias opcionales, sin marcar como inválidos los tickets migrados. La validación de transiciones compara con el estado anterior y no reconstruye historiales.
- **Regresión**: adaptar las pruebas que fijan el ciclo anterior y mantener verdes las historias US-01 a US-16. Registrar la actualización en el README.

### Comandos de verificación

```text
npm test -- --run
npm run lint
npm run format:check
npm run build
```

Registrar en el README la fecha, el comando, el número de archivos y pruebas, y el resultado real. No declarar pruebas no ejecutadas.

### Documentación a actualizar

- `specs/001-crm-module/spec.md`: referencia a esta iteración, ampliación de FR-025/FR-026 y nota de esquema v4.
- `specs/001-crm-module/data-model.md`: campos nuevos, evento de historial, catálogos, fórmulas y migración v4.
- `specs/001-crm-module/tasks.md`: fase de tickets de post-venta, con tareas y criterios de evidencia.
- `specs/001-crm-module/contracts/entity-storage.md`: operaciones, atomicidad, respaldo y recuperación.
- `README.md`: alcance, pasos de demostración, evidencias ejecutadas y uso de IA.
- `specs/001-crm-module/quickstart.md`: recorrido manual de la bandeja, SLA, historial y satisfacción.

## Definición de terminado

- [ ] La bandeja global permite crear un ticket y muestra folio, asunto, cliente, solicitante, canal y técnico.
- [ ] El ciclo `Nuevo → En proceso → En espera → En proceso → Resuelto → Cerrado` funciona y rechaza saltos y reaperturas.
- [ ] El SLA se calcula por prioridad, muestra el semáforo y se congela al resolver.
- [ ] El historial registra los cambios indicados y se guarda en la misma operación atómica.
- [ ] El panel muestra los seis indicadores de soporte y conserva los seis comerciales.
- [ ] La satisfacción de 1 a 5 se registra, se valida y se promedia.
- [ ] La eliminación individual confirma, borra solo el ticket y conserva al cliente.
- [ ] La migración a `SCHEMA_VERSION = 4` es explícita, aditiva, con respaldo y sin datos inventados.
- [ ] `spec.md`, `data-model.md`, `tasks.md`, `contracts/entity-storage.md`, `quickstart.md` y `README.md` describen las mismas entidades, reglas y evidencia.
- [ ] `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build` se ejecutan y sus resultados reales quedan registrados.
- [ ] No se reduce la cobertura ni se rompe ninguna prueba de las historias US-01 a US-16; las pruebas que fijaban el ciclo anterior se actualizan de forma justificada y la suite completa queda en verde.
