# Investigación (Fase 0): rediseño de interfaz del CRM

**Fecha**: 2026-11-16 · **Especificación**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Dominio heredado**: [../001-crm-module/spec.md](../001-crm-module/spec.md)

Este documento resuelve las decisiones técnicas de la iteración de interfaz. No quedan `NEEDS CLARIFICATION`. Cada decisión indica qué se eligió, por qué y qué alternativas se descartaron. La línea base verificada antes de diseñar es: **29 archivos y 280 pruebas en verde**, `npm run lint` sin errores.

## Navegación: búsqueda global en la cabecera

**Decisión**: mover el criterio de búsqueda a un único control `#global-search-input` en `.topbar`. Al enfocar o escribir, la aplicación navega a `#/search` mediante `showModule('search')` y reutiliza `refreshSearch()`. La vista de búsqueda conserva filtros, resultados y ficha, pero **no** tiene input propio. La entrada “Buscar” desaparece de la barra lateral.

**Justificación**: la búsqueda es una acción transversal y hoy compite con las secciones en el menú. Un único input elimina la duplicación de estado entre cabecera y vista, y mantiene una sola fuente de verdad (`FR-UX-001`). jsdom permite probar el flujo sin dependencias nuevas.

**Alternativas consideradas**:

- **Dos inputs sincronizados** (cabecera y vista): duplica estado, foco y pruebas, y permite divergencias. Descartada.
- **Command palette con atajo de teclado**: buena para usuarios expertos, pero oculta la búsqueda a quien no conoce el atajo y añade un componente y un patrón nuevo. Descartada para el MVP.
- **Mantener “Buscar” solo en la barra lateral**: es el problema actual; no resuelve la encontrabilidad.
- **Mantener ambos, con la entrada lateral enfocando la cabecera**: conserva un elemento de menú sin función propia. Descartada.

## Formularios: drawer lateral reutilizable

**Decisión**: implementar `src/components/ui-overlay.js` como controlador genérico de drawer y modal. El drawer aloja los formularios existentes **moviéndolos** en el DOM, sin reescribir `entity-form.js`, `document-form.js` ni `ticket-form.js`. Ancho de 480 px; pantalla completa bajo 640 px.

**Justificación**: los formularios ya están probados y sus ids forman parte del contrato de pruebas. Mover el contenedor en lugar de reescribir el formulario reduce el riesgo de regresión y satisface `FR-UX-003`. Una sola primitiva para drawer y modal evita dos implementaciones de foco, cierre y confirmación.

**Alternativas consideradas**:

- **Modal centrado**: incómodo para el formulario de oportunidad, que es largo y tiene dos columnas de campos. Descartada.
- **Página completa con `max-w-3xl` y panel lateral**: cumple el ancho, pero obliga a abandonar la lista y a resolver manualmente el retorno y el estado de la vista. Descartada.
- **Duplicar el formulario dentro de un diálogo**: duplica validación, ids y pruebas. Descartada.
- **Navegación a una ruta de edición**: exige router, que queda fuera del alcance.

## Submenús: “Listado” y “Nuevo”, sin “Reportes”

**Decisión**: Clientes y Oportunidades se convierten en grupos expandibles con dos entradas: “Listado” y “Nuevo”. Se generan desde `ModuleConfig`, reflejan el estado con `aria-expanded` y marcan la vista activa con `aria-current="page"`.

**Justificación**: son las dos acciones reales y ya implementadas. “Reportes” no tiene requisito, dato ni vista; añadirlo crearía un flujo muerto y contradiría el Principio III de la constitución (claridad y recuperación sin ambigüedad).

**Alternativas consideradas**:

- **Añadir “Reportes” con la distribución por etapa**: exige una historia nueva, una vista propia y un requisito que hoy no existe. Descartada.
- **Mantener navegación plana**: no mejora la encontrabilidad ni reduce el ruido del menú.
- **Acordeón con submenú siempre visible**: ocupa espacio vertical y compite con el contenido; se prefiere expandible.

## Alta de cliente al vuelo

