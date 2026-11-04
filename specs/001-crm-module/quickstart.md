# Inicio rápido y validación: módulo CRM

**Feature**: `001-crm-module` · **Especificación**: [spec.md](spec.md) · **Modelo**: [data-model.md](data-model.md) · **Contrato**: [contracts/entity-storage.md](contracts/entity-storage.md)

Esta guía describe cómo ejecutar la aplicación y cómo comprobar de punta a punta que el módulo CRM cumple los criterios de aceptación. No reemplaza a `spec.md`: los criterios de aceptación siguen siendo la fuente de verdad.

## Prerrequisitos

- Node.js y npm instalados (versiones compatibles con `package.json`).
- Navegador moderno de escritorio o móvil.
- El código base restaurado en el árbol de trabajo: `src/` e `index.html` desde el commit `dea57da`, y los tests base desde la rama `borrador`. **En el estado actual del repositorio estos archivos no están presentes**, por lo que la restauración es el primer paso de la implementación (ver `plan.md`, estrategia 1).
- Datos exclusivamente sintéticos. No usar nombres reales, RUT, datos bancarios ni información sensible.

## Puesta en marcha

```bash
npm install
npm run dev
```

Abrir la URL que imprime Vite (por defecto `http://localhost:5173`).

Para verificar la compilación y las pruebas (los comandos de calidad se habilitan en T004A):

```bash
npm test -- --run
npm run build
npm run lint
npm run format:check
```

Registrar en `README.md` (sección “Evidencias y registro de cambios”) la fecha, el comando y el resultado real. No declarar pruebas que no se hayan ejecutado.

## Datos semilla de la demo

Los escenarios 3, 4, 5 y 7 suponen datos que deben crearse una sola vez, antes de la validación manual (T066). No se cargan automáticamente:

| Registro | Valores |
|---|---|
| Cliente | **Empresa Demo 1**, código `CLI-DEMO-003`, tipo `Activo`, responsable `Ejecutivo A`, origen `Sitio web` |
| Oportunidad | Folio `3001`, serie `OPP`, asunto y montos del escenario 3 |
| Clientes del panel | Los del fixture de control de SC-007 en `data-model.md` |

Si se parte de almacenamiento vacío, crear primero estos registros y anotar en el README que son sintéticos.

## Escenario 1 — Registrar un cliente y un prospecto

**Objetivo**: comprobar `US-01`, `FR-001` a `FR-007`, `CA-01-01` a `CA-01-14`.

1. Abrir **Clientes** y seleccionar **Nuevo cliente**.
2. Registrar una empresa ficticia con nombre, código único, tipo, responsable y origen; dejar el contacto principal vacío.
3. Guardar y confirmar que el alta se informa correctamente.
4. Buscar la empresa por nombre y por código; abrir su ficha.
5. Editar el contacto principal con un correo válido y un teléfono; guardar.
6. Intentar crear otro cliente con el mismo código en minúsculas y con espacios; confirmar el rechazo.
7. Recargar la página y confirmar que el registro sigue disponible.

**Resultado esperado**: el cliente queda asociado a un `id` y un `entity_id` estables, el detalle indica “contacto incompleto” cuando corresponde, los duplicados de código se rechazan sin alterar el registro existente y los datos persisten tras recargar. Los errores conservan lo ingresado.

**Datos de ejemplo**:

| Campo | Valor |
|---|---|
| Nombre | Empresa Demo 1 |
| Código | CLI-DEMO-003 |
| Tipo | Prospecto |
| Responsable | Ejecutivo A |
| Origen | Referido |
| Correo | contacto1@example.com |

## Escenario 2 — Buscar clientes y consultar la ficha

**Objetivo**: comprobar `US-02`, `FR-008` a `FR-013`, `CA-02-01` a `CA-02-17`.

1. Con al menos tres clientes registrados, buscar por nombre completo, por una parte del nombre y por código.
2. Repetir la búsqueda cambiando mayúsculas y minúsculas y omitiendo tildes en un nombre que las tenga.
3. Buscar por el asunto y por el folio de una oportunidad; comprobar que el resultado aparece en la sección de oportunidades con su cliente vinculado.
4. Aplicar filtros de tipo, responsable y origen; comprobar que se combinan con AND y que existe una acción para limpiarlos.
5. Abrir la búsqueda sin criterio y luego buscar un texto inexistente.
6. Abrir la ficha de un cliente con y sin contacto principal.
7. Anotar el contenido almacenado antes y después de buscar y abrir fichas.

