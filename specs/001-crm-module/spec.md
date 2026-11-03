# Especificación de la Funcionalidad: Módulo CRM

**Rama de la funcionalidad**: 001-crm-module
**Creada**: 2026-10-26
**Estado**: Borrador
**Entrada**: Descripción del usuario: "La empresa vende equipos industriales a otras empresas de la Región del Biobío y pierde ventas porque no tiene un registro ordenado de sus clientes ni de las cotizaciones que manda. Se necesita un módulo CRM para guardar los clientes, seguir las oportunidades de venta y anotar los tickets de soporte después de la venta."

## Propósito

El módulo tiene que resolver un problema bien concreto: hoy las cotizaciones quedan repartidas entre correos y planillas, y nadie sabe en qué quedó cada una. Con el CRM el ejecutivo de ventas guarda los datos de sus clientes, va anotando las oportunidades con su monto y su etapa, y el técnico de soporte deja registradas las fallas de cada máquina. Así todo queda en el mismo lugar y siempre asociado a un cliente.

## Escenarios de Usuario y Pruebas

## Historia de Usuario 1 — Registrar clientes y prospectos (Prioridad: P1) 

Como ejecutivo comercial, quiero registrar empresas clientes y prospectos con sus datos de identificación, clasificación, responsable comercial y contacto principal, cuando esté disponible, para centralizar la cartera y disponer de información organizada para el seguimiento comercial. 

**Por qué esta prioridad**: El registro de clientes y prospectos constituye la base del módulo. Sin una empresa registrada, no es posible vincular oportunidades comerciales ni organizar su seguimiento. Por ello, esta funcionalidad es indispensable para el funcionamiento mínimo del módulo. 

**Prueba independiente**: Un usuario puede abrir la gestión de Clientes, registrar una empresa ficticia con nombre, código único, tipo, responsable y origen de captación, y encontrarla en la pantalla de búsqueda. Al consultar su detalle y recargar la aplicación en el mismo navegador, los datos guardados permanecen disponibles. Esta prueba puede realizarse sin crear oportunidades comerciales. 

**Escenarios de aceptación**: 

1. Dado que el ejecutivo comercial está en la gestión de clientes, cuando selecciona la opción de crear un nuevo cliente, entonces se muestra un formulario vacío con los campos obligatorios claramente identificados.

2. Dado un formulario de nuevo cliente, cuando el ejecutivo completa nombre de la empresa, código único, tipo, responsable comercial y origen de captación con valores válidos y guarda el registro, entonces el sistema confirma la creación y permite encontrar la empresa en la pantalla de búsqueda y consultar sus datos. 

3. Dado que se registra una empresa que aún no ha comprado, cuando el ejecutivo selecciona el tipo prospecto y guarda el formulario válido, entonces la empresa queda identificada como prospecto y disponible para vincular oportunidades comerciales. 

4. Dado que el ejecutivo dispone de información del contacto principal, cuando registra su nombre, un correo con formato válido y un teléfono, entonces esos datos quedan asociados a la empresa y se muestran al consultar su detalle. 

5. Dado que aún no se dispone de información del contacto principal, cuando el ejecutivo deja esos campos opcionales vacíos y completa los obligatorios, entonces el sistema permite guardar y señala en el detalle que la información de contacto está incompleta. 

6. Dado un formulario con uno o más campos obligatorios vacíos o compuestos únicamente por espacios, cuando el ejecutivo intenta guardar, entonces el sistema impide la creación, identifica los campos que debe completar y conserva los datos introducidos para corregirlos. 

7. Dado un cliente con código CLI-001 ya registrado, cuando el ejecutivo intenta crear otro con el código cli-001, entonces el sistema rechaza el duplicado al comparar los códigos sin espacios al inicio o al final y sin distinguir mayúsculas de minúsculas, conserva el formulario y no altera el registro existente. 

8. Dado un correo informado con formato inválido o un valor de tipo, responsable u origen que no pertenece a las opciones configuradas, cuando el ejecutivo intenta guardar, entonces el sistema explica qué debe corregir y no crea el registro. 

9. Dado un cliente o prospecto guardado correctamente, cuando el ejecutivo cambia de pantalla y recarga la aplicación en el mismo navegador, entonces el registro conserva sus datos y continúa disponible en la búsqueda. 

