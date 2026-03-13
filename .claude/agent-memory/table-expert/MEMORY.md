# Table Expert — Memoria de Proyecto

## Arquitectura DataTable (gh_gestion)

Este proyecto NO usa el nuevo sistema DataTable de `src/shared/components/common/DataTable/`.
Usa el sistema LEGACY basado en `BaseDataTable` de `src/shared/components/data-table/base/data-table-server.tsx`.

### Dos sistemas coexisten:

1. **LEGACY (activo)**: `BaseDataTable` + `fetchData` (Supabase directo) + `filterableColumns` con `config: { tableName, select, relation, p_filters, mapper }`
2. **NUEVO (en migración)**: `DataTable` de `src/shared/components/common/DataTable/` + acciones Prisma + `facetedFilters`

### Tabla de empleados activos — Archivos clave:

- Server Component: `src/features/Employees/Empleados/EmpleadosTables/Activos/employee_table.tsx`
- Client Component: `src/features/Employees/Empleados/EmpleadosTables/Activos/components/EmployeesTableServer.tsx`
- Fetch action: `src/features/Employees/Empleados/lib/actions/fetch-employees-action.ts`
- Page: `src/app/dashboard/employee/page.tsx`

### Export en sistema LEGACY:

- El export usa `exportFormatter` como propiedad DIRECTA de `ColumnDef` (no como `meta`)
- El campo es `excludeFromExport: true` (no en `meta`, sino directo en la columna)
- El componente que maneja el export es `DataTableExportExcelServer`
- Los headers se extraen del prop `title` del `DataTableColumnHeader` — NO hay `meta.title`
- Sin `exportFormatter`, el sistema tiene lógica fallback que intenta formatear fechas con `toLocaleDateString` y booleans con 'Sí'/'No'

### Filtros en sistema LEGACY:

- `filterableColumns` en `toolbarOptions` con `config: { tableName, select, relation, p_filters, mapper }`
- Para relaciones simples: `relation: '{"tabla_relacionada": "columna_fk_en_employees"}'`
- Para many-to-many: `multiJoinPaths: { joins: [...], final_column: 'x.y' }`
- Para columnas directas: solo `tableName`, `select`, `p_filters`, `mapper`
- Filtros de texto: via `searchableColumns` en toolbarOptions (campo `lastname` busca en firstname + lastname)
- NO hay filtros `text` individuales por columna — solo la búsqueda global por `lastname`

### Schema tabla employees (Supabase):

- Columnas de texto: lastname, firstname, cuil, document_number, street, street_number, postal_code, phone, email, file, normal_hours, born_date (text!), full_name
- Enums: nationality, document_type, gender, marital_status, level_of_education, affiliate_status, reason_for_termination, cost_type, status
- FKs bigint: province → provinces, city → cities
- FKs uuid: birthplace → countries, hierarchical_position → hierarchy, workflow_diagram → work_diagram, company_position → company_positions, type_of_contract → types_of_contract, cost_center_id → cost_center, workshop_sector_id → workshop_sectors, category_id → category, covenants_id → covenant, guild_id → guild
- Booleans: is_active
- Dates: date_of_admission (date), termination_date (date), created_at (timestamptz)

### Campos del schema SIN columna en la tabla activa (legacy):

- birthplace (FK → countries) — MISSING en legacy
- reason_for_termination (enum) — justificado solo en tabla de inactivos
- termination_date (date) — justificado solo en tabla de inactivos
- created_at — MISSING en legacy
- category_id (FK → category) — MISSING en legacy
- covenants_id (FK → covenant) — MISSING en legacy
- guild_id (FK → guild) — MISSING en legacy
- workshop_sector_id (FK → workshop_sectors) — MISSING en legacy
- full_name (columna generada) — justificado, redundante con lastname+firstname
- allocated_to (ARRAY) — MISSING en legacy

### Permisos de employees activos:

- moduleSlug: 'empleados', tabSlug: 'empleados-activos'
- tabId: '20000000-0000-0000-0000-000000000011'
- allowedActions: ['view'] (solo view; create/update en tab padre 'employees')
- Tab padre (para create): moduleSlug: 'empleados', tabSlug: 'employees'

### Sistema de permisos (nuevo DataTable):

- NO existe getModulePermissions() — usar checkMultiplePermissionsServer() de actionsServer.ts
- NO existe PermissionGuard con prop `module` + `action` + `redirect` (el SKILL asume este API que no existe aquí)
- Usar PermissionGuardServer o checkMultiplePermissionsServer directamente en el Server Component
- getTablePreferences(tableId) está en @/shared/actions/table-preferences — YA EXISTE

### getActiveCompanyId() y assertCompanyId():