**Decisión**: modal con los cinco campos obligatorios de cliente (nombre, código, tipo, responsable y origen) y correo y teléfono opcionales. Al guardar con `addEntity` se actualiza `#document-entity`, se selecciona el nuevo `entity_id` y se devuelve el foco al botón que abrió el modal. El formulario de oportunidad **no se limpia**.

**Justificación**: convierte el bloqueo de `CA-04-03` en un flujo continuo sin salir del contexto. Reutiliza `validateClient` y `addEntity`, por lo que no duplica reglas ni persistencia (`FR-UX-006`, `FR-019` de `001`).

**Alternativas consideradas**:

- **Navegar a Clientes y volver**: es el flujo actual y el que se quiere eliminar.
- **Crear el cliente con datos mínimos sin validar catálogos**: rompería `FR-005` y `FR-002`.
- **Precargar el cliente como borrador dentro de la oportunidad**: crea referencias huérfanas y contradice `FR-019`.

## Panel: estado vacío, KPIs y distribución por etapa

**Decisión**: el panel expone **dos presentaciones de una sola fuente**. `stageDistribution(documents, statuses)` se extrae del cálculo inline de `src/components/commercial-board.js` (commit `5aa9799`) a `src/crm-metrics.js`. Sobre esa función se montan:

1. `#stage-distribution`: banda compacta y no interactiva, con una fila por estado (etiqueta, conteo, monto y barra `aria-hidden` proporcional al **conteo**).
2. `#commercial-board`: el tablero del equipo, que conserva su marcado, sus clases y sus tarjetas accionables, y que pasa a consumir la misma función.

Si `entities` y `documents` están vacíos, se muestra `#dashboard-empty-state` con **composición de icono** (círculo tenue de 72 px + icono de 48 px), título, explicación y CTA “Registra tu primer cliente”, ocultando banda de KPIs, distribución y tablero. Si hay clientes pero ninguna oportunidad, la banda y la distribución se muestran con ceros y el tablero queda oculto.

**Justificación**: seis tarjetas de “0” no aportan contexto (`CA-07-03` de `001`), pero el tablero del equipo resuelve la lectura accionable y sería un desperdicio reescribirlo. Al mismo tiempo, seis columnas de tarjetas en una grilla de tres por fila no son una distribución: no se leen de un vistazo y crecen en altura con cada oportunidad. Separar las dos presentaciones resuelve ambos problemas sin duplicar datos: la objeción original a `#stage-distribution` era el riesgo de divergencia, y ese riesgo desaparece cuando ambas consumen la misma llamada en el mismo render. La barra se escala por conteo porque una sola oportunidad grande distorsionaría la lectura de la cartera; el monto sigue disponible como texto. La distribución usa solo `status` y `totalAmount` existentes, se recalcula en cada render y no se persiste (`FR-024`, `NFR-003`). Es descriptiva, no una predicción. Formalizarla atiende además el hallazgo del Avance 03, que marcó el embudo como funcionalidad sin cobertura en `spec.md` ni `tasks.md`.

**Alternativas consideradas**:

- **Una sola vista: el tablero como distribución**: era la decisión anterior. Se descarta porque la grilla 3×2 con tarjetas no comunica proporción ni permite comparar etapas de un vistazo, que es exactamente lo que pide el usuario.
- **Una sola vista: solo la banda, sin tablero**: pierde la tarjeta accionable y la prueba del equipo (`commercial-board.test.js`).
- **Dos cálculos independientes**: sí permitiría divergencia. Prohibido: ambas presentaciones leen el mismo `StageDistributionResult` del render.
- **Barras escaladas por monto**: una oportunidad dominante aplana el resto y confunde “cuántas” con “cuánto”. El monto queda como texto.
- **Reescribir el embudo como tabla nueva**: descarta el marcado, las clases y la prueba del equipo sin ganar nada.
- **Ocultar el panel cuando está vacío**: impide descubrir la sección y empeora la navegación.
- **Persistir el embudo**: viola la regla de no guardar derivados y genera desincronización.
- **Calcular una tasa de conversión histórica**: requiere eventos y marcas de cambio de etapa que el modelo no tiene.
- **Mantener seis tarjetas grandes de KPI**: ocupa espacio vertical sin jerarquía.

## Tablas ordenables y densidad