10. Dado que el almacenamiento del navegador no permite guardar el registro, cuando el ejecutivo intenta confirmar la creación, entonces el sistema informa que la operación no se completó, conserva los datos del formulario y no muestra una confirmación de éxito. 
 

---

### Historia de Usuario 2 — Buscar clientes y consultar su ficha (Prioridad: P1)

Como ejecutivo de ventas, quiero buscar un cliente por su nombre o código y consultar su ficha, para encontrar rápidamente la información necesaria antes de contactarlo.

La búsqueda se realiza con un único criterio que se compara tanto con el nombre como con el código del cliente o prospecto. Los resultados se actualizan automáticamente a medida que el ejecutivo escribe el criterio.

**Por qué esta prioridad**: La búsqueda y la consulta de la ficha permiten reutilizar los clientes ya registrados y acceder a su información sin recorrer manualmente la cartera. Es una capacidad necesaria para el trabajo comercial diario.

**Prueba independiente**: Con clientes previamente registrados, buscar por nombre completo, por una parte del nombre y por código; seleccionar un resultado y comprobar que se muestra su ficha. Verificar los mensajes de "sin criterio" y "sin coincidencias", y confirmar que los datos almacenados no cambian.

**Escenarios de aceptación**:

1. **Dado** que existen clientes registrados, **cuando** el ejecutivo busca por el nombre completo de uno de ellos, **entonces** el resultado incluye a ese cliente.

2. **Dado** que existen clientes registrados, **cuando** el ejecutivo busca por una parte del nombre, **entonces** se muestran los clientes cuyos nombres contienen esa parte.

3. **Dado** que existen clientes registrados, **cuando** el ejecutivo busca por el código completo de un cliente, **entonces** se muestra el cliente correspondiente.

4. **Dado** que el ejecutivo introduce un criterio de nombre o código con mayúsculas o minúsculas distintas a las almacenadas, **cuando** busca, **entonces** la búsqueda devuelve las mismas coincidencias.

5. **Dado** que varios clientes coinciden con el criterio, **cuando** el ejecutivo consulta los resultados, **entonces** se muestran todos los clientes coincidentes.

6. **Dado** que la búsqueda produce coincidencias, **cuando** el ejecutivo selecciona un resultado, **entonces** se muestra la ficha del cliente con todos los datos registrados.

7. **Dado** que la búsqueda no produce coincidencias, **cuando** el ejecutivo consulta los resultados, **entonces** se muestra un mensaje claro de que no hay coincidencias.

8. **Dado** que el ejecutivo no ha ingresado ningún criterio, **cuando** abre la búsqueda, **entonces** se muestra un mensaje que indica que debe ingresar un criterio.

9. **Dado** un cliente consultado, **cuando** el ejecutivo vuelve a la búsqueda o recarga la aplicación, **entonces** la información del cliente permanece sin cambios.

10. **Dado** un cliente sin información de contacto principal, **cuando** el ejecutivo abre su ficha, **entonces** se muestra la información disponible del cliente sin bloquear la consulta.

11. **Dado** un prospecto registrado, **cuando** el ejecutivo busca por su nombre o código, **entonces** el prospecto también aparece en los resultados y puede abrirse su ficha.

12. **Dado** un cliente cuyo nombre contiene tildes o diéresis, **cuando** el ejecutivo busca escribiendo esas palabras sin tilde, **entonces** el cliente aparece entre los resultados.

13. **Dado** un cliente con datos registrados, **cuando** el ejecutivo abre su ficha, **entonces** se muestran nombre, código, tipo, responsable comercial, origen de captación, correo, teléfono, contacto principal y fecha de registro; los campos opcionales vacíos se indican como “sin información”.

---

### Historia de Usuario 3 - Registrar tickets de soporte (Prioridad: P2)

Como técnico de soporte, quiero anotar un ticket asociado a un cliente y a un producto, para tener el historial de fallas y saber qué se le hizo a cada máquina.

**Por qué esta prioridad**: corresponde a la etapa de después de la venta. Aporta bastante, pero el módulo ya sirve con los clientes y las oportunidades.

**Prueba Independiente**: se elige un cliente, se registra un ticket con su motivo y descripción, y aparece en la lista de tickets con su estado.

