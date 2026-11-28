# Quickstart: validación del ticket de post-venta

**Feature**: `004-ticket-postventa` | **Plan**: [plan.md](plan.md) | **Modelo**: [data-model.md](data-model.md) | **Contratos**: [ticket-storage.md](contracts/ticket-storage.md), [ticket-ui.md](contracts/ticket-ui.md) | **Especificación**: [spec.md](spec.md)

## Propósito

Esta guía permite comprobar de punta a punta que el ticket de post-venta funciona: bandeja global, folio y asunto, solicitante y responsable, ciclo de vida, SLA, historial, indicadores, satisfacción, migración y regresión. No sustituye las pruebas automatizadas; las complementa con un recorrido manual reproducible.

No se declaran resultados que no se hayan ejecutado. Cada evidencia debe registrar fecha, comando, navegador, equipo y resultado real.

## Prerrequisitos

- Node.js y npm instalados.
- Dependencias instaladas: `npm install`.
- Navegador moderno de escritorio (Chrome o Firefox actual) y, si se valida responsive, una ventana móvil o emulación.
- El repositorio en la raíz `Grupo-04`.
- Datos de demostración: al menos tres clientes; uno con dos contactos y una oportunidad.

## 1. Línea base automatizada

Ejecutar desde la raíz:

```text
npm test -- --run
npm run lint
npm run format:check
npm run build
```

**Esperado**:

- La suite completa pasa. La línea base registrada al 2026-11-28 es de **57 archivos y 461 pruebas**; la iteración agrega archivos y pruebas, por lo que el total debe ser mayor y no debe haber fallos.
- `eslint` no reporta errores.
- Prettier no reporta diferencias.
- Vite construye `dist/` sin errores.

Registrar en `README.md` el total real de archivos y pruebas, la duración y el resultado. No copiar cifras de esta guía.

## 2. Levantar la aplicación

```text
npm run dev
```

Abrir la URL que imprime Vite (por defecto `http://localhost:5173`). Verificar que la barra lateral muestra **Tickets** y que `#/tickets` abre la bandeja.

## 3. Datos de control

Crear desde la interfaz tres clientes y, en uno de ellos, dos contactos y una oportunidad. Anotar los nombres y códigos. No se requiere un script de carga.

Para los escenarios de SLA e indicadores se usan fechas de creación controladas. En la validación automatizada se controlan con el reloj de Vitest; en la manual se pueden ajustar en una copia local de los datos con las herramientas del navegador, marcando claramente que es una manipulación de prueba y no un flujo de usuario.

### Muestra de control para el panel

Con `now` como instante de la prueba, preparar estos seis tickets (el orden es solo de referencia):

| # | Prioridad | Estado | `createdAt` | `resolvedAt` | CSAT | Resultado esperado |
|---|---|---|---|---|---|---|
| A | Alta | Nuevo | `now - 2 h` | — | — | Abierto; SLA `En plazo` (quedan 22 h). |
| B | Media | En proceso | `now - 60 h` | — | — | Abierto; SLA `Por vencer` (quedan 12 h ≤ 18 h). |
| C | Alta | En espera | `now - 30 h` | — | — | Abierto; SLA `Vencido` (objetivo 24 h). |
| D | Baja | Resuelto | `now - 200 h` | `now - 100 h` | 5 | Resuelto en 100 h; cumplió SLA (objetivo 168 h). |
| E | Media | Resuelto | `now - 100 h` | `now - 10 h` | 3 | Resuelto en 90 h; incumplió SLA (objetivo 72 h). |
| F | Baja | Cerrado | `now - 300 h` | `now - 250 h` | 4 | Resuelto en 50 h; cumplió SLA; cerrado. |

**Panel esperado**:

| Indicador | Valor |
|---|---|
| Tickets abiertos | `3` (A, B, C) |
| Tickets vencidos de SLA | `1` (C) |
| Tickets por prioridad (abiertos) | Alta `2`, Media `1`, Baja `0` |
| Tiempo medio de resolución | `80.0` h → `(100 + 90 + 50) / 3` |
| Cumplimiento de SLA | `66.7 %` → `2 / 3` (D y F) |
| Satisfacción promedio | `4.0` → `(5 + 3 + 4) / 3` |

Los tickets `Resuelto` y `Cerrado` no cuentan como abiertos ni como vencidos abiertos. Un cambio en cualquier ticket debe reflejarse al volver al panel, sin recargar totales persistidos.

## 4. Migración v3 → v4

### 4.1 Preparar una instantánea v3

En un navegador limpio, con la aplicación detenida o antes de migrar:

