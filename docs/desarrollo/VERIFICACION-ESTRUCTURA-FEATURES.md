# Verificación de Estructura de Features

Este documento mapea la estructura definida en `permissions-map.ts` contra la implementación actual en `src/features/`.
Usar como checklist para verificar que todas las features están correctamente implementadas.

---

## Leyenda

- ✅ Implementado correctamente
- ⚠️ Implementado pero requiere revisión/ajuste
- ❌ No implementado / Faltante
- 🔗 Hereda permisos de otro módulo
- 📁 Carpeta existente

---

## Resumen de Módulos

| Módulo        | Feature Principal     | Estado |
| ------------- | --------------------- | ------ |
| dashboard     | `Dashboard/`          | ⬜     |
| empresa       | `Empresa/`            | ⬜     |
| empleados     | `Employees/`          | ⬜     |
| equipos       | `Equipos/`            | ⬜     |
| operaciones   | `Operaciones/`        | ⬜     |
| formularios   | `Formularios/`        | ⬜     |
| documentacion | `Documentacion/`      | ⬜     |
| mantenimiento | `Mantenimiento/`      | ⬜     |
| comercial     | `Comercial/`          | ⬜     |
| ayuda         | N/A (módulo sin tabs) | ⬜     |

---

## 1. DASHBOARD (`src/features/Dashboard/`)

**Componente Principal:** `DashboardComponent.tsx`
**Ruta:** `/dashboard`

### Tabs Principales

| Tab           | Slug            | Feature/Carpeta Esperada   | Estado |
| ------------- | --------------- | -------------------------- | ------ |
| Principal     | `principal`     | `Dashboard/Principal/`     | ⬜     |
| Documentación | `documentacion` | `Dashboard/Documentacion/` | ⬜     |
| Estadísticas  | `estadisticas`  | `Dashboard/Estadisticas/`  | ⬜     |

### Subtabs de `documentacion`

| Subtab    | Slug        | Feature/Carpeta Esperada             | Estado |
| --------- | ----------- | ------------------------------------ | ------ |
| Empleados | `empleados` | `Dashboard/Documentacion/Empleados/` | ⬜     |
| Vehículos | `vehiculos` | `Dashboard/Documentacion/Vehiculos/` | ⬜     |

### Subtabs de `estadisticas`

| Subtab        | Slug            | Feature/Carpeta Esperada                  | Estado |
| ------------- | --------------- | ----------------------------------------- | ------ |
| Operaciones   | `operaciones`   | `Dashboard/Estadisticas/Operaciones/`     | ⬜     |
| RRHH          | `rrhh`          | `Dashboard/Estadisticas/RecursosHumanos/` | ⬜     |
| KPIs          | `kpis`          | `Dashboard/Estadisticas/KPIs/`            | ⬜     |
| Mantenimiento | `mantenimiento` | `Dashboard/Estadisticas/Mantenimiento/`   | ⬜     |

### Sub-subtabs de `kpis` (nivel 3)

| Sub-subtab  | Slug          | Feature/Carpeta Esperada                   | Estado |
| ----------- | ------------- | ------------------------------------------ | ------ |
| Indicadores | `indicadores` | `Dashboard/Estadisticas/KPIs/Indicadores/` | ⬜     |
| Gráficos    | `graficos`    | `Dashboard/Estadisticas/KPIs/Graficos/`    | ⬜     |

---

## 2. EMPRESA (`src/features/Empresa/`)

**Componente Principal:** `EmpresaComponent.tsx`
**Ruta:** `/dashboard/company/actualCompany`

### Tabs Principales

| Tab       | Slug       | Feature/Carpeta Esperada | Estado |
| --------- | ---------- | ------------------------ | ------ |
| General   | `general`  | `Empresa/General/`       | ⬜     |
| RRHH      | `rrhh`     | `Empresa/RRHH/`          | ⬜     |
| Vehículos | `vehicles` | `Empresa/Equipos/`       | ⬜     |

### Subtabs de `general`

| Subtab           | Slug            | Feature/Carpeta Esperada                  | Estado |
| ---------------- | --------------- | ----------------------------------------- | ------ |
| Empresa          | `company`       | `Empresa/General/components/company/`     | ⬜     |
| Centro de Costos | `cost-center`   | `Empresa/General/components/cost-center/` | ⬜     |
| Organigrama      | `organigrama`   | `Empresa/General/components/organigrama/` | ⬜     |
| Usuarios         | `users`         | `Empresa/Usuarios/`                       | ⬜     |
| Documentación    | `documentacion` | (usa componentes de Documentacion)        | ⬜     |

