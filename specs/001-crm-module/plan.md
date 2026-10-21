[plan_de_desarrollo_crm.md](https://github.com/user-attachments/files/33776413/plan_de_desarrollo_crm.md)
# Plan de Desarrollo - Módulo CRM (Customer Relationship Management)

## 1. Visión General del Proyecto

En este documento se define el plan de trabajo para adaptar el módulo base (`Vite + Vanilla JS`) al módulo **CRM**, cumpliendo con la metodología *Spec Driven Development*.

El objetivo principal es entregar un Producto Mínimo Viable (MVP) que permita gestionar la relación con clientes (Entidades) y el seguimiento de oportunidades comerciales (Documentos), integrando las definiciones de datos del modelo relacional global (`erp_data_model.md`).

---

## 2. Definición del MVP y Ámbito de Aplicación

* **Usuarios Principales:** Ejecutivos de Ventas, Administradores de CRM y Agentes de Soporte.
* **Entidad Principal (`Entity`):** **Cliente** (`customers` / `contacts`), registrando datos de contacto y empleado asignado.
* **Documento Principal (`Document`):** **Oportunidad de Venta** (`opportunities`), registrando etapas del embudo comercial, valores estimados y fechas de cierre.
* **Interconexión:** Vinculación con los módulos de Recursos Humanos (`employees`) y Logística (`products`).

---

## 3. Cronograma de Hitos y Entregables

| Hito | Fecha Límite | Entregables Clave | Estado |
|---|---|---|---|
| **Hito 1: Revisión Intermedia** | 20 de Octubre | Borrador de repositorio, Diagrama MER del CRM y `plan.md` inicial. | Completado / En Revisión |
| **Hito 2: Desarrollo ySpecs** | 10 de Noviembre | Archivos `spec.md`, `data-model.md` y `tasks.md` terminados. | En Progreso |
| **Hito 3: MVP Funcional** | 20 de Noviembre | Configuración en `src/module-config.js` probada y con datos falsos. | Pendiente |
| **Hito 4: Entrega y Presentación** | Semana del 30 de Noviembre | Repositorio final listo, ensayo de demo funcional (5 mins). | Pendiente |

---

## 4. Fases de Ejecución

### Fase 1: Arquitectura de Datos y MER
1. **Identificación de Tablas CRM:** Extraer del `erp_data_model.md` las tablas: `customers`, `contacts`, `leads`, `opportunities`, `opportunity_stages`, `interactions` y `support_tickets`.
2. **Generación del Diagrama MER:** Crear el diagrama Entidad-Relación visual enfocado en CRM e incluirlo en la documentación del repositorio.
3. **Mapeo al Template:** Definir los campos personalizados de Cliente e Oportunidad que se agregarán en `src/module-config.js`.

### Fase 2: Documentación Spec Driven
1. **`plan.md`:** (Este documento) Hoja de ruta del proyecto.
2. **`spec.md`:** Definición de historias de usuario, reglas de negocio, manejo de datos sensibles (PII) y mitigación de sesgos en la asignación de oportunidades.
3. **`data-model.md`:** Definición técnica de las entidades y tipos de datos especificando la persistencia en `localStorage`.
4. **`tasks.md`:** Check-list de tareas detalladas de desarrollo y validación.

### Fase 3: Configuración del Frontend (MVP)
1. Editar `src/module-config.js` con las etiquetas, campos personalizados y ciclo de vida del estado de las oportunidades (`Prospecto` $\rightarrow$ `Calificado` $\rightarrow$ `Propuesta` $\rightarrow$ `Ganado` / `Perdido`).
2. Verificar el funcionamiento de la barra de navegación, el dashboard de estadísticas, la búsqueda y la persistencia de datos.
3. Cargar datos de prueba (mock data) representativos.

### Fase 4: Preparación de la Defensa Final
1. Preparar la estructura de la presentación (5 minutos).
2. Revisar la coherencia entre el repositorio, la especificación y la interfaz visual.
3. Realizar ensayos aleatorios entre los integrantes del grupo para la defensa oral.
