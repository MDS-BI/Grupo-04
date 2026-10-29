[plan.md](https://github.com/user-attachments/files/34146518/plan.md)
# Plan de implementación: módulo CRM

**Rama propuesta**: `002-crm` | **Fecha**: 2026-10-29 | **Especificación**: [spec.md](spec.md)

## Resumen

Adaptar el template ERP del profesor a Comercial Andina Demo (caso ficticio B2B), utilizando Cliente como Entity y Oportunidad como Document. Conservar navegación, componentes y persistencia reutilizables. Configurar identidad, campos adicionales y etapas; añadir únicamente las reglas CRM que la base no ofrece. El entregable actual es el diseño documental, no un MVP ya ejecutable.

## Contexto técnico

| Aspecto | Decisión |
|---|---|
| Lenguaje | JavaScript ES2022, HTML y CSS, según template |
| Entorno | Vite; versiones exactas según package.json y lockfile del repositorio |
| Persistencia | localStorage, una empresa y un perfil de navegador |
| Pruebas previstas | Vitest y jsdom, reutilizando configuración existente |
| Plataforma | Navegadores modernos; escritorio y adaptación móvil |
| Escala de aceptación | 500 clientes y 1000 oportunidades |
| Restricción | Solo frontend; sin correo real, backend ni sincronización multiusuario |
| Moneda y calendario | CLP, fechas de calendario local; marcas ISO 8601 |

## Verificación de la constitución

No se aportó `.specify/memory/constitution.md`. No se declara haberla comprobado. Al acceder al repositorio se debe leer y resolver cualquier diferencia antes de implementar. Se proponen como criterios de trabajo: modularidad, validación central, accesibilidad, pruebas de flujos relevantes y separación entre interfaz y persistencia.

## Arquitectura y estructura propuesta

```text
specs/002-crm/
  spec.md
  plan.md
  data-model.md
  tasks.md
  modelo-entidad-relacion.svg
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
    entity-form.js
    document-form.js
tests/
  unit/
  integration/
README.md
```

Estos nombres reutilizan la estructura descrita por las plantillas; no confirman que se hayan inspeccionado archivos fuente. `crm-rules.js` y `crm-metrics.js` son extensiones propuestas para reglas comerciales e indicadores puros. app.js coordina navegación y componentes; storage.js conserva la identidad y delega validaciones CRM antes de escribir. Los listados y detalle se alojan en búsqueda; gestión mantiene formularios y selectores según el patrón base.

## Estrategia de implementación

1. Inspeccionar el repositorio, instrucciones locales, constitución, scripts, esquema de almacenamiento y pruebas. Ejecutar la base antes de cambiarla y registrar qué funcionalidades realmente existen. No heredar los checks completados del tasks original.
2. Definir ModuleConfig con etiquetas Cliente/Oportunidad, campos propios, catálogos, color y ciclo de vida. No redeclarar campos base. Conservar respaldo genérico del cargador.
3. Incorporar validaciones de código único, serie/folio, monto, fechas, estado inicial y motivo de pérdida. Compartirlas entre formularios y almacenamiento. Revisar cómo ocultar campos no usados sin borrar valores previos.
4. Completar formularios y selectores CRM, cascada confirmada y control de cambios sin guardar. Definir una escritura consistente del agregado antes de cambiar la persistencia existente.
5. Ampliar búsqueda y detalle para oportunidades; combinar filtros y recalcular los seis indicadores del modelo. Reutilizar barra lateral y panel.
6. Verificar flujos, errores de almacenamiento, navegación, seguridad de renderizado y rendimiento; documentar resultados reales. Corregir fallos antes de declarar tareas implementadas.

## Método de análisis y decisión de datos

Se usan variables categóricas (tipo, origen, responsable, etapa), fechas y montos. El análisis consiste en conteos, sumas y tasa de cierre, calculados con funciones puras. No se entrenan modelos ni se asignan probabilidades arbitrarias. El monto de oportunidad representa expectativa comercial y no ingreso. Se interpretan resultados con el volumen de casos y la información faltante para evitar conclusiones injustificadas.

## Validación prevista

| Nivel | Evidencia requerida |
|---|---|
| Unitario | Identificadores preservados, unicidad, fechas, transiciones, pérdida, cascada e indicadores |
| Integración | Crear cliente → oportunidad → avance → búsqueda → panel → recarga; editar y borrar con cancelación |
| Riesgos | Cuota agotada y JSON corrupto sin pérdida silenciosa; datos maliciosos como texto; pestaña obsoleta |
| Usabilidad | 5 participantes y 4 tareas; tiempos y tasa de éxito según SC-001 a SC-004 |
| Rendimiento | 20 búsquedas con 500/1000 registros; al menos 19 bajo 500 ms; registrar equipo y navegador |
| Compilación | Ejecutar los scripts reales de test y build del package.json; guardar resultados |
| Documental | Coherencia de entidades, campos, estados e indicadores entre archivos y MER |

No se han ejecutado estas pruebas de software porque no se aportó el código fuente del template. Los resultados deberán anotarse cuando exista implementación. No se requiere crear pruebas que solo reproduzcan etiquetas sin comprobar un flujo de usuario.

## Seguridad, riesgos y límites

Demo únicamente con datos sintéticos. Renderizar texto con textContent o escape seguro y evitar inyectar notas como HTML. Validar siempre antes de persistir; no reiniciar almacenamiento por errores. Los perfiles Ejecutivo y Jefe son actores de diseño y no permisos. La ausencia de backend impide control de acceso real, respaldo central y operación simultánea. La pérdida del perfil del navegador elimina la persistencia local. No prometer conformidad legal ni seguridad productiva a partir de esta demo.

## Escalabilidad e interconexión

Separar repositorio de datos de reglas e interfaz; mantener entity_id estable. En una etapa posterior, sustituir persistencia por API y base de datos con claves únicas/foráneas, autenticación, permisos, auditoría, respaldo y transacciones. Acordar con otros módulos el contrato de Cliente antes de intercambiar datos. Incorporar Contacto y Actividad cuando se necesiten múltiples interlocutores e historial. Es una ruta de evolución, no funcionalidad comprometida del MVP.

## Entrega y trazabilidad

El instructivo solicita repositorio con MVP, cuatro archivos Speckit, instrucciones de ejecución, imagen MER, análisis de evolución y demo funcional. Este paquete resuelve las cuatro especificaciones y el MER y aporta una guía de integración; el código y su demostración siguen pendientes. En el README real registrar decisiones, participantes y evidencias, o usar issues de GitHub. No inventar reuniones, aportes, pruebas ni validación empresarial.

El PDF fija revisión borrador el 20 de octubre y presentación/entrega final la semana del 30 de noviembre; confirmar cualquier cambio comunicado por el curso. Para la defensa de cinco minutos se propone: problema/usuarios (45 s), demo (2 min 30 s), modelo/reglas (1 min), límites y evolución (45 s).

## Seguimiento de complejidad

Se conservan dos entidades para que el MVP sea realizable sobre la base. Las extensiones indispensables son reglas de dominio, métricas y búsqueda de oportunidades. No se presenta la adaptación completa como un simple cambio de etiquetas: requiere implementación y pruebas. No se crean las carpetas research o contracts como prerrequisitos ficticios porque no fueron aportadas ni son necesarias para leer este paquete.