**Escenarios de Aceptación**:

1. **Dado** que estoy en la lista de tickets, **cuando** registro uno con cliente, producto, motivo (soporte, reclamo o consulta) y descripción, **entonces** el ticket se guarda y aparece con estado "En proceso".
2. **Dado** que el ticket está en proceso, **cuando** el técnico lo pasa a "Resuelto", **entonces** se muestra como resuelto y la falla queda registrada.
3. **Dado** que estoy registrando un ticket, **cuando** no elijo un cliente, **entonces** el sistema no deja guardarlo.

### Casos Límite

- Si alguien escribe un correo sin "@" o sin dominio, el cliente no se guarda y aparece el aviso de correo mal escrito.
- Un monto estimado negativo no se acepta; se pide un valor igual o mayor a cero.
- Si falta el producto en un ticket, no se puede guardar: hay que indicar a qué máquina se le hizo la mantención o cuál falló.

## Requisitos

### Requisitos Funcionales

- **FR-001**: El sistema debe permitir registrar un cliente con nombre, código, correo, teléfono, tipo de cliente y fecha de registro.
- **FR-002**: El sistema no debe guardar un cliente si falta el nombre o el código, y debe indicar cuál de los dos falta.
- **FR-003**: El sistema debe rechazar un correo que no tenga el formato básico, o sea que le falte el "@" o el dominio.
- **FR-004**: El sistema debe permitir editar y eliminar clientes, pidiendo confirmación antes de borrar.
- **FR-005**: El sistema debe permitir buscar clientes por su nombre completo.
- **FR-006**: El sistema debe permitir buscar clientes por una parte del nombre.
- **FR-007**: El sistema debe permitir buscar clientes por su código.
- **FR-008**: La búsqueda no debe distinguir entre mayúsculas y minúsculas.
- **FR-009**: El sistema debe mostrar los clientes que coincidan con el criterio ingresado.
- **FR-010**: El sistema debe permitir seleccionar un resultado para consultar la ficha del cliente.
- **FR-011**: La ficha debe mostrar la información disponible del cliente seleccionado.
- **FR-012**: El sistema debe mostrar un mensaje claro cuando no existan coincidencias.
- **FR-013**: El sistema debe mostrar un mensaje cuando no se haya ingresado ningún criterio de búsqueda.
- **FR-014**: La búsqueda y la consulta no deben modificar ni eliminar información de los clientes.
- **FR-015**: El sistema debe permitir registrar un ticket con cliente, producto, motivo (soporte, reclamo o consulta), descripción, prioridad y estado.
- **FR-016**: El sistema debe mostrar los tickets de cada cliente y permitir pasarlos de "En proceso" a "Resuelto".
- **FR-017**: El sistema debe guardar solo los datos de contacto necesarios del cliente y no debe permitir exportar el listado completo, para cuidar la información personal.
- **FR-018**: El sistema no debe usar la ubicación geográfica del cliente para ordenar ni para priorizar oportunidades y tickets.

### Entidades Clave

- **Cliente**: la empresa o persona a la que se le vende. Guarda nombre, correo, teléfono, tipo de cliente y fecha de registro. De acá cuelgan las oportunidades y los tickets.
- **Oportunidad de venta**: una cotización en curso de un cliente, con su monto estimado, fecha de cierre y etapa.
- **Ticket de soporte**: una falla, reclamo o consulta de un cliente sobre un producto, con descripción, prioridad y estado.
- **Producto** y **Empleado**: ya vienen definidos en otros módulos del sistema. En el CRM solo se usan como referencia, para saber de qué máquina se habla y quién atiende al cliente.

## Criterios de Éxito

### Resultados Medibles

- **SC-001**: Un ejecutivo de ventas alcanza a registrar un cliente nuevo en menos de 1 minuto.
- **SC-002**: Desde la ficha de un cliente se puede crear una oportunidad en menos de 30 segundos.
- **SC-003**: El 100% de las oportunidades y de los tickets quedan asociados a un cliente, sin registros sueltos.

## Suposiciones

- Se trabaja sin servidor: los datos quedan guardados en el mismo navegador donde se usa el módulo.
- Por ahora lo usa una persona del equipo a la vez; los permisos por rol quedan para más adelante.
- Los productos y los empleados ya existen en los otros módulos, así que acá no se crean, solo se referencian.
- Los clientes son empresas y pymes de la Región del Biobío.

