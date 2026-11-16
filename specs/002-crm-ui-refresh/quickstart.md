# Inicio rápido y validación: rediseño de interfaz del CRM

**Feature**: `002-crm-ui-refresh` · **Fecha**: 2026-11-16 · **Especificación**: [spec.md](spec.md)

Esta guía valida la iteración de interfaz con datos sintéticos. No repite las reglas de negocio de `001`; para dominio, persistencia y ciclo de vida, usar [`../001-crm-module/quickstart.md`](../001-crm-module/quickstart.md).

## Prerrequisitos

- Node.js compatible con el `package.json` del repositorio.
- Dependencias instaladas (`npm install`).
- La enmienda de `FR-036` y `CA-06-11` aplicada en `specs/001-crm-module/spec.md`.
- Navegador moderno de escritorio; para responsive, una ventana redimensionable.

## Puesta en marcha

```bash
npm install
npm run dev        # desarrollo en el puerto que indique Vite
npm test -- --run  # línea base: 280 pruebas actuales + las nuevas
npm run lint
npm run format:check
npm run build
```

**Línea base esperada antes de implementar**: 29 archivos y 280 pruebas en verde (278 de `001` más 2 del embudo), `eslint` sin errores. Registrar la salida real en `README.md`; si cambia, anotar el motivo.

## Datos semilla

Usar solo datos ficticios:

| Registro | Datos |
|---|---|
| Cliente | `Empresa Demo 1`, código `CLI-DEMO-003`, tipo Prospecto, responsable Ejecutivo A, origen Referido |
| Cliente 2 | `Empresa Demo 2`, código `CLI-DEMO-004`, tipo Activo, responsable Ejecutivo B, origen Sitio web, `targetDate` ayer |
| Oportunidad | Asunto “Compresor industrial”, folio `3001`, apertura `2026-11-02`, cierre `2026-11-30`, monto `8500000`, responsable Ejecutivo A |
| Ticket | Producto “Compresor CX-200”, motivo Soporte, prioridad Media, descripción “Vibración en el arranque” |

Registrar en el `README` que los datos son sintéticos.

## Escenario 1 — Navegación y búsqueda global (US-UX-01)

1. Abrir la aplicación y quedarse en el panel.
2. Enfocar la búsqueda de la cabecera y escribir `CLI-DEMO-003`.
3. Comprobar que la vista cambia a búsqueda y muestra el cliente.
4. Revisar la barra lateral: debe contener Panel, Clientes y Oportunidades, **sin** una entrada “Buscar”.
5. Expandir Clientes y verificar “Listado / Nuevo”; repetir con Oportunidades.
6. Activar “Nuevo” en Oportunidades y comprobar que se abre el drawer vacío.
7. Navegar a otra vista con el drawer abierto y con datos escritos; verificar que aparece el modal de confirmación con “Descartar” y “Seguir editando”.
8. Usar Atrás del navegador y un enlace directo `#/search`.
9. Borrar todo el criterio y comprobar que la vista de búsqueda permanece con la pista, sin listar resultados.
10. Con dos chips activos, borrar el criterio y verificar que los filtros y el contador se conservan.
11. Revisar el control de búsqueda sobre la cabecera oscura: placeholder legible, icono de lupa decorativo, ancho contenido y anillo de foco visible al tabular hasta él.

**Resultado esperado**: la búsqueda está disponible desde cualquier vista, el criterio sobrevive la navegación, existe un único elemento activo, los submenús exponen `aria-expanded` y no hay entrada de búsqueda en el menú lateral. “Seguir editando” conserva lo escrito; “Descartar” no persiste. Sin criterio no se listan resultados y los filtros activos no se pierden. La búsqueda se lee y se enfoca con claridad sobre la cabecera oscura (`NFR-UX-005`).

## Escenario 2 — Drawer y alta de cliente al vuelo (US-UX-02)