1. Abrir las herramientas de desarrollo y revisar `localStorage`.
2. Comprobar que existen `erp_base_module:schemaVersion` con `{"schemaVersion":3}` y `erp_base_module:tickets` con tickets sin `folio`, `subject`, `channel`, `assignee`, `team` ni `history`.
3. Si el almacenamiento ya está en v4, usar una copia de seguridad v3 o los fixtures de `tests/unit/storage-migration.test.js`; no se debe editar el almacenamiento de producción de la demo sin respaldo.

### 4.2 Aviso y cancelación

1. Recargar la aplicación.
2. Verificar que aparece el aviso de migración con la versión detectada y los pasos, y que **no** se modificó nada.
3. Abrir la confirmación; comprobar que es un diálogo accesible (no `window.confirm()`), que `Escape` cancela y que el foco vuelve al botón.
4. Cancelar. Verificar que `schemaVersion` sigue en 3 y que los tickets no cambiaron.

### 4.3 Aplicar la migración

1. Volver a abrir el aviso y confirmar la migración.
2. Verificar en `localStorage`:
   - `erp_base_module:crmBackup:v3` existe y contiene `{ createdAt, schemaVersion: 3, collections, ticketCount }`.
   - `erp_base_module:schemaVersion` es 4.
   - Cada ticket tiene folio `TKT-AAAA-####` único, asunto no vacío, `slaDueAt` calculado (si `createdAt` y `priority` son válidos) y una entrada `migracion` en `history`.
   - `firstResponseAt`, `closedAt`, `channel`, `assignee`, `team`, `satisfactionScore` y `satisfactionComment` están vacíos o ausentes cuando no existían; no se inventaron.
   - Clientes, oportunidades, contactos, actividades y papelera conservan sus registros.
3. Abrir la bandeja y comprobar que los tickets migrados aparecen con folio, asunto copiado de la descripción, “Sin asignar”, “Canal no registrado” y el SLA calculado con su fecha real. Un ticket abierto antiguo puede aparecer `Vencido`; es un resultado veraz.

### 4.4 Recuperación explícita

La restauración es una operación explícita y no borra el respaldo. En un entorno de desarrollo con Vite se puede ejecutar desde la consola del navegador:

```js
const storage = await import('/src/storage.js');
storage.restoreMigrationBackup();
location.reload();
```

**Esperado**: las colecciones vuelven a la instantánea v3, `schemaVersion` vuelve a 3 y el aviso de migración aparece de nuevo. Si la restauración falla, la instantánea actual se conserva y se informa el error.

> En una demo sin servidor de desarrollo, documentar el procedimiento de recuperación en `README.md` y no prometer un botón que no exista.

## 5. Alta desde la bandeja

1. Entrar a **Tickets** (`#/tickets`).
2. Seleccionar **Nuevo ticket**.
3. Completar: cliente, asunto, descripción, producto, motivo, prioridad, canal, contacto (o datos de respaldo), técnico, equipo, garantía y vínculo de origen.
4. Guardar.

**Esperado**:

- El ticket se crea en estado `Nuevo`, con folio `TKT-AAAA-####` y una entrada `creacion` en el historial.
- La bandeja se actualiza sin recargar y el ticket aparece según los filtros y el orden vigentes.
- El folio no es editable; si se intenta modificar por la interfaz o por escritura directa, se rechaza.
- El asunto queda recortado y limitado a 120 caracteres; la descripción sigue siendo un campo separado.
- El canal es obligatorio en el alta; el correo del solicitante se valida si está presente.
- La garantía muestra “En garantía”, “Fuera de garantía” o “Garantía no registrada” según el día local.
- El vínculo de origen solo acepta una oportunidad del mismo cliente.

**Casos de rechazo**:

- Sin asunto, sin descripción, sin cliente o sin producto: se impide guardar, se identifica el campo y se conserva lo escrito.
- Contacto de otro cliente o inexistente: se rechaza y se pide elegir uno válido.
- Canal, técnico o equipo fuera del catálogo: se rechaza.
- Garantía con formato inválido: se rechaza.
- Documento de otro cliente: se rechaza.

## 6. Filtros, orden y estados vacíos

1. Crear tickets con distintos estados, prioridades y técnicos.
2. Aplicar estado + prioridad + técnico y comprobar que la lista cumple **todos** los criterios (AND).
3. Elegir “Todos” en un filtro y comprobar que deja de restringir.
4. Ordenar por “Prioridad y SLA”: verificar `Alta` → `Media` → `Baja`; dentro de cada prioridad, el vencimiento más próximo primero; empates por `createdAt` y `folio`.
5. Cambiar a “Vencimiento SLA” y “Más reciente”; verificar el orden.
6. Pulsar “Limpiar filtros”: vuelven todos los tickets, el orden predeterminado y se anuncia el cambio.
7. Vaciar los filtros hasta no tener coincidencias: aparece “No hay tickets que coincidan con los filtros” con la acción de limpiar.
8. En un almacenamiento sin tickets: aparece “No hay tickets registrados” con la acción de alta.