- ### Historia de Usuario 4 — Registrar una oportunidad comercial (Prioridad: P1)

**Identificador:** HU-03  
**Actor principal:** Ejecutivo de ventas  
**Módulo:** Customer Relationship Management (CRM)  
**Estado:** Propuesta para incorporar a la especificación; implementación y pruebas pendientes.

> **Como** ejecutivo de ventas, **quiero** registrar una oportunidad comercial asociada a un cliente, **para** hacer seguimiento de una posible venta de equipamiento industrial.


**Justificación de la prioridad P1:** registrar oportunidades es una función central del CRM. Sin ella no existe un registro sobre el cual consultar el avance de las negociaciones ni organizar las posibles ventas.

#### Alcance

Incluye abrir el formulario, seleccionar un cliente existente, ingresar y validar los datos, guardar la oportunidad y comprobar su disponibilidad posterior. El resultado es una oportunidad en estado **Nueva**, vinculada a un único cliente.

La edición, los cambios de etapa, las cotizaciones con partidas o envíos, las alarmas, la facturación y los tickets de posventa corresponden a funcionalidades distintas. El registro de la oportunidad no confirma una venta ni genera una cotización. El equipamiento requerido se describe en el asunto y las notas, sin exigir un catálogo de productos ni una integración con inventario.

El MVP es solo frontend: persiste los datos en el mismo navegador mediante el almacenamiento local previsto por el proyecto. El ejecutivo es un perfil de uso; esta historia no presupone autenticación, permisos reales ni sincronización entre equipos.

#### Precondiciones y dependencias

- Existe al menos un cliente registrado en el CRM; la gestión de clientes es una dependencia funcional.
- El catálogo de responsables de demostración está disponible.
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

**Reglas complementarias:**

- Un cliente puede tener varias oportunidades y cada oportunidad pertenece a exactamente un cliente.
- Se permite asociar oportunidades a clientes de tipo Prospecto, Activo o Inactivo, conforme al modelo actual; crear una oportunidad no cambia el tipo del cliente.
- El responsable de la oportunidad se selecciona explícitamente y puede diferir del responsable del cliente.
- El monto estimado es una expectativa comercial, no un ingreso contable. No se calcula a partir de impuestos, descuentos o cantidades de otros campos del template.
- No se exige motivo de pérdida al registrar, porque la etapa inicial es Nueva.
- Dos oportunidades pueden compartir cliente y asunto si sus folios son distintos; la duplicidad se controla por serie y folio.
- Las validaciones se aplican tanto al formulario como a la capa de dominio/almacenamiento del frontend.

#### Flujo principal

1. El ejecutivo selecciona **Nueva oportunidad** desde el panel o el área Oportunidades.
2. El sistema presenta el formulario de creación sin datos residuales de otro registro, con serie OPP, moneda CLP y etapa Nueva.
3. El ejecutivo selecciona el cliente mediante su nombre y código.
4. Ingresa asunto, folio, fechas, monto estimado y responsable; opcionalmente añade notas.
5. Selecciona **Guardar oportunidad**.
6. El sistema valida los campos, la existencia del cliente y la unicidad de la pareja serie/folio.
7. Si todo es válido, genera los identificadores y marcas de tiempo y persiste el registro completo.
8. Solo después de guardar correctamente, muestra **“Oportunidad registrada correctamente”** y permite consultar el registro, su cliente y sus datos.

#### Criterios de aceptación

**CA-03-01 — Registro exitoso y asociación correcta**

- **Dado** un cliente existente y un formulario con todos los datos obligatorios válidos,
- **cuando** el ejecutivo guarda la oportunidad,
- **entonces** se crea exactamente un registro con los datos ingresados, asociado al `entity_id` seleccionado, con identificador único, serie OPP, moneda CLP, etapa Nueva y marcas de tiempo generadas; se confirma el guardado y el registro queda disponible para consulta.

**CA-03-02 — Campos obligatorios incompletos**

- **Dado** que falta cliente, asunto, folio, fecha de apertura, fecha de cierre, monto o responsable, o que el asunto contiene solo espacios,
- **cuando** se intenta guardar,
- **entonces** se identifican los campos que requieren corrección mediante mensajes visibles, se conserva el resto del formulario y no se crea una oportunidad.

