# Testing Pendiente - Vistas Faltantes

Este documento lista las vistas y funcionalidades que aún faltan por testear con E2E tests.

## ✅ Tests Completados

### Dashboard Navigation

- **Archivo**: `cypress/e2e/dashboard-navigation.cy.ts`
- **Descripción**: Valida que todas las vistas principales no crasheen
- **Estado**: ✅ Completado

### Daily Report CRUD

- **Archivo**: `cypress/e2e/daily-report-crud.cy.ts`
- **Descripción**: Testea el CRUD completo de partes diarios
- **Ruta**: `/dashboard/operations/[uuid]`
- **Estado**: ✅ Completado
- **Funcionalidades testeadas**:
  - CREATE - Crear nueva fila
  - READ - Leer datos existentes
  - UPDATE - Editar fila existente
  - DELETE - Eliminar fila
  - Validaciones de formulario
  - Actualización de tabla

## 📋 Tests Pendientes

### 1. Detalle de Empleado

- **Ruta**: `/dashboard/employees/[id]`
- **Funcionalidades a testear**:
  - Ver información del empleado
  - Editar datos del empleado
  - Ver historial de asignaciones
  - Ver partes diarios asociados

### 2. Detalle de Equipo

- **Ruta**: `/dashboard/equipments/[id]`
- **Funcionalidades a testear**:
  - Ver información del equipo
  - Editar datos del equipo
  - Ver historial de mantenimiento
  - Ver partes diarios asociados

### 3. Crear Empleado

- **Ruta**: `/dashboard/employees/create`
- **Funcionalidades a testear**:
  - Formulario de creación
  - Validaciones de campos obligatorios
  - Validación de CUIL/DNI
  - Asignación a clientes
  - Carga de documentos

### 4. Crear Equipo

- **Ruta**: `/dashboard/equipments/create`
- **Funcionalidades a testear**:
  - Formulario de creación
  - Validaciones de campos obligatorios
  - Validación de dominio/patente
  - Asignación a clientes
  - Carga de documentos

### 5. CRUD de Clientes

- **Ruta**: `/dashboard/customers`
- **Funcionalidades a testear**:
  - Crear cliente
  - Editar cliente
  - Dar de baja cliente
  - Ver servicios del cliente
  - Asignar empleados/equipos

### 6. CRUD de Servicios

- **Ruta**: `/dashboard/customers/[id]/services`
- **Funcionalidades a testear**:
  - Crear servicio
  - Editar servicio
  - Dar de baja servicio
  - Crear ítems de servicio
  - Asignar sectores/áreas

### 7. Reportes y Exportaciones

- **Ruta**: `/dashboard/reports`
- **Funcionalidades a testear**:
  - Generar reportes
  - Filtros de reportes
  - Exportar a Excel
  - Exportar a PDF

### 8. Configuración de Usuario

- **Ruta**: `/dashboard/settings`
- **Funcionalidades a testear**:
  - Cambiar contraseña
  - Actualizar perfil
  - Configurar notificaciones

## 📊 Prioridades

### Alta Prioridad

1. ✅ Daily Report CRUD (Completado)
2. CRUD de Clientes
3. CRUD de Servicios

### Media Prioridad

4. Crear Empleado
5. Crear Equipo
6. Detalle de Empleado
7. Detalle de Equipo

### Baja Prioridad

8. Reportes y Exportaciones
9. Configuración de Usuario

## 🎯 Estrategia de Testing

### Datos de Testing

- Todos los datos de testing deben estar en el año **2030** para evitar conflictos
- Usar prefijo `test-` en los IDs
- Usar nombres descriptivos como "Testing E2E" en los nombres
- Archivo SQL: `supabase/seed-testing.sql`

### Convenciones

- Usar `data-testid` para identificar elementos
- Formato: `data-testid="action-element-id"` (ej: `edit-row-123`)
- Esperar a que los elementos sean visibles antes de interactuar
- Usar timeouts generosos (10000ms) para operaciones de red

### Limpieza de Datos

- Los datos de testing se recrean con cada `supabase db reset`
- No depender de datos existentes en la BD
- Crear datos necesarios en `beforeEach` si es necesario

## 📝 Notas

- Los tests deben ser independientes entre sí
- Cada test debe poder ejecutarse de forma aislada
- Usar `beforeEach` para setup común
- Limpiar datos creados en `afterEach` si es necesario
- Documentar cualquier consideración especial en este archivo