**Esperado**: los filtros y el orden no se persisten al recargar; la vista vuelve al estado inicial.

## 7. Ciclo de vida y cierre

1. Abrir un ticket `Nuevo` y pasarlo a `En proceso`. Verificar que se genera `firstResponseAt` y una entrada `estado`.
2. Pasarlo a `En espera` con una nota (por ejemplo, “Cliente” o “Repuesto o proveedor”). Verificar que la nota queda en el historial y que el SLA sigue corriendo.
3. Reanudar a `En proceso`.
4. Resolver con un resumen no vacío. Verificar que se guarda `resolutionSummary`, se genera `resolvedAt` y el estado es `Resuelto` en una sola operación.
5. Cerrar. Verificar que se genera `closedAt`, el estado es `Cerrado` y el ticket queda de solo lectura.
6. Intentar reabrir un `Resuelto` a `Nuevo`, `En proceso` o `En espera`: la interfaz no ofrece la acción y el almacenamiento rechaza la transición.
7. Intentar cambiar cualquier dato de un `Cerrado`: se rechaza.
8. Recargar: el estado, la solución, las fechas y el historial permanecen.

**Rechazos esperados**: `Nuevo → Resuelto`, `Nuevo → Cerrado`, `En espera → Nuevo`, cualquier salida de `Cerrado` y resolver sin resumen.

## 8. SLA

1. Crear tickets `Alta`, `Media` y `Baja` y comprobar el objetivo: 24 h, 72 h y 168 h desde `createdAt`.
2. Verificar los tres semáforos: `En plazo`, `Por vencer` (≤ 25 % restante: 6 h, 18 h y 42 h) y `Vencido` (`now >= slaDueAt`).
3. Cambiar la prioridad de un ticket abierto: el objetivo se recalcula desde `createdAt`, no se reinicia el reloj y el cambio queda en el historial.
4. Resolver un ticket: el resultado final compara `resolvedAt` con el objetivo vigente y se muestra `En plazo` o `Vencido`; sin `resolvedAt` verificable, `Sin datos`.
5. Intentar cambiar la prioridad de un `Resuelto` o `Cerrado`: se rechaza.
6. Volver a la bandeja después de cambiar la hora del sistema o del día: el semáforo se recalcula; no se lee un total persistido.
7. Confirmar que `En espera` no pausa el SLA.

**Automatizado**: los límites exactos se validan en `tests/unit/ticket-sla.test.js` con reloj controlado; el recorrido manual comprueba la presentación y el recálculo.

## 9. Historial

1. Crear un ticket y cambiar estado, prioridad y técnico; resolver y cerrar.
2. Abrir el detalle y comprobar una entrada por cambio, de la más reciente a la más antigua, con tipo, fecha, actor y valores anterior/nuevo cuando corresponda.
3. Verificar que la creación incluye el folio, la resolución un resumen legible y la satisfacción una entrada separada.
4. Recargar y comprobar que el historial se conserva íntegro, sin duplicados ni reconstrucciones.
5. Simular un fallo de guardado (cuota agotada o error inyectado en la prueba): no se modifica el ticket ni queda una entrada parcial; se conserva lo ingresado para reintentar.

## 10. Satisfacción

1. Resolver un ticket con nota `4` y comentario; resolver otro con nota `2`.
2. Comprobar el promedio en el panel y en la ficha del cliente.
3. Intentar guardar `0`, `6`, un decimal o texto: se rechaza con el mensaje “nota entera de 1 a 5” y se conserva lo escrito.
4. Intentar un comentario de 501 caracteres: se rechaza con el máximo; los espacios al inicio y al final se recortan.
5. En un ticket `Resuelto`, registrar la satisfacción desde el detalle y verificar que no cambia el estado ni `resolvedAt`.
6. Cerrar el ticket y comprobar que la satisfacción queda en solo lectura.
7. Recargar: nota, comentario y promedio permanecen.

## 11. Indicadores del panel

1. Cargar la muestra de control de la sección 3.
2. Abrir el panel y comparar cada indicador con la tabla esperada.
3. Cambiar un ticket (por ejemplo, resolver uno abierto) y volver al panel: todos los indicadores se recalculan.
4. Abrir la ficha de un cliente con tickets: el promedio CSAT coincide con el panel para ese subconjunto.
5. Probar con almacenamiento sin tickets: los indicadores muestran `0` o “Sin datos” según corresponda; no hay errores de división por cero.
6. Verificar que los seis indicadores comerciales y las dos tarjetas de actividades existentes siguen presentes.