1. Ir a Clientes → Listado y activar “Nuevo cliente”.
2. Verificar drawer, formulario vacío, obligatorios marcados y foco en el primer campo.
3. Guardar con campos vacíos: los errores aparecen dentro del drawer y el foco va al primero.
4. Completar `Empresa Demo 1`, `CLI-DEMO-003`, Prospecto, Ejecutivo A y Referido; guardar.
5. Comprobar que el drawer se cierra, se confirma la creación y la fila aparece sin recargar.
6. Activar “Editar” en la fila, cambiar el origen y guardar; verificar que `id` y `entity_id` no cambian. Comprobar que la fila no ofrece borrar y que el borrado solo está en la barra compacta con `#delete-entity`.
7. Recorrer el drawer solo con teclado: Tab, Shift+Tab y Esc; verificar que el foco no sale, que Esc abre el modal de confirmación y que “Seguir editando” devuelve el foco al drawer.
8. Abrir Oportunidades → Nuevo con almacenamiento vacío.
9. Verificar que el selector no bloquea y que aparece “Crear cliente ahora”.
10. Escribir asunto, folio, fechas y monto; abrir el alta al vuelo y crear un cliente válido.
11. Confirmar que el cliente queda seleccionado y que el formulario de oportunidad conserva lo escrito.
12. Guardar la oportunidad. Repetir el alta al vuelo y cancelar.
13. En el listado de oportunidades, comprobar que la única acción por fila es “Editar” y que `#edit-document` / `#delete-document` siguen en la barra compacta.

**Resultado esperado**: el alta y la edición no abandonan la lista; el foco entra, cicla y vuelve; el descarte exige el modal propio y nunca `window.confirm()`; los datos del formulario de oportunidad sobreviven al alta al vuelo; cancelar el alta no crea registros; las validaciones son las mismas de `001`; la eliminación solo existe en la barra heredada.

## Escenario 3 — Tablas, orden y filtros (US-UX-03)

1. Buscar clientes y revisar la tabla: monograma, nombre, código, tipo, responsable, origen, próximo contacto y acciones.
2. Ordenar por responsable ascendente y luego descendente; comprobar `aria-sort` en el encabezado.
3. Ordenar por próximo contacto y verificar que los valores vacíos quedan al final.
4. Abrir “Filtros” y activar un chip de tipo y uno de origen; comprobar el contador y los resultados.
5. Cambiar el selector de tipo y verificar que el chip refleja el cambio.
6. Pulsar “Limpiar”: chips y selectores se desactivan y el criterio escrito se conserva.
7. Repetir la búsqueda combinando texto y dos filtros; verificar AND.
8. Buscar una oportunidad por folio y comprobar que aparece en su sección con el cliente vinculado.
9. Escribir un criterio sin coincidencias: verificar el estado vacío con CTA “Limpiar filtros” y que el texto se conserva al limpiarlos.
10. Vaciar el almacenamiento y abrir un listado sin registros: verificar el estado vacío con CTA “Nuevo cliente” o “Nueva oportunidad”.
11. Ir a Clientes → Listado y confirmar que no hay barra de filtros ni chips; volver a la búsqueda y comprobar que criterio y filtros siguen activos.
12. Crear 50 clientes de prueba y desplazarse por el listado: el encabezado debe permanecer visible y los montos y fechas deben quedar alineados a la derecha.
13. Escribir un nombre de cliente más ancho que su columna y verificar el truncado con puntos suspensivos sin que la tabla desborde el contenedor.
14. Repetir el recorrido solo con teclado, incluyendo el contenedor desplazable de la tabla.

**Resultado esperado**: las tablas tienen caption accesible, el orden es estable y anunciado, los vacíos quedan al final, chips y selectores coinciden siempre y los resultados de oportunidades no se mezclan sin etiqueta con los de clientes. La acción por fila es solo “Editar”; el estado vacío distingue filtro de ausencia de datos; los listados no duplican la barra de filtros. La tabla mantiene el encabezado visible al desplazarse, alinea montos y fechas para compararlos y trunca el texto largo solo visualmente.

## Escenario 4 — Panel vacío, panel con datos, distribución y tablero (US-UX-04)

1. Abrir el panel con `localStorage` vacío.
2. Verificar icono decorativo, título, explicación y CTA “Registra tu primer cliente”; ni la banda de KPIs, ni la distribución, ni el tablero deben verse.
3. Activar la CTA y comprobar que abre el drawer de nuevo cliente.
4. Crear dos clientes y tres oportunidades: dos abiertas por `100000` y `200000`, una ganada por `50000`.
5. Volver al panel: verificar la banda de seis KPIs, la banda de distribución con seis filas, una por estado, y el tablero con seis columnas.
6. Comprobar `Monto abierto = 300000` y `Oportunidades abiertas = 2`.
7. Revisar la distribución: cada fila muestra etiqueta, conteo, monto y una barra proporcional al **conteo**; los estados sin oportunidades aparecen en cero con barra de ancho `0` y ningún valor dice “NaN”.
8. Comparar los conteos y montos de la distribución con los del tablero: deben coincidir exactamente por estado, porque leen la misma función.
9. Pulsar la tarjeta de una oportunidad en el tablero y comprobar que abre su edición existente.
10. Marcar una oportunidad abierta como Perdida con motivo y volver al panel.
11. Comprobar el recálculo de monto, conteo, distribución, tablero y ancho de las barras.
12. Revisar la tasa de cierre sin oportunidades cerradas y con una cerrada.
13. En una segunda sesión con solo clientes y ninguna oportunidad, comprobar que la banda de indicadores y la distribución aparecen con ceros y que el tablero queda oculto, sin seis columnas vacías.
14. Comparar `localStorage` antes y después de todo el recorrido.

