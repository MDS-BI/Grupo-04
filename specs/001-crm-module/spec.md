# Especificación de la Funcionalidad: Módulo CRM

**Rama de la funcionalidad**: 001-crm-module
**Creada**: 2026-10-26
**Estado**: Borrador
**Entrada**: Descripción del usuario: "La empresa vende equipos industriales a otras empresas de la Región del Biobío y pierde ventas porque no tiene un registro ordenado de sus clientes ni de las cotizaciones que manda. Se necesita un módulo CRM para guardar los clientes, seguir las oportunidades de venta y anotar los tickets de soporte después de la venta."

## Propósito

El módulo tiene que resolver un problema bien concreto: hoy las cotizaciones quedan repartidas entre correos y planillas, y nadie sabe en qué quedó cada una. Con el CRM el ejecutivo de ventas guarda los datos de sus clientes, va anotando las oportunidades con su monto y su etapa, y el técnico de soporte deja registradas las fallas de cada máquina. Así todo queda en el mismo lugar y siempre asociado a un cliente.

## Escenarios de Usuario y Pruebas

### Historia de Usuario 1 - Registrar y ver clientes (Prioridad: P1)

Como ejecutivo de ventas, quiero registrar los datos de contacto de una empresa para poder encontrarlos rápido cuando le mande una cotización.

**Por qué esta prioridad**: sin clientes guardados el resto deja de tener sentido, porque tanto las oportunidades como los tickets van siempre asociados a un cliente.

**Prueba Independiente**: se abre el módulo, se agrega una empresa con nombre, correo y teléfono, y aparece en la lista de clientes.

**Escenarios de Aceptación**:

1. **Dado** que estoy en la lista de clientes, **cuando** completo el formulario con nombre, correo, teléfono y tipo de cliente (persona o empresa), **entonces** el cliente queda guardado y aparece en la lista con su fecha de registro.
2. **Dado** que estoy agregando un cliente, **cuando** dejo el nombre o el correo en blanco, **entonces** el sistema no deja guardar y me avisa qué dato falta.

---

### Historia de Usuario 2 - Seguir las oportunidades de venta (Prioridad: P1)

Como ejecutivo de ventas, quiero crear una oportunidad para un cliente con su monto estimado, fecha de cierre y etapa, para saber cuánta plata está en juego y en qué quedó cada cotización.

**Por qué esta prioridad**: este es el problema que plantea el enunciado. Mientras nadie sepa en qué etapa va cada cotización, la empresa va a seguir perdiendo ventas.

**Prueba Independiente**: se elige un cliente, se crea una oportunidad con monto, fecha y etapa, y queda en la lista de oportunidades de ese cliente.

**Escenarios de Aceptación**:

1. **Dado** que estoy en la ficha de un cliente, **cuando** creo una oportunidad con monto estimado, fecha de cierre y etapa (Contacto inicial, Negociación, Ganada o Perdida), **entonces** la oportunidad se guarda ligada a ese cliente.
2. **Dado** que la oportunidad ya existe, **cuando** le cambio la etapa a Ganada o Perdida, **entonces** la lista la muestra con la etapa nueva.
3. **Dado** que estoy creando una oportunidad, **cuando** pongo un monto negativo o me olvido de elegir el cliente, **entonces** el sistema no deja guardar y muestra el error.

---

### Historia de Usuario 3 - Registrar tickets de soporte (Prioridad: P2)

Como técnico de soporte, quiero anotar un ticket asociado a un cliente y a un producto, para tener el historial de fallas y saber qué se le hizo a cada máquina.

**Por qué esta prioridad**: corresponde a la etapa de después de la venta. Aporta bastante, pero el módulo ya sirve con los clientes y las oportunidades.

**Prueba Independiente**: se elige un cliente, se registra un ticket con su motivo y descripción, y aparece en la lista de tickets con su estado.

**Escenarios de Aceptación**:

1. **Dado** que estoy en la lista de tickets, **cuando** registro uno con cliente, producto, motivo (soporte, reclamo o consulta) y descripción, **entonces** el ticket se guarda y aparece con estado "En proceso".
2. **Dado** que el ticket está en proceso, **cuando** el técnico lo pasa a "Resuelto", **entonces** se muestra como resuelto y la falla queda registrada.
3. **Dado** que estoy registrando un ticket, **cuando** no elijo un cliente, **entonces** el sistema no deja guardarlo.

### Casos Límite

- Si alguien escribe un correo sin "@" o sin dominio, el cliente no se guarda y aparece el aviso de correo mal escrito.
- Un monto estimado negativo no se acepta; se pide un valor igual o mayor a cero.
- Si falta el producto en un ticket, no se puede guardar: hay que indicar a qué máquina se le hizo la mantención o cuál falló.