**CA-03-03 — Ausencia de clientes**

- **Dado** que no existen clientes registrados,
- **cuando** el ejecutivo intenta crear una oportunidad,
- **entonces** se explica que primero debe registrar un cliente, se ofrece acceso a esa acción y se impide guardar una oportunidad sin cliente.

**CA-03-04 — Cliente inexistente o referencia desactualizada**

- **Dado** que el cliente seleccionado ya no existe al momento de guardar o se proporciona un identificador inexistente,
- **cuando** se valida la oportunidad,
- **entonces** se rechaza la creación, se informa el problema y se solicita seleccionar un cliente válido, sin generar registros huérfanos ni asociar la oportunidad a otro cliente automáticamente.

**CA-03-05 — Folio válido y único**

- **Dado** un folio vacío, no entero, menor o igual que cero, o una pareja OPP/folio ya registrada para cualquier cliente,
- **cuando** se intenta guardar,
- **entonces** se rechaza el registro y se explica el error del folio.
- **Dado** un cliente con una oportunidad existente,
- **cuando** se registra otra con un folio válido y diferente,
- **entonces** se permite el alta aunque el asunto coincida.

**CA-03-06 — Validación del monto**

- **Dado** un monto vacío, negativo, decimal, no numérico o no finito,
- **cuando** se intenta guardar,
- **entonces** se rechaza el valor y se solicita un entero no negativo en CLP.
- **Dado** un monto igual a cero y los demás datos válidos,
- **cuando** se guarda,
- **entonces** se acepta el registro y se conserva el cero como monto estimado.

**CA-03-07 — Consistencia de fechas**

- **Dado** una fecha inexistente o una fecha estimada de cierre anterior a la apertura,
- **cuando** se intenta guardar,
- **entonces** se rechaza el registro con un mensaje asociado a las fechas.
- **Dado** fechas reales con cierre igual o posterior a la apertura,
- **cuando** se guarda con los demás campos válidos,
- **entonces** se aceptan y se conservan los días ingresados sin desplazamientos por zona horaria, incluso si el cierre ya está vencido.

**CA-03-08 — Responsable válido y etapa inicial**

- **Dado** un responsable ausente o ajeno al catálogo,
- **cuando** se intenta guardar,
- **entonces** se exige seleccionar una opción válida.
- **Dado** un intento de crear la oportunidad con una etapa distinta de Nueva,
- **cuando** se valida en la capa de dominio/almacenamiento,
- **entonces** se rechaza el intento; una creación válida siempre empieza en Nueva.

**CA-03-09 — Persistencia y consulta**

- **Dado** un registro guardado correctamente,
- **cuando** el ejecutivo navega a otra vista y después recarga la aplicación en el mismo navegador y origen, sin borrar su almacenamiento,
- **entonces** la oportunidad conserva su identificador, cliente, folio y demás datos, y continúa disponible en la consulta de oportunidades o del cliente asociado.

**CA-03-10 — Cancelación y cambios sin guardar**

- **Dado** un formulario modificado,
- **cuando** el ejecutivo cancela o intenta cambiar de vista,
- **entonces** se solicita elegir entre continuar editando o descartar los cambios; continuar mantiene los datos y descartar abandona el formulario sin crear registros ni modificar oportunidades existentes.

**CA-03-11 — Error de almacenamiento**

- **Dado** que el almacenamiento está lleno, no disponible o contiene datos corruptos,
- **cuando** se intenta guardar,
- **entonces** se informa que no se pudo registrar la oportunidad, no se muestra una confirmación de éxito ni se sobrescriben silenciosamente los datos previos, y los datos ingresados permanecen disponibles en el formulario para corregir o reintentar.

**CA-03-12 — Envío repetido**

- **Dado** un formulario válido,
- **cuando** el ejecutivo hace doble clic en Guardar o repite el envío de la misma serie y folio,
- **entonces** existe como máximo una oportunidad persistida con esa pareja y no se duplican registros.

**CA-03-13 — Texto seguro y uso con teclado**

