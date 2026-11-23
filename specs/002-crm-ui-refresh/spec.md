# Especificación de la funcionalidad: rediseño de interfaz del CRM

**Rama de la funcionalidad**: `main` (sin ramas secundarias, según la instrucción del curso)
**Creada**: 2026-11-16
**Estado**: En revisión
**Entrada**: “Para hacer este CRM mucho más navegable, encontrable y visualmente atractivo… espacios vacíos excesivos, falta de jerarquía visual y flujos de usuario interrumpidos.”
**Feature previa**: [`specs/001-crm-module/spec.md`](../001-crm-module/spec.md)
**Punto de partida**: integración visual del equipo (`5aa9799`), que ya aporta el embudo comercial de seis etapas, la identidad verde y el MER en SVG.

> **Relación con `001-crm-module`**: esta especificación **no redefine** el dominio. Hereda íntegramente las entidades, los campos, las reglas, el ciclo de vida, la persistencia y los indicadores de `001`. Solo especifica la capa de navegación, presentación y flujo de pantallas. Toda regla de negocio sigue viviendo en `001` y en `contracts/entity-storage.md` de esa feature.

> **Relación con la integración visual del equipo**: el embudo comercial de `src/components/commercial-board.js` (commit `5aa9799`) **se conserva y se adopta** como la vista de etapas del panel. Esta especificación no lo reemplaza ni crea una segunda vista de distribución; solo lo formaliza, extrae su cálculo a una función con pruebas y cubre el estado vacío. Con eso se atiende el hallazgo del Avance 03 de `feedback.md`, que señaló funcionalidades del sitio sin cobertura en `spec.md` ni en `tasks.md`.

## Propósito

El CRM funciona, pero la interfaz no acompaña el trabajo del ejecutivo: los formularios ocupan una tarjeta estrecha sobre un fondo gris amplio, la búsqueda compite con las secciones del menú lateral, el panel muestra seis tarjetas de “0” sin jerarquía y el alta de una oportunidad se interrumpe cuando no existe un cliente. Esta iteración convierte la interfaz en una herramienta densa, predecible y accesible, sin tocar el modelo de datos.

## Clarifications

### Session 2026-11-16

- Q: ¿Dónde deben quedar los controles actuales de "editar o eliminar", que hoy seleccionan un registro con un `<select>` y un botón de borrado, ahora que el alta y la edición pasan al drawer? → A: Se mueven, con sus ids y textos, a una barra compacta sobre la tabla de registros; su comportamiento de selección y borrado no cambia.
- Q: ¿Qué debe hacer el botón de cada fila en las tablas de clientes y oportunidades, si la edición y el borrado heredados ya están en la barra compacta sobre la tabla? → A: Cada fila ofrece solo “Editar”, que abre el drawer con ese registro; el borrado no se ofrece por fila y sigue únicamente en la barra compacta con `#delete-entity` / `#delete-document`.
- Q: Cuando una tabla no muestra resultados, ¿qué debe ofrecer su estado vacío como acción principal y debe distinguir entre “no hay registros” y “ningún registro coincide con el filtro”? → A: Dos variantes: con filtros o criterio activo, CTA “Limpiar filtros” que no borra el texto; sin registros en absoluto, CTA “Nuevo cliente” o “Nueva oportunidad”.
- Q: ¿Cómo debe mostrarse la confirmación para descartar cambios sin guardar? → A: Modal propio sobre `ui-overlay` con `data-variant="modal"`, título, “Descartar” con variante `danger` y “Seguir editando” como acción segura; no se usa `window.confirm()`.
- Q: ¿Dónde deben vivir la barra de filtros y los chips: solo en la vista de búsqueda o también en los listados “Listado” de Clientes y Oportunidades? → A: Solo en la vista de búsqueda; “Listado” ofrece tabla y orden, sin filtros.
- Q: Cuando el ejecutivo borra por completo el criterio de la búsqueda global estando en la vista de resultados, ¿qué debe ocurrir? → A: Se queda en la vista de búsqueda y muestra la pista “Escribe para buscar”, sin listar resultados y sin borrar los filtros activos.

## Alcance

**Incluye**:

