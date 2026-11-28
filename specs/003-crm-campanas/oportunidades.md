# Partidas y descuentos de oportunidad · Persona 2

Prioridad P1 · Estado propuesto · US-19 y US-20. El ejecutivo trabaja en el formulario de Oportunidades existente. El folio, el cliente, la moneda CLP y las etapas siguen las reglas del CRM.

## US-19 · Preparar el monto de una oportunidad por partidas

Como ejecutivo comercial, quiero desglosar los equipos y cantidades de una negociación para explicar el monto estimado al cliente y corregir una partida sin rehacer la cotización.

| Criterio | Dado / cuando | Resultado observable |
|---|---|---|
| CA-19-01 | Creo una oportunidad y agrego una o más partidas. | Cada partida tiene ID estable, descripción, cantidad entera positiva, precio unitario entero en CLP mayor o igual a cero y referencia de producto opcional. La base es la suma de cantidad × precio. Sin descuentos, coincide con el monto final. |
| CA-19-02 | Ingreso cantidad cero, precio negativo, un decimal, dejo la descripción vacía o intento guardar sin partidas. | Identifico el error junto al campo y conservo los valores. Un precio cero sí es válido. Se rechaza un importe que no se pueda representar exactamente en pesos. |
| CA-19-03 | Modifico el precio o la cantidad de una oportunidad abierta. | La vista previa parte de los precios base y vuelve a validar la selección. Si un descuento pierde su elegibilidad, se explica y debo corregirlo o quitarlo antes de guardar. Los montos base y final son de solo lectura. |
| CA-19-04 | Abro una oportunidad antigua tras confirmar su migración. | Veo una sola partida «Monto histórico de la oportunidad», cantidad 1 y precio igual al monto anterior, incluso si vale cero. Conserva folio, cliente, estado e importe y carece de producto inventado o descuentos atribuidos. Repetir la migración no duplica la partida. |

**Prueba independiente.** Registrar dos compresores de $50.000 y un servicio de $20.000. La base y el monto final inicial deben ser $120.000. Cambiar la cantidad del compresor a uno debe producir $70.000.

## US-20 · Aplicar y explicar descuentos

Como ejecutivo comercial, quiero comparar los beneficios elegibles y aplicar o retirar un descuento de forma explícita para conocer exactamente qué monto ofrecer y por qué.

| Criterio | Dado / cuando | Resultado observable |
|---|---|---|
| CA-20-01 | Selecciono un beneficio de producto. | Solo alcanza partidas elegibles. Con referencia externa se compara el identificador. Sin referencia se requiere una selección explícita permitida por la condición. La similitud del texto libre no habilita un descuento. |
| CA-20-02 | Aplico varios beneficios compatibles. | Se calculan primero los de partida y después los generales. Dentro de cada alcance rige la prioridad configurada; a igual prioridad se usa el ID estable. Un porcentaje se calcula sobre el saldo y se redondea al peso más cercano en cada paso (medio peso hacia arriba). Un fijo se aplica una vez por partida elegible o una vez por oportunidad, según su alcance. |
| CA-20-03 | Selecciono un beneficio excluyente, repetido en el mismo alcance, de otra campaña sin acuerdo explícito, o un manual sin compatibilidad expresa. | El sistema muestra el conflicto y me permite elegir. Nada se sustituye hasta que yo lo confirme. Un mismo beneficio de partida sí puede afectar distintas partidas elegibles, con un uso por cada una. |
| CA-20-04 | Aplico un descuento manual a una partida o al total. | Debo ingresar un motivo y un valor válido. Un fijo superior al saldo y cualquier descuento sobre saldo cero se rechazan. El 100 % de un saldo positivo puede dejarlo en cero. El motivo comercial y el motivo de pérdida se guardan por separado. |
| CA-20-05 | Consulto la vista previa, guardo y recargo. | Veo por paso el origen, mecanismo, alcance, tipo, valor, monto descontado y saldo final. Se conserva una copia de las condiciones y del motivo manual. Editar o vencer la campaña no altera los importes guardados. Un cambio de precio reutiliza las condiciones guardadas y revalida la elegibilidad; una selección nueva exige vigencia actual. |
| CA-20-06 | Intento modificar cantidades, precios o descuentos en Ganada o Perdida. | La interfaz y la operación de guardado bloquean la modificación económica. Se conservan las demás ediciones permitidas por FR-023 y el estado final. |

**Prueba independiente.** Sobre la base de $120.000 del ejemplo, aplicar 10 % solo a la partida de compresores y luego $5.000 al conjunto. Esperado: $10.000 y $5.000 de descuento, final $105.000. Sustituir el fijo por uno de $110.001 debe fallar. Para verificar el redondeo sucesivo, aplicar dos descuentos compatibles de 10 % sobre $105. Los descuentos individuales son $11 y $9; el final es $85.

## Trabajo que entrega la Persona 2

- [ ] T20. Crear el cálculo puro en `src/opportunity-pricing.js` y probar enteros CLP, orden, redondeo, saldo cero, descuento fijo excesivo y reconstrucción desde la base. Para elegir o combinar beneficios, invocar el evaluador de la Persona 1. La vista previa muestra sus rechazos y delega el guardado a la Persona 3. Panel, tablero y ficha leen el `totalAmount` confirmado por ese mismo cálculo.
- [ ] T21. Adaptar `src/components/document-form.js` para el perfil CRM y crear el editor de partidas y el desglose en un componente nuevo. Montarlo dentro del formulario existente. Mantener el formulario genérico cuando el perfil CRM no esté activo.
- [ ] T22. Entregar el desglose como componente de lectura reutilizable por la ficha. Incluir tests de formulario, cancelación y recuperación de errores. La previsualización solo calcula. Guardar envía el borrador completo a la operación de la Persona 3.
- [ ] Entregar a la Persona 3 el contrato `calcularOferta(borrador, condiciones)` con `baseAmount`, `totalAmount`, detalle por partida/descuento y errores. Una sola función calcula los importes tanto al previsualizar como al validar el guardado.

**Límite de archivos para el código.** Esta persona es dueña del formulario de oportunidad, del detalle reutilizable y del cálculo. La Persona 3 conecta estos componentes con las vistas y la persistencia. Si se necesita un punto de montaje en `index.html`, lo incorpora la Persona 3.
