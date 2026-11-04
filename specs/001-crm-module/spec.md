# Especificación de la funcionalidad: Módulo CRM

**Rama de la funcionalidad**: `main` (sin ramas secundarias, según la instrucción del curso)
**Creada**: 2026-10-26
**Actualizada**: 2026-11-04
**Estado**: En revisión
**Entrada**: Descripción del usuario: "La empresa vende equipos industriales a otras empresas de la Región del Biobío y pierde ventas porque no tiene un registro ordenado de sus clientes ni de las cotizaciones que manda. Se necesita un módulo CRM para guardar los clientes, seguir las oportunidades de venta y anotar los tickets de soporte después de la venta."

> **Nota de consolidación**: este archivo reemplaza a `specs.md`. Las historias, requisitos y criterios de éxito que estaban en `specs.md` se fusionaron aquí para mantener una sola especificación. `specs.md` queda reemplazado por este documento.

## Propósito

El módulo tiene que resolver un problema bien concreto: hoy las cotizaciones quedan repartidas entre correos y planillas, y nadie sabe en qué quedó cada una. Con el CRM el ejecutivo de ventas guarda los datos de sus clientes, va anotando las oportunidades con su monto y su etapa, y el técnico de soporte deja registradas las fallas de cada máquina. Así todo queda en el mismo lugar y siempre asociado a un cliente.

## Alcance y decisiones de alcance

- **MVP de la primera versión integrada (iteración 1, P1)**: clientes, oportunidades, búsqueda, ciclo de vida, terminología y persistencia local.
- **Segunda iteración (P2)**: tickets de soporte (US-03) y panel con indicadores (US-07), que igual quedan especificados aquí y en `data-model.md` para no dejarlos a medias.
- **Fuera del MVP**: envío de correos o WhatsApp, automatizaciones externas, campañas, agenda con alarmas, registro estructurado de cada interacción, cotizaciones con partidas, facturación, predicción de ventas, sincronización entre computadores y acceso simultáneo.
- **Solo frontend**: los datos viven en `localStorage` del mismo navegador. No hay backend, autenticación ni permisos reales.
- **Datos sintéticos**: la demo usa únicamente empresas, contactos y oportunidades ficticios. No se afirma que el caso haya sido investigado ni validado con una empresa real.
- **Una oportunidad no es una factura ni un pedido**: el monto es una expectativa comercial, no un ingreso contable.

### Roles

- **Ejecutivo comercial** y **ejecutivo de ventas** designan el mismo rol operativo: registra clientes, oportunidades y seguimientos. En este documento se usa “ejecutivo” cuando el criterio aplica a ambos.
- **Jefe comercial** es el rol que consulta el panel y la cartera; no ejecuta el alta de registros en esta especificación.
- **Técnico de soporte** registra y resuelve tickets (P2).
- Los roles describen personas de diseño, no permisos de acceso: la demo no implementa autenticación ni restringe vistas. Por eso el panel ofrece accesos rápidos a “Nuevo cliente” y “Nueva oportunidad” sin validar el rol.

## Organización por integrante

Cada historia tiene un responsable de documentación y de implementación. Completar los nombres al iniciar la iteración; no se inventan integrantes.

| Historia | Tema | Prioridad | Iteración | Responsable | Requisitos | Criterios |
|---|---|---|---|---|---|---|
| US-01 | Registrar clientes y prospectos | P1 | 1 | `[integrante]` | FR-001…FR-007, FR-013, FR-031, FR-032 | CA-01-01…CA-01-14 |
| US-02 | Buscar clientes y consultar su ficha | P1 | 1 | `[integrante]` | FR-008…FR-012, FR-035 | CA-02-01…CA-02-17 |
| US-03 | Registrar tickets de soporte | P2 | 2 | `[integrante]` | FR-025, FR-026 | CA-03-01…CA-03-08 |
| US-04 | Registrar una oportunidad comercial | P1 | 1 | `[integrante]` | FR-014…FR-019 | CA-04-01…CA-04-14 |
| US-05 | Gestionar oportunidades y ciclo de vida | P1 | 1 | `[integrante]` | FR-020…FR-023 | CA-05-01…CA-05-11 |
| US-06 | Usar terminología comercial consistente | P1 | 1 | `[integrante]` | FR-029, FR-030, FR-036 | CA-06-01…CA-06-12 |
| US-07 | Consultar el panel CRM | P2 | 2 | `[transversal]` | FR-024 | CA-07-01…CA-07-08 |
| Transversal | Privacidad, persistencia, seguridad, rendimiento y accesibilidad | P1 | 1–2 | `[transversal]` | FR-027, FR-028, FR-031…FR-036 | NFR-001…NFR-009 |

## Escenarios de usuario y pruebas

### Historia de Usuario 1 — Registrar clientes y prospectos (Prioridad: P1)

Como ejecutivo comercial, quiero registrar empresas clientes y prospectos con sus datos de identificación, clasificación, responsable comercial y contacto principal, cuando esté disponible, para centralizar la cartera y disponer de información organizada para el seguimiento comercial.

**Por qué esta prioridad**: el registro de clientes y prospectos constituye la base del módulo. Sin una empresa registrada no es posible vincular oportunidades comerciales ni organizar su seguimiento.

**Prueba independiente**: un usuario puede abrir la gestión de Clientes, registrar una empresa ficticia con nombre, código único, tipo, responsable y origen de captación, y encontrarla en la lista de clientes. Al recargar la aplicación en el mismo navegador, los datos permanecen disponibles y el cliente sigue en la lista. La búsqueda y la ficha se validan en US-02. Esta prueba puede realizarse sin crear oportunidades.

**Escenarios de aceptación**:

1. **CA-01-01** — Dado que el ejecutivo está en la gestión de clientes, cuando selecciona crear un nuevo cliente, entonces se muestra un formulario vacío con los campos obligatorios claramente identificados.
2. **CA-01-02** — Dado un formulario de nuevo cliente, cuando completa nombre de la empresa, código único, tipo, responsable comercial y origen de captación con valores válidos y guarda, entonces el sistema confirma la creación y la empresa aparece en la lista de clientes; la búsqueda y la consulta de la ficha se validan en US-02.
3. **CA-01-03** — Dado que se registra una empresa que aún no ha comprado, cuando el ejecutivo selecciona el tipo prospecto y guarda el formulario válido, entonces la empresa queda identificada como prospecto y disponible para vincular oportunidades.
4. **CA-01-04** — Dado que el ejecutivo dispone de información del contacto principal, cuando registra su nombre, un correo con formato válido y un teléfono, entonces esos datos quedan asociados a la empresa y se conservan al editarla.
5. **CA-01-05** — Dado que aún no se dispone de información del contacto principal, cuando el ejecutivo deja esos campos opcionales vacíos y completa los obligatorios, entonces el sistema permite guardar y conserva la información de contacto como incompleta para mostrarla en la ficha (US-02).
6. **CA-01-06** — Dado un formulario con uno o más campos obligatorios vacíos o compuestos únicamente por espacios, cuando el ejecutivo intenta guardar, entonces el sistema impide la creación, identifica los campos que debe completar y conserva los datos introducidos.
7. **CA-01-07** — Dado un cliente con código `CLI-001` ya registrado, cuando el ejecutivo intenta crear otro con el código `cli-001`, entonces el sistema rechaza el duplicado al comparar sin espacios al inicio o al final y sin distinguir mayúsculas de minúsculas, conserva el formulario y no altera el registro existente.
8. **CA-01-08** — Dado un correo informado con formato inválido o un valor de tipo, responsable u origen que no pertenece a las opciones configuradas, cuando el ejecutivo intenta guardar, entonces el sistema explica qué debe corregir y no crea el registro.
9. **CA-01-09** — Dado un cliente o prospecto guardado correctamente, cuando el ejecutivo cambia de pantalla y recarga la aplicación en el mismo navegador, entonces el registro conserva sus datos y continúa disponible en la lista de clientes.
10. **CA-01-10** — Dado que el almacenamiento del navegador no permite guardar el registro, cuando el ejecutivo intenta confirmar la creación, entonces el sistema informa que la operación no se completó, conserva los datos del formulario y no muestra una confirmación de éxito.
11. **CA-01-11** — Dado un cliente existente, cuando el ejecutivo modifica nombre, contacto, tipo, responsable u origen y guarda, entonces se conservan `id` y `entity_id`, se validan los mismos campos obligatorios y no se permite duplicar el código de otro cliente.
12. **CA-01-12** — Dado un cliente con oportunidades asociadas y, en P2, con tickets, cuando el ejecutivo solicita eliminarlo, entonces se informa cuántas oportunidades se eliminarán y, cuando la colección de tickets exista, cuántos tickets; se exige confirmación explícita y, si confirma, la eliminación del cliente y sus oportunidades es atómica en P1, y se extiende a los tickets en P2; si cancela, nada se modifica.
13. **CA-01-13** — Dado un cliente con `targetDate` vacía, anterior a hoy, igual a hoy o posterior, cuando se guarda, entonces la lista de clientes lo muestra respectivamente como “Sin programar”, “Vencido”, “Para hoy” o “Programado”, calculado con el día local del dispositivo y sin convertir la fecha a UTC.
14. **CA-01-14** — Dado que la configuración del módulo define los catálogos de tipo, responsable y origen, cuando el ejecutivo abre el formulario, entonces las opciones visibles provienen de `ModuleConfig` y cualquier valor ajeno se rechaza.