### Sub-subtabs de `users` (nivel 3)

| Sub-subtab         | Slug                 | Feature/Carpeta Esperada       | Estado |
| ------------------ | -------------------- | ------------------------------ | ------ |
| Usuarios Empleados | `usuarios-empleados` | `Empresa/Usuarios/`            | ⬜     |
| Gestión de Roles   | `gestion-roles`      | `Empresa/Usuarios/components/` | ⬜     |
| Detalle Usuario    | `detalle-usuario`    | `Empresa/Usuarios/[id]/`       | ⬜     |

### Subtabs de `rrhh`

| Subtab             | Slug             | Feature/Carpeta Esperada                     | Estado |
| ------------------ | ---------------- | -------------------------------------------- | ------ |
| Tipos de Diagramas | `listado`        | `Empresa/RRHH/components/DiagramTypes/`      | ⬜     |
| Tipos de Novedades | `diagrams`       | `Empresa/RRHH/components/Diagrams/`          | ⬜     |
| CCT                | `convenios`      | (usa CovenantTreeFileWrapper)                | ⬜     |
| Tipos de Contrato  | `contract-types` | `Empresa/RRHH/components/TypeContract/`      | ⬜     |
| Puestos            | `positions`      | `Empresa/RRHH/components/CompanyPositions/`  | ⬜     |
| Aptitudes Técnicas | `aptitudes`      | `Empresa/RRHH/components/AptitudesTecnicas/` | ⬜     |

### Subtabs de `vehicles`

| Subtab          | Slug        | Feature/Carpeta Esperada     | Estado |
| --------------- | ----------- | ---------------------------- | ------ |
| Tipos de Unidad | `tipos`     | `Empresa/Equipos/types/`     | ⬜     |
| Marcas          | `marcas`    | `Empresa/Equipos/brand/`     | ⬜     |
| Modelos         | `modelos`   | `Empresa/Equipos/model/`     | ⬜     |
| Subtipos        | `subtipos`  | `Empresa/Equipos/sub_types/` | ⬜     |
| Titulares       | `titulares` | `Empresa/Equipos/titulares/` | ⬜     |

---

## 3. EMPLEADOS (`src/features/Employees/`)

**Componente Principal:** Implementado en `src/app/dashboard/employee/page.tsx`
**Ruta:** `/dashboard/employee`

### Tabs Principales

| Tab                     | Slug                      | Feature/Carpeta Esperada         | Estado |
| ----------------------- | ------------------------- | -------------------------------- | ------ |
| Empleados               | `employees`               | `Employees/Empleados/`           | ⬜     |
| Documentos de Empleados | `documentos-de-empleados` | `Employees/Empleados/Documents/` | ⬜     |
| Diagramas               | `diagrams`                | `Employees/Diagrams/`            | ⬜     |
| CCT                     | `covenant`                | (usa CovenantTreeFileWrapper)    | ⬜     |
| Tipos de Documentos     | `tipos-de-documentos`     | 🔗 Hereda de `documentacion`     | ⬜     |
| Detalle Empleado        | `detalle-empleado`        | `Employees/EmpleadoID/`          | ⬜     |

### Subtabs de `employees`

| Subtab              | Slug                  | Feature/Carpeta Esperada                         | Estado |
| ------------------- | --------------------- | ------------------------------------------------ | ------ |
| Empleados Activos   | `empleados-activos`   | `Employees/Empleados/EmpleadosTables/Activos/`   | ⬜     |
| Empleados Inactivos | `empleados-inactivos` | `Employees/Empleados/EmpleadosTables/Inactivos/` | ⬜     |

### Subtabs de `documentos-de-empleados`

| Subtab      | Slug                         | Feature/Carpeta Esperada                    | Estado |
| ----------- | ---------------------------- | ------------------------------------------- | ------ |
| Permanentes | `docs-empleados-permanentes` | `Employees/Empleados/Documents/Permanents/` | ⬜     |
| Mensuales   | `docs-empleados-mensuales`   | `Employees/Empleados/Documents/Monthly/`    | ⬜     |

### Subtabs de `diagrams`

| Subtab             | Slug              | Feature/Carpeta Esperada           | Estado |
| ------------------ | ----------------- | ---------------------------------- | ------ |
| Diagramas Cargados | `old`             | `Employees/Diagrams/` (componente) | ⬜     |
| Cargar Diagramas   | `new`             | `Employees/Diagrams/` (componente) | ⬜     |
| Carga Masiva       | `massive_diagram` | `Employees/Diagrams/` (componente) | ⬜     |
| Reportes           | `reports`         | `Employees/Diagrams/Reports/`      | ⬜     |

