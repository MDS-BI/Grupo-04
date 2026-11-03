# Plan de implementación: módulo CRM

**Feature**: `001-crm-module` | **Fecha**: 2026-11-03 | **Especificación**: [spec.md](spec.md) | **Modelo**: [data-model.md](data-model.md) | **Investigación**: [research.md](research.md) | **Validación**: [quickstart.md](quickstart.md)

## Resumen

Adaptar el template ERP del profesor al módulo **CRM — Clientes y Oportunidades** (caso de diseño B2B con datos sintéticos), utilizando Cliente como `Entity` y Oportunidad como `Document`, y dejando Ticket como extensión P2. Se conservan navegación, componentes y persistencia reutilizables. Se configuran identidad, campos adicionales, catálogos y etapas; se añaden únicamente las reglas CRM que la base no ofrece.

El código base **existe en el historial** del repositorio: `src/` e `index.html` están en el commit `dea57da` y fueron eliminados en `0578622` (“update and clean-up 2”). Los tests base están en la rama `borrador`. La primera tarea técnica es restaurarlos, ejecutar la base y registrar qué funciona realmente antes de modificarla.

## Contexto técnico

| Aspecto | Decisión |
|---|---|
| Lenguaje | JavaScript ES2022, HTML y CSS, según template |
| Entorno | Vite; versiones exactas según `package.json` y lockfile del repositorio |
| Persistencia | `localStorage`, una empresa y un perfil de navegador |
| Claves base | `erp_base_module:entities`, `erp_base_module:documents` (documentadas en el README) |
| Pruebas | Vitest y jsdom, reutilizando `vitest.config.mjs` |
| Plataforma | Navegadores modernos; Chrome y Firefox actuales como mínimo, Edge y Safari si están disponibles; escritorio y adaptación móvil |
| Escala de aceptación | 500 clientes y 1000 oportunidades |
| Restricción | Solo frontend; sin correo real, backend ni sincronización multiusuario |
| Moneda y calendario | CLP, fechas de calendario local; marcas ISO 8601 |
| Entregable | MVP frontend + seis archivos Speckit (`spec`, `plan`, `research`, `data-model`, `quickstart`, `tasks`) + MER + README + demo |

## Verificación de la constitución

La constitución del proyecto existe en `.specify/memory/constitution.md`, versión **1.0.0**, y es de cumplimiento obligatorio según su sección de Governance. No se declara cumplimiento total mientras no existan pruebas ejecutadas.

| Principio / estándar | Estado | Evidencia o acción comprometida |
|---|---|---|
| I. Code Quality & Maintainability | Parcial | Separar `storage.js`, `crm-rules.js`, `crm-metrics.js`, `module-config.js` y componentes; funciones pequeñas y nombres claros. Revisión en cada incremento. |
| II. Test-First & Verification | Pendiente | Cada regla de negocio tendrá prueba unitaria antes o junto con la implementación; cada flujo crítico tendrá prueba de integración. No se marca una historia como terminada sin pruebas que pasen. |
| III. User Experience Consistency | Parcial | Terminología CRM en todas las vistas, estados vacíos, mensajes de error y accesibilidad por teclado. Ver `FR-030` y `NFR-001`. |
| IV. Performance & Reliability | Pendiente | Presupuesto de 500 ms con 500/1000 registros, 19 de 20 búsquedas; manejo de cuota, JSON corrupto y pestaña obsoleta. Medición pendiente. |
| Quality Standards | Parcial | Formato y linting según el template; documentación actualizada cuando cambie comportamiento, configuración o contrato. |
| Development Workflow | Parcial | Incrementos pequeños con criterios de aceptación, evidencia de pruebas y registro de cambios por iteración. |

**Desviaciones**: no se identifican desviaciones deliberadas. Cualquier excepción se documentará aquí antes de implementar.

### Re-evaluación posterior al diseño (Fase 1)

Tras generar `research.md`, `data-model.md`, `contracts/entity-storage.md` y `quickstart.md`, se revisaron los cuatro principios:

| Principio | Resultado del diseño | Estado |
|---|---|---|
| I. Code Quality & Maintainability | La separación en `crm-rules.js`, `crm-metrics.js`, `storage.js` y `module-config.js` evita duplicar reglas y mantiene el contrato base. No se introducen abstracciones sin uso. | Pasa el diseño |
| II. Test-First & Verification | Cada decisión de dominio de `research.md` tiene una prueba unitaria o de integración prevista; el test-first sigue siendo una obligación de implementación. | Pasa el diseño; verificación pendiente |
| III. User Experience Consistency | `quickstart.md` cubre estados vacíos, mensajes, terminología, navegación y teclado; los criterios de aceptación siguen siendo la fuente de verdad. | Pasa el diseño |
| IV. Performance & Reliability | La búsqueda en memoria y el recálculo de indicadores son viables para 500/1000 registros; la medición de 500 ms y los escenarios de cuota, JSON corrupto y pestaña obsoleta están en la guía de validación. | Pasa el diseño; medición pendiente |

No se requieren excepciones ni entradas en “Seguimiento de complejidad”. Las pruebas ejecutadas siguen siendo la condición para declarar cumplimiento total.

## Decisiones de investigación (Fase 0)

`research.md` resuelve las decisiones técnicas y sus alternativas. Las que condicionan el diseño son:

- Restaurar el código base desde `dea57da` (y los tests desde `borrador`) antes de modificarlo.
- Mantener Vite + JavaScript ES2022 sin framework.
- Persistir en `localStorage` con las claves base, `schemaVersion` explícita y una instantánea validada por escritura.
- Separar reglas puras (`crm-rules.js`, `crm-metrics.js`) del almacenamiento y compartir la validación entre formulario y persistencia.
- Tratar las fechas como cadenas `YYYY-MM-DD` locales y el folio como único por `series + folio`.
- Modelar el ciclo de vida como máquina de estados con estados finales y cascada atómica.
- Detectar cambios de otra pestaña con el evento `storage` y bloquear guardados obsoletos.
- Validar con Vitest + jsdom, con enfoque test-first, y renderizar todo texto de forma segura y accesible.

## Arquitectura y estructura propuesta

```text
specs/001-crm-module/
  spec.md
  plan.md
  research.md
  data-model.md
  quickstart.md
  tasks.md
  contracts/
    entity-storage.md
src/
  main.js
  app.js
  storage.js
  module-config.js
  crm-rules.js
  crm-metrics.js
  styles.css
  components/
    shell.js
    dashboard.js
    custom-fields.js
    entity-form.js
    entity-list.js
    entity-detail.js
    document-form.js
    document-list.js
    search-bar.js
    search-results.js
    ticket-form.js      # P2
    ticket-list.js      # P2
tests/
  unit/
  integration/
  performance/
README.md
```

- `app.js` coordina navegación y componentes.
- `storage.js` conserva la identidad y delega las validaciones CRM antes de escribir.
- `crm-rules.js` concentra las reglas puras de cliente, oportunidad, folio, fechas, ciclo de vida, búsqueda y tickets.
- `crm-metrics.js` calcula los seis indicadores del panel.
- `module-config.js` declara etiquetas, campos personalizados, catálogos, ciclo de vida y color.
- Los listados y el detalle se alojan en búsqueda; la gestión mantiene formularios y selectores según el patrón base.
- El MER se entrega como diagrama Mermaid en texto dentro de `data-model.md`; no se usan imágenes binarias.

## Estrategia de implementación

1. **Restaurar y verificar la base**: recuperar `src/` e `index.html` desde `dea57da`, los tests desde `borrador`, ejecutar `npm test` y `npm run build`, y registrar el estado real. No heredar checks completados sin evidencia.
2. **Configurar `ModuleConfig`**: etiquetas Cliente/Oportunidad, campos propios, catálogos, color y ciclo de vida. No redeclarar campos base. Conservar el respaldo genérico del cargador.
3. **Reglas de dominio**: código único, folio `series/folio`, monto, fechas, estado inicial, motivo de pérdida, transiciones, cascada y búsqueda normalizada. Compartirlas entre formularios y almacenamiento.
4. **Formularios y selectores CRM**: cliente, oportunidad y ticket P2; cascada confirmada, control de cambios sin guardar y validación accesible.
5. **Búsqueda, detalle y panel**: búsqueda por nombre/código, filtros, detalle con oportunidades asociadas y seis indicadores recalculados (panel P2, no bloquea el MVP).
6. **Terminología y accesibilidad**: etiquetas CRM en todas las vistas, estados vacíos, mensajes y navegación por teclado.
7. **Verificación**: pruebas unitarias, integración, riesgos de almacenamiento, seguridad de renderizado, rendimiento y build. Documentar resultados reales y corregir fallos antes de declarar tareas implementadas.

