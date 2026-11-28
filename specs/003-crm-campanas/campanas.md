# Campañas y obtención de beneficios · Persona 1

Prioridad P1 · Estado propuesto · US-17 y US-18. El jefe comercial configura las condiciones. El ejecutivo obtiene beneficios para un cliente. Ambos son perfiles de uso de la demo local.

## US-17 · Configurar y consultar una campaña

Como jefe comercial, quiero definir los beneficios y las condiciones de una campaña para que el equipo ofrezca el mismo descuento bajo las mismas reglas.

| Criterio | Dado / cuando | Resultado observable |
|---|---|---|
| CA-17-01 | Creo una campaña con código, nombre, vigencia y dos beneficios. | Se genera un ID estable. Puedo consultar y editar ambos beneficios y deshabilitar la campaña. Las campañas usadas se conservan. |
| CA-17-02 | Guardo un código de campaña duplicado tras recortar y convertir a mayúsculas, un nombre vacío, una fecha inexistente o una fecha final anterior al inicio. | El formulario conserva los valores, señala el campo y el registro anterior sigue intacto. El período incluye ambas fechas en el calendario local. |
| CA-17-03 | Configuro un beneficio. | Debo definir porcentaje entero de 1 a 100 o CLP fijo entero positivo, alcance por partida u oportunidad, mecanismo directo, código o dinámica, prioridad de aplicación, elegibilidad y cupos globales o por cliente. El código de canje normalizado identifica un único beneficio en todo el catálogo. |
| CA-17-04 | Declaro dos beneficios compatibles o configuro una dinámica. | La compatibilidad debe ser recíproca. La dinámica exige resultados posibles, admite «sin beneficio», exige probabilidades válidas que sumen 100 % y un límite de participaciones por cliente. Una contradicción impide guardar. |
| CA-17-05 | Consulto una campaña futura, vigente, finalizada o deshabilitada. | Veo su estado, beneficios y condiciones. Solo una campaña habilitada y vigente admite nuevas obtenciones o aplicaciones. Editar o desactivar conserva las condiciones históricas ya aplicadas. Consultar no cambia el saldo. |

**Prueba independiente.** Crear la campaña ficticia FERIA con un 10 % directo sobre un equipo y $5.000 mediante código sobre una oportunidad. Autorizar la combinación en ambos sentidos. Verificar búsqueda por código, fecha límite inclusiva, código repetido y desactivación.

## US-18 · Obtener un beneficio una sola vez

Como ejecutivo comercial, quiero ingresar un código o participar en una dinámica por cuenta de un cliente para saber qué beneficio está disponible antes de modificar su oportunidad.

| Criterio | Dado / cuando | Resultado observable |
|---|---|---|
| CA-18-01 | Ingreso un código válido para un cliente elegible. | Se registra la obtención con cliente, beneficio, mecanismo y fecha. Queda disponible. El monto de la oportunidad sigue igual. Los beneficios directos se pueden seleccionar sin este paso previo. |
| CA-18-02 | El código no existe, está vencido, el cliente no califica o superó el límite. | Veo la causa. No se crea una obtención ni cambia el monto. Un código válido no elude las comprobaciones al guardar. |
| CA-18-03 | Participo una vez en una dinámica. | Se guardan juntos participación y resultado, incluido «sin beneficio». Solo se muestra el resultado definitivo tras guardar. Recargar o repetir la misma solicitud devuelve el resultado registrado y cuenta una sola participación. |
| CA-18-04 | Hay una participación permitida y dos pestañas intentan usarla, o falla la persistencia. | Como máximo una participación queda confirmada. Un error conserva el estado anterior. Una obtención exitosa puede seleccionarse después sin volver a sortear. |

**Prueba independiente.** Con un cliente ficticio y una dinámica de un intento, fijar el resultado en la prueba, confirmar y recargar. Comprobar también la rama sin premio y un error al guardar. No usar una muestra aleatoria como criterio de aprobación.

## Trabajo que entrega la Persona 1

- [ ] T17. Escribir pruebas de vigencia, normalización, unicidad, compatibilidad, cupos y probabilidades. Implementar reglas puras en el nuevo `src/campaign-rules.js`.
- [ ] T18. Crear los componentes de catálogo, configuración y obtención en archivos nuevos de `src/components/`. Reutilizar etiquetas, formularios, avisos y navegación por teclado del CRM. El componente recibe los datos y las operaciones de guardado desde la aplicación.
- [ ] T19. Entregar fixtures sintéticos y pruebas de los dos recorridos en archivos de prueba nuevos. Para desarrollar antes de la integración se puede pasar un repositorio en memoria al componente. La prueba definitiva de recarga, concurrencia y fallo corresponde a la integración con almacenamiento real.
- [ ] Entregar un único evaluador de vigencia, elegibilidad, compatibilidad y límites con entradas explícitas de cliente, partidas, fecha, reservas y consumos. La Persona 2 lo usa en la vista previa y la Persona 3 lo vuelve a invocar con datos actuales al confirmar. Entregar los componentes y los datos que envían las acciones «guardar campaña» y «obtener beneficio». La Persona 3 implementa la escritura de ambas acciones. Compartir el ejemplo FERIA con IDs estables, versión, alcance y prioridad.

**Límite de archivos para el código.** Esta persona es dueña de las reglas y pantallas de campañas. La conexión en `app.js`, los cambios de esquema y las escrituras en `localStorage` corresponden a la Persona 3.