- NO existen en este proyecto. Para obtener companyId: leer cookie 'actualComp' o query a supabase
- En las server actions usar supabaseServer() y company_id desde sesión/cookie
- El campo en Prisma es `company_id` (snake_case, UUID nullable)

### Enums de employees (Prisma/Supabase):

- nationality_enum: Argentina | Extranjero
- document_type_enum: DNI | LE | LC | PASAPORTE
- gender_enum: Masculino | Femenino | No_Declarado (@map "No Declarado")
- marital_status_enum: Casado | Soltero | Divorciado | Viudo | Separado | Union_de_hecho (@map "Union de hecho")
- level_of_education_enum: Primario | Secundario | Terciario | Universitario | PosGrado
- affiliate_status_enum: Dentro_de_convenio (@map "Dentro de convenio") | Fuera_de_convenio (@map "Fuera de convenio")
- cost_type_enum: Directo | Indirecto
- status_type: Avalado | No_avalado (@map "No avalado") | Incompleto | Completo | Completo_con_doc_vencida (@map "Completo con doc vencida")
- reason_for_termination_enum: Despido_sin_causa | Renuncia | Despido_con_causa | Acuerdo_de_partes | Fin_de_contrato | Fallecimiento

### FKs BigInt (IDs enteros) — conversión manual en Prisma:

- province (BigInt) → provinces (id: BigInt)
- city (BigInt nullable) → cities (id: BigInt)
- En Prisma groupBy y filter: usar String(id) y map(Number)

### Empresa/General — CostCenter migrada (2026-03):

- **Nuevo sistema**: `src/features/Empresa/General/CostCenter/`
- cost_center NO tiene company_id — usa RLS Supabase, pero Prisma bypasea RLS. La tabla es global por diseño (sin filtro de empresa en las queries Prisma — el schema confirma que no hay campo company_id).
- Zustand store (`costCenter.store.ts`) ahora usa `CostCenterListItem` de Prisma en vez del tipo global `CostCenter` de Supabase.
- Tipo global `CostCenter` (colections.ts): `created_at: string` (Supabase). Tipo nuevo `CostCenterListItem` (Prisma): `created_at: Date`. Incompatibles — NO hacer cast entre ambos.
- DataTableSearchParams NO está en `helpers.ts` — importar desde `@/shared/components/common/DataTable` (index) o `types.ts`.
- `buildFiltersWhere` no apto para booleanos nullable — manejar `is_active` manualmente extrayendo `state.filters['is_active']`.
- Archivos eliminados: `CostCenterTab.tsx`, `CostCenterTabClient.tsx`, `CostCenterTable.tsx`.
- Form (`CostCenterForm.tsx`): `useEffect` para sincronizar con Zustand store externo es VÁLIDO (sincronización con fuente de datos externa al componente), no un anti-pattern.
- Mutaciones migradas a Prisma: `createCostCenterPrisma`, `updateCostCenterPrisma` en `CostCenter/actions.server.ts`. Invalidan `['cost-centers']` via React Query.

### Mantenimiento — Tablas migradas al nuevo sistema:

- **MaintenanceOrders**: `src/features/Mantenimiento/MaintenanceOrders/table/`
  - Status relevantes: `in_workshop`, `pending_workshop_validation`, `pending_operations_validation`, `operations_rejected`, `workshop_rejected`, `completed`
  - Progreso calculado desde `work_order_item_repairs` (nested: items → work_orders → work_order_items → repairs)
  - Sector actual calculado desde `maintenance_order_items` con `sector_sequence_order`
  - Patron especial: `MaintenanceOrdersTableContent` (Client wrapper) maneja el `ManageOrderWizard`
  - `TallerPipelineContent` ahora pasa `searchParams` al `MaintenanceOrdersTabContent`
  - Filtros de texto en vehicles (domain, serie, intern_number) se manejan como condiciones vehicles.{field}
  - `companyId` de `getServerCompanyId()` — NO se usa en WHERE de maintenance_orders (no tiene campo company)

- **OrderManagement**: `src/features/Mantenimiento/OrderManagement/`
  - Status filter: `status = 'in_workshop'`
  - Second-level FK: `vehicles.types_of_vehicles` (BigInt FK anidado) → `type_of_vehicle` en vehicles
  - `vehicleType` filter usa `map(Number)` para convertir BigInt IDs
  - Mantiene `getActiveWorkshopSectors`/`getActiveExternalWorkshops` del actionsServer viejo (son catálogos compartidos)
  - `ManageOrderWizard` se usa con cast `as never` porque usa tipos del actionsServer viejo
  - Archivos nuevos: `actions.server.ts`, `columns.tsx`, `OrderManagementList.tsx`, `_OrderManagementDataTable.tsx`
  - `OrderManagementTabContent` actualizado para recibir `searchParams` y delegar a `OrderManagementList`

