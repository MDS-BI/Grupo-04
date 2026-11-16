Feedback Avance 01 (26/10/26)

data-model.md esta demasiado simple, pueden ir profundizandolo
al plan.md le falta la parte tecnica que borraron
a las historias de usuario (specs.md) tambien le falta la parte tecnica, que se desarrolla usando IA

Proximos pasos:

- rectificar puntos anteriores
- trabajar en los specs (historias de usuario, US) para definir tareas
- dividirse las US y tareas para una siguiente iteracion (avances cada semana)
- ejecutar una version integrada de prueba

 Feedback Avance 02 (2/11/26)

- Se observan historias de usuario por miembro del grupo y ordenamiento del proyecto, muy bien
- Ver referencia a archivo datamodel.md en los specs (versus original data-model.md)

Proximos pasos:

- crear tareas a partir de los specs
- hacer primera implmentacion, registar modificaciones/incremental y volver al spec
- dividir el grupo entre modificaciones (ajustes previos) e incremental (nueva funcionalidad)
- integrar nueva version en 2 semanas

Feedback Avance 03 (16/11/26)

Consistencia sitio-especificación:
- FR-016 y US4 (escenario 4) dicen que la pantalla de gestión no muestra la lista de entidades, y T021 está marcada como hecha. Sin embargo, `index.html` incluye en `view-entities` la sección "Registros" (`client-list-items`).
- El sitio tiene funcionalidades que no están en spec.md ni en tasks.md: tickets de soporte (`ticket-form.js`, `ticket-list.js`, `storage.js`), embudo comercial (`commercial-board.js`), métricas CRM (`crm-metrics.js`, `dashboard.js`) y filtros de búsqueda (`search-bar.js`). Tampoco hay tareas para ellas.
- hacer mejoras de funcionalidad e interfaz de usuario, incluir data simulada para probar campos, incluir mejoras de estilo, transicion, navegacion, etcetera.

Presentacion de MVP final en 2 semanas.