### Subtabs de `detalle-empleado`

| Subtab             | Slug                 | Feature/Carpeta Esperada           | Estado |
| ------------------ | -------------------- | ---------------------------------- | ------ |
| Datos Personales   | `datos-personales`   | `Employees/EmpleadoID/components/` | ⬜     |
| Datos de Contacto  | `datos-contacto`     | `Employees/EmpleadoID/components/` | ⬜     |
| Datos Laborales    | `datos-laborales`    | `Employees/EmpleadoID/components/` | ⬜     |
| Diagramas Empleado | `diagramas-empleado` | `Employees/EmpleadoID/components/` | ⬜     |

---

## 4. EQUIPOS (`src/features/Equipos/`)

**Componente Principal:** `EquiposComponent.tsx`
**Ruta:** `/dashboard/equipment`

### Tabs Principales

| Tab                   | Slug                    | Feature/Carpeta Esperada     | Estado |
| --------------------- | ----------------------- | ---------------------------- | ------ |
| Equipos               | `equipos`               | `Equipos/Equipos/`           | ⬜     |
| Documentos de Equipos | `documentos-de-equipos` | `Equipos/DocumentosEquipos/` | ⬜     |
| Tipos de Documentos   | `tipos-de-documentos`   | 🔗 Hereda de `documentacion` | ⬜     |
| Mantenimiento         | `type_of_repairs`       | (usa RepairTypes component)  | ⬜     |
| Detalle Equipo        | `detalle-equipo`        | `Equipos/EquipoID/`          | ⬜     |
| Checklist             | `checklist-equipo`      | `Checklist/`                 | ⬜     |

### Subtabs de `equipos`

| Subtab        | Slug       | Feature/Carpeta Esperada      | Estado |
| ------------- | ---------- | ----------------------------- | ------ |
| Vehículos     | `vehicles` | `Equipos/Equipos/` (filtrado) | ⬜     |
| Otros         | `others`   | `Equipos/Equipos/` (filtrado) | ⬜     |
| Dados de Baja | `inactive` | `Equipos/Equipos/` (filtrado) | ⬜     |

### Subtabs de `documentos-de-equipos`

| Subtab      | Slug                       | Feature/Carpeta Esperada                | Estado |
| ----------- | -------------------------- | --------------------------------------- | ------ |
| Permanentes | `docs-equipos-permanentes` | `Equipos/DocumentosEquipos/Permanents/` | ⬜     |
| Mensuales   | `docs-equipos-mensuales`   | `Equipos/DocumentosEquipos/Monthly/`    | ⬜     |

### Subtabs de `type_of_repairs` (Mantenimiento)

| Subtab              | Slug                         | Feature/Carpeta Esperada            | Estado |
| ------------------- | ---------------------------- | ----------------------------------- | ------ |
| Solicitudes         | `created_solicitudes`        | `components/Tipos_de_reparaciones/` | ⬜     |
| Tipos de Reparación | `type_of_repair`             | `components/Tipos_de_reparaciones/` | ⬜     |
| Equipos con Desvíos | `equipments_with_deviations` | (componente)                        | ⬜     |
| Nueva Solicitud     | `type_of_repair_new_entry`   | (componente)                        | ⬜     |
| Grupos              | `maintenance_groups`         | (componente)                        | ⬜     |

### Sub-subtabs de `type_of_repair_new_entry` (nivel 3)

| Sub-subtab       | Slug               | Feature/Carpeta Esperada | Estado |
| ---------------- | ------------------ | ------------------------ | ------ |
| Carga Individual | `carga-individual` | (componente)             | ⬜     |
| Carga Múltiple   | `carga-multiple`   | (componente)             | ⬜     |

### Subtabs de `detalle-equipo`

| Subtab        | Slug            | Feature/Carpeta Esperada       | Estado |
| ------------- | --------------- | ------------------------------ | ------ |
| Datos Básicos | `datos-basicos` | `Equipos/EquipoID/components/` | ⬜     |
| Asignación    | `asignacion`    | `Equipos/EquipoID/components/` | ⬜     |
| QR            | `qr-equipo`     | `Equipos/EquipoID/components/` | ⬜     |

---

## 5. OPERACIONES (`src/features/Operaciones/`)