- **SolicitudesMantenimiento**: `src/features/Mantenimiento/SolicitudesMantenimiento/`
  - Filtros implementados: status (faceted), vehicle (faceted), source (faceted), supervisor (faceted + cross-filter), created_at (dateRange)
  - COLUMN_MAP: `supervisor: 'supervisor_id'` — así buildFiltersWhere resuelve el campo correcto en Prisma
  - filterFn del supervisor usa `row.original.supervisor_id` (campo raw en el tipo, incluido en select Prisma)
  - Si `shouldFilterBySupervisor` es true, el filtro de supervisor del usuario es irrelevante (la restricción se sobreescribe al final con el userId del usuario logueado)
  - supervisor facet: `prisma.profile.findMany` con `fullname` (nullable — usar `?? supervisorId` como fallback)
  - `status: { in: ['pending_approval', 'rejected'] }` es una restricción fija de negocio; si el usuario filtra por status, filtersWhere la sobreescribe (spread order). Este es comportamiento aceptado.

- **ParaTaller (ForWorkshop)**: `src/features/Mantenimiento/Operaciones/ParaTaller/`
  - Status fijo: `status = 'date_confirmed'` (pedidos con fecha de entrada confirmada)
  - `companyId` via `vehicles.company_id` (no en maintenance_orders directamente)
  - Filtros de texto en vehicles (domain, serie, intern_number) se manejan manualmente en AND conditions (no via buildTextFiltersWhere porque son campos anidados en vehicles)
  - Filtro `condition` es campo del vehículo (vehicles.condition), requiere findMany + conteo manual (no groupBy directo)
  - Auditoría 2026-03: correcciones aplicadas — `created_at` faltaba en DATE_RANGE_COLUMNS + facetedFilters; `order_number` faltaba en TEXT_COLUMNS + facetedFilters; null key en vehicleCounts Map (NULL_FILTER_VALUE fix); `order_number` agregado a VALID_SORT_FIELDS y a búsqueda global

- **PedidosPendientes**: `src/features/Mantenimiento/PedidosMantenimiento/Pendientes/`
  - Status fijos: `pending_scheduling`, `scheduled` (bussiness constraint en buildWhereClause)
  - `companyId` via `vehicles.company_id`
  - Filtros de texto en vehicles (domain, serie, intern_number) y order_number se manejan con OR de nivel raíz (`searchCondition`) para que Prisma pueda combinar campos de relación con campos directos
  - Patrón de búsqueda global multi-tabla: `OR: [{ vehicles: { OR: [...] } }, { order_number: {...} }]`
  - `source` (checklist/manual) — campo directo en maintenance_orders; tiene filtro facetado + groupBy con crossWhere
  - SOURCE_LABELS/SOURCE_ICONS exportados desde columns.tsx con valores 'checklist' → 'Checklist', 'manual' → 'Manual'
  - Auditoría 2026-03: `order_number` y `source` no tenían columna ni filtro (MISSING HIGH); agregados columnas, filtros text/faceted, formatters de export, groupBy en facets, VALID_SORT_FIELDS actualizados

- **WorkshopTracking (Seguimiento en Taller)**: `src/features/Mantenimiento/WorkshopTracking/`
  - Status relevantes: in_workshop, pending_workshop_validation, pending_operations_validation, operations_rejected, workshop_rejected, completed
  - Columnas virtuales (sin filtro): `days_in_workshop`, `sector_journey` (recorrido sectores), `progress` (% asignación)
  - Filtros de texto en vehicles (domain, serie, intern_number) se manejan manualmente en AND conditions
  - `order_number` usa TEXT_COLUMNS + buildTextFiltersWhere (campo directo en maintenance_orders)
  - Auditoría 2026-03: `order_number` faltaba en TEXT_COLUMNS + facetedFilters (filtro text); `CircleOff` icon faltaba en opción "Sin asignar" de vehicle; `DataTableFilterOption[]` type explícito en vehicleOptions para permitir push con icon
  - companyId via `vehicles.company_id` (no campo directo en maintenance_orders)

### PATRÓN CRÍTICO — Filtros omitidos sistemáticamente

**El error más frecuente al crear tablas**: las columnas FK (supervisor, employee, etc.) y de fecha (created_at) se agregan como columnas pero NO se agrega el filtro correspondiente.

**Checklist obligatorio al crear o auditar filtros:**

Para CADA columna en `columns.tsx`, preguntar:
1. ¿Es FK UUID? → Agregar en COLUMN_MAP, facet groupBy en getXxxFacets, supervisorOptions useMemo, entrada en facetedFilters con externalCounts, filterFn con NULL_FILTER_VALUE
2. ¿Es enum? → Agregar en COLUMN_MAP, facet groupBy, statusOptions useMemo, entrada en facetedFilters con externalCounts, filterFn con null check
3. ¿Es fecha? → Agregar en DATE_COLUMNS, en buildDateRangeFiltersWhere, entrada `{ columnId, title, type: 'dateRange' }` en facetedFilters
4. ¿Es texto? → Agregar en TEXT_COLUMNS, en buildTextFiltersWhere, entrada `{ columnId, title, type: 'text' }` en facetedFilters