- Cabecera con búsqueda global accesible desde cualquier vista.
- Barra lateral con submenús “Listado” y “Nuevo” en Clientes y Oportunidades.
- Alta y edición de cliente, oportunidad y ticket en un drawer lateral.
- Alta de cliente al vuelo desde el formulario de oportunidad.
- Listados y resultados como tablas ordenables con monogramas.
- Filtros en barra colapsable, solo en la vista de búsqueda, con chips sincronizados.
- Panel accionable: estado vacío ilustrado, banda compacta de indicadores y distribución por etapa sobre el embudo comercial existente.
- Sistema visual: tokens, tarjetas, jerarquía tipográfica y estandarización de botones.

**No incluye**:

- Cambios de entidad, campo, catálogo, estado, fórmula o `schemaVersion`.
- Nuevas reglas de negocio, validaciones o transiciones.
- Backend, autenticación, permisos, sincronización o exportación.
- “Reportes” como sección nueva: no existe requisito ni dato que lo respalde.
- Registro estructurado de actividad del cliente: el modelo no tiene esa entidad y no se inventa.
- Librerías de componentes, CSS o tablas; router; store; Playwright.

## Relación con `001-crm-module`

| Aspecto | Decisión |
|---|---|
| FR-001 a FR-035 | Sin cambios; se heredan y se siguen verificando con sus pruebas |
| FR-036 | Se reformula: la búsqueda deja de estar en la barra lateral y pasa a la cabecera, accesible desde toda vista |
| CA-06-11 | Se reformula: Clientes y Oportunidades exponen submenú “Listado / Nuevo”; “Nuevo” abre el drawer |
| CA-06-02 | Sin cambios: la barra lateral sigue etiquetando Clientes y Oportunidades con la terminología CRM |
| FR-024 | Sin cambios: los seis indicadores conservan sus fórmulas; el panel solo cambia su presentación y añade una vista derivada |
| Entidades y campos | Sin cambios; `data-model.md` de esta feature solo describe vistas derivadas |
| Persistencia | Sin cambios; mismas claves y `schemaVersion`, sin migración |
| Pruebas | Las 278 pruebas de `001` y las 2 del embudo (280 en total) deben seguir pasando; las acopladas al DOM se migran en la misma tarea que el shell |

## Roles

Los mismos de `001`: ejecutivo comercial, jefe comercial y técnico de soporte. Siguen siendo actores de diseño, no permisos reales; la demo no implementa autenticación.

## Historias de usuario

| Historia | Tema | Prioridad | Requisitos | Criterios |
|---|---|---|---|---|
| US-UX-01 | Navegar y buscar desde cualquier vista | P1 | FR-UX-001, FR-UX-002 | CA-UX-01-01…08 |
| US-UX-02 | Registrar y editar sin abandonar la lista | P1 | FR-UX-003…006, FR-UX-013 | CA-UX-02-01…11 |
| US-UX-03 | Encontrar y comparar registros | P1 | FR-UX-007…009 | CA-UX-03-01…10 |
| US-UX-04 | Consultar un panel accionable | P2 | FR-UX-010, FR-UX-011 | CA-UX-04-01…09 |
| Transversal | Jerarquía visual, accesibilidad y regresión | P1 | FR-UX-012, NFR-UX-001…004 | SC-UX-001…006 |

---

### Historia de Usuario 1 — Navegar y buscar desde cualquier vista (Prioridad: P1)

Como **ejecutivo comercial**, quiero **buscar desde cualquier pantalla y moverme por listados y altas**, para **no perder el contexto ni recorrer menús antes de encontrar lo que necesito**.

**Por qué esta prioridad**: la búsqueda es transversal y hoy compite con las secciones. Sin este cambio, el resto del rediseño no mejora la encontrabilidad.

**Prueba independiente**: desde el panel, escribir un código de cliente en la cabecera y comprobar que se llega a la vista de búsqueda con resultados. Expandir Clientes y Oportunidades, verificar “Listado / Nuevo”, abrir “Nuevo” y confirmar que aparece el drawer vacío. Verificar que no existe una entrada “Buscar” en la barra lateral.

**Escenarios de aceptación**:

1. **CA-UX-01-01** — Dado cualquier vista, cuando el ejecutivo enfoca la búsqueda de la cabecera y escribe un criterio, entonces la aplicación muestra la vista de búsqueda y los resultados correspondientes sin exigir un clic adicional en el menú.
2. **CA-UX-01-02** — Dado un criterio escrito en la cabecera, cuando el ejecutivo navega a otra vista y vuelve, entonces el criterio y los filtros se conservan en el mismo control.
3. **CA-UX-01-03** — Dada la barra lateral, cuando el ejecutivo la revisa, entonces contiene Panel, Clientes y Oportunidades, y **no** contiene una entrada de búsqueda.
4. **CA-UX-01-04** — Dado un grupo de navegación, cuando el ejecutivo lo expande o contrae, entonces el submenú muestra “Listado” y “Nuevo”, y `aria-expanded` refleja el estado real.
5. **CA-UX-01-05** — Dado el submenú de Clientes u Oportunidades, cuando el ejecutivo activa “Nuevo”, entonces se abre el drawer correspondiente con el formulario vacío y el foco en el primer campo.
6. **CA-UX-01-06** — Dada una vista activa, cuando el ejecutivo la consulta con teclado o lector de pantalla, entonces el control correspondiente expone `aria-current="page"` y se resalta visualmente.
7. **CA-UX-01-07** — Dado un formulario con cambios sin guardar, cuando el ejecutivo navega a otra vista, entonces se abre el modal de confirmación; “Seguir editando” conserva los datos y “Descartar” no persiste cambios.
8. **CA-UX-01-08** — Dado un enlace directo o el botón Atrás, cuando la aplicación restaura una vista, entonces abre una vista válida o la ruta de respaldo, sin estado inconsistente.

**Notas técnicas**: búsqueda en `#global-search-input`; navegación por `showModule()` y hash existentes; submenús generados desde `ModuleConfig` en `src/components/shell.js`; guardián de cambios extraído a una función compartida.

---

### Historia de Usuario 2 — Registrar y editar sin abandonar la lista (Prioridad: P1)

Como **ejecutivo comercial**, quiero **crear y editar clientes, oportunidades y tickets en un panel lateral**, para **mantener la lista a la vista y no reiniciar el trabajo cuando falta un dato**.

**Por qué esta prioridad**: los formularios actuales ocupan una tarjeta de 720 px con media pantalla vacía al lado y, en oportunidades, bloquean el alta cuando no hay clientes.

**Prueba independiente**: desde el listado de clientes, abrir “Nuevo”, guardar un cliente válido y ver la fila nueva sin recargar. Repetir con una oportunidad sin clientes previos, usando “Crear cliente ahora”, y comprobar que el formulario de oportunidad conserva lo escrito y queda el cliente seleccionado. Verificar teclado y cierre con Esc.

**Escenarios de aceptación**:

1. **CA-UX-02-01** — Dado el listado de clientes, cuando el ejecutivo activa “Nuevo cliente”, entonces se abre un drawer con el formulario vacío, los campos obligatorios marcados y el foco en el primer campo.
2. **CA-UX-02-02** — Dado un drawer con datos válidos, cuando el ejecutivo guarda, entonces el drawer se cierra, se confirma la creación y la fila aparece en la lista sin recargar la página.
3. **CA-UX-02-03** — Dada una fila existente, cuando el ejecutivo elige editar, entonces el drawer se abre con sus datos y al guardar se conservan `id` y `entity_id` y se actualizan solo los campos modificados.
4. **CA-UX-02-04** — Dado un drawer con cambios, cuando el ejecutivo cierra con Esc, con el velo o con “Cancelar”, entonces se abre el modal de confirmación con “Descartar” y “Seguir editando”; “Seguir editando” conserva los valores, y “Descartar” cierra sin persistir y sin mostrar éxito.
5. **CA-UX-02-05** — Dado un formulario inválido, cuando el ejecutivo intenta guardar, entonces los errores se muestran dentro del drawer, se asocian a los campos y el foco va al primero con error, sin perder lo escrito.
6. **CA-UX-02-06** — Dado un drawer abierto, cuando el ejecutivo lo cierra, entonces el foco vuelve al control que lo abrió.
7. **CA-UX-02-07** — Dado un drawer abierto, cuando el ejecutivo usa Tab y Shift+Tab, entonces el foco cicla dentro del drawer y no alcanza el contenido de fondo.
8. **CA-UX-02-08** — Dado el formulario de oportunidad sin clientes, cuando el ejecutivo activa “Crear cliente ahora”, completa los obligatorios y guarda, entonces se crea el cliente, se actualiza el selector, queda seleccionado y el formulario de oportunidad conserva asunto, folio, fechas y monto.
9. **CA-UX-02-09** — Dado el alta de cliente al vuelo, cuando el ejecutivo cancela o envía datos inválidos, entonces no se crea ningún registro y el formulario de oportunidad no se altera.
10. **CA-UX-02-10** — Dado el drawer de oportunidad o de ticket, cuando el ejecutivo edita y guarda, entonces se aplican las mismas validaciones, estados y mensajes de `001`, sin duplicar reglas.
11. **CA-UX-02-11** — Dados los registros listados, cuando el ejecutivo consulta la barra de acciones de la vista, entonces encuentra el selector de registro y el botón de eliminación con los ids y textos de `001`, ubicados sobre la tabla y con el mismo comportamiento de selección y borrado.