**Componente Principal:** `OperacionesComponent.tsx`
**Ruta:** `/dashboard/operations`

### Tabs Principales

| Tab                  | Slug                   | Feature/Carpeta Esperada                     | Estado |
| -------------------- | ---------------------- | -------------------------------------------- | ------ |
| Preparte             | `preparte`             | `Operaciones/Preparte/`                      | ⬜     |
| Partes Diarios       | `dailyreportstable`    | `Operaciones/PartesDiarios/`                 | ⬜     |
| Detalle Parte Diario | `detalle-parte-diario` | `Operaciones/PartesDiarios/` (ruta dinámica) | ⬜     |

---

## 6. FORMULARIOS (`src/features/Formularios/`)

**Componente Principal:** `FormulariosComponent.tsx`
**Ruta:** `/dashboard/forms`

### Tabs Principales

| Tab         | Slug          | Feature/Carpeta Esperada   | Estado |
| ----------- | ------------- | -------------------------- | ------ |
| Formularios | `formularios` | `Formularios/Formularios/` | ⬜     |

---

## 7. DOCUMENTACIÓN (`src/features/Documentacion/`)

**Componente Principal:** `DocumentacionComponent.tsx`
**Ruta:** `/dashboard/document`

### Tabs Principales

| Tab                     | Slug                      | Feature/Carpeta Esperada             | Estado |
| ----------------------- | ------------------------- | ------------------------------------ | ------ |
| Documentos de Empleados | `documentos-de-empleados` | `Documentacion/DocumentosEmpleados/` | ⬜     |
| Documentos de Equipos   | `documentos-de-equipos`   | `Documentacion/DocumentosEquipos/`   | ⬜     |
| Documentos de Empresa   | `documentos-de-empresa`   | `Documentacion/DocumentosEmpresa/`   | ⬜     |
| Tipos de Documentos     | `tipos-de-documentos`     | `Documentacion/TiposDocumentos/`     | ⬜     |
| Detalle de Documento    | `detalle-de-documento`    | (ruta dinámica `/document/[id]`)     | ⬜     |

### Subtabs de `documentos-de-empleados`

| Subtab      | Slug                         | Feature/Carpeta Esperada             | Estado |
| ----------- | ---------------------------- | ------------------------------------ | ------ |
| Permanentes | `docs-empleados-permanentes` | `Documentacion/DocumentosEmpleados/` | ⬜     |
| Mensuales   | `docs-empleados-mensuales`   | `Documentacion/DocumentosEmpleados/` | ⬜     |

### Subtabs de `documentos-de-equipos`

| Subtab      | Slug                       | Feature/Carpeta Esperada           | Estado |
| ----------- | -------------------------- | ---------------------------------- | ------ |
| Permanentes | `docs-equipos-permanentes` | `Documentacion/DocumentosEquipos/` | ⬜     |
| Mensuales   | `docs-equipos-mensuales`   | `Documentacion/DocumentosEquipos/` | ⬜     |

### Subtabs de `tipos-de-documentos`

| Subtab   | Slug                  | Feature/Carpeta Esperada         | Estado |
| -------- | --------------------- | -------------------------------- | ------ |
| Personas | `tipos-docs-personas` | `Documentacion/TiposDocumentos/` | ⬜     |
| Equipos  | `tipos-docs-equipos`  | `Documentacion/TiposDocumentos/` | ⬜     |

### Subtabs de `detalle-de-documento`

| Subtab    | Slug                    | Feature/Carpeta Esperada | Estado |
| --------- | ----------------------- | ------------------------ | ------ |
| Empresa   | `detalle-doc-empresa`   | (componente)             | ⬜     |
| Empleado  | `detalle-doc-empleado`  | (componente)             | ⬜     |
| Documento | `detalle-doc-documento` | (componente)             | ⬜     |

---

## 8. MANTENIMIENTO (`src/features/Mantenimiento/`)

**Componente Principal:** Usa `RepairTypes` en `/dashboard/maintenance`
**Ruta:** `/dashboard/maintenance`

### Tabs Principales

| Tab           | Slug              | Feature/Carpeta Esperada | Estado |
| ------------- | ----------------- | ------------------------ | ------ |
| Mantenimiento | `type_of_repairs` | (usa RepairTypes)        | ⬜     |

### Subtabs de `type_of_repairs`

