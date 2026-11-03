# Investigación (Fase 0): módulo CRM

**Fecha**: 2026-11-03 · **Especificación**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md)

Este documento resuelve las decisiones técnicas necesarias antes del diseño. El contexto técnico de `plan.md` no deja incógnitas abiertas (`NEEDS CLARIFICATION`); las decisiones que siguen explican **por qué** se eligió cada opción y qué alternativas se descartaron.

## Punto de partida: código base eliminado del árbol actual

**Decisión**: restaurar `src/` e `index.html` desde el commit `dea57da` y los tests base desde la rama `borrador`, ejecutar la base tal cual y registrar el resultado real antes de modificarla.

**Justificación**: el template ERP ya implementa navegación, generación de identidad, marcas de tiempo, persistencia y búsqueda. Reescribirlo duplicaría trabajo y rompería el contrato documentado en `specs/001-erp-base-module/`. La restauración es verificable en el historial de Git, por lo que no se depende de memoria ni de suposiciones.

**Alternativas consideradas**:

- Reimplementar el template desde cero: mayor esfuerzo, riesgo de divergir del contrato base y de los tests existentes.
- Copiar el estado de la rama `borrador`: la rama mezcla cambios de especificación con código; se prefiere tomar solo los archivos de prueba necesarios y revisarlos.
- Mantener el repositorio solo con documentación: no permite cumplir los criterios de aceptación ni generar evidencia ejecutable.

## Stack: Vite + JavaScript ES2022 + HTML + CSS sin framework

**Decisión**: conservar el stack del template base (Vite, JavaScript vanilla, HTML y CSS).

**Justificación**: el alcance es una aplicación de una sola página con formularios, listas y cálculos simples. El template ya resuelve el flujo de desarrollo, el build y las pruebas. Evitar un framework reduce dependencias y mantiene el código legible para el equipo y para la evaluación del curso.

**Alternativas consideradas**:

- React o Vue: aportan componentes y estado, pero añaden abstracción, dependencias y una curva de aprendizaje que no se justifica para el tamaño del MVP.
- HTML estático sin Vite: elimina el pipeline de build, pero dificulta el desarrollo local, las pruebas con módulos ES y la futura separación en capas.

## Persistencia: `localStorage` con claves base y versión de esquema

**Decisión**: mantener `erp_base_module:entities` y `erp_base_module:documents`; agregar `erp_base_module:tickets` (P2) y `erp_base_module:schemaVersion`. Toda escritura parte de una instantánea en memoria validada.

**Justificación**: el MVP es de un solo navegador, sin backend ni autenticación. Las claves base ya están documentadas y los tests del template las usan. Una versión explícita de esquema permite detectar datos incompatibles sin migrarlos en silencio, tal como exige `NFR-008`.

**Alternativas consideradas**:

- IndexedDB: mejor para volúmenes grandes y consultas, pero agrega complejidad asíncrona y no es necesaria para 500 clientes y 1000 oportunidades.
- Backend con base de datos: queda fuera del alcance del curso y del MVP; el contrato de almacenamiento está aislado para poder sustituirlo más adelante.
- Guardar cada registro en una clave separada: complica la escritura atómica de la cascada; se prefiere una lista por colección.

## Capa de dominio separada de la persistencia

**Decisión**: concentrar las reglas CRM puras en `src/crm-rules.js` y los indicadores en `src/crm-metrics.js`; `src/storage.js` conserva identidad, marcas de tiempo y escritura, y llama a las validaciones antes de persistir.

**Justificación**: el template base acepta campos opcionales para no romper otros módulos, pero el CRM exige obligatoriedad y reglas propias. Separar dominio y almacenamiento permite probar las reglas sin navegador, compartir la misma validación entre formulario y persistencia, y mantener estable el contrato base (`XR-002`, `XR-004`).

**Alternativas consideradas**:

- Validar solo en los formularios: dejaría pasar datos inválidos por llamadas directas al almacenamiento y duplicaría reglas.
- Endurecer el almacenamiento genérico: rompería el módulo ERP base y su contrato.
- Usar una librería de esquemas (Zod, Yup): útil, pero añade una dependencia y un DSL que no se necesita para las reglas actuales.

## Fechas de calendario sin desplazamiento por zona horaria

**Decisión**: representar fechas de negocio como cadenas `YYYY-MM-DD` y compararlas construyendo la cadena con año, mes y día locales; usar ISO 8601 solo para `createdAt` y `updatedAt`.