**Notas técnicas (implementación asistida por IA)**:

- Campos y tipos: ver `data-model.md`, entidad Cliente. Obligatorios: `name`, `code`, `category`, `accountOwner`, `acquisitionSource`. Opcionales: `email`, `phone`, `contactName`, `description`, `targetDate`. Generados: `id`, `entity_id`, `createdAt`, `updatedAt`.
- Persistencia: `src/storage.js` con `loadEntities`, `saveEntities`, `addEntity`, `updateEntity`, `deleteEntity`, `deleteDocumentsForEntity`, `deleteTicketsForEntity`; claves `erp_base_module:entities`, `erp_base_module:documents` y `erp_base_module:tickets`.
- Validación: `src/crm-rules.js` con `normalizeCode`, `validateClient`, `isValidEmail` y `isValidCatalogValue`. La validación se comparte entre formulario y almacenamiento.
- Interfaz: `src/components/entity-form.js`, `src/components/entity-list.js` y `src/components/search-bar.js`.
- Configuración: `src/module-config.js` con `labels`, `customFields`, catálogos y `theme`.
- Pruebas: `tests/unit/crm-rules.test.js`, `tests/unit/storage.test.js` y `tests/integration/create-edit-delete-client.test.js`.

---

### Historia de Usuario 2 — Buscar clientes y consultar su ficha (Prioridad: P1)

Como ejecutivo de ventas, quiero buscar un cliente por su nombre o código y consultar su ficha, para encontrar rápidamente la información necesaria antes de contactarlo.

La búsqueda se realiza con un único criterio que se compara tanto con el nombre como con el código del cliente o prospecto. Los resultados se actualizan automáticamente a medida que el ejecutivo escribe el criterio.

**Por qué esta prioridad**: la búsqueda y la consulta de la ficha permiten reutilizar los clientes ya registrados y acceder a su información sin recorrer manualmente la cartera.

**Prueba independiente**: con clientes previamente registrados, buscar por nombre completo, por una parte del nombre y por código; seleccionar un resultado y comprobar que se muestra su ficha. Verificar los mensajes de “sin criterio” y “sin coincidencias”, y confirmar que los datos almacenados no cambian.

**Escenarios de aceptación**:

1. **CA-02-01** — Dado que existen clientes registrados, cuando el ejecutivo busca por el nombre completo de uno de ellos, entonces el resultado incluye a ese cliente.
2. **CA-02-02** — Dado que existen clientes registrados, cuando el ejecutivo busca por una parte del nombre, entonces se muestran los clientes cuyos nombres contienen esa parte.
3. **CA-02-03** — Dado que existen clientes registrados, cuando el ejecutivo busca por el código completo de un cliente, entonces se muestra el cliente correspondiente.
4. **CA-02-04** — Dado que el ejecutivo introduce un criterio con mayúsculas o minúsculas distintas a las almacenadas, cuando busca, entonces la búsqueda devuelve las mismas coincidencias.
5. **CA-02-05** — Dado que varios clientes coinciden con el criterio, cuando el ejecutivo consulta los resultados, entonces se muestran todos los clientes coincidentes.
6. **CA-02-06** — Dado que la búsqueda produce coincidencias, cuando el ejecutivo selecciona un resultado, entonces se muestra la ficha del cliente con todos los datos registrados.
7. **CA-02-07** — Dado que la búsqueda no produce coincidencias, cuando el ejecutivo consulta los resultados, entonces se muestra un mensaje claro de que no hay coincidencias.
8. **CA-02-08** — Dado que el ejecutivo no ha ingresado ningún criterio, cuando abre la búsqueda, entonces se muestra un mensaje que indica que debe ingresar un criterio.
9. **CA-02-09** — Dado un cliente consultado, cuando el ejecutivo vuelve a la búsqueda o recarga la aplicación, entonces la información del cliente permanece sin cambios.
10. **CA-02-10** — Dado un cliente sin información de contacto principal, cuando el ejecutivo abre su ficha, entonces se muestra la información disponible sin bloquear la consulta.
11. **CA-02-11** — Dado un prospecto registrado, cuando el ejecutivo busca por su nombre o código, entonces el prospecto también aparece en los resultados y puede abrirse su ficha.
12. **CA-02-12** — Dado un cliente cuyo nombre contiene tildes o diéresis, cuando el ejecutivo busca escribiendo esas palabras sin tilde, entonces el cliente aparece entre los resultados.
13. **CA-02-13** — Dado un cliente con datos registrados, cuando el ejecutivo abre su ficha, entonces se muestran nombre, código, tipo, responsable comercial, origen de captación, correo, teléfono, contacto principal, descripción, próximo contacto y fecha de registro; los campos opcionales vacíos se indican como “sin información” y, si correo y teléfono están ambos vacíos, se muestra además “Contacto incompleto”.
14. **CA-02-14** — Dado un conjunto de resultados, cuando el ejecutivo combina el texto con filtros de tipo, responsable u origen, entonces los filtros se aplican con AND y se ofrece una acción para limpiarlos.
15. **CA-02-15** — Dado que el ejecutivo busca por asunto o folio de una oportunidad, cuando consulta el resultado, entonces se muestra en la sección de oportunidades con su cliente vinculado, distinguiéndolo de los resultados de clientes.
16. **CA-02-16** — Dado un cliente con oportunidades, cuando el ejecutivo abre su ficha, entonces ve la lista de oportunidades con asunto, etapa, monto, responsable y notas, sin editar desde la ficha.
17. **CA-02-17** — Dado que el ejecutivo usa solo teclado, cuando recorre la búsqueda, los resultados y la ficha, entonces puede alcanzar los controles, identificar el foco y leer los mensajes de estado.

**Notas técnicas (implementación asistida por IA)**:

- Búsqueda: una sola función `searchClients(criterion, filters)` en `src/crm-rules.js`, con normalización `trim → minúsculas → eliminación de diacríticos` para comparar nombre y código.
- Filtros: `category`, `accountOwner`, `acquisitionSource`; se combinan con AND. La búsqueda de oportunidades usa `opportunityTitle` y `folio` y devuelve el cliente asociado por `entity_id`.
- Interfaz: `src/components/search-bar.js`, `src/components/entity-list.js`, `src/components/document-list.js` y la vista de detalle.
- Estados: “Ingresa un criterio”, “Sin coincidencias”, “Sin información” y “Sin programar”.
- Pruebas: `tests/integration/search-clients.test.js` y un test de no mutación que compare el almacenamiento antes y después de buscar y consultar.

---

### Historia de Usuario 3 — Registrar tickets de soporte (Prioridad: P2)

Como técnico de soporte, quiero anotar un ticket asociado a un cliente y a un producto, para tener el historial de fallas y saber qué se le hizo a cada máquina.

**Por qué esta prioridad**: corresponde a la etapa de después de la venta. Aporta bastante, pero el módulo ya sirve con los clientes y las oportunidades. Se implementa en la segunda iteración.

**Prueba independiente**: se elige un cliente, se registra un ticket con su motivo y descripción, y aparece en la lista de tickets con su estado.

**Escenarios de aceptación**:

1. **CA-03-01** — Dado que el técnico está en la lista de tickets, cuando registra uno con cliente, producto, motivo (soporte, reclamo o consulta) y descripción, entonces el ticket se guarda y aparece con estado “En proceso”.
2. **CA-03-02** — Dado que el ticket está en proceso, cuando el técnico lo pasa a “Resuelto”, entonces se muestra como resuelto y la falla queda registrada.
3. **CA-03-03** — Dado que el técnico está registrando un ticket, cuando no elige un cliente, entonces el sistema no deja guardarlo.
4. **CA-03-04** — Dado que falta el producto, cuando el técnico intenta guardar, entonces el sistema no deja guardarlo y pide indicar a qué máquina se le hizo la mantención o cuál falló.
5. **CA-03-05** — Dado un ticket nuevo, cuando el técnico elige la prioridad, entonces solo puede seleccionar Alta, Media o Baja; cualquier otro valor se rechaza.
6. **CA-03-06** — Dado un cliente con tickets, cuando el técnico consulta su ficha, entonces se muestran los tickets asociados con motivo, prioridad, estado y fecha.
7. **CA-03-07** — Dado un ticket resuelto, cuando el técnico intenta volver a “En proceso”, entonces el MVP lo rechaza; editar descripción o prioridad conservando el estado sigue permitido.
8. **CA-03-08** — Dado un ticket guardado, cuando el técnico recarga la aplicación, entonces el ticket y su estado permanecen disponibles.

**Notas técnicas (implementación asistida por IA)**:

- Entidad `Ticket` en `data-model.md`: `id`, `entity_id`, `productId`, `productName`, `reason`, `description`, `priority`, `status`, `createdAt`, `updatedAt`.
- Producto es una referencia externa: se guarda `productId` cuando exista y un `productName` de respaldo para la demo; no se crea el módulo Producto.
- Prioridades: `Alta`, `Media`, `Baja`. Estados: `En proceso → Resuelto`; sin reapertura en el MVP.
- Interfaz: `src/components/ticket-form.js` y `src/components/ticket-list.js` (propuestos). Persistencia: `src/storage.js` con `loadTickets`, `saveTickets`, `addTicket` y `updateTicket`.
- Pruebas: `tests/unit/ticket-rules.test.js` y `tests/integration/tickets.test.js`.

---

### Historia de Usuario 4 — Registrar una oportunidad comercial (Prioridad: P1)

**Identificador**: US-04
**Actor principal**: Ejecutivo de ventas
**Módulo**: Customer Relationship Management (CRM)
**Estado**: En revisión; implementación y pruebas pendientes.

> **Como** ejecutivo de ventas, **quiero** registrar una oportunidad comercial asociada a un cliente, **para** hacer seguimiento de una posible venta de equipamiento industrial.

**Justificación de la prioridad P1**: registrar oportunidades es una función central del CRM. Sin ella no existe un registro sobre el cual consultar el avance de las negociaciones ni organizar las posibles ventas.

#### Alcance

Incluye abrir el formulario, seleccionar un cliente existente, ingresar y validar los datos, guardar la oportunidad y comprobar su disponibilidad posterior. El resultado es una oportunidad en estado **Nueva**, vinculada a un único cliente.

La edición, los cambios de etapa, las cotizaciones con partidas o envíos, las alarmas, la facturación y los tickets de posventa corresponden a funcionalidades distintas. La edición y el cambio de etapa se cubren en **US-05**. El registro de la oportunidad no confirma una venta ni genera una cotización. El equipamiento requerido se describe en el asunto y las notas, sin exigir un catálogo de productos ni una integración con inventario.

El MVP es solo frontend: persiste los datos en el mismo navegador mediante el almacenamiento local previsto por el proyecto. El ejecutivo es un perfil de uso; esta historia no presupone autenticación, permisos reales ni sincronización entre equipos.

#### Precondiciones y dependencias

- Existe al menos un cliente registrado en el CRM; la gestión de clientes es una dependencia funcional (US-01).
- El catálogo de responsables de demostración está disponible en `ModuleConfig`.
- El almacenamiento se puede leer y su estructura es válida. Un problema de almacenamiento debe informarse, sin reiniciar los datos automáticamente.
- Para probar esta historia de manera independiente se puede precargar un cliente sintético, sin implementar el resto del proceso comercial.

#### Datos del formulario y reglas de validación

| Dato visible | Campo del modelo | Obligatoriedad | Regla |
|---|---|---|---|
| Cliente asociado | `entity_id` | Obligatorio | Seleccionar un cliente existente, identificado por nombre y código. Guardar su `entity_id`, no su nombre ni su RUT. |
| Asunto / equipamiento de interés | `opportunityTitle` | Obligatorio | Texto no vacío después de quitar espacios iniciales y finales; debe describir la posible venta. |
| Folio de oportunidad | `folio` | Obligatorio | Introducido manualmente; entero mayor que cero. La pareja `series` + `folio` debe ser única en todo el módulo. |
| Serie | `series` | Automático | Valor fijo `OPP`; no editable al crear y sin validez tributaria. |
| Fecha de apertura | `startDate` | Obligatoria | Fecha real de calendario, almacenada como `YYYY-MM-DD`. |
| Fecha estimada de cierre | `endDate` | Obligatoria | Fecha real, igual o posterior a la apertura. Una fecha vencida es válida; no se exige que sea posterior a hoy. |
| Monto estimado (CLP) | `totalAmount` | Obligatorio | Número finito, entero y mayor o igual que cero. Cero es válido; vacío, negativo, decimal o texto no lo son. |
| Moneda | `currency` | Automático | Valor fijo `CLP`. |
| Ejecutivo responsable | `opportunityOwner` | Obligatorio | Selección de una opción válida del catálogo configurado. |
| Notas / necesidad del cliente | `notes` | Opcional | Texto libre para características del equipo, contexto o último contacto; se muestra como texto, sin ejecutar HTML o scripts. |
| Etapa comercial | `status` | Automático | Valor inicial `Nueva`. No se permite seleccionar una etapa diferente durante el registro. |
| Identificador interno | `id` | Automático | Único, generado por el sistema y distinto del folio comercial. |
| Fecha y hora de creación y actualización | `createdAt`, `updatedAt` | Automático | Marcas de tiempo ISO 8601; ambas representan el momento de creación en el alta inicial. |

**Reglas complementarias**:

- Un cliente puede tener varias oportunidades y cada oportunidad pertenece a exactamente un cliente.
- Se permite asociar oportunidades a clientes de tipo Prospecto, Activo o Inactivo; crear una oportunidad no cambia el tipo del cliente.
- El responsable de la oportunidad se selecciona explícitamente y puede diferir del responsable del cliente.
- El monto estimado es una expectativa comercial, no un ingreso contable. No se calcula a partir de impuestos, descuentos o cantidades de otros campos del template.
- No se exige motivo de pérdida al registrar, porque la etapa inicial es Nueva.
- Dos oportunidades pueden compartir cliente y asunto si sus folios son distintos; la duplicidad se controla por serie y folio.
- Las validaciones se aplican tanto al formulario como a la capa de dominio/almacenamiento del frontend.

#### Flujo principal

1. El ejecutivo selecciona **Nueva oportunidad** desde el área Oportunidades o la ficha de un cliente; el acceso desde el panel se agrega en P2.
2. El sistema presenta el formulario de creación sin datos residuales de otro registro, con serie OPP, moneda CLP y etapa Nueva.
3. El ejecutivo selecciona el cliente mediante su nombre y código.
4. Ingresa asunto, folio, fechas, monto estimado y responsable; opcionalmente añade notas.
5. Selecciona **Guardar oportunidad**.
6. El sistema valida los campos, la existencia del cliente y la unicidad de la pareja serie/folio.
7. Si todo es válido, genera los identificadores y marcas de tiempo y persiste el registro completo.
8. Solo después de guardar correctamente, muestra **“Oportunidad registrada correctamente”** y permite consultar el registro, su cliente y sus datos.

#### Criterios de aceptación

**CA-04-01 — Registro exitoso y asociación correcta**

- Dado un cliente existente y un formulario con todos los datos obligatorios válidos,
- cuando el ejecutivo guarda la oportunidad,
- entonces se crea exactamente un registro con los datos ingresados, asociado al `entity_id` seleccionado, con identificador único, serie OPP, moneda CLP, etapa Nueva y marcas de tiempo generadas; se confirma el guardado y el registro queda disponible para consulta.

**CA-04-02 — Campos obligatorios incompletos**

- Dado que falta cliente, asunto, folio, fecha de apertura, fecha de cierre, monto o responsable, o que el asunto contiene solo espacios,
- cuando se intenta guardar,
- entonces se identifican los campos que requieren corrección mediante mensajes visibles, se conserva el resto del formulario y no se crea una oportunidad.