**Lo que más se olvida por columna:**
- FK: la entrada en COLUMN_MAP (sin esto buildFiltersWhere no la procesa server-side)
- FK: el `filterFn` en columns.tsx usando `row.original.rawId` (no el campo accesado por accessorFn)
- Fecha: la entrada en `facetedFilters` con `type: 'dateRange'` (la columna tiene dateRange en la acción pero no aparece el filtro en la UI)
- Todas: olvidar `externalCounts: facets?.campo` → los counts son incorrectos con paginación
- Campos de tablas relacionadas (ej: `source` de `maintenance_requests`): el campo se incluye en el `select` Prisma pero se omite la columna y el filtro en la tabla. Verificar SIEMPRE que todos los campos del `select` tengan columna visible.

### Dashboard Principal — Dialogs con DataTable

**`AvailableEmployeesDialog.tsx` — MIGRADO (2026-03)**
- Reescrito con `queryFn` → `getAvailableEmployeesPaginated(params, positionIds)` (Prisma skip/take)
- Facets lazy-load: `getAvailableEmployeeSingleFacet(columnId, params, positionIds)` con crossWhere
- Columnas: file (legajo), name, cuil, company_positions (FK), customers (M:M), diagram (virtual)
- `paramNamespace="avail-emp"`, `queryKey=['available-employees-dialog', ...positionIds]`
- Count mismatch fix: `getEmployeeIndicators` ahora filtra `usedRelations` por `employees_diagram.work_active: true` (alinea numerador con denominador)
- Patrón especial: Dialog es Client Component con `queryFn` — NO hay Server Component intermediario
- `buildAvailableEmployeesWhere` es async (hace 2 queries previas: inReport + diagramEmployees con Promise.all)
- `contractor_employee.employee_id` y `contractor_id` son `String?` (nullable) en Prisma — siempre filtrar con `.filter(Boolean)`

**Dialogs PENDIENTE MIGRACIÓN:** `src/features/Dashboard/Principal/components/`
- `AvailableVehiclesDialog.tsx`, `VehiclesOnRepairDialog.tsx`, `ServicesDetailDialog.tsx`
- `vehicle-dialog-helpers.tsx` — helpers compartidos

- **PedidosConfirmados**: `src/features/Mantenimiento/PedidosMantenimiento/Confirmados/`
  - Auditoría 2026-03: `order_number` y `source` (de maintenance_requests) faltaban como columnas y filtros
  - `order_number`: agregado columna + filtro text + VALID_SORT_FIELDS + TEXT_COLUMNS + buildTextFiltersWhere + export formatter
  - `source`: agregado columna (oculta por defecto) + filtro facetado + SOURCE_LABELS/SOURCE_ICONS + groupBy en facets vía maintenance_requests + source en exclude de buildFiltersWhere + filtro manual sourceFilter + export formatter
  - `condition`: agregado íconos semánticos (CheckCircle2, XCircle, Wrench, AlertCircle, Settings2) en opciones del filtro facetado
  - `SOURCE_ICONS` en columns.tsx tipado como `Record<string, LucideIcon>` para compatibilidad con `DataTableFilterOption.icon`

- **DocumentosEmpleadosMensuales**: `src/features/Documentacion/DocumentosEmpleados/Mensuales/`
  - Fix 2026-03: migrado de bulk facets a lazy-load + client-side navigation mode
  - `period` es `String?` en DB (no DateTime) — filtro `text` NO `dateRange`. Eliminado de DATE_RANGE_COLUMNS
  - Columnas booleanas `mandatory`/`multiresource` viven en `document_types` (no en la tabla principal) — se manejan con groupBy + lookup en document_types para obtener los valores bool. crossWhere excluye 'mandatory'/'multiresource' correctamente del exclude
  - `contractor` es M:M via `employees.contractor_employee` — facet usa `findMany` + conteo manual (no groupBy)
  - Factory `makeBoolFetchFacet` para booleanos en document_types — patrón específico de esta tabla
  - `filterFn` de columna `employee` eliminada (era filtro text, no faceted — filterFn no aplica a text filters)
  - Filtros text agregados: `period` + `deny_reason` en TEXT_FILTER_COLUMNS y en buildWhereClause manualmente
  - `getMonthlyEmployeeDocumentsSingleFacet(columnId, searchParams?, employeeId?)` — función lazy-load con crossWhere
