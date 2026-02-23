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