**CA-04-03 — Ausencia de clientes**

- Dado que no existen clientes registrados,
- cuando el ejecutivo intenta crear una oportunidad,
- entonces se explica que primero debe registrar un cliente, se ofrece acceso a esa acción y se impide guardar una oportunidad sin cliente.

**CA-04-04 — Cliente inexistente o referencia desactualizada**

- Dado que el cliente seleccionado ya no existe al momento de guardar o se proporciona un identificador inexistente,
- cuando se valida la oportunidad,
- entonces se rechaza la creación, se informa el problema y se solicita seleccionar un cliente válido, sin generar registros huérfanos ni asociar la oportunidad a otro cliente automáticamente.

**CA-04-05 — Folio válido y único**

- Dado un folio vacío, no entero, menor o igual que cero, o una pareja OPP/folio ya registrada para cualquier cliente,
- cuando se intenta guardar,
- entonces se rechaza el registro y se explica el error del folio.
- Dado un cliente con una oportunidad existente,
- cuando se registra otra con un folio válido y diferente,
- entonces se permite el alta aunque el asunto coincida.

**CA-04-06 — Validación del monto**

- Dado un monto vacío, negativo, decimal, no numérico o no finito,
- cuando se intenta guardar,
- entonces se rechaza el valor y se solicita un entero no negativo en CLP.
- Dado un monto igual a cero y los demás datos válidos,
- cuando se guarda,
- entonces se acepta el registro y se conserva el cero como monto estimado.

**CA-04-07 — Consistencia de fechas**

- Dado una fecha inexistente o una fecha estimada de cierre anterior a la apertura,
- cuando se intenta guardar,
- entonces se rechaza el registro con un mensaje asociado a las fechas.
- Dado fechas reales con cierre igual o posterior a la apertura,
- cuando se guarda con los demás campos válidos,
- entonces se aceptan y se conservan los días ingresados sin desplazamientos por zona horaria, incluso si el cierre ya está vencido.

**CA-04-08 — Responsable válido y etapa inicial**

- Dado un responsable ausente o ajeno al catálogo,
- cuando se intenta guardar,
- entonces se exige seleccionar una opción válida.
- Dado un intento de crear la oportunidad con una etapa distinta de Nueva,
- cuando se valida en la capa de dominio/almacenamiento,
- entonces se rechaza el intento; una creación válida siempre empieza en Nueva.

**CA-04-09 — Persistencia y consulta**

- Dado un registro guardado correctamente,
- cuando el ejecutivo navega a otra vista y después recarga la aplicación en el mismo navegador y origen, sin borrar su almacenamiento,
- entonces la oportunidad conserva su identificador, cliente, folio y demás datos, y continúa disponible en la consulta de oportunidades o del cliente asociado.

**CA-04-10 — Cancelación y cambios sin guardar**

- Dado un formulario modificado,
- cuando el ejecutivo cancela o intenta cambiar de vista,
- entonces se solicita elegir entre continuar editando o descartar los cambios; continuar mantiene los datos y descartar abandona el formulario sin crear registros ni modificar oportunidades existentes.

**CA-04-11 — Error de almacenamiento**

- Dado que el almacenamiento está lleno, no disponible o contiene datos corruptos,
- cuando se intenta guardar,
- entonces se informa que no se pudo registrar la oportunidad, no se muestra una confirmación de éxito ni se sobrescriben silenciosamente los datos previos, y los datos ingresados permanecen disponibles en el formulario para corregir o reintentar.

**CA-04-12 — Envío repetido**

- Dado un formulario válido,
- cuando el ejecutivo hace doble clic en Guardar o repite el envío de la misma serie y folio,
- entonces existe como máximo una oportunidad persistida con esa pareja y no se duplican registros.

**CA-04-13 — Texto seguro y uso con teclado**

- Dado un asunto o notas que contienen etiquetas HTML o texto similar a un script,
- cuando se guardan y consultan,
- entonces se muestran como texto sin ejecutarse.
- Dado un ejecutivo que utiliza solo teclado,
- cuando completa y envía el formulario,
- entonces puede alcanzar los controles, identificar el foco y conocer los campos obligatorios y sus errores mediante etiquetas y mensajes asociados.

**CA-04-14 — Formulario obsoleto por cambios en otra pestaña**

- Dado que otra pestaña modifica los datos mientras el formulario permanece abierto,
- cuando la aplicación detecta el cambio del almacenamiento,
- entonces informa que los datos cambiaron y bloquea el guardado obsoleto hasta actualizar la vista, advirtiendo antes de descartar lo ingresado. Esto no implica soporte multiusuario transaccional.

#### Prueba independiente de la historia

Usar exclusivamente datos sintéticos. Precargar un cliente llamado **Empresa Demo 1**, código **CLI-DEMO-003**, y el responsable **Ejecutivo A**. Verificar previamente que el folio 3001 no exista.

| Campo | Valor de prueba |
|---|---|
| Asunto | Adquisición de compresor industrial para planta de producción |
| Folio | 3001 |
| Fecha de apertura | 2026-11-02 |
| Fecha estimada de cierre | 2026-11-30 |
| Monto estimado | 8500000 CLP |
| Responsable | Ejecutivo A |
| Notas | Cliente solicita evaluar un compresor para ampliar su capacidad productiva. Pendiente precisar características técnicas. |

**Resultado esperado**: se crea una sola oportunidad OPP/3001, asociada al cliente seleccionado y en estado Nueva. Sus datos permanecen al navegar y recargar. Repetir el folio debe fallar. También deben verificarse monto cero, campos vacíos, fechas invertidas, cliente inexistente y cancelación, según los criterios anteriores.

La meta de tiempo para este recorrido es SC-003; no se repite aquí.

**Notas técnicas (implementación asistida por IA)**:

- Dominio: `validateOpportunity` en `src/crm-rules.js`; unicidad `series + folio` con `isFolioUnique`; transición inicial forzada a `Nueva`.
- Persistencia: `src/storage.js` con `loadDocuments`, `saveDocuments`, `addDocument`, `updateDocument` y `deleteDocument`; `entity_id` debe existir en `erp_base_module:entities`.
- Interfaz: `src/components/document-form.js` y `src/components/document-list.js`; el cliente se selecciona por nombre y código.
- Fechas: comparar cadenas `YYYY-MM-DD` construidas con año, mes y día locales; no convertir a UTC.
- Pruebas: `tests/unit/opportunity-rules.test.js` y `tests/integration/create-opportunity.test.js`.

#### Datos y justificación para el modelo entidad-relación

- **Cliente (Entity)**: conserva los datos maestros de la empresa compradora.
- **Oportunidad (Document)**: representa una posible venta y contiene los datos definidos en esta historia.
- **Relación**: Cliente 1 a N Oportunidades; `Document.entity_id` referencia `Entity.entity_id`. No se duplican los datos completos del cliente dentro de cada oportunidad.
- **Identidad**: el `id` identifica técnicamente el registro; la pareja serie/folio permite reconocerlo comercialmente sin confundirlo con una factura.
- **Seguimiento**: responsable, fechas, asunto, notas y estado aportan el contexto inicial necesario para continuar la negociación.
- **Análisis**: el monto puede contribuir a la suma de oportunidades abiertas; no expresa probabilidad de cierre ni ingresos efectivos. No se exige capturar atributos personales o información bancaria.

#### Definición de terminado

- [ ] El formulario y la consulta permiten completar el flujo principal con datos sintéticos.
- [ ] Se verifican todos los criterios CA-04-01 a CA-04-14 y se documentan los resultados reales.
- [ ] La validación evita referencias huérfanas y duplicados de serie/folio.
- [ ] El registro permanece después de navegar y recargar el mismo navegador.
- [ ] Los errores y cancelaciones no crean registros ni muestran éxitos falsos.
- [ ] La especificación, el modelo de datos, las tareas y el MER describen los mismos campos y relación.
- [ ] Se documenta cómo ejecutar y demostrar esta funcionalidad en el frontend.

---

### Historia de Usuario 5 — Gestionar oportunidades y ciclo de vida comercial (Prioridad: P1)

Como **ejecutivo comercial**, quiero **editar una oportunidad y actualizar su etapa** para **conocer el avance de la negociación y distinguir las ventas pendientes de las ganadas o perdidas**.

