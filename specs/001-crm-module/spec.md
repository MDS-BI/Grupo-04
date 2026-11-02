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
