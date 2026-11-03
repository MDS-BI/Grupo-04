# CRM — Clientes y Oportunidades

Módulo CRM construido sobre el template ERP base (Vite + Vanilla JS). Permite registrar clientes y prospectos, vincular oportunidades comerciales, buscar y consultar fichas, seguir el ciclo de vida de las oportunidades y consultar un panel con indicadores descriptivos. Los tickets de soporte son P2 y se implementan en la segunda iteración.

> **Estado**: documentación en revisión. El código base se restaurará desde el commit `dea57da` (`src/` e `index.html`) y los tests base desde la rama `borrador`. La primera versión integrada de prueba se registra en la sección de evidencias.

## Integrantes

| Integrante | Rol | Historias asignadas |
|---|---|---|
| `[completar]` | Documentación / ajustes | `[completar]` |
| `[completar]` | Implementación | `[completar]` |
| `[completar]` | Implementación | `[completar]` |
| `[completar]` | Pruebas / demo | `[completar]` |
| `[completar]` | Pruebas / demo | `[completar]` |
| `[completar]` | Coordinación | `[completar]` |

Agregar o quitar filas según la cantidad real de integrantes. La asignación por historia está en `specs/001-crm-module/spec.md`, sección “Organización por integrante”.

## Problema y alcance

La empresa vende equipos industriales a otras empresas de la Región del Biobío y pierde ventas porque las cotizaciones quedan repartidas entre correos y planillas. El CRM centraliza clientes, oportunidades y seguimiento. Es una demo con datos sintéticos: no hay backend, autenticación ni permisos reales.

- **P1**: clientes, oportunidades, búsqueda, ciclo de vida, panel, terminología y persistencia.
- **P2**: tickets de soporte.
- **Fuera del MVP**: correo real, campañas, facturación, cotizaciones con partidas, predicción y sincronización multiusuario.

## Cronograma y división del trabajo

| Hito | Fecha | Entregables | Estado |
|---|---|---|---|
| Hito 1 — Revisión inicial | 20/10/2026 | Repositorio, MER y plan inicial | Cumplido, con observaciones del profesor |
| Hito 2 — Especificaciones y tareas | 10/11/2026 | `spec.md` consolidada, `plan.md`, `data-model.md`, contrato y `tasks.md` generado desde las US | En progreso |
| Hito 3 — Versión integrada de prueba | 17/11/2026 | Código base restaurado, CRM configurado, pruebas ejecutadas y demo interna | Pendiente |
| Hito 4 — Entrega y presentación | Semana del 30/11/2026 | Repositorio final, README, evidencias y ensayo de 5 minutos | Pendiente |

| Línea | Alcance | Responsable | Iteración |
|---|---|---|---|
| A — Ajustes previos | Coherencia de `spec.md`, `plan.md`, `data-model.md`, contrato, checklist y README; regeneración de tareas | `[integrante]` | 1 |
| B — Incremental | Restauración del código, `ModuleConfig`, reglas, formularios, búsqueda, ciclo de vida, panel y terminología | `[integrante]` | 1–2 |
| C — P2 | Tickets de soporte: entidad, formulario, estados y pruebas | `[integrante]` | 2–3 |

## Estructura del repositorio

```text
specs/001-crm-module/
  spec.md
  plan.md
  data-model.md
  tasks.md
  contracts/entity-storage.md
  checklists/requirements.md
src/
  main.js
  app.js
  storage.js
  module-config.js
  crm-rules.js
  crm-metrics.js
  styles.css
  components/
tests/
  unit/
  integration/
```

## Requisitos

- Node.js y npm.
- Navegador moderno.

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abrir la URL que imprime Vite (por defecto `http://localhost:5173`).

## Pruebas y build

```bash
npm test
npx vitest run
npm run build
```

Registrar en la sección de evidencias la fecha, el comando y el resultado real. No declarar pruebas que no se hayan ejecutado.

## Configuración del módulo

Toda la adaptación vive en `src/module-config.js`:

- `moduleName`: `CRM — Clientes y Oportunidades`.
- `labels`: Cliente/Clientes y Oportunidad/Oportunidades.
- `customFields`: `contactName`, `accountOwner`, `acquisitionSource`, `opportunityTitle`, `opportunityOwner`, `lossReason`.
- `statusLifecycle`: Nueva → Contactada → Propuesta → Negociación → Ganada / Perdida.
- `theme.accentColor`: `#0F766E`.

Catálogos: tipo de cliente (Prospecto, Activo, Inactivo), responsables (Ejecutivo A, Ejecutivo B), orígenes (Sitio web, Referido, Contacto directo, Otro) y prioridades de ticket (Alta, Media, Baja). El detalle está en `specs/001-crm-module/data-model.md`.

## Persistencia

- `erp_base_module:entities`: clientes.
- `erp_base_module:documents`: oportunidades.
- `erp_base_module:tickets`: tickets (P2, propuesto).
- `erp_base_module:schemaVersion`: versión de esquema (propuesto).

Los datos viven en el `localStorage` del navegador. Borrar el perfil del navegador elimina la persistencia. No hay respaldo central ni acceso simultáneo.

## Demo

Datos sintéticos sugeridos:

| Dato | Valor |
|---|---|
| Cliente | Empresa Demo 1 |
| Código | CLI-DEMO-003 |
| Tipo | Prospecto |
| Responsable | Ejecutivo A |
| Origen | Referido |
| Oportunidad | Adquisición de compresor industrial |
| Folio | 3001 |
| Fechas | 2026-11-02 → 2026-11-30 |
| Monto | 8.500.000 CLP |

Recorrido: crear cliente → crear oportunidad → buscar → abrir ficha → avanzar etapa → volver al panel → recargar. Repetir el folio debe fallar. Probar también monto cero, campos vacíos, fechas invertidas, cliente inexistente y cancelación.

## Evidencias y registro de cambios

| Fecha | Cambio | Comando / evidencia | Resultado |
|---|---|---|---|
| 2026-11-03 | Consolidación documental y modelo de datos | Revisión de `spec.md`, `plan.md`, `data-model.md` | Pendiente de validación del equipo |
| Pendiente | Restauración del código base | `npm test`, `npm run build` | Pendiente |
| Pendiente | Primera versión integrada | Demo y pruebas | Pendiente |

## Uso de IA

La parte técnica se desarrolla con asistencia de IA, conforme al feedback del curso. Registrar qué se generó con IA, qué se revisó manualmente y qué se verificó con pruebas. No se inventan reuniones, aportes, pruebas ni validación empresarial.

## Documentación

- [Especificación](specs/001-crm-module/spec.md)
- [Plan](specs/001-crm-module/plan.md)
- [Investigación técnica](specs/001-crm-module/research.md)
- [Modelo de datos](specs/001-crm-module/data-model.md)
- [Inicio rápido y validación](specs/001-crm-module/quickstart.md)
- [Contrato de almacenamiento](specs/001-crm-module/contracts/entity-storage.md)
- [Checklist](specs/001-crm-module/checklists/requirements.md)
- [MER (Mermaid, en `data-model.md`)](specs/001-crm-module/data-model.md)