**Por qué esta prioridad**: es necesaria para completar el ciclo comercial del CRM y hacer seguimiento continuo al estado de las ventas.

**Prueba independiente**: ejecutar transiciones entre etapas de una oportunidad existente y verificar restricciones, persistencia tras recargar y el registro del motivo en caso de pérdida. También editar y eliminar una oportunidad con confirmación. Esta prueba puede realizarse sin afectar otras historias.

**Escenarios de aceptación**:

1. **CA-05-01** — Dado que el usuario edita una oportunidad en estado Nueva, cuando la avanza a Contactada, entonces el estado se actualiza y se conserva el resto de los datos.
2. **CA-05-02** — Dado una oportunidad en Contactada, cuando la avanza a Propuesta, entonces el estado se actualiza.
3. **CA-05-03** — Dado una oportunidad en Propuesta, cuando la avanza a Negociación, entonces el estado se actualiza.
4. **CA-05-04** — Dado una oportunidad en Negociación, cuando la marca como Ganada, entonces el estado se actualiza y la oportunidad deja de contar como abierta.
5. **CA-05-05** — Dado una oportunidad en cualquier etapa abierta (Nueva, Contactada, Propuesta o Negociación), cuando el usuario decide cerrarla sin éxito, entonces permite marcarla como Perdida.
6. **CA-05-06** — Dado que se marca una oportunidad como Perdida, cuando se intenta guardar sin motivo, entonces el sistema exige obligatoriamente un `lossReason` no vacío y no guarda.
7. **CA-05-07** — Dado un intento de salto no permitido (por ejemplo, Nueva → Ganada o Propuesta → Ganada) o de reapertura de una oportunidad Ganada o Perdida, cuando se ejecuta la acción, entonces el sistema rechaza la transición en la interfaz y en la capa de almacenamiento, e indica la restricción.
8. **CA-05-08** — Dado una oportunidad Ganada o Perdida, cuando el usuario edita notas, asunto, fechas, monto o responsable conservando el estado, entonces se permite guardar y no se reabre.
9. **CA-05-09** — Dado una oportunidad existente, cuando el usuario edita asunto, fechas, monto, responsable, notas o folio, entonces se conservan `id` y `entity_id`, se validan las mismas reglas de US-04 y el folio sigue siendo único.
10. **CA-05-10** — Dado una oportunidad existente, cuando el usuario solicita eliminarla, entonces se pide confirmación explícita, se elimina solo la oportunidad y el cliente permanece intacto; cancelar no modifica datos.
11. **CA-05-11** — Dado un cambio de etapa o una edición guardada, cuando el usuario recarga la aplicación, entonces el estado y los datos modificados permanecen.

**Notas técnicas (implementación asistida por IA)**:

- Ciclo canónico: `Nueva → Contactada → Propuesta → Negociación → Ganada`; desde cualquier estado abierto se puede pasar a `Perdida`; `Ganada` y `Perdida` son finales.
- Dominio: `canTransition(from, to)` y `nextStatuses(status)` en `src/crm-rules.js`; `lossReason` obligatorio solo al entrar en `Perdida`.
- Persistencia: `updateDocument` y `deleteDocument` en `src/storage.js`; no se permite reabrir un estado final.
- Interfaz: selector de etapa en `src/components/document-form.js` y acciones de editar/eliminar en `src/components/document-list.js`.
- Pruebas: `tests/unit/lifecycle.test.js` y `tests/integration/opportunity-lifecycle.test.js`.

---

### Historia de Usuario 6 — Usar terminología comercial consistente (Prioridad: P1)

Como ejecutivo comercial, quiero que las pantallas, formularios, botones y mensajes utilicen los términos cliente y oportunidad de manera consistente, para comprender las operaciones del CRM y distinguir la información de cada empresa de sus posibles ventas.

**Por qué esta prioridad**: la terminología comercial permite identificar claramente qué información se registra y qué acción se está realizando. Utilizar cliente y oportunidad evita confusiones con los términos genéricos entidad y documento del módulo base.

**Prueba independiente**: con un perfil configurado que establezca entidad → cliente y documento → oportunidad, un usuario recorre la gestión de clientes, la gestión de oportunidades, la búsqueda y, en P2, el panel. Verifica que los encabezados, botones, formularios y mensajes emplean los términos comerciales, tanto en singular como en plural. Con una empresa ficticia y una oportunidad vinculada, comprueba que la navegación y los datos guardados mantienen su comportamiento.

**Escenarios de aceptación**:

1. **CA-06-01** — Dado un perfil CRM que define los términos cliente/clientes y oportunidad/oportunidades, cuando se inicia la aplicación, entonces las etiquetas de dominio visibles se obtienen de esa configuración y utilizan la terminología comercial correspondiente.
2. **CA-06-02** — Dado que el ejecutivo consulta la barra lateral y, en P2, el panel, cuando revisa las opciones de navegación y —cuando exista el panel— las acciones rápidas y las tarjetas de estadísticas, entonces encuentra etiquetas coherentes como clientes, oportunidades, nuevo cliente y nueva oportunidad, sin referencias a entidades o documentos para esas funciones.
3. **CA-06-03** — Dado que el ejecutivo abre un formulario de creación o edición, cuando consulta su encabezado, campos y botones de acción, entonces el sistema identifica claramente si está trabajando con un cliente o una oportunidad y utiliza el singular o plural según corresponda.
4. **CA-06-04** — Dado que una operación genera una confirmación, un error de validación o una solicitud de eliminación, cuando el sistema muestra el mensaje, entonces utiliza el término comercial del registro afectado y explica la acción de forma clara.
5. **CA-06-05** — Dado que no existen clientes u oportunidades, o que una búsqueda no devuelve coincidencias, cuando se muestra el estado vacío, entonces el mensaje utiliza la terminología CRM e indica cómo continuar, por ejemplo, “No hay clientes registrados” o “No se encontraron oportunidades”.
6. **CA-06-06** — Dado que el ejecutivo consulta los resultados de búsqueda o el detalle de un cliente, cuando revisa sus oportunidades asociadas, entonces los títulos y etiquetas distinguen al cliente de sus oportunidades y mantienen los mismos términos que las pantallas de gestión.
7. **CA-06-07** — Dado un cliente guardado con una oportunidad vinculada, cuando el ejecutivo navega entre Clientes, Oportunidades y Buscar y, en P2, Panel, entonces cada opción abre la vista correspondiente y se conservan los identificadores, los datos y la relación entre ambos registros.
8. **CA-06-08** — Dado que la terminología CRM está configurada, cuando el usuario recarga la aplicación en el mismo navegador, entonces las pantallas vuelven a mostrar los términos configurados y los registros guardados permanecen disponibles sin modificaciones causadas por el cambio de etiquetas.
9. **CA-06-09** — Dado que el módulo base se inicia sin mapeos de terminología, cuando se muestran sus pantallas, entonces utiliza los términos predeterminados entidad/entidades y documento/documentos sin errores, conservando el comportamiento de navegación.
10. **CA-06-10** — Dado un cambio de configuración con una clave personalizada que colisiona con un campo base, cuando se carga el módulo, entonces se informa el conflicto y se conserva el respaldo genérico sin sobrescribir datos.
11. **CA-06-11** — Dado la barra lateral, cuando el ejecutivo selecciona Clientes u Oportunidades, entonces se abre el formulario y selector de registros del área, con el área activa resaltada.
12. **CA-06-12** — Dado una pantalla estrecha, cuando se contrae la barra lateral, entonces sus iconos conservan nombres accesibles y la vista activa sigue identificada.

**Notas técnicas (implementación asistida por IA)**:

- `ModuleConfig` en `src/module-config.js`: `moduleName`, `labels` (`entity`, `entities`, `document`, `documents`), `customFields`, `statusLifecycle`, `theme.accentColor`.
- El cargador base ya valida tipos, colisiones con campos base, opciones de select, estados y color; conservar ese comportamiento y no duplicarlo en `crm-rules.js`.
- Interfaz: `src/components/shell.js` para barra superior/lateral y todos los componentes que usan `labelFor(kind)`.
- Pruebas: `tests/unit/module-config.test.js` y `tests/integration/relabeling.test.js`.

---

### Historia de Usuario 7 — Consultar el panel CRM (Prioridad: P2, transversal)

Como **jefe comercial**, quiero ver la cartera y los seguimientos pendientes para priorizar el trabajo diario y evaluar el estado actual de las oportunidades.

