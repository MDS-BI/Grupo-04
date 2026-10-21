[especificaciones_crm.md](https://github.com/user-attachments/files/33779085/especificaciones_crm.md)
# Especificaciones del Sistema - Módulo CRM

## 1. Contexto y Problema
La empresa proveedora de equipamiento industrial B2B en la Región del Biobío presenta pérdida de ventas debido a la falta de trazabilidad en las cotizaciones enviadas a clientes (forestales, constructoras, logísticas). El módulo CRM busca centralizar la información de los clientes, las oportunidades de negocio en curso y los requerimientos de soporte técnico post-venta.

## 2. Usuarios del Sistema
- **Ejecutivo de Ventas:** Encargado de registrar cuentas comerciales y gestionar el avance de las oportunidades (embudo de ventas).
- **Soporte Técnico:** Encargado de atender y registrar tickets asociados a fallas o mantención de maquinaria específica.
- **Jefatura Comercial:** Revisa el estado global de las oportunidades y el volumen de tickets.

## 3. Historias de Usuario
1. **Gestión de Clientes:** Como Ejecutivo de Ventas, quiero registrar y visualizar la información de contacto de las empresas (clientes) para acceder rápidamente a sus datos al momento de cotizar.
2. **Embudo de Oportunidades:** Como Ejecutivo de Ventas, quiero crear oportunidades comerciales asignándoles un valor estimado, fecha de cierre y etapa (Prospecto, Propuesta, Ganado) para hacer seguimiento de la venta.
3. **Post-Venta:** Como Soporte Técnico, quiero registrar tickets de soporte vinculados a un cliente y a un producto específico para mantener el historial de fallas de la maquinaria.

## 4. Riesgos de Datos y Manejo de Sesgos
- **Privacidad de la Información:** El CRM almacena datos de contacto directos (teléfonos, correos) e información transaccional confidencial. Requiere una mitigación futura mediante control de acceso por roles (cada vendedor ve solo su cartera).
- **Sesgo Territorial/Geográfico:** Existe el riesgo de que el uso de los datos priorice la atención o asignación de oportunidades a empresas ubicadas en el centro urbano de Concepción, discriminando o retrasando la atención a Pymes en zonas periféricas.