**Notas técnicas**: `src/components/ui-overlay.js` como controlador único; los formularios existentes se mueven al drawer sin reescribir su lógica; `src/components/quick-create-client.js` para el alta mínima; el drawer usa `role="dialog"`, `aria-modal="true"` y trampa de foco. Los controles `#edit-entity`, `#delete-entity`, `#edit-document` y `#delete-document` se conservan con sus ids y textos en una barra compacta sobre la tabla, sin cambios de comportamiento.

---

### Historia de Usuario 3 — Encontrar y comparar registros (Prioridad: P1)

Como **jefe comercial**, quiero **ver los registros en tablas ordenables con filtros visibles**, para **comparar carteras y detectar pendientes sin leer listas desordenadas**.

**Por qué esta prioridad**: con 500 clientes y 1000 oportunidades, una lista de elementos sueltos no permite comparar ni priorizar.

**Prueba independiente**: buscar clientes, ordenar por responsable en ambos sentidos, activar dos chips de filtro y comprobar contador, resultados y sincronización con los selectores. Repetir con datos de volumen y medir el ordenamiento.

**Escenarios de aceptación**:

1. **CA-UX-03-01** — Dados resultados de clientes, cuando el ejecutivo los consulta, entonces se muestran en una tabla con columnas de cliente, tipo, responsable, origen, próximo contacto y acciones, donde la única acción de cada fila es “Editar” y abre el drawer del registro.
2. **CA-UX-03-02** — Dado un cliente en la tabla, cuando el ejecutivo lo revisa, entonces ve su monograma con iniciales, su nombre y su código, y el monograma no se anuncia como información adicional a un lector de pantalla.
3. **CA-UX-03-03** — Dado un encabezado ordenable, cuando el ejecutivo lo activa, entonces el orden alterna ascendente y descendente, `aria-sort` refleja el estado y los valores vacíos quedan al final.
4. **CA-UX-03-04** — Dados clientes y oportunidades sin orden explícito, cuando se renderiza la tabla, entonces los clientes se ordenan por nombre ascendente y las oportunidades por folio ascendente.
5. **CA-UX-03-05** — Dada la barra de filtros, cuando el ejecutivo la abre o cierra, entonces `aria-expanded` refleja el estado y el contador de filtros activos se anuncia al cambiar.
6. **CA-UX-03-06** — Dado un chip de filtro, cuando el ejecutivo lo activa, entonces el selector correspondiente toma el mismo valor y ambos quedan sincronizados; al cambiar el selector, el chip refleja el cambio.
7. **CA-UX-03-07** — Dado un conjunto de filtros activos, cuando el ejecutivo pulsa “Limpiar”, entonces se desactivan chips y selectores y el criterio de búsqueda escrito se conserva.
8. **CA-UX-03-08** — Dados varios filtros activos, cuando el ejecutivo busca, entonces se combinan con AND y se mantiene el comportamiento de `CA-02-14`.
9. **CA-UX-03-09** — Dados resultados de oportunidades, cuando el ejecutivo los consulta, entonces aparecen en su propia sección de tabla con el cliente vinculado, sin mezclarse sin etiqueta con los clientes.
10. **CA-UX-03-10** — Dado el recorrido con teclado, cuando el ejecutivo recorre tabla, encabezados y chips, entonces alcanza todos los controles, identifica el foco y conoce el orden aplicado.

**Notas técnicas**: `src/components/data-table.js` con `<caption class="sr-only">`, `aria-sort` y orden estable; `src/components/filter-chips.js` sincronizado con los tres `<select>` existentes; se conserva `readSearchFilters()`.

---

### Historia de Usuario 4 — Consultar un panel accionable (Prioridad: P2)