## 12. Eliminación individual

1. Abrir un ticket y pulsar “Eliminar”.
2. Verificar que la confirmación indica folio y asunto, aclara que el cliente no se elimina y que la acción es definitiva.
3. Cancelar: no se modifica nada.
4. Confirmar: se elimina solo el ticket y su historial; el cliente, sus oportunidades, contactos, actividades y otros tickets permanecen.
5. Recargar: el ticket no reaparece.

## 13. Accesibilidad y teclado

Recorrer solo con teclado:

1. Navegar a **Tickets** con `Tab`/`Enter`.
2. Recorrer filtros y orden; aplicar y limpiar.
3. Enfocar una fila y abrir el detalle con `Enter` o `Espacio`.
4. Recorrer el detalle, abrir “Cambiar estado”, “Resolver”, “Cerrar” y “Eliminar”.
5. Cerrar cada overlay con `Escape` y comprobar que el foco vuelve al control de origen.
6. Verificar foco visible, etiquetas asociadas, `aria-sort`, mensajes `aria-live` y que el semáforo tiene texto e icono además del color.
7. Completar el recorrido crear → espera → resolver → cerrar → historial → satisfacción sin ratón (SC-026).

## 14. Rendimiento

1. Preparar 1000 tickets (fixture de rendimiento o datos sintéticos; no se declara como uso real).
2. Abrir la bandeja, aplicar filtros y ordenar.
3. Medir 20 veces; al menos 19 deben completarse en menos de 500 ms (FR-075, SC-027).
4. Registrar navegador, versión, sistema, equipo y método de medición.
5. Si no se cumple, registrar el resultado real y abrir una tarea de optimización; no declarar el presupuesto cumplido sin evidencia.

**Automatizado**: `tests/performance/search-performance.test.js` amplía el presupuesto existente con la bandeja de 1000 tickets; el resultado de jsdom no reemplaza la medición en navegador.

## 15. Regresión

Comprobar que siguen funcionando:

- Alta, edición, búsqueda y eliminación de clientes.
- Alta, edición, ciclo y borrado de oportunidades.
- Contactos múltiples, principal único y reasignación al eliminar.
- Actividades, vencimientos y finalización.
- Búsqueda global y filtros.
- Papelera: mover, restaurar y purgar.
- Panel con indicadores comerciales y de actividades.
- Enlaces directos y botón Atrás: una ruta inválida cae en una vista válida.

La suite completa debe quedar en verde y no debe reducir la cobertura de US-01 a US-16.

## 16. Evidencia a registrar

En `README.md`, agregar una fila por hito con:

- fecha;
- comando ejecutado y resultado real (archivos, pruebas, duración, build);
- navegador y versión;
- sistema operativo y equipo;
- escenarios manuales recorridos;
- cualquier desviación, resultado no alcanzado o tarea pendiente.

No declarar pruebas, participantes, mediciones ni validaciones que no se hayan ejecutado.

## 17. Diagnóstico rápido

| Síntoma | Revisión |
|---|---|
| No aparece “Tickets” | `VIEW_IDS.tickets`, `availableViews()`, `#nav-tickets` y el registro en `shell.js`. |
| La bandeja está vacía con datos | Verificar `erp_base_module:tickets` y que la migración esté aplicada. |
| El aviso de migración no desaparece | Confirmar que `schemaVersion` es 4 y que las escrituras no están bloqueadas. |
| Folio repetido o inválido | Revisar `nextTicketFolio`, la unicidad global y el límite 9999. |
| El SLA no cambia | Verificar que se recalcula con `createdAt` y `priority`, no con un valor persistido. |
| El historial no aparece | Confirmar que el evento se agregó antes de `saveSnapshot` y que el ticket es v4. |
| Error de cuota | Liberar espacio o restaurar el respaldo; no borrar `crmBackup:v3` durante la migración. |
| Un ticket migrado aparece vencido | Es esperado si su `createdAt` es antiguo; el SLA usa la fecha real. |
| El panel muestra “Sin datos” | Verificar que existan tickets con `resolvedAt` válido o notas CSAT; no es un error de división por cero. |

## Referencias

- Reglas, campos y migración: [data-model.md](data-model.md).
- Operaciones y errores: [ticket-storage.md](contracts/ticket-storage.md).
- Vistas, IDs y accesibilidad: [ticket-ui.md](contracts/ticket-ui.md).
- Decisiones y alternativas: [research.md](research.md).
- Criterios de aceptación: [spec.md](spec.md).