**Decisión**: `src/components/data-table.js` renderiza `<table>` con `<caption class="sr-only">`, `<th scope="col">` y `aria-sort` dentro de `.table-wrap` (`role="region"`, `aria-label`, `tabindex="0"`, `overflow-x: auto`). Ordena en memoria, alterna ascendente y descendente, deja los valores vacíos al final y usa un orden por defecto estable (clientes por nombre, oportunidades por folio). El encabezado es `position: sticky`, las filas miden 44–48 px, los montos y fechas se alinean a la derecha con `font-variant-numeric: tabular-nums` y el texto largo se trunca solo visualmente con `text-overflow: ellipsis`.

**Justificación**: una tabla es más legible que una lista para cinco columnas y habilita comparación y ordenamiento sin perder accesibilidad (`FR-UX-007`, `FR-UX-008`). No requiere virtualización para 500/1000 filas. La densidad y la alineación numérica no son adorno: sin cifras de ancho fijo y sin columna alineada, comparar montos exige leer dígito a dígito, y sin encabezado fijo se pierde la referencia de columna a la décima fila. Ambas decisiones son CSS puro, sin dependencias.

**Alternativas consideradas**:

- **Listas con ordenamiento manual**: no permite comparar columnas ni exponer `aria-sort`.
- **Tarjetas en grilla**: útiles en pocos registros, inmanejables en 500.
- **Librería de tablas**: dependencia no justificada para el alcance.
- **Virtualización**: introduce una dependencia y un patrón nuevo; el presupuesto de 500 ms se cumple sin ella.
- **Tooltip obligatorio para el texto truncado**: el texto completo sigue en el DOM y en el lector de pantalla; un `title` añadiría una dependencia de ratón sin beneficio accesible.

## Acciones por fila y estado vacío de tablas

**Decisión**: la única acción por fila es “Editar”, que abre el drawer con ese registro. El borrado no se ofrece en la fila: sigue exclusivamente en la barra compacta sobre la tabla, con `#delete-entity` y `#delete-document`. La barra conserva también `#edit-entity` y `#edit-document` con sus ids, textos, selección y comportamiento. El estado vacío se muestra sin `<tbody>` y con dos variantes de CTA: “Limpiar filtros” cuando hay criterio o filtros activos —sin borrar el texto— y “Nuevo cliente” o “Nueva oportunidad” cuando no existe ningún registro.

**Justificación**: `FR-UX-013` prohíbe sustituir los controles heredados y exige conservar una sola vía de borrado, mientras `FR-UX-007` pide acciones por fila. “Editar” es la única acción que gana valor en la fila y reutiliza el drawer ya especificado. Distinguir el vacío por filtro del vacío por datos evita ofrecer “crear” cuando el problema es un filtro, y “limpiar” cuando la cuenta está vacía (`FR-UX-007`, casos límite de `spec.md`).

**Alternativas consideradas**:

- **“Editar” y “Eliminar” por fila**: duplica la eliminación y deja dos caminos destructivos con confirmaciones distintas. Descartada.
- **Sin acciones por fila**: obliga a seleccionar con un `<select>` antes de editar y mantiene el flujo torpe que la iteración quiere eliminar. Descartada.
- **“Ver detalle” por fila**: la ficha ya existe en la vista de búsqueda; añadirla a la tabla duplica navegación sin requisito. Descartada.
- **Un único estado vacío con CTA “Nuevo”**: ofrece crear cuando lo que falta es limpiar filtros. Descartada.

## Confirmación de descarte: modal propio

**Decisión**: la confirmación de cambios sin guardar se implementa con `openOverlay({ variant: 'modal' })`, título asociado, acción “Descartar” con variante visual `danger` y acción segura “Seguir editando”. No se usa `window.confirm()`.

**Justificación**: reutiliza la primitiva de foco, cierre y pila que ya existe para el drawer, mantiene el foco atrapado y devuelto, y es verificable en jsdom sin simular diálogos del navegador (`FR-UX-005`, `CA-UX-01-07`, `CA-UX-02-04`). El diálogo nativo no es estilizable, no expone `role="dialog"` verificable y bloquea el hilo de la prueba.

**Alternativas consideradas**:

- **`window.confirm()`**: excluye el control visual, rompe la consistencia del sistema y complica las pruebas. Descartada.
- **Cerrar siempre descartando**: pierde datos por accidente y contradice `FR-UX-005`. Descartada.
- **Nativo al navegar y modal al cerrar**: dos patrones para la misma decisión. Descartada.

## Filtros con chips sincronizados

**Decisión**: mantener los tres `<select>` actuales (`#search-filter-category`, `#search-filter-owner`, `#search-filter-source`) dentro de una barra colapsable y añadir chips `aria-pressed` que escriben en ellos. Un contador anuncia los filtros activos y “Limpiar” desactiva ambos sin borrar el criterio. La barra y los chips viven **solo** en `#view-search`; los listados “Listado” de Clientes y Oportunidades ofrecen tabla y orden, sin barra de filtros, y reutilizan criterio y filtros al volver a la búsqueda.

**Justificación**: los selectores conservan `readSearchFilters()` y las pruebas existentes (`CA-02-14`), mientras los chips dan la lectura rápida que pide el usuario (`FR-UX-009`). La sincronización en ambos sentidos evita estados contradictorios. Limitar los filtros a la búsqueda mantiene una sola fuente de estado y evita duplicar la barra en dos vistas (`FR-UX-009`).

**Alternativas consideradas**:

- **Solo chips, sin selectores**: rompe las pruebas y pierde la selección nativa accesible.
- **Solo selectores apilados**: es el problema actual.
- **Filtros también en “Listado”, con estado compartido**: exige montar y sincronizar la misma barra en dos vistas y decidir qué pasa al navegar entre ambas. Descartada.
- **Filtros independientes por vista**: duplica estado y permite resultados contradictorios entre listado y búsqueda. Descartada.
- **Persistir filtros en `localStorage`**: no hay requisito y añade estado que sobrevive a la sesión.

## Búsqueda sin criterio

**Decisión**: al borrar por completo `#global-search-input`, la aplicación permanece en `#view-search`, muestra la pista “Escribe para buscar”, no lista resultados y no borra los filtros activos. No navega a la vista anterior.

**Justificación**: conserva el comportamiento actual de `renderSearchResults()` (`hasCriterion: false`) y evita saltos de vista mientras el usuario edita el criterio (`FR-UX-001`, `CA-UX-01-02`). Los filtros siguen visibles y activos para el siguiente criterio.

**Alternativas consideradas**:

- **Volver a la vista anterior**: el foco y el contexto saltan con cada borrado del campo. Descartada.
- **Listar todos los registros**: convierte un campo vacío en un listado no solicitado y degrada el rendimiento con 500/1000 filas. Descartada.
- **Mostrar el estado vacío con CTA**: confunde “sin criterio” con “sin coincidencias” y ofrece limpiar filtros que quizá no existen. Descartada.

## Sistema visual y tokens

**Decisión**: ampliar `src/styles.css` con `--radius-lg`, `--radius-xl`, `--shadow-sm`, `--shadow-md`, una **escala tipográfica cerrada** (`--text-xs` 12 px, `--text-sm` 14 px, `--text-base` 16 px, `--text-lg` 20 px, `--text-xl` 28 px) con pesos `--weight-regular` 400, `--weight-medium` 500 y `--weight-semibold` 600, `--text-muted: #52606F`, `.req` para obligatorios y las variantes `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.chip`, `.kpi`, `.data-table`, `.empty-state` y `.card-header`. Los gráficos son SVG en línea.

El estado vacío usa una **composición de icono** (contenedor circular de 72 px con `--accent-soft` + icono de 48 px `aria-hidden`), no una ilustración figurativa. La búsqueda global, que vive sobre la cabecera oscura, se especifica con ancho máximo de 480 px, alto de 40 px, fondo claro, icono de lupa decorativo, placeholder ≥ 4.5:1 y anillo de foco ≥ 3:1.