**Resultado esperado**: el estado vacío solo aparece sin datos y entonces oculta banda, distribución y tablero; los indicadores coinciden con las fórmulas de `001`; la distribución es una lectura compacta y proporcional de la cartera y el tablero conserva el marcado y las tarjetas del equipo; ambas presentaciones muestran siempre las mismas cifras; con clientes y sin oportunidades no se dibujan columnas vacías ni se divide por cero; cada tarjeta abre la edición; la tasa de cierre dice “Sin datos” cuando corresponde; no se agregaron claves ni totales.

## Escenario 5 — Sistema visual, superficies y responsive (CA-UX-05)

1. Abrir las cuatro vistas y comprobar que ninguna tiene el fondo de página ni el de sección teñidos de verde; el verde aparece solo en la CTA, el estado activo y el dato destacado.
2. Medir el contraste de `--text-muted` sobre `#F7F8FA`, `#FFFFFF`, `#E6EDE9` y la cabecera `#123C36`; anotar los cuatro valores.
3. Buscar `#` en `src/styles.css`, `index.html` y `src/`: todo hexadecimal debe vivir en `:root` (o en el bloque de tema oscuro si se entregó).
4. Recorrer paddings, gaps y márgenes: todos deben pertenecer a 4/8/12/16/24/32/48/64 px.
5. Revisar las superficies: página plana, secciones con borde de 1 px y sombra solo en drawer, modal y popover. Ningún bloque debe acumular borde, sombra, radio y franja.
6. Recorrer botones y campos: mismas alturas (32/40 px), cuatro variantes y estados `hover`, `active`, `disabled`, `loading` y foco visible. Buscar `.primary`: no debe aparecer.
7. Activar `prefers-reduced-motion: reduce` en el sistema operativo o en las DevTools y repetir apertura de drawer, hover y navegación: sin transición ni animación.
8. Desactivar la preferencia y comprobar que las transiciones duran entre 120 y 160 ms.
9. A 768 px: el rail de iconos ya no existe; `#nav-toggle` abre el sidebar con “Listado” y “Nuevo” completos, `aria-expanded` cambia, Esc cierra y el foco vuelve al botón.
10. A 390 px: cada fila de tabla se presenta como tarjeta con etiqueta por celda, sin desplazamiento horizontal forzado y conservando la acción “Editar”.
11. Si se entregó tema oscuro: cambiar la preferencia del sistema y comprobar contraste AA y que no aparece ninguna clave nueva en `localStorage`. Si no se entregó: confirmar que `README.md` lo declara pendiente.

**Resultado esperado**: la interfaz es neutra con acento verde, sin hexadecimales sueltos ni espaciados arbitrarios; cada bloque comunica un solo nivel de elevación; botones y campos comparten un único vocabulario; el movimiento es breve y se anula con la preferencia del sistema; a 768 px la navegación conserva los submenús y a 390 px la tabla sigue siendo legible como tarjetas; el tema oscuro cumple o queda declarado pendiente.

## Validaciones transversales