Como **jefe comercial**, quiero **un panel que me diga qué hacer cuando está vacío y que muestre la cartera de forma compacta cuando hay datos**, para **empezar rápido y priorizar el trabajo diario**.

**Por qué esta prioridad**: mejora la consulta una vez disponible el flujo central. Se implementa al final, sin bloquear las historias P1.

**Prueba independiente**: abrir el panel con `localStorage` vacío y verificar ilustración y CTA; crear datos, volver y comprobar la banda de indicadores y el embudo como distribución por etapa; marcar una oportunidad como ganada y otra como perdida y verificar el recálculo.

**Escenarios de aceptación**:

1. **CA-UX-04-01** — Dado un almacenamiento vacío, cuando el ejecutivo abre el panel, entonces ve una ilustración con alternativa textual, un título, una explicación y la CTA “Registra tu primer cliente”, y no ve ni la banda de indicadores ni el embudo comercial.
2. **CA-UX-04-02** — Dado el estado vacío, cuando el ejecutivo activa la CTA, entonces se abre el drawer de nuevo cliente con el formulario vacío.
3. **CA-UX-04-03** — Dados clientes u oportunidades registrados, cuando el ejecutivo abre el panel, entonces el estado vacío desaparece y aparece la banda compacta con los seis indicadores.
4. **CA-UX-04-04** — Dados datos almacenados, cuando se muestran los seis indicadores, entonces sus valores coinciden exactamente con las fórmulas de `FR-024` y `data-model.md` de `001`.
5. **CA-UX-04-05** — Dadas oportunidades en distintas etapas, cuando el ejecutivo consulta la distribución, entonces ve un bloque del embudo por estado con su etiqueta, su conteo y su monto, incluidos los estados sin registros en cero.
6. **CA-UX-04-06** — Dada una oportunidad que cambia de etapa, cuando el ejecutivo vuelve al panel, entonces los indicadores y el embudo se recalculan.
7. **CA-UX-04-07** — Dado que no hay oportunidades cerradas, cuando se muestra la tasa de cierre, entonces dice “Sin datos” y nunca “NaN” ni una división por cero.
8. **CA-UX-04-08** — Dados los accesos directos del panel, cuando el ejecutivo activa “Nuevo cliente” o “Nueva oportunidad”, entonces se abre el drawer vacío correspondiente.
9. **CA-UX-04-09** — Dado que el ejecutivo navega, ordena, filtra y consulta el panel, cuando compara el almacenamiento antes y después, entonces no aparecen claves, campos ni totales nuevos.

**Notas técnicas**: `stageDistribution(documents, statuses)` se extrae a `src/crm-metrics.js` desde el cálculo que hoy vive en `src/components/commercial-board.js`, y ese componente pasa a consumirla sin cambiar su marcado; SVG en línea, sin binarios; `renderDashboard()` sigue recalculando en cada render y no persiste derivados.

---

## Requisitos funcionales

