# Investigación (Fase 0): rediseño de interfaz del CRM

**Fecha**: 2026-11-16 · **Especificación**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Dominio heredado**: [../001-crm-module/spec.md](../001-crm-module/spec.md)

Este documento resuelve las decisiones técnicas de la iteración de interfaz. No quedan `NEEDS CLARIFICATION`. Cada decisión indica qué se eligió, por qué y qué alternativas se descartaron. La línea base verificada antes de diseñar es: **28 archivos y 278 pruebas en verde**, `npm run lint` sin errores.

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

**Decisión**: si `entities` y `documents` están vacíos, se muestra `#dashboard-empty-state` con SVG en línea, título, explicación y CTA “Registra tu primer cliente”, y se oculta la banda de indicadores. Con datos, se muestra una banda compacta de los seis KPI y, debajo, “Distribución por etapa” calculada por `stageDistribution(documents)`.

**Justificación**: seis tarjetas de “0” no aportan contexto (`CA-07-03` de `001`). La distribución usa solo `status` y `totalAmount` existentes, se recalcula en cada render y no se persiste (`FR-024`, `NFR-003`). Es descriptiva, no una predicción.

**Alternativas consideradas**:

- **Ocultar el panel cuando está vacío**: impide descubrir la sección y empeora la navegación.
- **Persistir el embudo**: viola la regla de no guardar derivados y genera desincronización.
- **Calcular una tasa de conversión histórica**: requiere eventos y marcas de cambio de etapa que el modelo no tiene.
- **Mantener seis tarjetas grandes**: ocupa espacio vertical sin jerarquía.

## Tablas ordenables

**Decisión**: `src/components/data-table.js` renderiza `<table>` con `<caption class="sr-only">`, `<th scope="col">` y `aria-sort`. Ordena en memoria, alterna ascendente y descendente, deja los valores vacíos al final y usa un orden por defecto estable (clientes por nombre, oportunidades por folio).

**Justificación**: una tabla es más legible que una lista para cinco columnas y habilita comparación y ordenamiento sin perder accesibilidad (`FR-UX-007`, `FR-UX-008`). No requiere virtualización para 500/1000 filas.

**Alternativas consideradas**:

- **Listas con ordenamiento manual**: no permite comparar columnas ni exponer `aria-sort`.
- **Tarjetas en grilla**: útiles en pocos registros, inmanejables en 500.
- **Librería de tablas**: dependencia no justificada para el alcance.

## Filtros con chips sincronizados

**Decisión**: mantener los tres `<select>` actuales (`#search-filter-category`, `#search-filter-owner`, `#search-filter-source`) dentro de una barra colapsable y añadir chips `aria-pressed` que escriben en ellos. Un contador anuncia los filtros activos y “Limpiar” desactiva ambos sin borrar el criterio.

**Justificación**: los selectores conservan `readSearchFilters()` y las pruebas existentes (`CA-02-14`), mientras los chips dan la lectura rápida que pide el usuario (`FR-UX-009`). La sincronización en ambos sentidos evita estados contradictorios.

**Alternativas consideradas**:

- **Solo chips, sin selectores**: rompe las pruebas y pierde la selección nativa accesible.
- **Solo selectores apilados**: es el problema actual.
- **Persistir filtros en `localStorage`**: no hay requisito y añade estado que sobrevive a la sesión.

## Sistema visual y tokens

**Decisión**: ampliar `src/styles.css` con `--radius-lg`, `--radius-xl`, `--shadow-sm`, `--shadow-md`, escala tipográfica, `--text-muted: #64748B`, `.req` para obligatorios y variantes `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.chip`, `.kpi`, `.data-table` y `.card-header`. Ilustraciones como SVG en línea.

**Justificación**: resuelve jerarquía, contraste y pesos visuales con CSS puro, sin dependencias. Los SVG en línea evitan binarios, permiten `currentColor` y cumplen `NFR-UX-004`.

**Alternativas consideradas**:

- **Framework CSS**: añade dependencia y obliga a reescribir toda la hoja.
- **Imágenes PNG**: binarios difíciles de revisar y de tematizar.
- **Estilos por componente en JS**: dispersa el sistema y dificulta el mantenimiento.

## Sin cambios de datos ni de esquema

**Decisión**: no se agregan entidades, campos, claves, versiones de esquema ni migraciones. Todo lo nuevo es una vista derivada en memoria.

**Justificación**: la iteración es de presentación. Mantener `schemaVersion` evita migraciones y conserva la compatibilidad con los datos existentes (`NFR-UX-002`, `NFR-008` de `001`).

**Alternativas consideradas**:

- **Agregar una entidad `Actividad`** para el panel del cliente: no existe en el modelo, exige eventos y backend, y amplía el alcance. Descartada.
- **Guardar preferencias de orden y filtros**: podría hacerse en `sessionStorage`, pero no es necesario y añade superficie de error.

## Migración de pruebas acopladas al DOM

**Decisión**: los ocho archivos que dependen de `nav-search`, `search-input` o de la estructura de `#search-results-list` se actualizan en la misma tarea que cambia el shell. Se conservan los ids de los controles de formulario y de los filtros.

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
| 5 | Panel con estado vacío, KPIs y distribución derivada | Persistir el embudo |
| 6 | Tablas ordenables con `aria-sort` | Listas con orden manual |
| 7 | Chips sincronizados con los selectores | Solo chips |
| 8 | Tokens y SVG en línea, sin dependencias | Framework CSS |
| 9 | Cero cambios de esquema | Entidad `Actividad` |
