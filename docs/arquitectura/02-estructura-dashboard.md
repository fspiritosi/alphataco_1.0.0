# Estructura del Dashboard - Testing Map

Este documento detalla todas las rutas, tabs y subtabs del dashboard para testing con Cypress.

## 1. Dashboard Principal

**Ruta:** `/dashboard`

- **Descripción:** Página principal del dashboard
- **Tabs:** Ninguno
- **Componente:** DashboardComponent o WelcomeComponent (según rol)

---

## 2. Comercial

**Ruta:** `/dashboard/comercial`

- **Tab por defecto:** `comerce`

### Tab: Comercial

**Query param:** `?tab=comerce`

#### Subtabs:

1. **Clientes** - `?tab=comerce&subtab=customers`
2. **Areas** - `?tab=comerce&subtab=areas`
3. **Equipos** - `?tab=comerce&subtab=equipment`
4. **Sectores** - `?tab=comerce&subtab=sector`
5. **Contratos** - `?tab=comerce&subtab=service`
6. **Unidades de Medida** - `?tab=comerce&subtab=mensure_units`
7. **Partes Diarios** - `?tab=comerce&subtab=daily_reports`

---

## 3. Company

**Ruta:** `/dashboard/company`

- **Descripción:** Vista de todas las compañías (tarjetas)
- **Tabs:** Ninguno

---

## 4. Documentos

**Ruta:** `/dashboard/document`

- **Tab por defecto:** `Documentos de empleados`

### Tab 1: Documentos de empleados

**Query param:** `?tab=Documentos de empleados`

#### Subtabs:

1. **Documentos permanentes** - `?tab=Documentos de empleados&subtab=permanentes`
2. **Documentos mensuales** - `?tab=Documentos de empleados&subtab=mensuales`

### Tab 2: Documentos de equipos

**Query param:** `?tab=Documentos de equipos`

#### Subtabs:

1. **Documentos permanentes** - `?tab=Documentos de equipos&subtab=permanentes`
2. **Documentos mensuales** - `?tab=Documentos de equipos&subtab=mensuales`

### Tab 3: Documentos de empresa

**Query param:** `?tab=Documentos de empresa`

#### Subtabs:

1. **Documentos permanentes** - `?tab=Documentos de empresa&subtab=permanentes`
2. **Documentos mensuales** - `?tab=Documentos de empresa&subtab=mensuales`

### Tab 4: Tipos de documentos

**Query param:** `?tab=Tipos de documentos`

- **Subtabs:** Ninguno

---

## 5. Empleados

**Ruta:** `/dashboard/employee`

- **Tab por defecto:** `employees`

### Tab 1: Empleados

**Query param:** `?tab=employees`

#### Subtabs:

1. **Empleados activos** - `?tab=employees&subtab=Empleados activos`
2. **Empleados inactivos** - `?tab=employees&subtab=Empleados inactivos`

### Tab 2: Documentos de empleados

**Query param:** `?tab=Documentos de empleados`

#### Subtabs:

1. **Documentos permanentes** - `?tab=Documentos de empleados&subtab=permanentes`
2. **Documentos mensuales** - `?tab=Documentos de empleados&subtab=mensuales`

### Tab 3: Diagramas

**Query param:** `?tab=diagrams`

#### Subtabs:

1. **Diagrama Cargados** - `?tab=diagrams&subtab=old`
2. **Cargar Diagrama** - `?tab=diagrams&subtab=new`
3. **Diagrama Masivo** - `?tab=diagrams&subtab=massive_diagram`
4. **Reportes** - `?tab=diagrams&subtab=reports`

### Tab 4: Tipos de documentos

**Query param:** `?tab=Tipos de documentos`

- **Subtabs:** Ninguno

### Tab 5: CCT (Convenios Colectivos de Trabajo)

**Query param:** `?tab=covenant`

- **Subtabs:** Ninguno

---

## 6. Equipos

**Ruta:** `/dashboard/equipment`

- **Tab por defecto:** `equipos`

### Tab 1: Equipos

**Query param:** `?tab=equipos`

#### Subtabs:

1. **Vehículos** - `?tab=equipos&subtab=vehicles`
2. **Otros** - `?tab=equipos&subtab=others`
3. **Vehículos dados de baja** - `?tab=equipos&subtab=inactive`

### Tab 2: Documentos de equipos

**Query param:** `?tab=Documentos de equipos`

#### Subtabs:

1. **Documentos permanentes** - `?tab=Documentos de equipos&subtab=permanentes`
2. **Documentos mensuales** - `?tab=Documentos de equipos&subtab=mensuales`

### Tab 3: Tipos de documentos

**Query param:** `?tab=Tipos de documentos`

- **Subtabs:** Ninguno

### Tab 4: Mantenimiento

**Query param:** `?tab=type_of_repairs`

#### Subtabs:

1. **Solicitudes de mantenimiento** - `?tab=type_of_repairs&subtab=created_solicitudes`
2. **Tipos de reparaciones creados** - `?tab=type_of_repairs&subtab=type_of_repair`
3. **Solicitud de mantenimiento** - `?tab=type_of_repairs&subtab=type_of_repair_new_entry`
4. **Grupos de mantenimiento** - `?tab=type_of_repairs&subtab=maintenance_groups`

---

## 7. Formularios

**Ruta:** `/dashboard/forms`

- **Tab por defecto:** `formularios`

### Tab: Tipos de checklist

**Query param:** `?tab=formularios`

- **Subtabs:** Ninguno

---

## 8. Ayuda

**Ruta:** `/dashboard/help`

- **Descripción:** Formulario para reportar problemas
- **Tabs:** Ninguno

---

## 9. Mantenimiento

**Ruta:** `/dashboard/maintenance`

- **Tab por defecto:** `type_of_repairs`

### Tab: Solicitudes de mantenimiento

**Query param:** `?tab=type_of_repairs`

#### Subtabs:

1. **Solicitudes de mantenimiento** - `?tab=type_of_repairs&subtab=created_solicitudes`
2. **Tipos de reparaciones creados** - `?tab=type_of_repairs&subtab=type_of_repair`
3. **Solicitud de mantenimiento** - `?tab=type_of_repairs&subtab=type_of_repair_new_entry`
4. **Grupos de mantenimiento** - `?tab=type_of_repairs&subtab=maintenance_groups`

---

## 10. Operaciones

**Ruta:** `/dashboard/operations`

- **Tab por defecto:** `dailyReportsTable`

### Tab 1: Gestor de pedidos (Preparte)

**Query param:** `?tab=Preparte`

- **Subtabs:** Ninguno

### Tab 2: Partes diarios

**Query param:** `?tab=dailyReportsTable`

- **Subtabs:** Ninguno
- **Nota:** Vista con formulario y tabla en paneles redimensionables

---

## Resumen de Testing

### Total de rutas a testear:

- **10 rutas principales** (excluyendo /pedidos y /vista_prueba)
- **23 tabs principales**
- **31 subtabs**

### Total de URLs únicas a validar: **54+**

---

## Notas para Testing

1. Todas las rutas requieren autenticación
2. Algunas vistas están restringidas por rol (Invitado, Usuario, Admin)
3. Las rutas con tabs usan query parameters para navegación
4. Verificar que no haya errores de renderizado en ninguna vista
5. Validar que los componentes carguen correctamente
6. Verificar que no haya errores en consola del navegador
