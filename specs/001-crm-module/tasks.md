[tareas_crm.md](https://github.com/user-attachments/files/33778828/tareas_crm.md)
# Lista de Tareas (Checklist de Implementación)

Este documento detalla los pasos técnicos y operativos para construir el MVP del CRM, permitiendo hacer seguimiento al progreso del equipo.

## Fase 1: Arquitectura y Diseño (Revisión 20 de Octubre)
- [x] **Tarea 1.1:** Definir el problema, usuarios y contexto de negocio B2B en la región.
- [x] **Tarea 1.2:** Seleccionar tablas relevantes del modelo ERP base (`customers`, `opportunities`, `support_tickets`).
- [x] **Tarea 1.3:** Crear el diagrama Entidad-Relación (MER) usando IA generativa.
- [x] **Tarea 1.4:** Subir imagen del diagrama (`crm_erd.png`) al repositorio.

## Fase 2: Documentación Spec Driven
- [x] **Tarea 2.1:** Redactar y subir `plan.md` con la hoja de ruta.
- [x] **Tarea 2.2:** Redactar y subir `spec.md` con historias de usuario y análisis de riesgos.
- [x] **Tarea 2.3:** Redactar y subir `data-model.md` especificando relaciones inter-módulos.
- [x] **Tarea 2.4:** Redactar y subir `tasks.md` (este documento).

## Fase 3: Configuración del Frontend (MVP)
- [x] **Tarea 3.1:** Restaurar el repositorio base (`src/` e `index.html`) desde el historial de Git.
- [x] **Tarea 3.2:** Editar `src/module-config.js` para renombrar la Entidad genérica a **Cliente** y el Documento a **Oportunidad**.
- [x] **Tarea 3.3:** Configurar campos personalizados (`contactName`, `accountOwner`, `acquisitionSource`, `opportunityTitle`, `opportunityOwner`, `lossReason`).
- [x] **Tarea 3.4:** Configurar el ciclo de estados (`statusLifecycle`): Nueva $\rightarrow$ Contactada $\rightarrow$ Propuesta $\rightarrow$ Negociación $\rightarrow$ Ganada/Perdida.
- [x] **Tarea 3.5:** Ejecutar las pruebas y el build (`vitest run`, `npm run build`) y validar que la interfaz funcione sin errores.

## Fase 4: Preparación para la Entrega (Fines de Noviembre)
- [ ] **Tarea 4.1:** Cargar datos de prueba realistas en la interfaz (Ej: empresas forestales, aserraderos locales).
- [x] **Tarea 4.2:** Probar el flujo completo: registrar un cliente nuevo y crearle una oportunidad de venta.
- [ ] **Tarea 4.3:** Preparar la presentación y ensayar el "pitch" de 5 minutos, considerando que el presentador será elegido al azar.