| Subtab                       | Slug                       | Feature/Carpeta Esperada                  | Estado |
| ---------------------------- | -------------------------- | ----------------------------------------- | ------ |
| Solicitudes                  | `created_solicitudes`      | (componente compartido)                   | ⬜     |
| Tipos de Reparación          | `type_of_repair`           | (componente compartido)                   | ⬜     |
| Nueva Solicitud              | `type_of_repair_new_entry` | (componente compartido)                   | ⬜     |
| Grupos                       | `maintenance_groups`       | (componente compartido)                   | ⬜     |
| Solicitudes de Mantenimiento | `maintenance_requests`     | `Mantenimiento/SolicitudesMantenimiento/` | ⬜     |
| Pedidos de Mantenimiento     | `maintenance_orders`       | `Mantenimiento/PedidosMantenimiento/`     | ⬜     |
| Operaciones                  | `maintenance_operations`   | `Mantenimiento/Operaciones/`              | ⬜     |

---

## 9. COMERCIAL (`src/features/Comercial/`)

**Componente Principal:** `ComercialComponent.tsx`
**Ruta:** `/dashboard/comercial`

### Tabs Principales

| Tab       | Slug      | Feature/Carpeta Esperada | Estado |
| --------- | --------- | ------------------------ | ------ |
| Comercial | `comerce` | `Comercial/Comerce/`     | ⬜     |

### Subtabs de `comerce`

| Subtab             | Slug            | Feature/Carpeta Esperada                 | Estado |
| ------------------ | --------------- | ---------------------------------------- | ------ |
| Clientes           | `customers`     | `Comercial/Comerce/components/`          | ⬜     |
| Áreas              | `areas`         | `Comercial/Comerce/components/`          | ⬜     |
| Equipos            | `equipment`     | `Comercial/Comerce/components/`          | ⬜     |
| Sectores           | `sector`        | `Comercial/Comerce/components/`          | ⬜     |
| Contratos          | `service`       | `Comercial/Comerce/components/Services/` | ⬜     |
| Unidades de Medida | `mensure_units` | `Comercial/Comerce/components/`          | ⬜     |
| Partes Diarios     | `daily_reports` | `Comercial/Comerce/components/`          | ⬜     |

### Sub-subtabs de `customers` (nivel 3)

| Sub-subtab | Slug                | Feature/Carpeta Esperada               | Estado |
| ---------- | ------------------- | -------------------------------------- | ------ |
| Detalle    | `detalle-cliente`   | `Empresa/Clientes/components/`         | ⬜     |
| Empleados  | `empleados-cliente` | `Empresa/Clientes/components/`         | ⬜     |
| Equipos    | `equipos-cliente`   | `Empresa/Clientes/components/equipos/` | ⬜     |

### Sub-subtabs de `service` (nivel 3)

| Sub-subtab         | Slug                  | Feature/Carpeta Esperada                 | Estado |
| ------------------ | --------------------- | ---------------------------------------- | ------ |
| Detalle            | `detalle-contrato`    | `Comercial/Comerce/components/Services/` | ⬜     |
| Documentos         | `documentos-contrato` | `Comercial/Comerce/components/Services/` | ⬜     |
| Items del Servicio | `items-contrato`      | `Comercial/Comerce/components/Services/` | ⬜     |

---

## 10. AYUDA

**Ruta:** `/dashboard/help`

> Módulo sin tabs definidas en el permissions-map. Solo tiene el módulo base.

---

## Carpetas de Features Adicionales (no en permissions-map)

Las siguientes carpetas existen en `src/features/` pero no tienen módulo directo en permissions-map:

| Carpeta                   | Descripción                    | ¿Debería tener permisos?  |
| ------------------------- | ------------------------------ | ------------------------- |
| `Checklist/`              | Gestión de checklists          | ⬜ Evaluar                |
| `graficos/`               | Componentes de gráficos        | No (componentes internos) |
| `Layout/`                 | Navbar y Sidebar               | No (layout general)       |
| `Pedidos/`                | Gestión de pedidos             | ⬜ Evaluar                |
| `Permissions/`            | Sistema de permisos            | No (infraestructura)      |
| `TabsManager/`            | Gestión de tabs                | No (infraestructura)      |
| `UserPermissionsManager/` | Gestión de permisos de usuario | No (infraestructura)      |

---

## Estructura de Carpetas Recomendada