| Aspecto | Cómo comprobarlo | Resultado esperado |
|---|---|---|
| Regresión | `npm test -- --run` | Las 280 pruebas actuales y las nuevas pasan |
| Teclado | Recorrer cabecera, submenús, drawer, tabla, chips y panel | Todo alcanzable, foco visible y devuelto |
| Foco en overlay | Abrir y cerrar solo con teclado; abrir dos overlays | El foco entra, cicla, no sale y vuelve al disparador correcto |
| Cambios sin guardar | Escribir y cerrar con Esc, con el veló y al navegar | Modal propio con “Descartar” / “Seguir editando”; “Seguir editando” conserva, “Descartar” no persiste y no aparece `window.confirm()` |
| Responsive | 1440, 1024, 768 y 390 px | Sin desbordamiento; drawer a pantalla completa bajo 640 px; a 768 px nav desplegable con “Listado / Nuevo”; a 390 px tabla como tarjetas |
| Contraste | Medir `--text-muted` sobre página, tarjeta, columna del tablero y cabecera; CTA, placeholder y anillo de foco | ≥ 4.5:1 en texto y placeholder; ≥ 3:1 en controles y foco |
| Paleta | Buscar hexadecimales en `src/styles.css`, `index.html` y `src/` | Cero colores fuera de `:root`; base neutra y verde solo de acento |
| Espaciado | Auditar `padding`, `gap` y `margin` | Solo 4/8/12/16/24/32/48/64 px |
| Superficies | Revisar `.card`, `.stat-card`, `.action-card`, `.commercial-column`, `.drawer`, `.modal` | Una sola señal de elevación por bloque; sombra solo en lo elevado |
| Componentes | Recorrer botones y campos; buscar `.primary` | Mismo vocabulario, dos tamaños y estados completos; sin alias |
| Movimiento | Alternar `prefers-reduced-motion` y medir duración | Sin transición al reducir; 120–160 ms por defecto |
| Navegación móvil | A 768 px abrir/cerrar con teclado y clic fuera | Submenús completos, `aria-expanded`, Esc y foco devuelto |
| Tabla en móvil | A 390 px revisar una tabla | Tarjetas con etiqueta por celda, sin scroll horizontal forzado |
| Tema oscuro | Alternar `prefers-color-scheme` (si se entregó) | AA en los cuatro pares y ninguna clave nueva en `localStorage`; si no, declarado pendiente |
| Tipografía | Recorrer las cuatro vistas y buscar `font-size` en `styles.css` | Solo los cinco pasos de la escala; ninguna medida suelta |
| Densidad de tabla | 50 filas y un valor de texto largo | Encabezado visible al hacer scroll, montos alineados a la derecha y truncado sin desbordamiento |
| Sin cambios de datos | Comparar `localStorage` antes/después de navegar, ordenar, filtrar y consultar | Mismas claves y campos; `schemaVersion` intacto |
| Rendimiento | 500 clientes y 1000 oportunidades; 20 búsquedas y 20 ordenamientos | Al menos 19 de 20 bajo 500 ms; registrar equipo y navegador |
| Seguridad | Guardar asunto o notas con HTML o texto tipo script | Se muestran como texto; sin ejecución |
| Terminología | Revisar las cuatro vistas y estados vacíos | Cliente/Clientes y Oportunidad/Oportunidades, sin “entidad” ni “documento” |

## Criterios de salida

- `specs/001-crm-module/spec.md` enmendado en `FR-036` y `CA-06-11`.
- `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build` sin errores, con salida registrada en `README.md`.
- Escenarios 1 a 5 ejecutados con datos sintéticos y resultados anotados.
- Validación manual de teclado, contraste y responsive registrada con navegador y dimensiones.
- Distribución y tablero verificados con las mismas cifras por estado, y panel con clientes sin oportunidades sin columnas vacías ni `NaN`.
- Escala tipográfica auditada y contraste de la búsqueda sobre la cabecera oscura medido y anotado.
- Auditoría de `SC-UX-009` registrada: cero hexadecimales fuera de `:root`, cinco tamaños tipográficos, espaciados de la escala y ausencia de `.primary`.
- Contraste de `--text-muted` medido sobre los cuatro fondos reales y registrado (`SC-UX-010`).
- Navegación a 768 px y tabla como tarjetas a 390 px verificadas con capturas (`SC-UX-011`).
- Movimiento reducido comprobado; tema oscuro entregado con AA o declarado pendiente.
- Comparación de `localStorage` documentada, incluida la ausencia de claves nuevas del tema.
- Cualquier criterio no verificado se declara pendiente; no se reporta como cumplido.

## Referencias

- Requisitos y criterios: [spec.md](spec.md)
- Vistas derivadas y ausencia de cambios de esquema: [data-model.md](data-model.md)
- Contrato de DOM y ARIA: [contracts/ui-shell.md](contracts/ui-shell.md)
- Decisiones y alternativas: [research.md](research.md)
- Arquitectura y verificación: [plan.md](plan.md)
- Dominio heredado: [../001-crm-module/spec.md](../001-crm-module/spec.md) y [../001-crm-module/quickstart.md](../001-crm-module/quickstart.md)
