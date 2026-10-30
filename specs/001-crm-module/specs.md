[spec.md](https://github.com/user-attachments/files/34146775/spec.md)
# Especificación de la funcionalidad: módulo CRM

**Rama propuesta**: `002-crm`  
**Fecha**: 2026-10-29  
**Estado**: Especificación preparada; implementación y validación pendientes.  
**Entrada**: Adaptar el módulo ERP base al área Customer Relationship Management.

## Problema y propósito

Una empresa que vende insumos a otras empresas necesita reunir los datos de sus clientes, saber quién atiende cada cuenta y dar seguimiento a sus posibles ventas. Al depender de planillas y anotaciones separadas puede duplicar clientes, olvidar contactos y perder visibilidad sobre negociaciones abiertas.

El MVP propuesto centraliza clientes y oportunidades, asigna responsables y permite consultar próximas fechas de contacto e indicadores descriptivos. La empresa de referencia es **Comercial Andina Demo**, una empresa ficticia B2B utilizada únicamente para concretar el diseño. No se afirma que este caso haya sido investigado ni validado con una empresa real.

## Cliente, usuarios y alcance del compromiso

El cliente de la plataforma es la empresa; sus usuarios son el ejecutivo comercial que mantiene la cartera y el jefe comercial que consulta indicadores y organiza seguimientos. El desarrollador configura la adaptación. Estos son perfiles de uso, sin autenticación ni permisos reales en el prototipo.

Se compromete un frontend local con panel, gestión de clientes, oportunidades vinculadas, búsqueda, validaciones, etapas comerciales y persistencia en el mismo navegador. El dato maestro Entity se adapta a Cliente y Document a Oportunidad. Se conservan claves y reglas base; se añaden campos y validaciones CRM explícitas. Una oportunidad es un registro comercial, no una factura ni un pedido.

Quedan fuera del MVP: envío de correos o WhatsApp, automatizaciones externas, campañas, tickets de soporte, agenda con alarmas, registro estructurado de cada interacción, cotizaciones con partidas, facturación, predicción de ventas, sincronización entre computadores y acceso simultáneo. Las notas guardan contexto libre y no constituyen una bitácora auditada. GitHub permite colaborar en código y documentación; no sincroniza los datos de localStorage.

## Escenarios de usuario y pruebas (obligatorio)

### Historia de Usuario 1 — Registrar clientes y prospectos (Prioridad: P1)

Como **ejecutivo comercial**, quiero registrar una empresa y su contacto principal para centralizar la información de la cartera.

**Por qué esta prioridad**: Es necesaria para completar el flujo operativo mínimo del CRM.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** el formulario vacío, **cuando** guardo nombre, código único y los campos CRM obligatorios, **entonces** el cliente aparece en búsqueda y permanece después de recargar.
2. **Dado** un código ya utilizado, **cuando** intento guardar otro cliente con el mismo código normalizado, **entonces** se rechaza el duplicado y se conserva el formulario.
3. **Dado** información obligatoria incompleta o un correo inválido, **cuando** intento guardar, **entonces** se identifican los campos incorrectos y no se modifica el almacenamiento.

---

### Historia de Usuario 2 — Actualizar y eliminar clientes (Prioridad: P1)

Como **ejecutivo comercial**, quiero corregir datos o eliminar un cliente con confirmación para mantener información precisa.

**Por qué esta prioridad**: Es necesaria para completar el flujo operativo mínimo del CRM.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** un cliente existente, **cuando** modifico su contacto, **entonces** se guardan los cambios conservando sus identificadores.
2. **Dado** un cliente con oportunidades, **cuando** solicito eliminarlo, **entonces** se informa cuántas oportunidades se eliminarán y se exige confirmar.
3. **Dado** la confirmación de eliminación, **cuando** cancelo, **entonces** el cliente y todas sus oportunidades permanecen intactos.

---

### Historia de Usuario 3 — Consultar el panel CRM (Prioridad: P1)

Como **jefe comercial**, quiero ver la cartera y los seguimientos pendientes para priorizar el trabajo diario.

**Por qué esta prioridad**: Es necesaria para completar el flujo operativo mínimo del CRM.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** datos almacenados, **cuando** abro el panel, **entonces** veo clientes, oportunidades abiertas, monto abierto y seguimientos vencidos calculados con las reglas del modelo.
2. **Dado** el panel, **cuando** activo Nuevo cliente, Nueva oportunidad, Gestionar clientes o Buscar, **entonces** se abre la vista correspondiente; los formularios de creación están vacíos.
3. **Dado** un almacenamiento vacío, **cuando** abro el panel, **entonces** los indicadores muestran cero y se explica cómo comenzar.

---

### Historia de Usuario 4 — Gestionar clientes y oportunidades (Prioridad: P1)

Como **ejecutivo comercial**, quiero usar formularios separados dentro del espacio CRM para mantener una relación comercial ordenada.

**Por qué esta prioridad**: Es necesaria para completar el flujo operativo mínimo del CRM.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** la barra lateral, **cuando** selecciono Clientes u Oportunidades, **entonces** se abre el formulario y selector de registros del área, con el área activa resaltada.
2. **Dado** un cliente registrado, **cuando** creo una oportunidad válida, **entonces** queda vinculada exclusivamente al entity_id de ese cliente.
3. **Dado** una oportunidad existente, **cuando** la edito o elimino con confirmación, **entonces** la búsqueda y los indicadores reflejan el cambio; cancelar no modifica datos.

---

### Historia de Usuario 5 — Configurar la identidad CRM (Prioridad: P1)

Como **desarrollador**, quiero declarar nombre, etiquetas, campos y estados en module-config.js para adaptar la base sin duplicar su estructura.

**Por qué esta prioridad**: Es necesaria para completar el flujo operativo mínimo del CRM.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** el perfil CRM válido, **cuando** inicio la aplicación, **entonces** se muestra CRM — Comercial Andina Demo.
2. **Dado** una clave personalizada que colisiona con un campo base, **cuando** cargo la configuración, **entonces** se informa del conflicto sin sobrescribir datos.
3. **Dado** el módulo base sin perfil, **cuando** lo inicio, **entonces** continúa disponible su comportamiento genérico de respaldo.

---

### Historia de Usuario 6 — Usar terminología comercial consistente (Prioridad: P1)

Como **ejecutivo comercial**, quiero ver Clientes y Oportunidades en toda la interfaz para entender cada operación.

**Por qué esta prioridad**: Es necesaria para completar el flujo operativo mínimo del CRM.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** el perfil CRM, **cuando** recorro formularios, mensajes, panel y búsqueda, **entonces** se usan Cliente/Clientes y Oportunidad/Oportunidades en todas las etiquetas de dominio.
2. **Dado** un registro guardado, **cuando** cambio de pantalla, **entonces** se conservan identidad y datos independientemente de sus etiquetas.

---

### Historia de Usuario 7 — Capturar información específica del CRM (Prioridad: P1)

Como **ejecutivo comercial**, quiero registrar responsable, origen, etapa y motivo de pérdida para dar continuidad y contexto a cada oportunidad.

**Por qué esta prioridad**: Es necesaria para completar el flujo operativo mínimo del CRM.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** un formulario de cliente, **cuando** elijo tipo, responsable y origen de captación, **entonces** se validan contra las opciones configuradas y persisten.
2. **Dado** una oportunidad, **cuando** intento pasarla a Perdida sin motivo, **entonces** el sistema impide guardar y solicita el motivo.
3. **Dado** una oportunidad con campos personalizados, **cuando** recargo y la consulto, **entonces** los valores siguen disponibles en formulario y detalle.

---

### Historia de Usuario 8 — Buscar y filtrar la cartera (Prioridad: P2)

Como **ejecutivo comercial**, quiero buscar por nombre, código, contacto o responsable para encontrar rápidamente al cliente correcto.

**Por qué esta prioridad**: Mejora la consulta y priorización una vez disponible el flujo central.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** varios clientes, **cuando** busco con diferencias de mayúsculas o acentos, **entonces** se encuentran coincidencias normalizadas sin modificar los valores originales.
2. **Dado** una búsqueda sin coincidencias, **cuando** consulto los resultados, **entonces** se muestra un estado vacío y una opción para limpiar filtros.
3. **Dado** clientes y oportunidades, **cuando** combino texto y filtro de etapa, **entonces** se muestran los clientes con al menos una oportunidad que cumple ambos criterios sobre la misma oportunidad cuando el texto corresponde a ella.

---

### Historia de Usuario 9 — Programar el próximo seguimiento del cliente (Prioridad: P2)

Como **ejecutivo comercial**, quiero guardar una próxima fecha de contacto para evitar que una relación comercial quede desatendida.

**Por qué esta prioridad**: Mejora la consulta y priorización una vez disponible el flujo central.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** un cliente, **cuando** guardo una fecha real en targetDate, **entonces** se muestra como Próximo contacto.
2. **Dado** un cliente sin fecha, **cuando** lo guardo, **entonces** se permite y aparece Sin programar.
3. **Dado** un cliente con fecha anterior al día local actual, **cuando** abro el panel, **entonces** aparece entre los seguimientos vencidos; una fecha de hoy se muestra Para hoy.

---

### Historia de Usuario 10 — Registrar oportunidades comerciales (Prioridad: P1)

Como **ejecutivo comercial**, quiero registrar una oportunidad con asunto, fechas y monto estimado para seguir una posible venta desde su apertura hasta el cierre.

**Por qué esta prioridad**: Es necesaria para completar el flujo operativo mínimo del CRM.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** un cliente existente, **cuando** guardo asunto, folio, fechas, monto y responsable válidos, **entonces** se crea la oportunidad en estado Nueva.
2. **Dado** un identificador de cliente inexistente, **cuando** intento guardar, **entonces** se rechaza la referencia sin crear registros huérfanos.
3. **Dado** una fecha estimada de cierre anterior a la apertura, **cuando** guardo, **entonces** se rechaza y se explica el error.

---

### Historia de Usuario 11 — Consultar el detalle comercial (Prioridad: P2)

Como **ejecutivo comercial**, quiero consultar el cliente y sus oportunidades desde búsqueda para preparar la siguiente conversación.

**Por qué esta prioridad**: Mejora la consulta y priorización una vez disponible el flujo central.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** un resultado de búsqueda, **cuando** abro su detalle, **entonces** veo el contacto, próxima fecha y oportunidades con asunto, etapa, monto, responsable y notas.
2. **Dado** un detalle abierto, **cuando** elijo Editar, **entonces** se abre la gestión con el registro correcto cargado.
3. **Dado** una búsqueda por asunto de oportunidad, **cuando** consulto el resultado, **entonces** se muestra también el cliente vinculado.

---

### Historia de Usuario 12 — Controlar el ciclo de vida comercial (Prioridad: P1)

Como **ejecutivo comercial**, quiero avanzar las oportunidades por etapas válidas para reflejar el progreso real de una negociación.

**Por qué esta prioridad**: Es necesaria para completar el flujo operativo mínimo del CRM.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** una oportunidad Nueva, **cuando** la avanzo a Contactada, **entonces** el estado se actualiza.
2. **Dado** una oportunidad Nueva, **cuando** intento cambiar directamente a Ganada, **entonces** el cambio se rechaza incluso si se invoca la capa de almacenamiento.
3. **Dado** una oportunidad Ganada o Perdida, **cuando** intento reabrirla, **entonces** se rechaza en este MVP; editar notas conservando el estado sigue permitido.

---

### Historia de Usuario 13 — Navegar en un espacio CRM accesible (Prioridad: P1)

Como **usuario del crm**, quiero disponer de barra superior y lateral persistentes para ubicarme sin perder trabajo.

**Por qué esta prioridad**: Es necesaria para completar el flujo operativo mínimo del CRM.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** cualquier vista, **cuando** navego con teclado, **entonces** puedo alcanzar controles con foco visible y nombres accesibles.
2. **Dado** una pantalla estrecha, **cuando** se contrae la barra lateral, **entonces** sus iconos conservan nombres accesibles.
3. **Dado** un formulario modificado sin guardar, **cuando** intento cambiar de vista, **entonces** se permite continuar editando o descartar explícitamente; los datos ya guardados no se pierden.

---

### Historia de Usuario 14 — Actualizar estadísticas al volver al panel (Prioridad: P2)

Como **jefe comercial**, quiero ver indicadores recalculados después de cada cambio para evaluar el estado actual de la cartera.

**Por qué esta prioridad**: Mejora la consulta y priorización una vez disponible el flujo central.

**Prueba independiente**: Ejecutar los siguientes escenarios con datos sintéticos y verificar interfaz y persistencia después de recargar.

**Escenarios de aceptación**:

1. **Dado** oportunidades abiertas por 100000 y 200000 CLP y una ganada por 50000 CLP, **cuando** vuelvo al panel, **entonces** el monto abierto es 300000 CLP y hay dos oportunidades abiertas.
2. **Dado** una oportunidad abierta, **cuando** la marco Perdida con motivo y vuelvo al panel, **entonces** deja de aportar al monto y al conteo abierto.
3. **Dado** un cambio de día local, **cuando** vuelvo al panel, **entonces** los seguimientos se clasifican usando el día local actual.

---

## Requisitos (obligatorio)

### Requisitos funcionales

- **FR-001**: El sistema DEBE crear clientes con nombre, código único normalizado, tipo, responsable y origen; validar correo opcional.
- **FR-002**: El sistema DEBE editar clientes preservando id y entity_id; eliminar con confirmación explícita y cascada informada.
- **FR-003**: El sistema DEBE crear, editar y eliminar oportunidades asociadas a un cliente existente, con folio y serie únicos como pareja.
- **FR-004**: El sistema DEBE validar asunto, responsable, monto estimado no negativo y fechas reales; endDate no puede preceder startDate.
- **FR-005**: El sistema DEBE crear oportunidades en Nueva y aplicar las transiciones de data-model.md en interfaz y almacenamiento; exigir motivo de pérdida.
- **FR-006**: El sistema DEBE guardar una próxima fecha de contacto opcional por cliente y distinguir Vencido, Para hoy, Programado y Sin programar.
- **FR-007**: El sistema DEBE buscar clientes y oportunidades y mostrar resultados asociados con filtros por tipo, responsable y etapa; los filtros se combinan con AND.
- **FR-008**: El sistema DEBE ofrecer detalle de cliente y oportunidades; editar solamente en la vista de gestión.
- **FR-009**: El sistema DEBE mostrar el panel inicial, cuatro acciones rápidas mínimas y los indicadores definidos en data-model.md.
- **FR-010**: El sistema DEBE recalcular indicadores al volver al panel y después de cada mutación; no persistir totales derivados.
- **FR-011**: El sistema DEBE aplicar nombre, etiquetas, campos, estados y color desde ModuleConfig; informar conflictos y conservar el respaldo genérico del template.
- **FR-012**: El sistema DEBE mantener barra superior y lateral con Panel, Clientes, Oportunidades y Buscar; resaltar la vista activa y ofrecer navegación accesible.
- **FR-013**: El sistema DEBE mantener formularios y selectores de edición en gestión; situar el listado completo en búsqueda para conservar el patrón del template.
- **FR-014**: El sistema DEBE persistir datos guardados tras recargar; advertir antes de descartar cambios sin guardar y conservar datos al navegar.
- **FR-015**: El sistema DEBE gestionar almacenamiento lleno o JSON corrupto sin informar éxito falso ni sobrescribir silenciosamente los datos existentes.
- **FR-016**: El sistema DEBE renderizar entradas como texto seguro, sin ejecutar HTML o scripts; usar únicamente datos sintéticos en la demo.
- **FR-017**: El sistema DEBE mantener búsquedas correctas con 500 clientes y 1000 oportunidades; medir el tiempo de actualización en un equipo de referencia.
- **FR-018**: El sistema DEBE conservar nombres y semántica de campos base; documentar cambios de dominio y cualquier migración antes de usar datos previos.

### Requisitos de extensibilidad

- **XR-001**: Configurar identidad, etiquetas, campos adicionales, estados y color mediante el perfil del módulo.
- **XR-002**: Centralizar validaciones CRM adicionales en una capa de dominio, sin duplicar persistencia ni generación de identidad.
- **XR-003**: Mantener `entity_id` como contrato de vinculación para una futura integración con otros módulos.
- **XR-004**: Separar almacenamiento e interfaz para permitir sustituir localStorage por una API posteriormente.

## Casos límite

- Sin clientes: bloquear la creación de oportunidades y ofrecer crear un cliente.
- Registro eliminado o referencia obsoleta: avisar y actualizar selectores, sin guardar sobre otro registro.
- Campos vacíos y espacios: recortar texto; comparar códigos con trim y mayúsculas; no confundir monto cero con campo vacío.
- Fechas imposibles: rechazar, incluso si el navegador deja introducirlas; comparar fechas de calendario sin convertirlas a medianoche UTC.
- Contacto opcional: permitir email y teléfono vacíos y señalar información incompleta en el detalle.
- Eliminar un cliente: confirmar número de oportunidades y aclarar irreversibilidad en la aplicación; cancelar no muta datos.
- Estado final: mantenerlo al editar otros campos; no ofrecer reapertura en el MVP.
- JSON corrupto/cuota agotada: mostrar error recuperable; no reiniciar automáticamente ni afirmar que se guardó.
- Varias pestañas: detectar cambios con el evento storage y solicitar recarga antes de guardar un formulario obsoleto; no prometer concurrencia transaccional.
- Configuración modificada: preservar valores desconocidos ya guardados, informar incompatibilidades y exigir migración explícita antes de reinterpretarlos.
- Enlace directo o botón Atrás: restaurar una vista válida; proteger cambios sin guardar y usar Panel como ruta de respaldo.

## Entidades clave

**Cliente (Entity)**: empresa prospecto, activa o inactiva; incluye contacto principal, responsable y próxima fecha. **Oportunidad (Document)**: posible venta perteneciente a un solo cliente, con fechas, monto y etapa. **ModuleConfig**: configuración técnica estática; no es una tabla de transacciones ni de usuarios. El detalle de campos y relaciones está en data-model.md.

## Criterios de éxito (obligatorio)

Son metas de aceptación pendientes de medir, no resultados obtenidos.

| ID | Meta | Verificación |
|---|---|---|
| SC-001 | Registrar cliente válido en menos de 2 minutos | Prueba de uso desde formulario vacío |
| SC-002 | Registrar oportunidad vinculada y cambiarla a Contactada en menos de 3 minutos | Recorrido con datos sintéticos |
| SC-003 | Encontrar un cliente en menos de 10 segundos | Buscar por código conocido |
| SC-004 | Al menos 90% de éxito en crear, editar, eliminar y buscar sin ayuda | 5 usuarios, 4 tareas cada uno; al menos 18 de 20 completadas |
| SC-005 | Actualización de búsqueda menor a 500 ms en al menos 19 de 20 búsquedas | 500 clientes y 1000 oportunidades; registrar navegador, equipo y mediciones |
| SC-006 | Cero referencias huérfanas y cero transiciones inválidas aceptadas | Pruebas de dominio y persistencia |
| SC-007 | Indicadores coinciden exactamente con la muestra de control | Cálculo manual contra panel |
| SC-008 | Datos guardados permanecen tras recargar y navegar | Prueba de integración |
| SC-009 | Todas las etiquetas de dominio usan Clientes/Oportunidades | Revisión de las cuatro vistas |
| SC-010 | Las cuatro especificaciones y el MER describen las mismas dos entidades | Revisión de coherencia documental |

## Suposiciones, privacidad y sesgos

Una sola empresa, un único navegador y moneda CLP. Se usa la fecha local del dispositivo. Los responsables se seleccionan de un catálogo de demostración; no representan cuentas autenticadas. No se requieren RUT ni domicilios para priorizar contactos. No se guardan contraseñas, datos bancarios ni información sensible en notas.

localStorage no proporciona control de acceso ni seguridad equivalente a un sistema empresarial: cualquier persona con acceso al perfil del navegador puede consultar los datos y estos pueden perderse al borrar el almacenamiento. Antes de uso real se necesitarían autenticación, permisos, backend seguro, respaldo y una política de tratamiento y retención de datos.

Los indicadores son descriptivos. Un monto elevado no demuestra mayor probabilidad de compra; un registro sin contacto no demuestra desinterés. No se puntúa a clientes por atributos personales ni se elaboran rankings de desempeño de ejecutivos. La tasa de cierre se interpreta junto con el número de casos cerrados y no como inferencia causal.
holi