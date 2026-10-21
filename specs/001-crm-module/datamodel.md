[modelo_de_datos_crm.md](https://github.com/user-attachments/files/33779187/modelo_de_datos_crm.md)
# Modelo de Datos - Módulo CRM

## 1. Tablas Principales (CRM)

### `customers`
- `customer_id` (INT, PK)
- `address_id` (INT, FK)
- `assigned_employee_id` (INT, FK -> HR.employees)
- `customer_name` (VARCHAR)
- `email` (VARCHAR)
- `phone` (VARCHAR)
- `customer_since` (DATE)

### `opportunities`
- `opportunity_id` (INT, PK)
- `customer_id` (INT, FK -> CRM.customers)
- `lead_id` (INT, FK -> CRM.leads)
- `assigned_employee_id` (INT, FK -> HR.employees)
- `stage_id` (INT, FK -> CRM.opportunity_stages)
- `estimated_value` (DECIMAL)
- `close_date` (DATE)

### `support_tickets`
- `ticket_id` (INT, PK)
- `customer_id` (INT, FK -> CRM.customers)
- `product_id` (INT, FK -> Logistics.products)
- `assigned_employee_id` (INT, FK -> HR.employees)
- `subject` (VARCHAR)
- `status` (VARCHAR)
- `priority` (VARCHAR)
- `created_date` (DATETIME)

## 2. Integración Cruzada con Otros Módulos
- **Recursos Humanos (`employees`)**: `assigned_employee_id` vincula vendedores y ejecutivos de soporte.
- **Logística (`products`)**: `product_id` relaciona las solicitudes de soporte con el catálogo de productos.
