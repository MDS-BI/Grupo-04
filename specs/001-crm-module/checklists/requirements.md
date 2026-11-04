# Lista de verificación de calidad de la especificación: Módulo CRM

**Propósito**: validar la completitud y calidad de `spec.md` antes de planificar e implementar.
**Creada**: 2026-11-03
**Funcionalidad**: [spec.md](../spec.md)
**Estado**: En revisión

## Calidad del contenido

- [x] La especificación está enfocada en el valor para el usuario y las necesidades del negocio.
- [x] Está escrita para partes interesadas no técnicas en las historias y criterios de aceptación.
- [x] Todas las secciones obligatorias están completas.
- [ ] Los criterios de aceptación no contienen detalles de implementación.
  - **Nota**: el curso solicita una parte técnica por historia. Para compatibilizar ambos requisitos, los detalles técnicos están separados en “Notas técnicas” y en el “Anexo técnico”; los CA siguen siendo funcionales.
- [x] Las notas técnicas están identificadas como anexo y no reemplazan los CA.

## Completitud de los requisitos

- [x] No quedan marcadores `[NEEDS CLARIFICATION]`.
- [x] Los requisitos funcionales son comprobables y trazables a historias y criterios.
- [x] Los criterios de éxito son medibles y tienen protocolo de medición.
- [x] Los criterios de éxito son agnósticos a la tecnología.
- [x] Todos los escenarios de aceptación están definidos.
- [x] Los casos límite están identificados.
- [x] El alcance está delimitado: MVP P1 y tickets P2.
- [x] Las dependencias y suposiciones están identificadas.
- [x] Los requisitos no funcionales están definidos (accesibilidad, rendimiento, persistencia, privacidad y seguridad de renderizado).

## Preparación de la funcionalidad

- [x] Todos los requisitos funcionales tienen criterios de aceptación o referencia a una historia.
- [x] Los escenarios de usuario cubren los flujos principales.
- [ ] La funcionalidad cumple los resultados medibles definidos en los criterios de éxito.
  - **Nota**: pendiente de medir con la versión integrada; los SC son metas, no resultados obtenidos.
- [ ] No hay filtración de detalles de implementación en los criterios de aceptación.
  - **Nota**: algunos CA nombran campos del modelo (`entity_id`, `targetDate`, `lossReason`, `ModuleConfig`) para mantener la trazabilidad. Se acepta como desviación consciente y se revisará al cerrar la especificación.
- [x] La especificación, el plan y el modelo de datos usan el mismo ciclo de vida y los mismos nombres de campo.
- [x] El modelo de datos define cliente, oportunidad y ticket (P2), con claves y restricciones.
- [x] El contrato de almacenamiento distingue el comportamiento base del perfil CRM.

## Pendientes conocidos

- [x] `tasks.md` regenerado desde las historias y requisitos, con T004A (lint/formato), T054A (edición de ticket), T069 (usabilidad) y T070 (recorrido completo).
- [ ] Los nombres de los integrantes deben completarse en la tabla de organización por integrante.
- [ ] La versión integrada debe ejecutar `npm run lint`, `npm run format:check`, `npm test -- --run` y `npm run build`, y registrar los resultados reales.
- [ ] El diagrama Mermaid de `data-model.md` debe coincidir con las tablas de entidades y relaciones.
- [ ] SC-001 a SC-004 deben medirse o declararse pendientes; no se reportan como cumplidos sin evidencia.

## Hallazgos aceptados o diferidos

Provienen de `speckit.analyze` y se aceptan de forma consciente. Pueden reaparecer en análisis posteriores; no bloquean la implementación.

| ID | Estado | Motivo y destino |
|---|---|---|
| AMB-01 | Pendiente | Nombres de integrantes; se completan en T065 y en la tabla de `spec.md`. |
| AMB-03 | Diferido a P2 | El presupuesto numérico del panel se fija al implementar US-07 y se mide en T063. |
| DUP-01 | Aceptado | FR-027…FR-035 reformulan NFR-001…NFR-009 de forma intencional; ante conflicto prevalece el NFR. |
| DUP-02 | Aceptado | La meta de rendimiento se repite en FR-034, NFR-002 y SC-005 como redundancia intencional. |

## Notas

La especificación está en revisión. `tasks.md` ya existe como grafo trazable; no se declara “lista para implementación” hasta que la versión integrada tenga evidencia de pruebas.
