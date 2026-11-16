# Inicio rápido y validación: rediseño de interfaz del CRM

**Feature**: `002-crm-ui-refresh` · **Fecha**: 2026-11-16 · **Especificación**: [spec.md](spec.md)

Esta guía valida la iteración de interfaz con datos sintéticos. No repite las reglas de negocio de `001`; para dominio, persistencia y ciclo de vida, usar [`../001-crm-module/quickstart.md`](../001-crm-module/quickstart.md).

## Prerrequisitos

- Node.js compatible con el `package.json` del repositorio.
- Dependencias instaladas (`npm install`).
- La enmienda de `FR-036` y `CA-06-11` aplicada en `specs/001-crm-module/spec.md`.
- Navegador moderno de escritorio; para responsive, una ventana redimensionable.

## Puesta en marcha

```bash
npm install
npm run dev        # desarrollo en el puerto que indique Vite
npm test -- --run  # línea base: 278 pruebas de 001 + las nuevas
npm run lint
npm run format:check
npm run build
```

**Línea base esperada antes de implementar**: 28 archivos y 278 pruebas en verde, `eslint` sin errores. Registrar la salida real en `README.md`; si cambia, anotar el motivo.

## Datos semilla

Usar solo datos ficticios:

| Registro | Datos |
|---|---|
| Cliente | `Empresa Demo 1`, código `CLI-DEMO-003`, tipo Prospecto, responsable Ejecutivo A, origen Referido |
| Cliente 2 | `Empresa Demo 2`, código `CLI-DEMO-004`, tipo Activo, responsable Ejecutivo B, origen Sitio web, `targetDate` ayer |
| Oportunidad | Asunto “Compresor industrial”, folio `3001`, apertura `2026-11-02`, cierre `2026-11-30`, monto `8500000`, responsable Ejecutivo A |
| Ticket | Producto “Compresor CX-200”, motivo Soporte, prioridad Media, descripción “Vibración en el arranque” |

Registrar en el `README` que los datos son sintéticos.

## Escenario 1 — Navegación y búsqueda global (US-UX-01)

1. Abrir la aplicación y quedarse en el panel.
2. Enfocar la búsqueda de la cabecera y escribir `CLI-DEMO-003`.
3. Comprobar que la vista cambia a búsqueda y muestra el cliente.
4. Revisar la barra lateral: debe contener Panel, Clientes y Oportunidades, **sin** una entrada “Buscar”.
5. Expandir Clientes y verificar “Listado / Nuevo”; repetir con Oportunidades.
6. Activar “Nuevo” en Oportunidades y comprobar que se abre el drawer vacío.
7. Navegar a otra vista con el drawer abierto y con datos escritos; verificar la confirmación.
8. Usar Atrás del navegador y un enlace directo `#/search`.

**Resultado esperado**: la búsqueda está disponible desde cualquier vista, el criterio sobrevive la navegación, existe un único elemento activo, los submenús exponen `aria-expanded` y no hay entrada de búsqueda en el menú lateral. Al cancelar una navegación con cambios, se conserva lo escrito.

## Escenario 2 — Drawer y alta de cliente al vuelo (US-UX-02)

1. Ir a Clientes → Listado y activar “Nuevo cliente”.
2. Verificar drawer, formulario vacío, obligatorios marcados y foco en el primer campo.
3. Guardar con campos vacíos: los errores aparecen dentro del drawer y el foco va al primero.
4. Completar `Empresa Demo 1`, `CLI-DEMO-003`, Prospecto, Ejecutivo A y Referido; guardar.
5. Comprobar que el drawer se cierra, se confirma la creación y la fila aparece sin recargar.
6. Editar la fila, cambiar el origen y guardar; verificar que `id` y `entity_id` no cambian.
7. Recorrer el drawer solo con teclado: Tab, Shift+Tab y Esc; verificar que el foco no sale y vuelve al disparador.
8. Abrir Oportunidades → Nuevo con almacenamiento vacío.
9. Verificar que el selector no bloquea y que aparece “Crear cliente ahora”.
10. Escribir asunto, folio, fechas y monto; abrir el alta al vuelo y crear un cliente válido.
11. Confirmar que el cliente queda seleccionado y que el formulario de oportunidad conserva lo escrito.
12. Guardar la oportunidad. Repetir el alta al vuelo y cancelar.

**Resultado esperado**: el alta y la edición no abandonan la lista; el foco entra, cicla y vuelve; los datos del formulario de oportunidad sobreviven al alta al vuelo; cancelar el alta no crea registros; las validaciones son las mismas de `001`.

## Escenario 3 — Tablas, orden y filtros (US-UX-03)