- **FR-UX-001**: El sistema DEBE ofrecer un único control de búsqueda global en la cabecera superior, disponible en todas las vistas, que al recibir un criterio muestre la vista de búsqueda con resultados, y NO DEBE mostrar una entrada de búsqueda en la barra lateral. Al borrar por completo el criterio, la vista de búsqueda permanece y muestra la pista “Escribe para buscar”, sin listar resultados ni borrar los filtros activos.
- **FR-UX-002**: El sistema DEBE presentar Clientes y Oportunidades como grupos expandibles con las entradas “Listado” y “Nuevo”, generadas desde `ModuleConfig`, con `aria-expanded` y `aria-current`, sin inventar secciones sin requisito.
- **FR-UX-003**: El sistema DEBE abrir el alta y la edición de cliente, oportunidad y ticket en un drawer lateral, sin abandonar la vista de lista y reutilizando los formularios y validaciones existentes.
- **FR-UX-004**: El drawer DEBE comportarse como diálogo modal accesible: `role="dialog"`, `aria-modal="true"`, título asociado, trampa de foco, cierre con Esc, cierre con el velo, devolución de foco y ancho completo bajo 640 px.
- **FR-UX-005**: El sistema DEBE pedir confirmación antes de descartar cambios sin guardar al cerrar el drawer o cambiar de vista, mediante un modal propio sobre `ui-overlay` con `data-variant="modal"`, título asociado, acción “Descartar” con variante `danger` y acción segura “Seguir editando”; NO DEBE usar `window.confirm()`. “Seguir editando” conserva los datos y descartar no persiste ni muestra éxito.
- **FR-UX-006**: Dado el formulario de oportunidad sin clientes, el sistema DEBE ofrecer “Crear cliente ahora” con un modal de alta mínima; al guardar DEBE crear el cliente, actualizar y seleccionar el selector, y conservar el resto del formulario de oportunidad.
- **FR-UX-007**: El sistema DEBE mostrar clientes y oportunidades en tablas con `<caption>` accesible, encabezados con `scope="col"`, monograma decorativo, columnas claras y una columna de acciones cuya única acción por fila es “Editar”, que abre el drawer del registro. Cuando no haya filas NO DEBE renderizar `<tbody>` y DEBE mostrar un estado vacío con CTA: “Limpiar filtros” si hay filtros o criterio activo —sin borrar el texto—, y “Nuevo cliente” o “Nueva oportunidad” si no existe ningún registro.
- **FR-UX-008**: El sistema DEBE permitir ordenar por columna alternando ascendente y descendente, exponer `aria-sort` en la columna activa, dejar los valores vacíos al final y usar un orden por defecto estable.
- **FR-UX-009**: La vista de búsqueda DEBE ofrecer los filtros en una barra colapsable con chips `aria-pressed` sincronizados con los selectores de tipo, responsable y origen, un contador de filtros activos y una acción de limpieza que no borre el criterio. Los listados “Listado” de Clientes y Oportunidades NO DEBEN mostrar esa barra: ofrecen tabla y orden, y reutilizan el criterio y los filtros de la búsqueda al volver a ella.
- **FR-UX-010**: Dado un almacenamiento sin clientes ni oportunidades, el panel DEBE mostrar un estado vacío con ilustración, explicación y CTA primaria “Registra tu primer cliente”, y ocultar la banda de indicadores y el embudo comercial.
- **FR-UX-011**: Dados datos existentes, el panel DEBE mostrar los seis indicadores de `FR-024` en una banda compacta y la “Distribución por etapa” sobre el embudo comercial ya existente, derivada de `status` y `totalAmount`, con un bloque por estado del ciclo de vida —incluidos los que no tienen registros—, recalculada en cada render y nunca persistida.
- **FR-UX-012**: El sistema DEBE aplicar un sistema visual consistente: tokens de radio, sombra y color; tarjetas con cabecera e icono; etiquetas de formulario en peso medio; asterisco de obligatorio en tono de acento; texto secundario `#64748B`; una sola CTA sólida por bloque y acciones secundarias con borde fino.
- **FR-UX-013**: El sistema DEBE conservar los selectores y botones de eliminación de `001` (`#edit-entity`, `#delete-entity`, `#edit-document`, `#delete-document`) con sus ids, textos y comportamiento, reubicados en una barra compacta sobre la tabla de registros. La eliminación NO DEBE ofrecerse como acción de fila; la acción “Editar” de la fila no sustituye a `#edit-entity` ni a `#edit-document`, que conservan su selección y su comportamiento.

## Requisitos no funcionales

Se heredan `NFR-001` a `NFR-009` de `001`. Además:

- **NFR-UX-001**: No se permiten dependencias nuevas de ejecución ni de desarrollo para esta iteración.
- **NFR-UX-002**: No se agregan entidades, campos, claves de `localStorage` ni versiones de esquema; no hay migración.
- **NFR-UX-003**: Con 500 clientes y 1000 oportunidades, ordenar o filtrar debe completarse en menos de 500 ms en al menos 19 de 20 mediciones.
- **NFR-UX-004**: Las ilustraciones DEBEN ser SVG en línea o CSS, sin archivos binarios, y las decorativas DEBEN ser `aria-hidden="true"` con alternativa textual cuando transmitan información.

## Criterios de éxito

Son metas verificables, no resultados obtenidos.