**Justificación**: resuelve jerarquía, contraste y pesos visuales con CSS puro, sin dependencias. La escala cerrada ataca la causa real de la falta de jerarquía: hoy conviven tamaños de 0.82, 0.85, 0.88, 0.9, 0.92, 0.95, 1, 1.02, 1.05, 1.5 y 2 rem sin un criterio, lo que hace que todo pese lo mismo. Un icono compuesto es más predecible que un dibujo hecho a mano, que en un proyecto sin diseñador tiende a envejecer mal. Los SVG en línea evitan binarios, permiten `currentColor` y cumplen `NFR-UX-004`.

**Alternativas consideradas**:

- **Framework CSS**: añade dependencia y obliga a reescribir toda la hoja.
- **Imágenes PNG**: binarios difíciles de revisar y de tematizar.
- **Estilos por componente en JS**: dispersa el sistema y dificulta el mantenimiento.
- **Ilustración figurativa en SVG**: bonita en el papel, difícil de dibujar bien y de mantener coherente; se sustituye por icono en contenedor tenue.
- **Input de búsqueda con el estilo por defecto del navegador sobre la cabecera oscura**: contraste impredecible y foco invisible; se especifica explícitamente.
- **Escala fluida con `clamp()` en todos los títulos**: rompe la consistencia entre vistas y complica verificarla; solo el `h1` del panel la usa.

## Identidad neutra en lugar de paleta teñida

**Decisión**: la base pasa a ser neutra —fondo `--bg` `#F7F8FA`, superficie `--surface` `#FFFFFF`, borde `--border` `#E4E7EC`, texto `--text` `#0F172A`— y el verde queda como acento (`--accent` `#0F766E`) para CTA, estado activo y dato destacado. El `--text-muted` se oscurece de `#64748B` a `#52606F`. Se añaden los detalles nativos `accent-color`, `::selection`, `color-scheme`, `caret-color` y scrollbar fina.

**Justificación**: el tema actual tiñe de verde el fondo (`#F2F6F4`), el borde (`#D8E5DE`) y el texto (`#183B36`); cuando todo comparte el mismo matiz, nada destaca y la interfaz envejece. Además hay un defecto real de contraste: `#64748B` da 4.76:1 sobre blanco, pero 4.32:1 sobre `#F2F4F8` y ≈3.97:1 sobre `#E6EDE9`, y el texto secundario se usa sobre ambos. `#52606F` supera 4.5:1 en los cuatro fondos reales. Mover todos los hexadecimales a `:root` hace que la auditoría de `NFR-UX-009` sea una búsqueda de texto y no una revisión manual.

**Alternativas consideradas**:

- **Conservar la paleta verde y solo cambiar tipografía**: el tinte global sigue dominando la percepción; es el cambio de mayor impacto y menor esfuerzo.
- **Verde como color de fondo de página con superficie blanca**: mantiene el sesgo cromático y reduce el contraste entre niveles.
- **Mantener `#64748B` y confiar en que casi siempre cae sobre blanco**: falso en la práctica; el texto secundario aparece sobre columnas del tablero y fondos de sección.
- **Paleta oscura fija sin tokens**: impide el tema opcional y duplica reglas.

## Escala de espacio y jerarquía de superficies

**Decisión**: declarar `--space-1…8` (4/8/12/16/24/32/48/64 px) y aplicarla a todo `padding`, `gap` y `margin`. La jerarquía de superficies tiene tres niveles: página plana (`--bg`, sin borde ni sombra), sección (`--surface` + borde de 1 px) y elevado (solo drawer, modal y popover con `--shadow-md`). Se elimina la franja `border-left: 4px` de `.stat-card` y se sustituye por un chip de icono tenue.

**Justificación**: los valores sueltos de espaciado son la causa silenciosa de que una interfaz “no se sienta bien”: con todo a 10, 14, 18 o 22 px nada se alinea visualmente. Una escala de 8 px da ritmo sin discusión. La acumulación de borde + sombra + radio + franja en el mismo bloque hace que todos los niveles pesen igual; una sola señal por nivel crea profundidad real sin añadir decoración. El chip de icono comunica la categoría del indicador mejor que una franja de color, que compite con el borde de la tarjeta.

**Alternativas consideradas**:

- **Escala de 4 px**: más granularidad, más decisiones y más heterogeneidad; 8 px es suficiente para este producto.
- **Sombras grandes en todas las tarjetas**: look de plantilla y ruido visual.
- **Solo bordes, sin sombra en ningún caso**: el drawer y el modal pierden separación del fondo.
- **Mantener la franja de 4 px en los indicadores**: cuarta señal en un bloque que ya tiene radio, borde y sombra.

## Componentes unificados y movimiento intencional

**Decisión**: un solo vocabulario de botones (`.btn` + `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`), dos tamaños (32 y 40 px) y estados `hover`, `active`, `disabled`, `loading` y foco visible; se elimina el alias `.primary`. Tokens de movimiento `--dur-fast: 120ms`, `--dur-base: 160ms` y `--ease-out`, con `@media (prefers-reduced-motion: reduce)` que anula transiciones y animaciones.

**Justificación**: hoy conviven `.primary` y `.btn-primary` para el mismo componente, sin estados completos; eso produce botones que se comportan distinto según la vista. La duración de 120–160 ms es perceptible como respuesta y no como espera; por encima de 200 ms la interfaz se siente lenta aunque no lo sea. Respetar `prefers-reduced-motion` es requisito de accesibilidad y cuesta un bloque de CSS.

**Alternativas consideradas**:

- **Mantener ambos vocabularios y mapear uno al otro**: deja deuda y dos fuentes de verdad.
- **Un solo tamaño de botón**: 40 px en tablas densas rompe el ritmo y 32 px como CTA principal es demasiado pequeño.
- **Animaciones de 300 ms**: se perciben como lentitud.
- **Animaciones de rebote o escala**: distraen en una herramienta de trabajo.

## Navegación responsive y tabla como tarjetas

**Decisión**: bajo 900 px el sidebar deja de ser un rail de iconos y se abre como panel desplegable con `#nav-toggle`, `aria-expanded`, submenús “Listado / Nuevo” completos, cierre con Esc, cierre por clic en el fondo y devolución del foco. Bajo 640 px la tabla se presenta como tarjetas, con una etiqueta por celda tomada del `th`, sin desplazamiento horizontal forzado.

**Justificación**: el rail de 60 px bajo 900 px deja inalcanzables los submenús que `FR-UX-002` exige; es un hueco funcional, no una preferencia estética. Un panel desplegable conserva toda la navegación y reutiliza el patrón de foco del overlay. La tabla de cinco columnas no cabe a 390 px: convertir cada fila en tarjeta mantiene la lectura y evita el scroll horizontal, que en móvil oculta la columna de acciones.

**Alternativas consideradas**:

- **Mantener el rail y mostrar tooltips**: los submenús siguen sin estar disponibles y el tooltip no existe en táctil.
- **Menú inferior fijo**: añade un patrón nuevo y compite con la cabecera.
- **Tabla con scroll horizontal también en móvil**: oculta columnas y la acción “Editar”.
- **Ocultar columnas en móvil**: pierde información sin ofrecer sustituto.

## Tema oscuro opcional

**Decisión**: el tema oscuro es opcional. Si se entrega, se implementa solo con tokens dentro de `@media (prefers-color-scheme: dark)`, con `color-scheme: light dark`, sin claves nuevas de `localStorage` y conservando los contrastes de `NFR-UX-008`. Si no se entrega, se declara pendiente en `README.md`.

**Justificación**: con la paleta ya neutralizada y los hexadecimales centralizados en `:root`, el tema oscuro es un bloque de tokens, no una reescritura. Hacerlo antes de la Fase 8 obligaría a mantener dos paletas teñidas. No se ofrece un conmutador manual porque exigiría persistir la preferencia y el requisito prohíbe claves nuevas.

**Alternativas consideradas**:

- **Conmutador manual con `localStorage`**: viola la restricción de no agregar claves.
- **Tema oscuro con reglas por selector**: duplica el mantenimiento y garantiza inconsistencias.
- **Tema oscuro obligatorio en esta iteración**: amplía el alcance sin requisito del usuario.

## Sin cambios de datos ni de esquema

**Decisión**: no se agregan entidades, campos, claves, versiones de esquema ni migraciones. Todo lo nuevo es una vista derivada en memoria.