1. Buscar clientes y revisar la tabla: monograma, nombre, código, tipo, responsable, origen, próximo contacto y acciones.
2. Ordenar por responsable ascendente y luego descendente; comprobar `aria-sort` en el encabezado.
3. Ordenar por próximo contacto y verificar que los valores vacíos quedan al final.
4. Abrir “Filtros” y activar un chip de tipo y uno de origen; comprobar el contador y los resultados.
5. Cambiar el selector de tipo y verificar que el chip refleja el cambio.
6. Pulsar “Limpiar”: chips y selectores se desactivan y el criterio escrito se conserva.
7. Repetir la búsqueda combinando texto y dos filtros; verificar AND.
8. Buscar una oportunidad por folio y comprobar que aparece en su sección con el cliente vinculado.
9. Repetir el recorrido solo con teclado.

**Resultado esperado**: las tablas tienen caption accesible, el orden es estable y anunciado, los vacíos quedan al final, chips y selectores coinciden siempre y los resultados de oportunidades no se mezclan sin etiqueta con los de clientes.

## Escenario 4 — Panel vacío, panel con datos y distribución (US-UX-04)

1. Abrir el panel con `localStorage` vacío.
2. Verificar ilustración, título, explicación y CTA “Registra tu primer cliente”; la banda de KPIs no debe verse.
3. Activar la CTA y comprobar que abre el drawer de nuevo cliente.
4. Crear dos clientes y tres oportunidades: dos abiertas por `100000` y `200000`, una ganada por `50000`.
5. Volver al panel: verificar banda de seis KPIs y “Distribución por etapa”.
6. Comprobar `Monto abierto = 300000` y `Oportunidades abiertas = 2`.
7. Marcar una oportunidad abierta como Perdida con motivo y volver al panel.
8. Comprobar el recálculo de monto, conteo y distribución.
9. Revisar la tasa de cierre sin oportunidades cerradas y con una cerrada.
10. Comparar `localStorage` antes y después de todo el recorrido.

**Resultado esperado**: el estado vacío solo aparece sin datos; los indicadores coinciden con las fórmulas de `001`; la distribución muestra una fila por estado con conteo y monto, incluidos los ceros; la tasa de cierre dice “Sin datos” cuando corresponde; no se agregaron claves ni totales.

## Validaciones transversales

| Aspecto | Cómo comprobarlo | Resultado esperado |
|---|---|---|
| Regresión | `npm test -- --run` | Las 278 pruebas de `001` y las nuevas pasan |
| Teclado | Recorrer cabecera, submenús, drawer, tabla, chips y panel | Todo alcanzable, foco visible y devuelto |
| Foco en overlay | Abrir y cerrar solo con teclado; abrir dos overlays | El foco entra, cicla, no sale y vuelve al disparador correcto |
| Cambios sin guardar | Escribir y cerrar con Esc, con el veló y al navegar | Confirmación; cancelar conserva, descartar no persiste |
| Responsive | 1440, 1024, 768 y 390 px | Sin desbordamiento; drawer a pantalla completa bajo 640 px; tabla con scroll horizontal |
| Contraste | Medir texto secundario y CTA primaria | ≥ 4.5:1 en texto normal; ≥ 3:1 en controles |
| Sin cambios de datos | Comparar `localStorage` antes/después de navegar, ordenar, filtrar y consultar | Mismas claves y campos; `schemaVersion` intacto |
| Rendimiento | 500 clientes y 1000 oportunidades; 20 búsquedas y 20 ordenamientos | Al menos 19 de 20 bajo 500 ms; registrar equipo y navegador |
| Seguridad | Guardar asunto o notas con HTML o texto tipo script | Se muestran como texto; sin ejecución |
| Terminología | Revisar las cuatro vistas y estados vacíos | Cliente/Clientes y Oportunidad/Oportunidades, sin “entidad” ni “documento” |

## Criterios de salida

- `specs/001-crm-module/spec.md` enmendado en `FR-036` y `CA-06-11`.
- `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build` sin errores, con salida registrada en `README.md`.
- Escenarios 1 a 4 ejecutados con datos sintéticos y resultados anotados.
- Validación manual de teclado, contraste y responsive registrada con navegador y dimensiones.
- Comparación de `localStorage` documentada.
- Cualquier criterio no verificado se declara pendiente; no se reporta como cumplido.

## Referencias

- Requisitos y criterios: [spec.md](spec.md)
- Vistas derivadas y ausencia de cambios de esquema: [data-model.md](data-model.md)
- Contrato de DOM y ARIA: [contracts/ui-shell.md](contracts/ui-shell.md)
- Decisiones y alternativas: [research.md](research.md)
- Arquitectura y verificación: [plan.md](plan.md)
- Dominio heredado: [../001-crm-module/spec.md](../001-crm-module/spec.md) y [../001-crm-module/quickstart.md](../001-crm-module/quickstart.md)