| ID | Meta | Verificación |
|---|---|---|
| SC-UX-001 | La búsqueda está a un clic o foco desde cualquier vista | Recorrido manual en las cuatro vistas y prueba de integración |
| SC-UX-002 | Crear un cliente desde el drawer no abandona la lista y se completa en menos de 2 minutos desde formulario vacío con los datos sintéticos de `quickstart.md` (umbral de `SC-001` de `001`), sin regresión frente al flujo anterior | Cronometraje de cinco altas: mediana y rango registrados en `README.md` |
| SC-UX-003 | Cero regresiones: las 280 pruebas actuales (278 de `001` más 2 del embudo) siguen pasando | `npm test -- --run` |
| SC-UX-004 | Cero violaciones de foco: el foco siempre entra, cicla y vuelve | Pruebas de `ui-overlay` y recorrido con teclado |
| SC-UX-005 | Ordenar y filtrar 500/1000 registros bajo 500 ms en 19 de 20 mediciones | Prueba de rendimiento extendida |
| SC-UX-006 | Cero cambios en `localStorage` después de navegar, ordenar, filtrar y consultar el panel | Comparación antes/después |

## Casos límite

- **Drawer con cambios y navegación por hash**: se pide confirmación una sola vez con el modal; “Seguir editando” restaura la vista anterior y “Descartar” no persiste cambios.
- **Dos overlays**: el alta al vuelo se abre sobre el drawer de oportunidad y el modal de confirmación se apila sobre el drawer o el modal que lo origina; solo el superior recibe foco y al cerrarse devuelve el foco al control que lo abrió.
- **Sin clientes**: el selector queda vacío, el mensaje deja de ser un bloqueo y ofrece la CTA de alta al vuelo.
- **Cliente eliminado en otra pestaña**: al guardar la oportunidad se mantiene el rechazo de referencia huérfana de `FR-019`.
- **Tabla vacía**: no se renderiza `<tbody>`; se distingue el vacío por filtro (CTA “Limpiar filtros”, que conserva el texto) del vacío por ausencia de registros (CTA “Nuevo cliente” o “Nueva oportunidad”), y nunca se muestra una tabla con encabezados sin filas.
- **Valores ausentes al ordenar**: van al final en ambos sentidos y se muestran como “sin información”.
- **Filtros y criterio**: limpiar filtros no borra el texto; limpiar el texto no borra los filtros.
- **Búsqueda sin criterio**: con el campo vacío, la vista de búsqueda permanece, muestra la pista “Escribe para buscar”, no lista resultados y no navega a otra vista.
- **Panel sin oportunidades cerradas**: “Sin datos” en la tasa de cierre; el embudo mantiene los estados con conteo y monto en cero.
- **Panel vacío**: el estado vacío ilustrado oculta la banda y el embudo; no se muestran seis columnas de “Sin oportunidades”.
- **Pantalla estrecha**: el drawer ocupa todo el viewport y la tabla permite desplazamiento horizontal sin romper el layout.

## Suposiciones y límites

- Una sola empresa, un navegador y CLP, igual que `001`.
- La validación visual es manual; no se adoptan capturas automatizadas.
- El rediseño no promete conformidad legal ni seguridad productiva.
- Las métricas del panel siguen siendo descriptivas; la distribución por etapa no es una predicción ni una tasa de conversión histórica.

## Definición de terminado

- [ ] `specs/001-crm-module/spec.md` reformula `FR-036` y `CA-06-11` y apunta a esta feature.
- [ ] Los cuatro historias tienen criterios verificables y pruebas asociadas.
- [ ] Las 280 pruebas actuales (278 de `001` más 2 del embudo) y las nuevas pasan con `npm test -- --run`.
- [ ] El embudo comercial del equipo (`5aa9799`) queda cubierto por `CA-UX-04-05` y `FR-UX-011`, atendiendo el hallazgo del Avance 03.
- [ ] `npm run lint`, `npm run format:check` y `npm run build` terminan sin errores.
- [ ] `data-model.md` confirma que no hay cambios de esquema y `contracts/ui-shell.md` describe ids, ARIA y estados.
- [ ] `quickstart.md` permite validar los escenarios de navegación, drawer, tablas y panel.
- [ ] Se registran en `README.md` los resultados reales y lo que quede pendiente.

## Anexo técnico

- Plan, arquitectura y estrategia: [`plan.md`](plan.md)
- Decisiones y alternativas: [`research.md`](research.md)
- Vistas derivadas y ausencia de cambios de esquema: [`data-model.md`](data-model.md)
- Contrato de DOM y ARIA: [`contracts/ui-shell.md`](contracts/ui-shell.md)
- Escenarios de validación: [`quickstart.md`](quickstart.md)
- Dominio heredado: [`../001-crm-module/spec.md`](../001-crm-module/spec.md) y [`../001-crm-module/contracts/entity-storage.md`](../001-crm-module/contracts/entity-storage.md)
