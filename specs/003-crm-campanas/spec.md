# Campañas y condiciones comerciales del CRM

Estado: especificada para implementar · Prioridad P1 · Base revisada: `c76aa68` · Perfiles: jefe comercial y ejecutivo.

Una empresa que negocia equipos industriales necesita explicar al cliente qué promoción se aplicó y evitar ofrecer el mismo cupo en dos negociaciones. La extensión trabaja con clientes y oportunidades del CRM. El importe sigue siendo una estimación en CLP. La publicación externa, el cobro, los impuestos, el inventario, la autenticación y el canje entre dispositivos quedan fuera del alcance. Los tickets conservan su vínculo con el cliente.

| Entrega | Historias | Qué puede demostrar el integrante |
|---|---|---|
| Persona 1 | [US-17 Configurar campañas y US-18 Obtener beneficios](campanas.md) | Configurar beneficios, validar un código y obtener un resultado único por participación. |
| Persona 2 | [US-19 Preparar partidas y US-20 Aplicar descuentos](oportunidades.md) | Explicar una oferta desde sus precios base hasta el monto final, con descuentos de línea y generales. |
| Persona 3 | US-21 y US-22, a continuación | Guardar, recargar, cerrar una oportunidad y conciliar sus importes y sus usos. |

US-17 a US-22 amplían las historias del CRM. Las US-12 a US-16 conservan sus identificadores en la [especificación de dominio](../001-crm-module/spec.md). Se puede desarrollar esta extensión sobre el MVP existente aunque contactos múltiples, actividades y papelera sigan como borrador. El editor conserva la navegación y los formularios laterales de la [interfaz CRM](../002-crm-ui-refresh/spec.md).

## US-21 · Reservar y consumir el beneficio al gestionar la negociación

Como ejecutivo comercial, quiero que el cupo quede reservado al guardar y que su uso refleje el cierre de la oportunidad, para evitar prometer dos veces una promoción limitada.

| Criterio | Dado / cuando | Resultado observable |
|---|---|---|
| CA-21-01 | Previsualizo, cancelo o consulto una oferta y luego guardo explícitamente una abierta. | Solo el guardado confirma juntos oportunidad, partidas, condiciones y reservas. Los cupos cuentan reservas activas más consumos, globales o por cliente. Repetir la misma operación mantiene un único uso. |
| CA-21-02 | Retiro un beneficio y guardo, o elimino una oportunidad abierta. | Se libera la reserva. La obtención por código o dinámica vuelve a estar disponible según su vigencia y límites. La participación realizada sigue contada. |
| CA-21-03 | Cierro una abierta como Ganada o Perdida. | Se conservan las reglas de transición y el motivo de pérdida existente. Se consumen todas sus reservas en la misma operación. Recargar, repetir el cierre o borrar después la oportunidad cerrada no repone el cupo. Un cierre rechazado conserva las reservas. |
| CA-21-04 | Queda un uso y dos pestañas intentan guardarlo, o se interrumpe el guardado. | Como máximo una oportunidad recibe el uso. Al reiniciar existe el estado completo anterior o el nuevo. El rechazo conserva el borrador y no anuncia éxito. |
| CA-21-05 | Elimino un cliente con tickets, oportunidades y usos. | La confirmación informa el efecto. Se aplica la cascada del CRM, se liberan reservas abiertas y se preserva el consumo con un identificador interno sin datos de contacto. Si se activa la papelera US-16, restaurar nunca duplica usos consumidos y las reservas liberadas requieren nueva validación de cupo. |

**Prueba independiente.** Dar un único uso a un beneficio, abrir dos oportunidades del mismo cliente e intentar reservarlo en ambas. Retirarlo de la primera y usarlo en la segunda. Cerrar la segunda como Perdida indicando motivo y comprobar que el cupo sigue consumido después de borrarla.

## US-22 · Verificar la cartera y las condiciones ofrecidas

Como jefe comercial, quiero consultar el saldo promocional y los montos finales en la cartera para saber qué condiciones siguen disponibles y qué monto está realmente en negociación.

| Criterio | Dado / cuando | Resultado observable |
|---|---|---|
| CA-22-01 | Consulto una campaña o un beneficio. | Distingo disponible, reservado y consumido, además de mecanismo, cliente y oportunidad/partida cuando corresponda. Para registros depurados se muestra una referencia histórica sin datos personales. Navegar o recargar no consume ni reasigna. |
| CA-22-02 | Abro ficha, listado, tablero y panel. | Cada oportunidad muestra el mismo `totalAmount` final. La ficha permite explicar base, descuentos y total. El tablero suma los finales por etapa y el panel suma solo abiertas; los conteos y la tasa de cierre conservan la fórmula del CRM. |
| CA-22-03 | Abro dos oportunidades con finales de $90.000 y $180.000 y otra Ganada por $50.000. | El panel muestra $270.000 abiertos, dos oportunidades abiertas y, si esa Ganada es la única cerrada, 100 % de cierre. Desactivar la campaña y recargar conserva los importes. Una nueva aplicación del beneficio desactivado resulta rechazada. |
| CA-22-04 | Un cliente con beneficios registra un ticket sin una venta ganada. | Se puede crear y resolver el ticket con el flujo de posventa disponible. La operación no consume beneficios ni cambia el tipo de cliente, las etapas o el monto de sus oportunidades. |

**Prueba independiente.** Usar los tres registros sintéticos de CA-22-03, navegar por las cuatro vistas y comparar oportunidades, saldos y usos antes y después. Registrar las cifras y el navegador usado.

## Trazabilidad con la propuesta que recibió el equipo

| Requisitos de origen | Criterios de esta extensión |
|---|---|
| FR-12-01 a 08 · catálogo, configuración y mantenimiento | CA-17-01 a 05, CA-18-01 a 03 |
| FR-12-09 a 13 · historia de condiciones y cifras visibles | CA-17-05, CA-19-01, CA-20-02 a 06, CA-22-02 y 03 |
| FR-12-14 a 16 · consulta de usos y cálculo común | CA-18-01, CA-20-02 y 05, CA-21-01, CA-22-01 a 03 |
| FR-13-01 a 06 · partidas, elegibilidad, obtención y límites | CA-19-01 a 03, CA-17-03 y 04, CA-18-01 a 04, CA-20-01 a 03, CA-21-04 |
| FR-13-07 a 11 · manuales, compatibilidad y acciones explícitas | CA-19-03, CA-20-02 a 05, CA-21-01 y 02 |
| FR-13-12 a 14 · cierre económico, copia histórica y operación protegida | CA-20-05 y 06, CA-21-01 a 05, CA-22-03 |

[Modelo de datos y contrato de integración](data-model.md) · [Plan de implementación y pruebas](tasks.md)