**Justificación**: la iteración es de presentación. Mantener `schemaVersion` evita migraciones y conserva la compatibilidad con los datos existentes (`NFR-UX-002`, `NFR-008` de `001`).

**Alternativas consideradas**:

- **Agregar una entidad `Actividad`** para el panel del cliente: no existe en el modelo, exige eventos y backend, y amplía el alcance. Descartada.
- **Guardar preferencias de orden y filtros**: podría hacerse en `sessionStorage`, pero no es necesario y añade superficie de error.

## Migración de pruebas acopladas al DOM

**Decisión**: los doce archivos que dependen de `nav-search` o `search-input` —`workspace-shell`, `search-entities`, `search-clients`, `tickets`, `custom-fields`, `critical-journey`, `manage-document`, `manage-tabs`, `relabeling`, `dashboard`, `security-render` y `search-performance`— se actualizan en la misma tarea que cambia el shell. Se conservan los ids de los controles de formulario y de los filtros.

**Justificación**: el Principio II exige que las pruebas pasen antes de declarar terminada una historia. Migrarlas en una tarea posterior deja la suite roja entre incrementos y oculta regresiones reales.

**Alternativas consideradas**:

- **Mantener `nav-search` oculto para compatibilidad**: deja un elemento muerto y contradice `FR-UX-001`.
- **Reescribir toda la suite**: pierde cobertura y trazabilidad histórica.
- **Saltar las pruebas afectadas temporalmente**: viola la constitución.

## Resumen de decisiones

| # | Decisión | Alternativa principal descartada |
|---|---|---|
| 1 | Búsqueda global única en cabecera | Dos inputs sincronizados |
| 2 | Drawer lateral como patrón de alta y edición | Modal centrado / página completa |
| 3 | Submenús “Listado / Nuevo” | “Reportes” sin requisito |
| 4 | Alta de cliente al vuelo reutilizando dominio | Navegar a Clientes y volver |
| 5 | Distribución por etapa y tablero accionable como dos presentaciones de `stageDistribution()` | Una sola vista (tablero como distribución) / dos cálculos independientes |
| 6 | Tablas ordenables con `aria-sort`, encabezado fijo, cifras tabulares y truncado visual | Listas con orden manual / virtualización |
| 7 | Chips sincronizados con los selectores | Solo chips |
| 8 | Tokens, escala tipográfica cerrada y SVG en línea, sin dependencias | Framework CSS / tamaños sueltos |
| 9 | Cero cambios de esquema | Entidad `Actividad` |
| 10 | “Editar” como única acción por fila; borrado solo en la barra compacta | Editar y eliminar por fila |
| 11 | Estado vacío con dos variantes de CTA (filtros vs. sin registros) | Un único estado vacío |
| 12 | Confirmación de descarte con modal propio de `ui-overlay`, sin `window.confirm()` | Diálogo nativo |
| 13 | Filtros y chips solo en la vista de búsqueda | Filtros también en “Listado” |
| 14 | Búsqueda sin criterio permanece en la vista con pista | Volver a la vista anterior |
| 15 | Estado vacío con icono en contenedor tenue | Ilustración figurativa en SVG |
| 16 | Búsqueda con estilo explícito sobre la cabecera oscura | Estilo por defecto del navegador |
| 17 | Barra de distribución escalada por conteo, monto como texto | Barra escalada por monto |
| 18 | Tablero oculto cuando no hay oportunidades | Seis columnas vacías |
| 19 | Base neutra con verde solo como acento; `--text-muted` `#52606F` | Conservar la paleta teñida / mantener `#64748B` |
| 20 | Escala de espacio de 8 px y una sola señal de elevación por bloque | Valores sueltos / borde + sombra + franja |
| 21 | Un vocabulario de botones y campos, dos tamaños y estados completos | Mantener `.primary` y `.btn-primary` en paralelo |
| 22 | Movimiento de 120–160 ms con `prefers-reduced-motion` | Animaciones largas o decorativas |
| 23 | Nav desplegable bajo 900 px y tabla como tarjetas bajo 640 px | Rail de 60 px / scroll horizontal en móvil |
| 24 | Tema oscuro opcional solo por tokens y `prefers-color-scheme` | Conmutador manual con `localStorage` |