**Resultado esperado**: se muestran todos los coincidentes; los resultados de clientes y oportunidades se distinguen y la oportunidad muestra su cliente vinculado; aparecen los mensajes “Ingresa un criterio” y “Sin coincidencias”; los campos opcionales vacíos se muestran como “sin información” y la fecha de próximo contacto como “Sin programar” o el estado correspondiente; la búsqueda y la consulta no modifican el almacenamiento.

## Escenario 3 — Registrar una oportunidad

**Objetivo**: comprobar `US-04`, `FR-014` a `FR-019`, `CA-04-01` a `CA-04-14`.

**Precondición**: existe el cliente **Empresa Demo 1** (`CLI-DEMO-003`) y el folio 3001 no está registrado.

1. Abrir **Nueva oportunidad** desde **Oportunidades** y desde la ficha del cliente (el acceso desde el panel se agrega en P2).
2. Completar el formulario con los datos de la tabla siguiente.
3. Guardar y confirmar el mensaje de éxito; abrir el registro y su cliente asociado.
4. Repetir el guardado con el mismo folio y comprobar que no se duplica.
5. Probar monto cero, monto negativo o decimal, campos vacíos, fechas invertidas, cliente inexistente y cancelación con cambios sin guardar.
6. Recargar y confirmar que la oportunidad conserva identificador, cliente, folio y demás datos.

**Datos de ejemplo**:

| Campo | Valor |
|---|---|
| Cliente | Empresa Demo 1 (CLI-DEMO-003) |
| Asunto | Adquisición de compresor industrial para planta de producción |
| Folio | 3001 |
| Fecha de apertura | 2026-11-02 |
| Fecha estimada de cierre | 2026-11-30 |
| Monto estimado | 8500000 CLP |
| Responsable | Ejecutivo A |
| Notas | Cliente solicita evaluar un compresor para ampliar su capacidad productiva. |

**Resultado esperado**: se crea una sola oportunidad OPP/3001, en estado **Nueva**, moneda CLP y marcas de tiempo generadas. El folio repetido se rechaza; el monto cero se acepta; las fechas se conservan sin desplazamiento por zona horaria; un cliente inexistente no genera registros huérfanos; cancelar no crea ni modifica datos.

## Escenario 4 — Gestionar el ciclo de vida

**Objetivo**: comprobar `US-05`, `FR-020` a `FR-023`, `CA-05-01` a `CA-05-11`.

1. Abrir la oportunidad OPP/3001 y avanzar: Nueva → Contactada → Propuesta → Negociación → Ganada.
2. Crear otra oportunidad y marcarla **Perdida** sin motivo; confirmar el rechazo.
3. Repetir la pérdida con un motivo no vacío; confirmar que se guarda.
4. Intentar un salto no permitido (por ejemplo, Nueva → Ganada o Propuesta → Ganada) y reabrir una oportunidad Ganada o Perdida.
5. Editar asunto, fechas, monto, responsable, notas o folio conservando el estado final.
6. Eliminar una oportunidad con confirmación y cancelar en otro intento.

**Resultado esperado**: solo se aceptan las transiciones declaradas; `lossReason` es obligatorio al pasar a Perdida; Ganada y Perdida son finales y no se reabren; editar conserva `id`, `entity_id` y la unicidad del folio; eliminar una oportunidad no elimina al cliente y cancelar no modifica datos.

## Escenario 5 — Consultar el panel (P2)

**Objetivo**: comprobar `US-07`, `FR-024`, `CA-07-01` a `CA-07-08`.

**Alcance**: segunda iteración; no bloquea el MVP P1.

1. Abrir el panel con almacenamiento vacío.
2. Crear dos oportunidades abiertas por 100000 y 200000 CLP y una ganada por 50000 CLP.
3. Volver al panel y revisar los seis indicadores.
4. Marcar una oportunidad abierta como Perdida con motivo y volver al panel.
5. Revisar la tasa de cierre cuando no hay oportunidades cerradas.

**Resultado esperado**: se muestran clientes registrados, oportunidades abiertas, monto abierto, seguimientos vencidos, contactos para hoy y tasa de cierre; el monto abierto es 300000 CLP con dos oportunidades abiertas; al perder una oportunidad deja de sumar; sin cerradas se muestra “Sin datos”; los indicadores se recalculan al volver al panel y no se leen totales persistidos.

## Escenario 6 — Terminología y navegación

**Objetivo**: comprobar `US-06`, `FR-029`, `FR-030`, `FR-036`, `CA-06-01` a `CA-06-12`.

1. Recorrer Clientes, Oportunidades y Buscar desde la barra lateral; en P2, también Panel.
2. Revisar encabezados, botones, formularios, mensajes, estados vacíos y confirmaciones.
3. Confirmar que la vista activa se resalta y que la navegación protege cambios sin guardar.
4. Recargar y comprobar que se mantienen los términos configurados y los registros.
5. Revisar el comportamiento con una pantalla estrecha y con navegación solo por teclado.