- **Dado** un asunto o notas que contienen etiquetas HTML o texto similar a un script,
- **cuando** se guardan y consultan,
- **entonces** se muestran como texto sin ejecutarse.
- **Dado** un ejecutivo que utiliza solo teclado,
- **cuando** completa y envía el formulario,
- **entonces** puede alcanzar los controles, identificar el foco y conocer los campos obligatorios y sus errores mediante etiquetas y mensajes asociados.

**CA-03-14 — Formulario obsoleto por cambios en otra pestaña**

- **Dado** que otra pestaña modifica los datos mientras el formulario permanece abierto,
- **cuando** la aplicación detecta el cambio del almacenamiento,
- **entonces** informa que los datos cambiaron y bloquea el guardado obsoleto hasta actualizar la vista, advirtiendo antes de descartar lo ingresado. Esto no implica soporte multiusuario transaccional.

#### Prueba independiente de la historia

Usar exclusivamente datos sintéticos. Precargar un cliente llamado **Industrias Biobío Demo**, código **CLI-DEMO-003**, y el responsable **Ejecutivo A**. Verificar previamente que el folio 3001 no exista.

| Campo | Valor de prueba |
|---|---|
| Asunto | Adquisición de compresor industrial para planta de producción |
| Folio | 3001 |
| Fecha de apertura | 2026-11-02 |
| Fecha estimada de cierre | 2026-11-30 |
| Monto estimado | 8500000 CLP |
| Responsable | Ejecutivo A |
| Notas | Cliente solicita evaluar un compresor para ampliar su capacidad productiva. Pendiente precisar características técnicas. |

**Resultado esperado:** se crea una sola oportunidad OPP/3001, asociada al cliente seleccionado y en estado Nueva. Sus datos permanecen al navegar y recargar. Repetir el folio debe fallar. También deben verificarse monto cero, campos vacíos, fechas invertidas, cliente inexistente y cancelación, según los criterios anteriores.

**Meta de uso propuesta:** un usuario puede completar un registro válido en menos de tres minutos desde el formulario vacío, disponiendo de los datos del caso. Esta meta debe medirse; no representa un resultado ya obtenido.

#### Datos y justificación para el modelo entidad-relación

- **Cliente (Entity):** conserva los datos maestros de la empresa compradora.
- **Oportunidad (Document):** representa una posible venta y contiene los datos definidos en esta historia.
- **Relación:** Cliente 1 a N Oportunidades; `Document.entity_id` referencia `Entity.entity_id`. No se duplican los datos completos del cliente dentro de cada oportunidad.
- **Identidad:** el `id` identifica técnicamente el registro; la pareja serie/folio permite reconocerlo comercialmente sin confundirlo con una factura.
- **Seguimiento:** responsable, fechas, asunto, notas y estado aportan el contexto inicial necesario para continuar la negociación.
- **Análisis:** el monto puede contribuir a la suma de oportunidades abiertas; no expresa probabilidad de cierre ni ingresos efectivos. No se exige capturar atributos personales o información bancaria.

#### Definición de terminado

- [ ] El formulario y la consulta permiten completar el flujo principal con datos sintéticos.
- [ ] Se verifican todos los criterios CA-03-01 a CA-03-14 y se documentan los resultados reales.
- [ ] La validación evita referencias huérfanas y duplicados de serie/folio.
- [ ] El registro permanece después de navegar y recargar el mismo navegador.
- [ ] Los errores y cancelaciones no crean registros ni muestran éxitos falsos.
- [ ] La especificación, el modelo de datos, las tareas y el MER describen los mismos campos y relación.
- [ ] Se documenta cómo ejecutar y demostrar esta funcionalidad en el frontend.

### Historia de Usuario 5 — Gestionar clientes y oportunidades (Prioridad: P1)

Como **ejecutivo comercial**, quiero **actualizar la etapa de una oportunidad comercial**, para **conocer el avance de la negociación y distinguir las ventas pendientes de las ganadas o perdidas**.

**Por qué esta prioridad:** Es necesaria para completar el ciclo comercial del CRM y hacer seguimiento continuo al estado de las ventas.

**Prueba independiente:** Ejecutar transiciones entre etapas de una oportunidad existente y verificar restricciones, persistencia tras recargar y el registro del motivo en caso de pérdida. Esta prueba puede realizarse sin afectar otras historias.

**Escenarios de aceptación:**