**Justificación**: `new Date('2026-11-02')` se interpreta como medianoche UTC y puede mostrarse como el día anterior en zonas horarias negativas, como Chile. Comparar cadenas de calendario evita ese error y cumple `FR-017` y `CA-04-07`.

**Alternativas consideradas**:

- Guardar fechas como epoch en milisegundos: obliga a convertir en cada vista y facilita errores de zona horaria.
- Usar una librería de fechas: resuelve el problema, pero es dependencia innecesaria para comparar días y validar días del mes.

## Folio de oportunidad: unicidad compuesta e idempotencia

**Decisión**: validar la pareja `series + folio` como única global al crear y editar, excluyendo el registro actual. El folio se ingresa manualmente como entero positivo; la serie se fija en `OPP`. El guardado repetido debe producir como máximo un registro con esa pareja.

**Justificación**: el folio es el identificador comercial visible y no debe confundirse con `id` ni con una factura. La unicidad compuesta evita duplicados y la comprobación previa al guardado cubre el doble clic y el reenvío (`FR-015`, `CA-04-12`).

**Alternativas consideradas**:

- Generar el folio automáticamente: elimina el error humano, pero el caso de negocio pide un folio comercial ingresado y reconocible.
- Hacer único solo el folio: impediría reutilizar números en series distintas, aunque el MVP solo use `OPP`; se deja la restricción compuesta para no cerrar la evolución futura.
- Confiar solo en la validación del formulario: no protege envíos repetidos ni llamadas directas al almacenamiento.

## Ciclo de vida como máquina de estados explícita

**Decisión**: declarar estados y transiciones en `ModuleConfig` y validarlas con `canTransition(from, to)` y `nextStatuses(status)` en `crm-rules.js`. `Ganada` y `Perdida` son finales; `lossReason` es obligatorio solo al entrar en `Perdida`.

**Justificación**: una tabla de transiciones es fácil de probar, mantener y mostrar en la interfaz. Evita saltos no declarados y reaperturas accidentales, y mantiene una única fuente de verdad para la interfaz y el almacenamiento (`FR-021` a `FR-023`).

**Alternativas consideradas**:

- Validar transiciones solo en la interfaz: un guardado directo podría reabrir una oportunidad cerrada.
- Modelar el ciclo como una cadena lineal sin estados finales: no representa pérdidas ni impide reaperturas.
- Permitir cualquier cambio de estado: contradice los criterios de aceptación y facilita datos inconsistentes.

## Eliminación en cascada atómica

**Decisión**: al eliminar un cliente, validar y construir en memoria la nueva instantánea (cliente, oportunidades y tickets) y persistirla como una sola operación. Si la escritura falla, no se actualiza el estado previo ni se muestra éxito.

**Justificación**: `localStorage` no ofrece transacciones ni claves foráneas. Escribir la instantánea completa permite cumplir `FR-007`, `NFR-007` y evitar oportunidades o tickets huérfanos. La confirmación previa informa cuántos registros se eliminarán.

**Alternativas consideradas**:

- Eliminar cada registro con una escritura separada: una falla intermedia deja datos parciales.
- Bloquear la eliminación si existen oportunidades: no cumple el criterio de cascada confirmada.
- Delegar la integridad a una base de datos: no existe backend en el MVP; se documenta como evolución futura.

## Detección de formularios obsoletos entre pestañas

**Decisión**: escuchar el evento `storage` y, si otra pestaña modifica las colecciones mientras hay un formulario abierto, avisar y bloquear el guardado hasta actualizar la vista, protegiendo los datos ingresados.

**Justificación**: el MVP no promete concurrencia transaccional, pero tampoco debe sobrescribir datos de otra pestaña sin aviso (`FR-032`, `CA-04-14`). Es un mecanismo acotado y comprobable en integración.

**Alternativas consideradas**:

- Ignorar el evento `storage`: riesgo de sobrescritura silenciosa.
- Implementar bloqueos o sincronización en tiempo real: excede el alcance y daría una falsa sensación de multiusuario.
- Recargar automáticamente: descartaría cambios sin consentimiento.

## Búsqueda normalizada y rendimiento con 500/1000 registros

**Decisión**: una función `searchClients(criterion, filters)` con normalización `trim → minúsculas → eliminación de diacríticos`, comparando nombre y código; filtros de tipo, responsable y origen combinados con AND. `searchOpportunities` compara asunto y folio y devuelve el cliente asociado por `entity_id`.