**Resultado esperado**: se usan Cliente/Clientes y Oportunidad/Oportunidades en singular y plural, sin referencias a entidad/documento para esas funciones; existe respaldo genérico cuando no hay perfil; la vista activa se identifica; los controles son alcanzables con teclado y el foco es visible.

## Escenario 7 — Tickets de soporte (P2)

**Objetivo**: comprobar `US-03`, `FR-025`, `FR-026`, `CA-03-01` a `CA-03-08`.

**Alcance**: segunda iteración; no bloquea el MVP P1.

1. Registrar un ticket asociado a un cliente y a un producto, con motivo, descripción y prioridad.
2. Confirmar que aparece en la lista con estado **En proceso**.
3. Pasarlo a **Resuelto** y comprobar que no se puede reabrir en el MVP.
4. Intentar guardar sin cliente o sin producto; confirmar el rechazo.
5. Consultar los tickets desde la ficha del cliente y recargar.

**Resultado esperado**: el ticket conserva cliente, producto, motivo, prioridad, estado y fecha; solo se aceptan Alta, Media y Baja; el estado final no se reabre; los datos persisten tras recargar.

## Validaciones transversales

| Aspecto | Cómo comprobarlo | Resultado esperado |
|---|---|---|
| Persistencia | Navegar entre vistas y recargar el mismo navegador | Los registros conservan datos e identificadores |
| Almacenamiento lleno o corrupto | Simular cuota agotada o JSON inválido en el navegador | Error recuperable, datos previos intactos, sin éxito falso |
| Varias pestañas | Abrir dos pestañas, modificar en una y guardar en la otra | Aviso y bloqueo del guardado obsoleto hasta actualizar |
| Seguridad de renderizado | Guardar asunto o notas con etiquetas HTML o texto tipo script | Se muestran como texto, sin ejecutarse |
| Accesibilidad | Recorrer formularios, listas y mensajes solo con teclado | Controles alcanzables, foco visible, etiquetas y errores asociados |
| Contraste | Revisar texto normal y controles sobre el fondo | Contraste suficiente; si se declara WCAG AA, verificar 4.5:1 en texto normal y 3:1 en texto grande/UI |
| Compatibilidad | Probar en los navegadores declarados y en una pantalla estrecha | La interfaz funciona en al menos Chrome y Firefox actuales; registrar los navegadores realmente usados |
| Rendimiento | Cargar 500 clientes y 1000 oportunidades; medir 20 búsquedas y 20 recálculos del panel | Al menos 19 de 20 bajo 500 ms; registrar navegador y equipo |
| Referencias huérfanas | Eliminar un cliente con oportunidades y, en P2, con tickets; cancelar | Cascada atómica de oportunidades en P1 y de tickets en P2, solo con confirmación; cancelar no modifica nada |
| Terminología | Revisar todas las vistas y estados vacíos | Cliente/Clientes y Oportunidad/Oportunidades, con fallback genérico |

## Medición de usabilidad

Si el equipo ejecuta el protocolo de `plan.md`, usar 5 participantes y 4 tareas (crear, editar, eliminar y buscar). Registrar participantes anonimizados, tiempos de SC-001 a SC-003 y tasa de éxito de SC-004. SC-001 a SC-004 no bloquean la implementación, pero no se puede afirmar que se cumplen sin medirlos: si no se realiza la medición, declararlo como pendiente en `README.md`. No inventar participantes ni resultados.

## Criterios de salida

- `npm test -- --run` termina sin fallos y el resultado queda registrado.
- `npm run build` termina correctamente y el resultado queda registrado.
- `npm run lint` y `npm run format:check` terminan sin errores y el resultado queda registrado.
- El recorrido completo de `tests/integration/critical-journey.test.js` (T070) pasa.
- Se registran los navegadores realmente probados (Chrome y Firefox como mínimo).
- Para el MVP P1 se ejecutan los escenarios 1, 2, 3, 4 y 6 con datos sintéticos y sus resultados se anotan en `README.md`.
- El escenario 5 (panel) y el escenario 7 (tickets) se validan al cerrar la segunda iteración.
- La medición de usabilidad se ejecuta o se declara explícitamente como pendiente.
- Cualquier requisito no verificado se declara como pendiente; no se reporta como cumplido.

## Referencias

- Criterios de aceptación y requisitos: [spec.md](spec.md)
- Entidades, campos y fórmulas: [data-model.md](data-model.md)
- Contrato de almacenamiento: [contracts/entity-storage.md](contracts/entity-storage.md)
- Decisiones técnicas: [research.md](research.md)
- Estrategia y verificación: [plan.md](plan.md)