**Por qué esta prioridad**: mejora la consulta y priorización una vez disponible el flujo central. Es transversal a las historias de clientes y oportunidades.

**Prueba independiente**: con datos sintéticos, abrir el panel, revisar los seis indicadores y comprobar que se recalculan al volver después de crear, editar, ganar o perder una oportunidad.

**Escenarios de aceptación**:

1. **CA-07-01** — Dado que existen datos almacenados, cuando el jefe comercial abre el panel, entonces ve los seis indicadores: clientes registrados, oportunidades abiertas, monto abierto, seguimientos vencidos, contactos para hoy y tasa de cierre.
2. **CA-07-02** — Dado el panel, cuando el usuario activa Nuevo cliente, Nueva oportunidad, Gestionar clientes o Buscar, entonces se abre la vista correspondiente y los formularios de creación están vacíos.
3. **CA-07-03** — Dado un almacenamiento vacío, cuando se abre el panel, entonces los indicadores muestran cero y se explica cómo comenzar.
4. **CA-07-04** — Dado oportunidades abiertas por 100000 y 200000 CLP y una ganada por 50000 CLP, cuando se vuelve al panel, entonces el monto abierto es 300000 CLP y hay dos oportunidades abiertas.
5. **CA-07-05** — Dado una oportunidad abierta, cuando se marca Perdida con motivo y se vuelve al panel, entonces deja de aportar al monto y al conteo abierto.
6. **CA-07-06** — Dado un cambio de día local, cuando se vuelve al panel, entonces los seguimientos se clasifican usando el día local actual.
7. **CA-07-07** — Dado que no hay oportunidades cerradas, cuando se muestra la tasa de cierre, entonces se muestra “Sin datos” en lugar de una división por cero.
8. **CA-07-08** — Dado cualquier cambio en clientes u oportunidades, cuando se vuelve al panel, entonces los indicadores se recalculan y no se leen totales persistidos.

**Notas técnicas (implementación asistida por IA)**:

- Métricas puras en `src/crm-metrics.js`: `countClients`, `countOpenOpportunities`, `sumOpenAmount`, `overdueFollowUps`, `todayContacts`, `closeRate`.
- Fórmulas exactas en `data-model.md`, sección “Variables e indicadores descriptivos”. No persistir totales derivados.
- Interfaz: `src/components/dashboard.js`; reutilizar las tarjetas de estadísticas del template base.
- Pruebas: `tests/unit/crm-metrics.test.js` y `tests/integration/dashboard.test.js`.

---

## Casos límite

- **Sin clientes**: bloquear la creación de oportunidades y ofrecer crear un cliente.
- **Registro eliminado o referencia obsoleta**: avisar y actualizar selectores, sin guardar sobre otro registro.
- **Campos vacíos y espacios**: recortar texto; comparar códigos con trim y mayúsculas; no confundir monto cero con campo vacío.
- **Fechas imposibles**: rechazar, incluso si el navegador deja introducirlas; comparar fechas de calendario sin convertirlas a medianoche UTC.
- **Contacto opcional**: permitir email y teléfono vacíos y señalar información incompleta en el detalle.
- **Eliminar un cliente**: confirmar número de oportunidades y, cuando existan, tickets; aclarar la irreversibilidad en la aplicación; cancelar no muta datos.
- **Estado final**: mantenerlo al editar otros campos; no ofrecer reapertura en el MVP.
- **JSON corrupto o cuota agotada**: mostrar error recuperable; no reiniciar automáticamente ni afirmar que se guardó.
- **Varias pestañas**: detectar cambios con el evento `storage` y solicitar recarga antes de guardar un formulario obsoleto; no prometer concurrencia transaccional.
- **Configuración modificada**: preservar valores desconocidos ya guardados, informar incompatibilidades y exigir migración explícita antes de reinterpretarlos.
- **Enlace directo o botón Atrás**: restaurar una vista válida; proteger cambios sin guardar y usar Clientes como ruta de respaldo en P1 y Panel en P2.
- **Ticket sin producto**: bloquear el guardado y pedir la referencia del producto o un nombre de respaldo.
- **Ticket resuelto**: no permitir volver a “En proceso” en el MVP; editar otros campos conservando el estado.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE registrar clientes con `name`, `code`, `category`, `accountOwner` y `acquisitionSource` obligatorios; `email`, `phone`, `contactName`, `description` y `targetDate` opcionales; `id`, `entity_id`, `createdAt` y `updatedAt` generados. La fecha de registro no se ingresa manualmente.
- **FR-002**: El sistema DEBE rechazar cualquier campo obligatorio vacío o compuesto solo por espacios, identificar los campos afectados, conservar lo ingresado y no persistir el registro.
- **FR-003**: El sistema DEBE normalizar `code` con trim y mayúsculas, rechazar duplicados y conservar una representación normalizada sin alterar el registro existente.
- **FR-004**: El sistema DEBE validar el correo cuando esté presente, exigiendo al menos “@” y dominio; si está vacío, el cliente se guarda y el detalle muestra “Contacto incompleto” cuando correo y teléfono están ambos vacíos.
- **FR-005**: El sistema DEBE validar `category`, `accountOwner` y `acquisitionSource` contra los catálogos de `ModuleConfig` y rechazar valores ajenos.
- **FR-006**: El sistema DEBE permitir editar un cliente conservando `id` y `entity_id`, aplicando las mismas validaciones y la unicidad de código.
- **FR-007**: El sistema DEBE eliminar un cliente solo con confirmación explícita, informando cuántas oportunidades se eliminarán y, cuando la colección de tickets exista (P2), cuántos tickets. En P1 la operación atómica cubre cliente y oportunidades; en P2 se extiende a tickets. Cancelar no modifica nada.
- **FR-008**: El sistema DEBE buscar clientes con un único criterio comparado con nombre o código, sin distinguir mayúsculas, tildes ni espacios al inicio o al final.
- **FR-009**: El sistema DEBE mostrar todos los clientes coincidentes, permitir seleccionar uno y consultar su ficha con los campos registrados y los estados “sin información” y “sin programar”.
- **FR-010**: El sistema DEBE mostrar un mensaje cuando no se haya ingresado criterio y otro cuando no existan coincidencias.
- **FR-011**: La búsqueda y la consulta DEBEN ser de solo lectura: no modifican ni eliminan clientes, oportunidades ni tickets.
- **FR-012**: El sistema DEBE permitir filtrar resultados por tipo, responsable y origen, combinados con AND, y ofrecer limpiar filtros; también DEBE buscar oportunidades por asunto o folio mostrando el cliente vinculado en una sección identificada, sin mezclarlas sin etiqueta con los resultados de clientes.
- **FR-013**: El sistema DEBE guardar una `targetDate` opcional por cliente y distinguir “Vencido”, “Para hoy”, “Programado” y “Sin programar” usando el día local.
- **FR-014**: El sistema DEBE registrar oportunidades con cliente existente, `opportunityTitle`, `folio`, `series = OPP`, `startDate`, `endDate`, `totalAmount`, `currency = CLP`, `opportunityOwner`, `status = Nueva` y `notes` opcional; DEBE ofrecer el alta desde el área Oportunidades y la ficha del cliente; el acceso directo desde el panel se habilita en P2 (US-07).
- **FR-015**: El sistema DEBE validar la unicidad global de la pareja `series + folio` al crear y editar, excluyendo el registro actual.
- **FR-016**: El sistema DEBE validar `totalAmount` como número finito, entero y mayor o igual que cero en CLP; cero es válido.
- **FR-017**: El sistema DEBE validar fechas reales de calendario y exigir `endDate >= startDate`; una fecha vencida es válida y no se desplaza por zona horaria.
- **FR-018**: El sistema DEBE validar `opportunityOwner` contra el catálogo y forzar `status = Nueva` al crear, rechazando cualquier otra etapa inicial en la capa de dominio/almacenamiento.
- **FR-019**: El sistema DEBE impedir oportunidades huérfanas: el `entity_id` debe existir al guardar y no se asigna otro cliente automáticamente.
- **FR-020**: El sistema DEBE permitir editar oportunidades conservando `id` y `entity_id`, y eliminar oportunidades con confirmación; la eliminación solo borra la oportunidad y no altera al cliente.
- **FR-021**: El sistema DEBE aplicar el ciclo `Nueva → Contactada → Propuesta → Negociación → Ganada`, permitir `Perdida` desde cualquier estado abierto y rechazar saltos no declarados en interfaz y almacenamiento.
- **FR-022**: El sistema DEBE exigir `lossReason` no vacío al pasar a `Perdida` y tratar `Ganada` y `Perdida` como estados finales.
- **FR-023**: El sistema DEBE impedir reabrir oportunidades cerradas en el MVP y permitir editar otros campos conservando el estado.
- **FR-024**: El sistema DEBE mostrar los seis indicadores del panel con las fórmulas de `data-model.md`, recalcularlos al volver al panel y después de cada mutación, y no persistir totales derivados. “Seguimientos vencidos” y “Contactos para hoy” excluyen clientes `Inactivo`.
- **FR-025**: El sistema DEBE registrar tickets con cliente, producto, motivo (soporte, reclamo o consulta), descripción, prioridad y estado; `productId` es opcional y se acepta como cadena no vacía (el módulo Producto está fuera del alcance); `productName` es un respaldo de demo.
- **FR-026**: El sistema DEBE mostrar los tickets por cliente, permitir `En proceso → Resuelto` y permitir editar motivo, descripción y prioridad conservando el estado; no se permite reapertura en el MVP y la prioridad se limita a Alta, Media o Baja.
- **FR-027**: El sistema DEBE guardar solo los datos de contacto necesarios del cliente y NO DEBE ofrecer exportación del listado completo.
- **FR-028**: El sistema NO DEBE usar la ubicación geográfica del cliente para ordenar ni para priorizar oportunidades o tickets.
- **FR-029**: El sistema DEBE aplicar `moduleName`, etiquetas, campos personalizados, catálogos, ciclo de vida y color desde `ModuleConfig`; DEBE informar conflictos y conservar el respaldo genérico del template.
- **FR-030**: El sistema DEBE usar Cliente/Clientes y Oportunidad/Oportunidades en panel, gestión, formularios, búsqueda, detalle, mensajes y estados vacíos, en singular y plural, con fallback entidad/documento cuando no haya perfil.
- **FR-031**: El sistema DEBE persistir los registros tras navegar y recargar el mismo navegador, versionar explícitamente el esquema y no migrar datos en silencio.
- **FR-032**: El sistema DEBE manejar cuota agotada, JSON corrupto y formularios obsoletos por cambios en otra pestaña sin mostrar éxito falso ni sobrescribir datos previos.
- **FR-033**: El sistema DEBE renderizar asunto, notas y descripciones como texto seguro, sin ejecutar HTML o scripts.
- **FR-034**: El sistema DEBE mantener búsquedas correctas con 500 clientes y 1000 oportunidades y actualizar en menos de 500 ms en al menos 19 de 20 búsquedas.
- **FR-035**: El sistema DEBE permitir navegar y operar con teclado, con foco visible, etiquetas asociadas, mensajes de error comprensibles y contraste suficiente.
- **FR-036**: El sistema DEBE mantener barra superior y lateral con Clientes, Oportunidades y Buscar en P1, y Panel en P2, resaltar la vista activa y proteger cambios sin guardar al navegar.