```
src/features/
├── Dashboard/
│   ├── DashboardComponent.tsx
│   ├── Principal/
│   │   └── PrincipalTabContent.tsx
│   ├── Documentacion/
│   │   ├── DocumentsTabContent.tsx
│   │   ├── Empleados/
│   │   └── Vehiculos/
│   └── Estadisticas/
│       ├── EstadisticasTabComponent.tsx
│       ├── Operaciones/
│       ├── RecursosHumanos/
│       ├── KPIs/
│       │   ├── Indicadores/
│       │   └── Graficos/
│       └── Mantenimiento/
│
├── Empresa/
│   ├── EmpresaComponent.tsx
│   ├── General/
│   │   ├── GeneralTabContent.tsx
│   │   └── components/
│   │       ├── company/
│   │       ├── cost-center/
│   │       └── organigrama/
│   ├── RRHH/
│   │   ├── RrhhTabContent.tsx
│   │   └── components/
│   │       ├── DiagramTypes/
│   │       ├── Diagrams/
│   │       ├── TypeContract/
│   │       ├── CompanyPositions/
│   │       └── AptitudesTecnicas/
│   ├── Equipos/
│   │   ├── EquipmentsTabContent.tsx
│   │   ├── types/
│   │   ├── brand/
│   │   ├── model/
│   │   ├── sub_types/
│   │   └── titulares/
│   ├── Usuarios/
│   │   ├── UsersTabComponent.tsx
│   │   └── components/
│   └── Clientes/            # Usado por Comercial
│
├── Employees/
│   ├── EmployeesComponent.tsx  # ⚠️ Falta - actualmente en page.tsx
│   ├── Empleados/
│   │   ├── EmpleadosTables/
│   │   │   ├── Activos/
│   │   │   └── Inactivos/
│   │   └── Documents/
│   │       ├── Permanents/
│   │       └── Monthly/
│   ├── Diagrams/
│   │   └── Reports/
│   └── EmpleadoID/
│       └── components/
│
├── Equipos/
│   ├── EquiposComponent.tsx
│   ├── Equipos/
│   │   └── components/
│   ├── DocumentosEquipos/
│   │   ├── Permanents/
│   │   └── Monthly/
│   └── EquipoID/
│       └── components/
│
├── Operaciones/
│   ├── OperacionesComponent.tsx
│   ├── Preparte/
│   └── PartesDiarios/
│
├── Formularios/
│   ├── FormulariosComponent.tsx
│   └── Formularios/
│
├── Documentacion/
│   ├── DocumentacionComponent.tsx
│   ├── DocumentosEmpleados/
│   ├── DocumentosEquipos/
│   ├── DocumentosEmpresa/
│   └── TiposDocumentos/
│
├── Mantenimiento/
│   ├── MantenimientoComponent.tsx  # ⚠️ Falta
│   ├── SolicitudesMantenimiento/
│   ├── PedidosMantenimiento/
│   └── Operaciones/
│
├── Comercial/
│   ├── ComercialComponent.tsx
│   └── Comerce/
│       ├── ComerceTabContent.tsx
│       └── components/
│
└── Checklist/
    └── actions/
```

---

## Notas de Implementación

### Herencia de Permisos

Los siguientes tabs heredan permisos de otros módulos:

1. **empleados/tipos-de-documentos** → hereda de `documentacion/tipos-de-documentos`
2. **equipos/tipos-de-documentos** → hereda de `documentacion/tipos-de-documentos`
3. **detalle-empleado/documentacion-empleado** → hereda de `documentacion/documentos-de-empleados`
4. **detalle-equipo/documentos-equipo** → hereda de `documentacion/documentos-de-equipos`
5. **detalle-equipo/reparaciones** → hereda de `equipos/type_of_repairs`
6. **customers/contratos-cliente** → hereda de `comercial/comerce/service`

### Componentes Compartidos

Algunos componentes se usan en múltiples módulos:

- `RepairTypes` → usado en `equipos` y `mantenimiento`
- `TiposDocumentosTabContent` → usado en `documentacion`, `empleados` y `equipos`
- `CovenantTreeFileWrapper` → usado en `empresa/rrhh` y `empleados`

### Pendientes de Revisión

1. **EmployeesComponent** - La lógica está directamente en el `page.tsx`, debería moverse a un componente dedicado
2. **MantenimientoComponent** - No existe, la página usa directamente `RepairTypes`
3. **Dashboard/Estadisticas/Mantenimiento** - Tab comentada en el código

---

## Cómo Usar Este Documento

1. Revisa cada sección marcando ✅ donde la implementación coincide
2. Marca ⚠️ donde hay diferencias que necesitan atención
3. Marca ❌ donde falta implementación
4. Actualiza el documento cuando se hagan cambios
5. Usa como referencia para nuevas features