**Justificación**: la normalización hace que la búsqueda no dependa de mayúsculas ni tildes (`FR-008`, `CA-02-12`) y una sola función evita divergencias entre vistas. Con 500 clientes y 1000 oportunidades, filtrar en memoria es suficiente para el presupuesto de 500 ms en 19 de 20 mediciones (`NFR-002`); la medición real queda pendiente y debe registrarse.

**Alternativas consideradas**:

- Búsqueda solo por nombre: no cumple el criterio de búsqueda por código.
- Índices persistidos: añaden complejidad y riesgo de desactualización; el volumen no lo exige.
- Motor de búsqueda externo: sobredimensionado para el MVP y sin backend.

## Pruebas: Vitest + jsdom, con enfoque test-first

**Decisión**: usar Vitest y jsdom, reutilizando `vitest.config.mjs`; pruebas unitarias para reglas, métricas, ciclo de vida y almacenamiento, y de integración para los flujos completos. Cada regla de negocio se implementa con su prueba antes o junto con el código.

**Justificación**: es el stack que ya declara `package.json` y permite probar DOM sin navegador real. La constitución exige verificación automatizada y el curso exige evidencia real, no resultados declarados (`NFR-009`).

**Alternativas consideradas**:

- Jest: viable, pero obliga a reconfigurar un proyecto que ya usa Vitest.
- Solo pruebas manuales: no permiten regresión ni evidencia repetible.
- Cypress/Playwright: útiles para extremo a extremo, pero añaden navegador y configuración; se pueden incorporar después para la demo.

## Renderizado seguro y accesibilidad

**Decisión**: mostrar asunto, notas, descripciones y demás texto con `textContent` o escape equivalente; usar etiquetas asociadas, mensajes de error visibles y foco navegable con teclado. No se inyecta HTML del usuario.

**Justificación**: cumple `NFR-004`, `FR-035` y `CA-04-13`. El texto ingresado es dato, no marcado; la accesibilidad es requisito de experiencia y no una mejora opcional.

**Alternativas consideradas**:

- `innerHTML` con sanitización manual: más riesgo de omisión y de ejecución de scripts.
- Editor de texto enriquecido: fuera de alcance y aumenta la superficie de seguridad.
- Depender solo de validación visual: no cubre lectores de pantalla ni navegación por teclado.

## Tickets P2 y referencias externas

**Decisión**: modelar `Ticket` con `entity_id` y una referencia de producto (`productId` cuando exista, `productName` como respaldo de demo). No crear el módulo Producto. Estados `En proceso → Resuelto`, sin reapertura en el MVP.

**Justificación**: permite registrar el historial de fallas sin duplicar el maestro de productos de Logística (`FR-025`, `FR-026`). La referencia externa se documenta como contrato y no como integración implementada.

**Alternativas consideradas**:

- Crear un catálogo de productos dentro del CRM: duplicaría datos de otro módulo y excede el alcance.
- Exigir `productId` siempre: impediría la demo mientras no exista el módulo Producto.
- Permitir reapertura de tickets: el MVP la excluye explícitamente.

## Resumen de decisiones

| Tema | Decisión | Requisitos relacionados |
|---|---|---|
| Código base | Restaurar desde `dea57da` y tests desde `borrador` | Plan, estrategia 1 |
| Stack | Vite + JS ES2022 + HTML/CSS | NFR-006 |
| Persistencia | `localStorage` con claves base y `schemaVersion` | FR-031, NFR-008 |
| Dominio | `crm-rules.js` y `crm-metrics.js` puros | XR-002, XR-004 |
| Fechas | Cadenas `YYYY-MM-DD` locales | FR-017 |
| Folio | Único por `series + folio`, guardado idempotente | FR-015, CA-04-12 |
| Ciclo de vida | Máquina de estados explícita y final | FR-021 a FR-023 |
| Cascada | Instantánea completa en una escritura | FR-007, NFR-007 |
| Pestañas | Evento `storage` y bloqueo de guardado obsoleto | FR-032 |
| Búsqueda | Normalización con diacríticos y filtros AND | FR-008, FR-012 |
| Pruebas | Vitest + jsdom, test-first | Constitución II, NFR-009 |
| Seguridad | Texto seguro y accesibilidad | NFR-004, FR-035 |
| Tickets | P2 con referencia externa de producto | FR-025, FR-026 |