## Método de análisis y decisión de datos

Se usan variables categóricas (tipo, origen, responsable, etapa), fechas y montos. El análisis consiste en conteos, sumas y tasa de cierre, calculados con funciones puras. No se entrenan modelos ni se asignan probabilidades arbitrarias. El monto de oportunidad representa expectativa comercial y no ingreso. Se interpretan resultados con el volumen de casos y la información faltante para evitar conclusiones injustificadas.

## Validación prevista

| Nivel | Evidencia requerida |
|---|---|
| Unitario | Identificadores preservados, unicidad de código y folio, fechas, transiciones, pérdida, cascada, búsqueda normalizada e indicadores |
| Integración | Crear cliente → oportunidad → avance → búsqueda → panel → recarga; editar y borrar con cancelación; tickets P2 |
| Riesgos | Cuota agotada y JSON corrupto sin pérdida silenciosa; datos maliciosos como texto; pestaña obsoleta |
| Usabilidad | 5 participantes y 4 tareas; tiempos y tasa de éxito según SC-001 a SC-004 (ejecutado en T069) |
| Rendimiento | 20 búsquedas con 500/1000 registros; al menos 19 bajo 500 ms; registrar equipo y navegador |
| Accesibilidad | Recorrido completo con teclado, foco visible, etiquetas, errores asociados y contraste verificable |
| Compilación | Ejecutar los scripts reales de `package.json` (`npm test`, `npm run build`); guardar resultados |
| Documental | Coherencia de entidades, campos, estados, indicadores y MER entre `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md` y el contrato |

Los resultados deben anotarse en la sección “Evidencias y registro de cambios” del `README.md` cuando exista implementación. No se declaran pruebas ejecutadas que no se hayan corrido.

## Seguridad, riesgos y límites

- Demo únicamente con datos sintéticos. No se usan nombres reales, RUT, datos bancarios ni información sensible.
- Renderizar texto con `textContent` o escape seguro; no inyectar notas como HTML.
- Validar siempre antes de persistir; no reiniciar el almacenamiento por errores.
- Los perfiles Ejecutivo y Jefe son actores de diseño y no permisos.
- La ausencia de backend impide control de acceso real, respaldo central y operación simultánea.
- La pérdida del perfil del navegador elimina la persistencia local.
- No prometer conformidad legal ni seguridad productiva a partir de esta demo.
- La cascada de eliminación debe ser atómica a nivel de la instantánea en memoria; si falla la escritura, no se modifica el estado previo.

## Escalabilidad e interconexión

Separar repositorio de datos, reglas e interfaz; mantener `entity_id` estable. En una etapa posterior, sustituir la persistencia por una API y una base de datos con claves únicas/foráneas, autenticación, permisos, auditoría, respaldo y transacciones. Acordar con otros módulos el contrato de Cliente antes de intercambiar datos. Incorporar Contacto y Actividad cuando se necesiten múltiples interlocutores e historial. En una etapa posterior, los tickets podrán referenciar `productId` de Logística y `assigned_employee_id` de RR.HH. como claves externas; el MVP solo usa `productId` cuando existe y `productName` como respaldo, sin crear esos módulos aquí.

## Seguimiento de complejidad

Se conservan dos colecciones base para que el MVP sea realizable sobre el template: Cliente (`Entity`) y Oportunidad (`Document`). Los tickets P2 agregan una colección adicional y se implementan en la segunda iteración. Las extensiones indispensables son reglas de dominio, métricas, búsqueda de oportunidades y terminología. No se presenta la adaptación completa como un simple cambio de etiquetas: requiere implementación y pruebas.