1. **Dado** que el usuario edita una oportunidad, **cuando** cambia su etapa, **entonces** permite avanzar de forma secuencial en el flujo *Prospecto → Calificado → Propuesta → Ganado*.

2. **Dado** que una oportunidad está en cualquier etapa abierta, **cuando** el usuario decide cerrarla sin éxito, **entonces** permite marcarla como *Perdido*.

3. **Dado** que se marca una oportunidad como *Perdido*, **cuando** se intenta guardar, **entonces** el sistema solicita obligatoriamente ingresar un motivo de pérdida.

4. **Dado** que se guarda el cambio de etapa, **cuando** se actualiza o recarga la página, **entonces** el sistema conserva el estado modificado.

5. **Dado** un intento de cambio no válido o salto de etapa no permitido, **cuando** se ejecuta la acción, **entonces** el sistema rechaza la transición e indica la restricción.
 

## Historia de Usuario 6 — Usar terminología comercial consistente (Prioridad: P1)

Como ejecutivo comercial, quiero que las pantallas, formularios, botones y mensajes utilicen los términos cliente y oportunidad de manera consistente, para comprender las operaciones del CRM y distinguir la información de cada empresa de sus posibles ventas.

**Por qué esta prioridad:** La terminología comercial permite identificar claramente qué información se registra y qué acción se está realizando. Utilizar cliente y oportunidad evita confusiones con los términos genéricos entidad y documento del módulo base y facilita el uso diario del CRM. 

**Prueba independiente:** Con un perfil configurado que establezca entidad → cliente y documento → oportunidad, un usuario recorre el panel, la gestión de clientes, la gestión de oportunidades y la búsqueda. Verifica que los encabezados, botones, formularios y mensajes emplean los términos comerciales, tanto en singular como en plural. Con una empresa ficticia y una oportunidad vinculada, comprueba que la navegación y los datos guardados mantienen su comportamiento.

**Escenarios de aceptación:**
1. Dado un perfil CRM que define los términos cliente/clientes y oportunidad/oportunidades, cuando se inicia la aplicación, entonces las etiquetas de dominio visibles se obtienen de esa configuración y utilizan la terminología comercial correspondiente.
2. Dado que el ejecutivo consulta el panel y la barra lateral, cuando revisa las opciones de navegación, las acciones rápidas y las tarjetas de estadísticas, entonces encuentra etiquetas coherentes como clientes, oportunidades, nuevo cliente y nueva oportunidad, sin referencias a entidades o documentos para esas funciones.
3. Dado que el ejecutivo abre un formulario de creación o edición, cuando consulta su encabezado, campos y botones de acción, entonces el sistema identifica claramente si está trabajando con un cliente o una oportunidad y utiliza el singular o plural según corresponda.
4. Dado que una operación genera una confirmación, un error de validación o una solicitud de eliminación, cuando el sistema muestra el mensaje, entonces utiliza el término comercial del registro afectado y explica la acción de forma clara.
5. Dado que no existen clientes u oportunidades, o que una búsqueda no devuelve coincidencias, cuando se muestra el estado vacío, entonces el mensaje utiliza la terminología CRM e indica cómo continuar, por ejemplo, “No hay clientes registrados” o “No se encontraron oportunidades”.
6. Dado que el ejecutivo consulta los resultados de búsqueda o el detalle de un cliente, cuando revisa sus oportunidades asociadas, entonces los títulos y etiquetas distinguen al cliente de sus oportunidades y mantienen los mismos términos que las pantallas de gestión.
7. Dado un cliente guardado con una oportunidad vinculada, cuando el ejecutivo navega entre Panel, clientes, oportunidades y buscar, entonces cada opción abre la vista correspondiente y se conservan los identificadores, los datos y la relación entre ambos registros.
8. Dado que la terminología CRM está configurada, cuando el usuario recarga la aplicación en el mismo navegador, entonces las pantallas vuelven a mostrar los términos configurados y los registros guardados permanecen disponibles sin modificaciones causadas por el cambio de etiquetas.
9. Dado que el módulo base se inicia sin mapeos de terminología, cuando se muestran sus pantallas, entonces utiliza los términos predeterminados entidad/entidades y documento/documentos sin errores, conservando el comportamiento de navegación.
