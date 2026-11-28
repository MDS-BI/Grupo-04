# Plan de integración y verificación · Persona 3

Usar las historias [de catálogo](campanas.md), [de oportunidades](oportunidades.md) y [de cierre y consulta](spec.md) junto con el [contrato de datos](data-model.md). Las tres entregas documentales preparan esta implementación. Las tareas de código se marcan después de ejecutarlas y registrar evidencia.

## Orden de integración

1. Persona 1 publica las historias de campañas. Comparte con ambas personas el contrato de beneficio y ejemplos de campaña. La primera entrega de código cubre las tareas T17 a T19.
2. Persona 2 desarrolla precios y partidas con esos ejemplos. Comparte el cálculo y el componente de detalle. La segunda entrega de código cubre T20 a T22. Puede avanzar en paralelo usando muestras acordadas.
3. Persona 3 desarrolla la migración y los servicios con datos de prueba en paralelo. Conecta componentes reales tras recibir ambas entregas. Es la única persona que edita los archivos comunes `src/app.js`, `src/storage.js`, `src/module-config.js`, `index.html`, `src/styles.css`, el README y la especificación de dominio en esta ampliación. Las otras personas entregan necesidades de navegación y estilos mediante sus componentes.

## Acuerdos con las historias que ya existen

- US-04 y US-05 siguen siendo los puntos de entrada para crear o editar una oportunidad y cambiar su etapa. Extender esos flujos y sus pruebas. Los formularios del perfil genérico y los datos previos a la migración conservan sus casos de regresión.
- US-07 ya suma `totalAmount` y calcula la tasa de cierre. US-22 compara esa salida con ficha, listado y tablero. La fórmula comercial de descuentos vive únicamente en el cálculo de la Persona 2.
- US-08 y US-09 cubren recuperación e integridad. T23 y T24 extienden esa misma ruta de almacenamiento con los registros promocionales. Si el equipo ya implementó la recuperación al empezar, adaptar su mecanismo. La instantánea descrita en el modelo es una propuesta para la base revisada.
- US-15 y US-16 son las dependencias del tablero editable y la papelera. Si están activas, conectar esos puntos de entrada a las mismas operaciones de cierre, baja y restauración. Si siguen pendientes, probar el cierre y la baja actuales y dejar el punto de integración identificado.

## Tareas propias de la Persona 3

- [ ] T23. Probar migración desde esquema 1 con importes positivo y cero, oportunidades abiertas y cerradas, datos desconocidos y tickets existentes. Verificar cancelación, repetición y fallo por cuota. Implementar el adaptador CRM conservando el perfil genérico.
- [ ] T24. Implementar obtención, reserva, retiro, cierre y eliminación con el contrato de datos, bloqueo común de escritura y comprobación de la revisión. Verificar concurrencia por el último cupo, doble clic, reintento tras recarga y corte antes/después de confirmar. No mostrar premio, éxito o saldo nuevo antes de confirmar.
- [ ] T25. Conectar la vista «Campañas» al shell de navegación y montar el editor de partidas en Oportunidades. Reusar el componente de solo lectura en la ficha. Integrar el cierre tanto desde el formulario como desde el tablero si permite cambiar etapas. Evitar que una ruta alternativa cambie el monto de una cerrada.
- [ ] T26. Comprobar cascada, anonimización y límites. Si US-16 ya está disponible, cubrir restauración; si US-16 sigue en borrador, probar la eliminación existente y registrar la restauración como dependencia futura.
- [ ] T27. Recorrer ficha, listado, tablero y panel con los datos de CA-22-03. Validar visualmente un descuento manual y uno de campaña. Comparar los montos y comprobar que consultar no consume. Probar también el caso de un ticket sin oportunidad ganada.
- [ ] T28. Ejecutar la suite original y las pruebas nuevas, lint, formato y build. Registrar fecha, commit inicial, comandos y resultados en el README con un recorrido Chrome/Firefox. Al completar la implementación, actualizar el contrato de almacenamiento vigente, el MER en imagen, los pasos de demo y el estado real de las historias.

## Doce comprobaciones de entrega

| Comprobación solicitada | Historias | Responsable de reunir la evidencia |
|---|---|---|
| 1. Crear campaña con varios beneficios | US-17 | Persona 1 |
| 2. Elegibilidad, mecanismos y compatibilidad | US-17, US-18, US-20 | Persona 1 con fixtures para Persona 2 |
| 3. Oportunidad con varias partidas | US-19 | Persona 2 |
| 4. Descuento por partida y general | US-20 | Persona 2 |
| 5. Rechazo de códigos, combinaciones y valores | US-17, US-18, US-20 | Personas 1 y 2, cada una en su componente |
| 6. Resultado promocional estable tras recarga | US-18, US-21 | Persona 3 con el sorteo de Persona 1 |
| 7. Reservar, liberar y consumir una sola vez | US-21 | Persona 3 |
| 8. Conciliar las cuatro vistas | US-22 | Persona 3 con el cálculo de Persona 2 |
| 9. Conservar condiciones al editar campañas | US-17, US-20, US-22 | Persona 3 |
| 10. Migrar oportunidades sin alterar el importe | US-19, US-21 | Persona 3 |
| 11. Recuperar sin guardar parcialmente | US-18, US-21 | Persona 3 |
| 12. Mantener la independencia de posventa | US-22 | Persona 3 |

**Secuencia de verificación del repositorio.** Instalar dependencias con `npm ci`. Ejecutar `npm test -- --run`, `npm run lint`, `npm run format:check` y `npm run build`. Arrancar con `npm run dev` y preparar datos ficticios en el mismo perfil que se usará para la demo. Para probar el 10 % de una partida y un monto fijo general usar el ejemplo de $105.000 de US-20. Para verificar que el panel excluye cerradas usar el ejemplo separado de $270.000 de US-22.