> **Nota de trazabilidad**: FR-027 a FR-035 reformulan el requisito no funcional correspondiente para que cada requisito funcional sea autónomo y verificable por separado. Es una redundancia intencional; ante cualquier conflicto de redacción, prevalece el NFR.

### Requisitos de extensibilidad

- **XR-001**: Configurar identidad, etiquetas, campos adicionales, estados y color mediante el perfil del módulo.
- **XR-002**: Centralizar las validaciones CRM adicionales en una capa de dominio, sin duplicar persistencia ni generación de identidad.
- **XR-003**: Mantener `entity_id` como contrato de vinculación para una futura integración con otros módulos.
- **XR-004**: Separar almacenamiento e interfaz para permitir sustituir `localStorage` por una API posteriormente.

## Entidades clave

- **Cliente (Entity)**: empresa prospecto, activa o inactiva; incluye nombre, código, tipo, responsable, origen, contacto principal y próxima fecha. De acá cuelgan las oportunidades y los tickets.
- **Oportunidad (Document)**: posible venta perteneciente a un solo cliente, con asunto, folio, fechas, monto y etapa.
- **Ticket (P2)**: falla, reclamo o consulta de un cliente sobre un producto, con descripción, prioridad y estado.
- **ModuleConfig**: configuración técnica estática; no es una tabla de transacciones ni de usuarios.
- **Producto y Empleado**: módulos externos previstos, fuera de este repositorio y del alcance del MVP; el CRM no los implementa y solo los referenciará cuando existan. En la demo, `productId` es opcional y `productName` actúa como respaldo.

El detalle de campos, tipos y relaciones está en `data-model.md`.

## Requisitos no funcionales

- **NFR-001 Accesibilidad**: la interfaz debe poder usarse con teclado, con foco visible, etiquetas asociadas a los campos, errores anunciados y contraste suficiente. Como objetivo verificable se adopta WCAG 2.1 AA: 4.5:1 para texto normal y 3:1 para texto grande y controles de interfaz. Las imágenes decorativas no deben transmitir información sin alternativa textual.
- **NFR-002 Rendimiento**: con 500 clientes y 1000 oportunidades, la búsqueda debe actualizarse en menos de 500 ms en al menos 19 de 20 mediciones; el panel debe recalcular sin bloquear la interfaz. Registrar navegador, equipo y mediciones.
- **NFR-003 Persistencia y recuperación**: ante cuota agotada, JSON corrupto o pestaña obsoleta, conservar la información previa, mostrar un error recuperable y no reiniciar el almacenamiento automáticamente.
- **NFR-004 Seguridad de renderizado**: todo texto ingresado se muestra como texto; no se inyecta HTML ni se ejecutan scripts.
- **NFR-005 Privacidad y minimización**: solo datos de contacto necesarios, sin exportación masiva, sin datos bancarios ni contraseñas, y sin usar ubicación geográfica para ordenar o priorizar.
- **NFR-006 Compatibilidad**: navegadores modernos de escritorio y móvil; como mínimo Chrome y Firefox actuales, con Edge y Safari cuando estén disponibles. Vite y Vanilla JS según el template base. Registrar los navegadores realmente probados.
- **NFR-007 Integridad**: las operaciones de cascada y las transiciones de estado deben ser atómicas a nivel de la instantánea en memoria; no se aceptan escrituras parciales.
- **NFR-008 Versionado**: el esquema CRM debe tener versión explícita y cualquier migración debe ser visible y confirmada, nunca silenciosa.
- **NFR-009 Evidencia**: cada iteración debe registrar pruebas ejecutadas, resultados y decisiones; no se declaran pruebas no ejecutadas.

## Criterios de éxito

Son metas de aceptación pendientes de medir, no resultados obtenidos. El protocolo de medición se detalla en `plan.md` y en el anexo técnico. SC-001 a SC-004 requieren participantes reales (T069): no bloquean la implementación, pero deben medirse o declararse explícitamente pendientes antes de afirmar que se cumplen. No se inventan participantes ni resultados.

| ID | Meta | Verificación |
|---|---|---|
| SC-001 | Registrar un cliente válido en menos de 2 minutos desde formulario vacío | Prueba de uso con datos sintéticos |
| SC-002 | Crear una oportunidad desde la ficha de un cliente, con datos conocidos, en menos de 30 segundos | Recorrido con cliente precargado |
| SC-003 | Registrar una oportunidad completa desde formulario vacío en menos de 3 minutos | Recorrido con datos sintéticos |
| SC-004 | Al menos 90% de éxito en crear, editar, eliminar y buscar sin ayuda | 5 usuarios, 4 tareas cada uno; al menos 18 de 20 completadas |
| SC-005 | Actualización de búsqueda menor a 500 ms en al menos 19 de 20 búsquedas | 500 clientes y 1000 oportunidades; registrar navegador, equipo y mediciones |
| SC-006 | Cero referencias huérfanas y cero transiciones inválidas aceptadas | Pruebas de dominio y persistencia |
| SC-007 | Indicadores coinciden exactamente con la muestra de control definida en `data-model.md` | Cálculo manual contra el panel usando el fixture de control |
| SC-008 | Datos guardados permanecen tras recargar y navegar | Prueba de integración |
| SC-009 | Todas las etiquetas del perfil CRM usan Clientes/Oportunidades; el módulo base sin configuración conserva el fallback entidad/documento | Revisión de panel, gestión, búsqueda y detalle con el perfil CRM activo |
| SC-010 | `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/entity-storage.md` y el MER describen las mismas entidades | Revisión de coherencia documental |

