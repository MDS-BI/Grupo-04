Elementos:
Cliente:
  Id_cliente
    Nombre
Correo_electrónico
Número_Telefónico
Tipo_De_Cliente (persona, empresa, etc)
Fecha_Registro_Cliente.
Tickets (Para el seguimiento de soporte de cada caso):
  Id_Ticket
  Id_Cliente
  Motivo (soporte,reclamo,consulta)
  Fecha_de_creación
  Estado (Resuelto, en proceso, Resuelto)
  Descripción
Oportunidad_venta:
Id _Oportunidad
Id_Cliente
Monto _Estimado
Etapa_de_venta(Contacto inicial, negociación, ganada, perdida)
Conexiones:
Cliente a Tickets
Un cliente puede sacar uno o mas tickets y tenerlos a lo largo del tiempo, sin embargo cada ticket pertenece a un único cliente mediante Id_Cliente
Cliente a Oportunidad_venta:
Cada cliente puede tener varias oportunidades en curso pero cada una asociada al cliente en específico mediante Id_Cliente