## Suposiciones, privacidad y sesgos

- Una sola empresa, un único navegador y moneda CLP. Se usa la fecha local del dispositivo.
- Los responsables se seleccionan de un catálogo de demostración; no representan cuentas autenticadas.
- No se requieren RUT ni domicilios para priorizar contactos.
- No se guardan contraseñas, datos bancarios ni información sensible en notas.
- `localStorage` no proporciona control de acceso ni seguridad equivalente a un sistema empresarial: cualquier persona con acceso al perfil del navegador puede consultar los datos y estos pueden perderse al borrar el almacenamiento. Antes de uso real se necesitarían autenticación, permisos, backend seguro, respaldo y una política de tratamiento y retención de datos.
- Los indicadores son descriptivos. Un monto elevado no demuestra mayor probabilidad de compra; un registro sin contacto no demuestra desinterés. No se puntúa a clientes por atributos personales ni se elaboran rankings de desempeño de ejecutivos. La tasa de cierre se interpreta junto con el número de casos cerrados y no como inferencia causal.

## Anexo técnico

Esta sección satisface el requerimiento del curso de incluir la parte técnica en las historias, sin contaminar los criterios de aceptación funcionales. Los criterios de aceptación siguen siendo la fuente de verdad para QA; este anexo es la guía de implementación.

### Arquitectura

- **Stack**: Vite + JavaScript ES2022 + HTML + CSS, sin framework. El template base está descrito en el `README.md`.
- **Punto de entrada**: `src/main.js`; coordinación en `src/app.js`.
- **Persistencia**: `src/storage.js`, sobre `localStorage`.
- **Configuración**: `src/module-config.js`.
- **Reglas de dominio**: `src/crm-rules.js` (funciones puras).
- **Indicadores**: `src/crm-metrics.js` (funciones puras).
- **Componentes**: `src/components/shell.js`, `custom-fields.js`, `entity-form.js`, `entity-list.js`, `entity-detail.js`, `document-form.js`, `document-list.js`, `search-bar.js`, `search-results.js`, `dashboard.js` y, para P2, `ticket-form.js` y `ticket-list.js`. La vista de edición de la oportunidad (`document-form.js` en modo edición) cumple la función de detalle; no se crea un componente separado.
- **Estilos**: `src/styles.css`, con tokens de color.

### Almacenamiento

- Claves documentadas por el template base: `erp_base_module:entities` y `erp_base_module:documents`.
- Clave propuesta para tickets: `erp_base_module:tickets`.
- Clave propuesta para versión de esquema: `erp_base_module:schemaVersion`.
- Operaciones base: `loadEntities`, `saveEntities`, `addEntity`, `updateEntity`, `deleteEntity`, `deleteDocumentsForEntity`; `loadDocuments`, `saveDocuments`, `addDocument`, `updateDocument`, `deleteDocument`; para P2, `loadTickets`, `saveTickets`, `addTicket`, `updateTicket`, `deleteTicketsForEntity`.
- La validación de dominio se ejecuta antes de escribir. Si la escritura falla, no se actualiza la instantánea en memoria ni se muestra éxito.

### Configuración del módulo (`ModuleConfig`)

| Clave | Valor propuesto |
|---|---|
| `moduleName` | CRM — Clientes y Oportunidades |
| `labels.entity` / `entities` | Cliente / Clientes |
| `labels.document` / `documents` | Oportunidad / Oportunidades |
| `customFields` | `contactName` (entity/text/opcional), `accountOwner` (entity/select/obligatorio), `acquisitionSource` (entity/select/obligatorio), `opportunityTitle` (document/text/obligatorio), `opportunityOwner` (document/select/obligatorio), `lossReason` (document/text/condicional) |
| `statusLifecycle.statuses` | Nueva, Contactada, Propuesta, Negociación, Ganada, Perdida |
| `statusLifecycle.transitions` | Nueva → Contactada, Perdida; Contactada → Propuesta, Perdida; Propuesta → Negociación, Perdida; Negociación → Ganada, Perdida; Ganada → ∅; Perdida → ∅ |
| `theme.accentColor` | `#0F766E` |

Catálogos de demostración:

- `category`: Prospecto, Activo, Inactivo.
- `accountOwner` / `opportunityOwner`: Ejecutivo A, Ejecutivo B.
- `acquisitionSource`: Sitio web, Referido, Contacto directo, Otro.
- `priority` de tickets (P2): Alta, Media, Baja.

### Funciones de dominio propuestas (lista no exhaustiva)

| Función | Responsabilidad |
|---|---|
| `normalizeCode(value)` | `trim` + mayúsculas para comparar códigos |
| `normalizeText(value)` | `trim`, minúsculas y eliminación de diacríticos para búsqueda |
| `isValidEmail(value)` | Validación básica de “@” y dominio |
| `validateClient(client, context)` | Campos obligatorios, catálogos y código único |
| `validateOpportunity(opportunity, context)` | Cliente existente, folio único, monto, fechas, responsable y etapa inicial |
| `canTransition(from, to)` | Transiciones válidas del ciclo de vida |
| `nextStatuses(status)` | Estados siguientes permitidos |
| `validateTicket(ticket)` | Cliente, producto, motivo, prioridad y estado |
| `searchClients(criterion, filters)` | Búsqueda normalizada por nombre/código y filtros AND |
| `searchOpportunities(criterion, filters)` | Búsqueda por asunto/folio con cliente asociado |

Además se implementan `getTargetDateStatus`, `validateStatusChange`, `validateAmount`, `validateOpportunityDates`, `isFolioUnique` y `canTransitionTicket`. Esta tabla no es exhaustiva.

### Indicadores

Las fórmulas exactas están en `data-model.md`, sección “Variables e indicadores descriptivos”. Se implementan como funciones puras en `src/crm-metrics.js` y se recalculan en cada render del panel; no se guardan en `localStorage`.

### Estrategia de pruebas

- **Unitarias**: `tests/unit/crm-rules.test.js`, `tests/unit/opportunity-rules.test.js`, `tests/unit/search.test.js`, `tests/unit/crm-metrics.test.js`, `tests/unit/lifecycle.test.js`, `tests/unit/ticket-rules.test.js`, `tests/unit/storage.test.js`, `tests/unit/module-config.test.js`, `tests/unit/security-render.test.js` (T060).
- **Integración**: `tests/integration/create-edit-delete-client.test.js`, `tests/integration/create-opportunity.test.js`, `tests/integration/opportunity-lifecycle.test.js`, `tests/integration/search-clients.test.js`, `tests/integration/dashboard.test.js`, `tests/integration/relabeling.test.js`, `tests/integration/tickets.test.js`, `tests/integration/storage-risks.test.js` (T061), `tests/integration/accessibility.test.js` (T062) y `tests/integration/critical-journey.test.js` (T070).
- **Rendimiento**: `tests/performance/search-performance.test.js` (T063).
- **Soporte**: `tests/setup.js` para limpiar `localStorage` entre pruebas (T004).
- **Regla test-first**: cada regla de negocio debe tener su prueba antes o junto con la implementación; no se considera terminada una historia sin pruebas que pasen.
- **Evidencia**: registrar en `plan.md` o en el README la fecha, el comando ejecutado y el resultado real. No declarar pruebas no ejecutadas.

### Uso de IA

El curso permite desarrollar la parte técnica con IA. Registrar en el README o en `plan.md` qué se generó con IA, qué se revisó manualmente y qué se verificó con pruebas. No se deben inventar resultados, participantes ni validación empresarial.

## Definición de terminado

- [ ] La especificación, `plan.md`, `data-model.md`, el contrato y el MER describen las mismas entidades, campos y estados.
- [ ] Las historias P1 tienen criterios de aceptación verificables y pruebas asociadas.
- [ ] Las validaciones de cliente, oportunidad, folio, fechas, ciclo de vida y tickets se comparten entre interfaz y almacenamiento.
- [ ] El panel (P2) muestra los seis indicadores con las fórmulas acordadas.
- [ ] La terminología CRM se aplica en todas las vistas y existe fallback genérico.
- [ ] La versión integrada se ejecuta con `npm test` y `npm run build` y los resultados quedan registrados.
- [ ] Los tickets P2 están especificados y modelados, aunque se implementen en la segunda iteración.
