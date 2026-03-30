# Dashboard Documentacion + RRHH — Migracion a Prisma + DataTable Nuevo

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar todas las tablas y graficos del Dashboard (tabs Documentacion y Estadisticas/RRHH) de Supabase a Prisma, reemplazar BaseDataTable viejo por el DataTable nuevo, y corregir todos los anti-patterns.

**Architecture:** 3-layer DataTable (Server Component → Client Component → `<DataTable />`), server actions con Prisma, graficos con server actions + React Query (no supabaseBrowser), RPCs complejos via `prisma.$queryRawUnsafe()` cuando Prisma nativo sea inviable.

**Tech Stack:** Prisma, DataTable de `@/shared/components/common/DataTable/`, React Query, recharts, moment.js, Logger.

**Branch:** `feat/dashboard-prisma-migration` (crear desde `dev`)

---

## Mapa de Archivos

### Archivos a CREAR

```
src/features/Dashboard/Documentacion/
├── Empleados/
│   ├── EmployeeExpiringDocsList.tsx          # Server Component
│   ├── columns.tsx                           # Columnas DataTable nuevo
│   ├── _EmployeeExpiringDocsDataTable.tsx    # Client Component
│   └── actions.server.ts                     # Prisma server actions
├── Vehiculos/
│   ├── VehicleExpiringDocsList.tsx            # Server Component
│   ├── columns.tsx                           # Columnas DataTable nuevo
│   ├── _VehicleExpiringDocsDataTable.tsx     # Client Component
│   └── actions.server.ts                     # Prisma server actions
└── actions.server.ts                         # Server actions compartidas (row actions: dar de baja, historial)

src/features/Dashboard/Estadisticas/RecursosHumanos/
├── actions.server.ts                         # NUEVO — todas las server actions con Prisma (reemplaza actions/actions.ts)
├── types.ts                                  # Tipos inferidos de los retornos de Prisma
├── components/
│   ├── DepartmentSummaryTable/               # Subcarpeta para tabla "Resumen por Sector"
│   │   ├── DepartmentSummaryList.tsx         # Server Component
│   │   ├── columns.tsx
│   │   └── _DepartmentSummaryDataTable.tsx   # Client + modal "Ausentes en [Sector]"
│   ├── DailyAbsenceTable/                    # Subcarpeta para tabla "Ausentismo Diario"
│   │   ├── DailyAbsenceList.tsx              # Server Component
│   │   ├── columns.tsx
│   │   └── _DailyAbsenceDataTable.tsx        # Client + modal "Ausentes por fecha"
│   ├── EmployeeAbsenceTable/                 # Subcarpeta para tabla compartida "Detalle Ausencias"
│   │   ├── columns.tsx
│   │   └── _EmployeeAbsenceDataTable.tsx     # Client (reutilizada en modales)
│   ├── SummaryCards.tsx                       # KPI cards (reescrito con Prisma)
│   ├── AbsenteeismTrendChart.tsx              # Reescrito: server action + React Query
│   ├── HeadcountTrendChart.tsx                # Reescrito: server action + React Query
│   ├── DepartmentAbsenceCharts.tsx            # Reescrito: Prisma SSR
│   └── employee-distribution-charts.tsx       # Reescrito: Prisma SSR
├── fallback/
│   └── RRHHDashboardSkeleton.tsx             # Skeleton para Suspense
```

### Archivos a ELIMINAR (tras migracion)

```
src/app/dashboard/componentDashboard/actions/server-actions.ts          # Movido a features/
src/app/dashboard/componentDashboard/table/employees-expiring-columns-server.tsx
src/app/dashboard/componentDashboard/table/equipment-expiring-columns-server.tsx
src/app/dashboard/componentDashboard/table/data-table-options.tsx       # Migrado a server actions
src/features/Dashboard/Documentacion/components/EmployeesTableServerWrapper.tsx
src/features/Dashboard/Documentacion/components/EmployeesTableServer.tsx
src/features/Dashboard/Documentacion/components/DocumentsTableServerWrapper.tsx
src/features/Dashboard/Documentacion/components/DocumentsTableServer.tsx
src/features/Dashboard/Estadisticas/RecursosHumanos/actions/actions.ts  # Reemplazado por actions.server.ts nuevo
src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/department-summary-table.tsx  # → DepartmentSummaryTable/
src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/detailed-absence-table.tsx    # → DailyAbsenceTable/
src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/employee-absence-table.tsx    # → EmployeeAbsenceTable/
```

### Archivos a MODIFICAR

```
src/features/Dashboard/Documentacion/DocumentsTabContent.tsx            # Apuntar a nuevos componentes + Suspense
src/features/Dashboard/DashboardComponent.tsx                           # Agregar Suspense en tabs
src/features/Dashboard/Estadisticas/EstadisticasTabComponent.tsx        # Suspense + skeletons
src/features/Dashboard/Estadisticas/RecursosHumanos/absenteeism-dashboard.tsx  # Apuntar a nuevos componentes
src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/absenteeism-trend-chart.tsx   # Solo visual, sin cambios de data
src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/headcount-trend-chart.tsx     # Solo visual, sin cambios de data
src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/department-absence-charts.tsx # Sin cambios (puro render)
src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/employee-gender-position-chart.tsx  # Quitar dead code
src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/employee-contract-type-chart.tsx    # useState → useMemo
```

---

## Fase 1: Setup + Dashboard Documentacion (2 tablas)

### Task 1: Crear branch y capturar baseline

**Files:** Ninguno

- [ ] **Step 1: Crear branch desde dev**

```bash
git checkout dev && git pull && git checkout -b feat/dashboard-prisma-migration
```

- [ ] **Step 2: Capturar datos baseline de Dashboard Documentacion**

Usando chrome-devtools MCP, navegar a `/dashboard?tab=documentacion&subtab=empleados`:

1. Tomar screenshot
2. Anotar cantidad de registros totales mostrados en la tabla
3. Anotar algunos valores de ejemplo (primer empleado, documento, fecha vencimiento)

Repetir para `/dashboard?tab=documentacion&subtab=vehiculos`.

- [ ] **Step 3: Capturar datos baseline de RRHH**

Navegar a `/dashboard?tab=estadisticas&subtab=rrhh`:

1. Tomar screenshot general
2. Anotar valores de KPI cards (dotacion, altas, bajas, ausentes, %)
3. Anotar cantidad de filas en "Resumen por Sector"
4. Hacer click en un sector → anotar cantidad de empleados en el modal
5. Anotar datos de "Ausentismo Diario" (primera/ultima fila)
6. Verificar graficos (que rendericen sin errores)

- [ ] **Step 4: Consultar datos en Supabase PROD para referencia cruzada**

Usando MCP supabase-PROD (SOLO LECTURA), ejecutar queries de referencia:

```sql
-- Cantidad de documentos de empleados por vencer (proximos 30 dias)
SELECT COUNT(*) FROM documents_employees de
JOIN document_types dt ON de.id_document_types = dt.id
WHERE de.is_active = true
AND de.validity IS NOT NULL
AND de.validity <= NOW() + INTERVAL '30 days'
AND de.state = 'presentado';

-- Cantidad de documentos de equipos por vencer
SELECT COUNT(*) FROM documents_equipment de
JOIN document_types dt ON de.id_document_types = dt.id
WHERE de.is_active = true
AND de.validity IS NOT NULL
AND de.validity <= NOW() + INTERVAL '30 days'
AND de.state = 'presentado';
```

Guardar estos numeros como referencia para verificacion post-migracion.

---

### Task 2: Tabla de documentos de empleados por vencer (DataTable nuevo + Prisma)

**Files:**

- Create: `src/features/Dashboard/Documentacion/Empleados/actions.server.ts`
- Create: `src/features/Dashboard/Documentacion/Empleados/columns.tsx`
- Create: `src/features/Dashboard/Documentacion/Empleados/_EmployeeExpiringDocsDataTable.tsx`
- Create: `src/features/Dashboard/Documentacion/Empleados/EmployeeExpiringDocsList.tsx`
- Reference: `src/app/dashboard/componentDashboard/actions/server-actions.ts` (query actual)
- Reference: `src/app/dashboard/componentDashboard/table/employees-expiring-columns-server.tsx` (columnas actuales)
- Reference: `.claude/skills/new-datatable/SKILL.md` (plantilla completa)

- [ ] **Step 1: Crear actions.server.ts con Prisma**

Leer el server action actual (`fetchEmployeeExpiringDocuments` en `server-actions.ts`) para entender la query exacta. Replicar con Prisma:

```typescript
'use server';

import { prisma } from '@/shared/lib/prisma';
import { Logger } from '@/lib/logger';
import {
  parseSearchParams,
  stateToPrismaParams,
  buildSearchWhere,
  buildFiltersWhere,
  buildTextFiltersWhere,
  buildDateRangeFiltersWhere,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';

const logger = new Logger('features/Dashboard/Documentacion/Empleados');

// La query debe filtrar:
// - documents_employees con is_active = true
// - validity <= NOW() + 30 dias (o segun filtro del dashboard)
// - state = 'presentado' (o el filtro que use la query actual)
// - company_id del usuario actual
// Include: employees (lastname, firstname, file), document_types (name)

export async function getEmployeeExpiringDocsPaginated(searchParams: DataTableSearchParams, companyId: string) {
  // ... implementar siguiendo el patron de SKILL.md
  // buildWhereClause con filtros de texto, fechas, faceted
  // Prisma findMany + count en Promise.all
}

export async function getEmployeeExpiringDocsForExport(searchParams: DataTableSearchParams, companyId: string) {
  // Sin skip/take, misma logica de where
}

export async function getEmployeeExpiringDocsSingleFacet(
  columnId: string,
  searchParams: DataTableSearchParams,
  companyId: string
) {
  // Facet individual con crossWhere
}

// Tipos inferidos
export type EmployeeExpiringDocItem = Awaited<ReturnType<typeof getEmployeeExpiringDocsPaginated>>['data'][number];
```

La query Prisma base debe ser equivalente a:

```typescript
prisma.documents_employees.findMany({
  where: {
    is_active: true,
    employees: { company_id: companyId, is_active: true },
    validity: { lte: thirtyDaysFromNow },
    state: 'presentado', // verificar con la query actual
  },
  select: {
    id: true,
    validity: true,
    created_at: true,
    state: true,
    document_path: true,
    employees: {
      select: { id: true, lastname: true, firstname: true, file: true },
    },
    document_types: {
      select: { id: true, name: true },
    },
  },
  orderBy: { validity: 'asc' },
});
```

- [ ] **Step 2: Crear columns.tsx**

Columnas basadas en las actuales (`employees-expiring-columns-server.tsx`), adaptadas al sistema nuevo:

| Columna     | accessorFn/Key                                                         | Filtro               | Meta                          |
| ----------- | ---------------------------------------------------------------------- | -------------------- | ----------------------------- |
| Empleado    | `accessorFn: row => row.employees?.lastname` con `id: 'employee'`      | text                 | `{ title: 'Empleado' }`       |
| Legajo      | `accessorFn: row => row.employees?.file` con `id: 'fileNumber'`        | text (exact match)   | `{ title: 'Legajo' }`         |
| Documento   | `accessorFn: row => row.document_types?.name` con `id: 'documentType'` | faceted (fetchFacet) | `{ title: 'Documento' }`      |
| Vencimiento | `accessorKey: 'validity'`                                              | dateRange            | `{ title: 'Vencimiento' }`    |
| Subido el   | `accessorKey: 'created_at'`                                            | dateRange            | `{ title: 'Subido el' }`      |
| Estado      | `accessorKey: 'state'`                                                 | faceted              | `{ title: 'Estado' }`         |
| Acciones    | `id: 'actions'`                                                        | —                    | `{ excludeFromExport: true }` |

Patron de legajo: filtro de texto con coincidencia exacta (`equals`), tooltip HelpCircle.
Fechas: `moment(val).format('DD/MM/YYYY')`.
Vencimiento: icono rojo si vencido, naranja si por vencer (replicar logica actual).

- [ ] **Step 3: Crear \_EmployeeExpiringDocsDataTable.tsx (Client Component)**

Seguir SKILL.md: queryFn, queryKey, onStateChange, currentParams, lazy-load facets con fetchFacet, exportConfig, etc.

Props: `data`, `totalRows`, `searchParams`, `tableId`, `companyId`.

- [ ] **Step 4: Crear EmployeeExpiringDocsList.tsx (Server Component)**

```typescript
import { getEmployeeExpiringDocsPaginated } from './actions.server';
import { getTablePreferences, stripPrefixFromSearchParams } from '@/shared/components/common/DataTable';
import { _EmployeeExpiringDocsDataTable } from './_EmployeeExpiringDocsDataTable';
// obtener companyId del servidor (cookies/session)

const TABLE_ID = 'dashboard-employee-expiring-docs';

export async function EmployeeExpiringDocsList({ searchParams }) {
  const tableParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);
  const [{ data, total }, preferences] = await Promise.all([
    getEmployeeExpiringDocsPaginated(tableParams, companyId),
    getTablePreferences(TABLE_ID),
  ]);
  return (
    <_EmployeeExpiringDocsDataTable
      data={data}
      totalRows={total}
      searchParams={tableParams}
      tableId={TABLE_ID}
      companyId={companyId}
      initialColumnVisibility={preferences.columnVisibility ?? {}}
      initialFilterVisibility={preferences.filterVisibility ?? {}}
    />
  );
}
```

- [ ] **Step 5: Verificar tipos** — `npm run check-types`

- [ ] **Step 6: Commit**

```
feat(dashboard/documentacion): migrate employee expiring docs table to Prisma + new DataTable
```

---

### Task 3: Tabla de documentos de equipos por vencer (DataTable nuevo + Prisma)

**Files:**

- Create: `src/features/Dashboard/Documentacion/Vehiculos/actions.server.ts`
- Create: `src/features/Dashboard/Documentacion/Vehiculos/columns.tsx`
- Create: `src/features/Dashboard/Documentacion/Vehiculos/_VehicleExpiringDocsDataTable.tsx`
- Create: `src/features/Dashboard/Documentacion/Vehiculos/VehicleExpiringDocsList.tsx`
- Reference: `src/app/dashboard/componentDashboard/actions/server-actions.ts` (query actual para equipos)
- Reference: `src/app/dashboard/componentDashboard/table/equipment-expiring-columns-server.tsx`

- [ ] **Step 1: Crear actions.server.ts con Prisma**

Misma estructura que Task 2 pero para `documents_equipment` con relacion a `vehicles`:

```typescript
prisma.documents_equipment.findMany({
  where: {
    is_active: true,
    vehicles: { company_id: companyId, is_active: true },
    validity: { lte: thirtyDaysFromNow },
    state: 'presentado',
  },
  select: {
    id: true,
    validity: true,
    created_at: true,
    state: true,
    document_path: true,
    vehicles: {
      select: { id: true, domain: true, intern_number: true, serie: true },
    },
    document_types: {
      select: { id: true, name: true },
    },
  },
});
```

- [ ] **Step 2: Crear columns.tsx**

| Columna     | Dato                                                              | Filtro               |
| ----------- | ----------------------------------------------------------------- | -------------------- |
| Equipo      | `vehicles.domain \|\| vehicles.intern_number \|\| vehicles.serie` | text                 |
| Documento   | `document_types.name`                                             | faceted (fetchFacet) |
| Vencimiento | `validity`                                                        | dateRange            |
| Subido el   | `created_at`                                                      | dateRange            |
| Estado      | `state`                                                           | faceted              |
| Acciones    | Ver/Subir                                                         | `excludeFromExport`  |

- [ ] **Step 3: Crear Client + Server Components** (misma estructura que Task 2)

- [ ] **Step 4: Verificar tipos** — `npm run check-types`

- [ ] **Step 5: Commit**

```
feat(dashboard/documentacion): migrate equipment expiring docs table to Prisma + new DataTable
```

---

### Task 4: Migrar row actions (data-table-options.tsx) a server actions

**Files:**

- Create: `src/features/Dashboard/Documentacion/actions.server.ts` (acciones compartidas)
- Read: `src/app/dashboard/componentDashboard/table/data-table-options.tsx` (implementacion actual)
- Modify: columnas de ambas tablas para usar las nuevas acciones

El archivo actual `data-table-options.tsx` usa `supabaseBrowser()` directamente para:

1. **Ver historial**: query a `documents_employees_logs`
2. **Dar de baja**: update a `documents_employees` con `is_active = false`
3. **Ver/subir documento**: link de navegacion

- [ ] **Step 1: Crear server actions con Prisma**

```typescript
'use server';
import { prisma } from '@/shared/lib/prisma';

export async function getDocumentHistory(documentId: string) {
  return prisma.documents_employees_logs.findMany({
    where: { documents_employees_id: documentId },
    orderBy: { updated_at: 'desc' },
  });
}

export async function deactivateEmployeeDocument(documentId: string) {
  return prisma.documents_employees.update({
    where: { id: documentId },
    data: { is_active: false },
  });
}

export async function deactivateEquipmentDocument(documentId: string) {
  return prisma.documents_equipment.update({
    where: { id: documentId },
    data: { is_active: false },
  });
}
```

- [ ] **Step 2: Crear componente de acciones en la celda**

Reescribir la logica de `data-table-options.tsx` como un Client Component limpio:

- Usar `useMutation` + `useQueryClient` para dar de baja (con invalidacion de query)
- Usar `useQuery` para historial (lazy, on dialog open)
- Usar `moment` en lugar de `date-fns` para fechas
- Usar `AlertDialog` para confirmacion de baja
- NO usar `supabaseBrowser()` — todo via server actions

- [ ] **Step 3: Integrar en las columnas de ambas tablas**

- [ ] **Step 4: Verificar tipos + commit**

```
feat(dashboard/documentacion): migrate row actions to Prisma server actions
```

---

### Task 5: Actualizar DocumentsTabContent + limpiar archivos viejos

**Files:**

- Modify: `src/features/Dashboard/Documentacion/DocumentsTabContent.tsx`
- Modify: `src/features/Dashboard/DashboardComponent.tsx` (agregar Suspense)
- Delete: archivos viejos listados en el mapa de archivos

- [ ] **Step 1: Actualizar DocumentsTabContent.tsx**

```typescript
import { Suspense } from 'react';
import { EmployeeExpiringDocsList } from './Empleados/EmployeeExpiringDocsList';
import { VehicleExpiringDocsList } from './Vehiculos/VehicleExpiringDocsList';
// Skeleton dedicado para cada tabla

// TabsManagerServer con Suspense:
// subtab empleados → <Suspense fallback={<Skeleton />}><EmployeeExpiringDocsList /></Suspense>
// subtab vehiculos → <Suspense fallback={<Skeleton />}><VehicleExpiringDocsList /></Suspense>
```

- [ ] **Step 2: Agregar Suspense en DashboardComponent.tsx** para DocumentsTabContent

- [ ] **Step 3: Eliminar archivos viejos** (ver lista en mapa de archivos)

- [ ] **Step 4: Buscar imports huerfanos** — grep por los archivos eliminados y corregir

- [ ] **Step 5: Verificar tipos + verificacion visual**

Navegar a `/dashboard?tab=documentacion&subtab=empleados` y `/dashboard?tab=documentacion&subtab=vehiculos`:

- Verificar que las tablas rendericen correctamente
- Comparar cantidad de registros con el baseline (Task 1)
- Verificar filtros (escribir un nombre, filtrar por documento)
- Verificar export Excel
- Verificar acciones de fila (historial, dar de baja)

- [ ] **Step 6: Commit**

```
refactor(dashboard/documentacion): cleanup old files and update tab content
```

---

## Fase 2: RRHH — Server Actions con Prisma

### Task 6: Investigar RPCs y crear server actions de RRHH

**Files:**

- Create: `src/features/Dashboard/Estadisticas/RecursosHumanos/actions.server.ts`
- Create: `src/features/Dashboard/Estadisticas/RecursosHumanos/types.ts`
- Read: `src/features/Dashboard/Estadisticas/RecursosHumanos/actions/actions.ts` (implementacion actual)

- [ ] **Step 1: Leer las definiciones de las RPCs en la base de datos**

Usar MCP supabase-PROD (SOLO LECTURA) para leer el cuerpo de cada RPC:

```sql
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name LIKE 'hr_get_%'
AND routine_schema = 'public';
```

Para cada RPC, evaluar:

- **Prisma nativo** si es un SELECT/JOIN/GROUP BY simple
- **`prisma.$queryRawUnsafe()`** si tiene CTEs, window functions, o logica compleja

- [ ] **Step 2: Crear server actions — queries directas (Prisma nativo)**

Estas funciones actualmente son queries directas a Supabase (NO RPCs), asi que se migran a Prisma nativo:

```typescript
// getEmployeesByGenderAndPosition → Prisma nativo
export async function getEmployeesByGenderAndPosition(companyId: string) {
  const data = await prisma.employees.findMany({
    where: { company_id: companyId, is_active: true },
    select: {
      gender: true,
      company_position: true,
      company_positions: { select: { name: true } },
    },
  });
  return data;
}

// getEmployeesByContractType → Prisma nativo
export async function getEmployeesByContractType(companyId: string) {
  const data = await prisma.employees.findMany({
    where: { company_id: companyId, is_active: true },
    select: {
      types_of_contract: { select: { id: true, name: true } },
    },
  });
  return data;
}
```

- [ ] **Step 3: Crear server actions — RPCs simples (intentar Prisma nativo)**

Evaluar cada RPC tras leer su definicion:

**`hr_get_current_absent_employees(p_company_id, p_date)`** — Lista empleados ausentes en una fecha.
Probablemente es:

```typescript
// Si es viable con Prisma:
export async function getCurrentAbsentEmployees(companyId: string, date: Date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const absentees = await prisma.employees_diagram.findMany({
    where: {
      day: day,
      month: month,
      year: year,
      is_active: true,
      diagram_type_rel: { computes_absenteeism: true },
      employees: { company_id: companyId, is_active: true },
    },
    include: {
      employees: {
        select: {
          id: true,
          file: true,
          firstname: true,
          lastname: true,
          hierarchy: { select: { name: true } },
          work_diagram: { select: { name: true } },
        },
      },
      diagram_type_rel: { select: { name: true, short_description: true } },
    },
  });
  // Mapear al formato esperado por los componentes
  return absentees.map((a) => ({
    legajo: a.employees.file,
    nombre: `${a.employees.lastname} ${a.employees.firstname}`,
    tarea: a.employees.hierarchy?.name ?? '',
    // ... etc
  }));
}
```

**`hr_get_department_absence_summary(p_company_id, p_date)`** — Resumen por sector.

```typescript
// Prisma nativo: 2 queries en paralelo
export async function getDepartmentAbsenceSummary(companyId: string, date: Date) {
  // 1. Total empleados por sector
  const byDept = await prisma.employees.groupBy({
    by: ['hierarchical_position'],
    where: { company_id: companyId, is_active: true },
    _count: true,
  });
  // 2. Ausentes por sector (de employees_diagram)
  // ... join + groupBy
  // 3. Combinar y calcular porcentaje
}
```

- [ ] **Step 4: Crear server actions — RPCs complejos ($queryRawUnsafe)**

Para RPCs con logica compleja (series temporales, CTEs, window functions):

```typescript
export async function getAbsenteeismTrend(companyId: string, from: string, to: string) {
  const result = await prisma.$queryRawUnsafe<TrendData[]>(
    `SELECT * FROM hr_get_absenteeism_trend($1, $2::date, $3::date, false)`,
    companyId,
    from,
    to
  );
  return result;
}

export async function getDailyAbsenceTimeseries(companyId: string, from: string, to: string) {
  const result = await prisma.$queryRawUnsafe<TimeseriesData[]>(
    `SELECT * FROM hr_get_daily_absence_timeseries($1, $2::date, $3::date, false)`,
    companyId,
    from,
    to
  );
  return result;
}
```

**IMPORTANTE**: La decision Prisma nativo vs $queryRawUnsafe se toma en el Step 1 al leer cada RPC. Si la logica es un simple SELECT/JOIN/GROUP BY → Prisma nativo. Si tiene CTEs, LATERAL JOINs, window functions, o logica procedural → $queryRawUnsafe.

- [ ] **Step 5: Crear types.ts con tipos inferidos**

```typescript
export type DepartmentSummaryItem = Awaited<ReturnType<typeof getDepartmentAbsenceSummary>>[number];
export type AbsentEmployeeItem = Awaited<ReturnType<typeof getCurrentAbsentEmployees>>[number];
// ... etc
```

- [ ] **Step 6: Verificar tipos + commit**

```
feat(dashboard/rrhh): create Prisma server actions for all RRHH data
```

---

## Fase 3: RRHH — Tablas con DataTable Nuevo

### Task 7: Tabla "Detalle de Ausencias por Empleado" (componente compartido)

**Files:**

- Create: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/EmployeeAbsenceTable/columns.tsx`
- Create: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/EmployeeAbsenceTable/_EmployeeAbsenceDataTable.tsx`
- Reference: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/employee-absence-table.tsx` (actual)

Esta tabla se reutiliza en:

- Vista principal "Detalle de Ausencias por Empleado"
- Modal de "Ausentes en [Sector]"
- Modal de "Empleados ausentes por fecha"

**IMPORTANTE**: Esta tabla recibe datos ya filtrados (no hace fetch propio). Los datos vienen del componente padre (que obtiene la lista de empleados ausentes). Por lo tanto, NO necesita `queryFn` ni paginacion server-side. Es una tabla client-side con datos pasados por prop.

- [ ] **Step 1: Crear columns.tsx**

| Columna       | Dato            | Filtro             |
| ------------- | --------------- | ------------------ |
| Legajo        | `legajo`        | text (exact match) |
| Nombre        | `nombre`        | text               |
| Tarea/Sector  | `tarea`         | faceted            |
| Linea         | `linea`         | faceted            |
| Turno         | `turno`         | faceted            |
| Motivo        | `motivo`        | faceted            |
| Desde         | `desde`         | dateRange          |
| Hasta         | `hasta`         | dateRange          |
| Dias Caidos   | `diasCaidos`    | —                  |
| Observaciones | `observaciones` | text               |

- [ ] **Step 2: Crear \_EmployeeAbsenceDataTable.tsx**

Client Component que recibe `data` como prop (NO hace fetch). Usa `<DataTable>` sin `queryFn` (modo client-side puro). Configurar facetedFilters, export, etc.

```typescript
interface Props {
  data: AbsentEmployeeItem[];
  title?: string;
}
```

- [ ] **Step 3: Verificar tipos + commit**

```
feat(dashboard/rrhh): create shared EmployeeAbsenceDataTable component
```

---

### Task 8: Tabla "Resumen por Sector" + Modal

**Files:**

- Create: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/DepartmentSummaryTable/DepartmentSummaryList.tsx`
- Create: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/DepartmentSummaryTable/columns.tsx`
- Create: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/DepartmentSummaryTable/_DepartmentSummaryDataTable.tsx`
- Reference: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/department-summary-table.tsx` (actual)

- [ ] **Step 1: Crear columns.tsx**

| Columna      | Dato         | Filtro  |
| ------------ | ------------ | ------- |
| Sector       | `sector`     | faceted |
| Dotacion     | `dotacion`   | —       |
| Ausentes     | `ausentes`   | —       |
| % Ausentismo | `porcentaje` | —       |

Nota: La fila es clickable para abrir modal con detalle de ausentes del sector.

- [ ] **Step 2: Crear \_DepartmentSummaryDataTable.tsx**

Client Component con:

- `<DataTable>` (client-side, datos por prop — no fetch propio)
- Logica de click en fila → abrir `<Dialog>` con `_EmployeeAbsenceDataTable`
- Los datos del modal vienen embebidos en la fila (`data.data[]` = lista de empleados ausentes del sector)

```typescript
// Al hacer click en fila:
const [selectedDepartment, setSelectedDepartment] = useState(null);
// Modal muestra: <_EmployeeAbsenceDataTable data={selectedDepartment.data} />
```

- [ ] **Step 3: Crear DepartmentSummaryList.tsx (Server Component)**

Fetch SSR con la server action de Task 6:

```typescript
const data = await getDepartmentAbsenceSummary(companyId, date);
return <_DepartmentSummaryDataTable data={data} />;
```

- [ ] **Step 4: Verificar tipos + commit**

```
feat(dashboard/rrhh): create DepartmentSummaryTable with sector detail modal
```

---

### Task 9: Tabla "Ausentismo Diario" + Modal

**Files:**

- Create: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/DailyAbsenceTable/DailyAbsenceList.tsx`
- Create: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/DailyAbsenceTable/columns.tsx`
- Create: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/DailyAbsenceTable/_DailyAbsenceDataTable.tsx`
- Reference: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/detailed-absence-table.tsx` (actual)

- [ ] **Step 1: Crear columns.tsx**

| Columna        | Dato                   | Filtro    |
| -------------- | ---------------------- | --------- |
| Fecha          | `fecha`                | dateRange |
| Dotacion       | `dotacion`             | —         |
| Altas          | `altas`                | —         |
| Bajas          | `bajas`                | —         |
| Vacaciones     | `vacaciones`           | —         |
| Total Dotacion | `totalDotacion`        | —         |
| Total Ausentes | `totalAusentes`        | —         |
| % Ausentismo   | `porcentajeAusentismo` | —         |

Fila clickable → abre modal con detalle de empleados ausentes en esa fecha.

- [ ] **Step 2: Crear \_DailyAbsenceDataTable.tsx**

Client Component con:

- `<DataTable>` (client-side, datos por prop)
- Click en fila → fetch on-demand de empleados ausentes para esa fecha
- Usar `useMutation` o `useQuery` (lazy) para el fetch del modal
- Modal muestra tabs: Bajas / Ausentes / Altas (si la respuesta tiene `detalles`)
- Cada tab contiene `_EmployeeAbsenceDataTable`

```typescript
// Al hacer click en fila:
const handleRowClick = async (row) => {
  setSelectedDate(row.fecha);
  setModalOpen(true);
  // El fetch se hace via useQuery con enabled: modalOpen && selectedDate
};

const { data: modalData, isLoading } = useQuery({
  queryKey: ['absent-employees', selectedDate],
  queryFn: () => getCurrentAbsentEmployees(companyId, selectedDate),
  enabled: modalOpen && !!selectedDate,
});
```

- [ ] **Step 3: Crear DailyAbsenceList.tsx (Server Component)**

Fetch SSR:

```typescript
const data = await getDailyAbsenceTimeseries(companyId, from, to);
return <_DailyAbsenceDataTable data={data} companyId={companyId} />;
```

- [ ] **Step 4: Verificar tipos + commit**

```
feat(dashboard/rrhh): create DailyAbsenceTable with date detail modal
```

---

### Task 10: Migrar SummaryCards (KPI) a Prisma

**Files:**

- Modify: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/SummaryCards.tsx`
- Reference: server action `getAbsenteeismSummary` (actual)

- [ ] **Step 1: Actualizar SummaryCards.tsx**

Cambiar de `getAbsenteeismSummary` (Supabase RPC) a la nueva server action Prisma (creada en Task 6).

Eliminar:

- `:any` typing
- Import de la vieja server action

```typescript
const data = await getAbsenteeismSummaryPrisma(companyId);
// Tipar correctamente con el tipo inferido
```

- [ ] **Step 2: Verificar que los valores KPI coincidan con el baseline**

Comparar los valores mostrados con los capturados en Task 1 Step 3.

- [ ] **Step 3: Commit**

```
feat(dashboard/rrhh): migrate SummaryCards KPIs to Prisma
```

---

## Fase 4: RRHH — Graficos

### Task 11: Migrar AbsenteeismTrendChart (supabaseBrowser → Prisma + React Query)

**Files:**

- Rewrite: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/AbsenteeismTrendChart.tsx`
- Keep: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/absenteeism-trend-chart.tsx` (componente visual puro, sin cambios)

- [ ] **Step 1: Reescribir AbsenteeismTrendChart.tsx**

Eliminar:

- `supabaseBrowser()` import y uso
- `useEffect` + `useState` para fetching
- `Cookies.get('actualComp')` para company_id
- `console.error()`

Reemplazar con:

- `useQuery` con server action Prisma (`getAbsenteeismTrend`)
- `companyId` recibido como prop del Server Component padre
- `Logger` en lugar de `console.error`
- Tipos inferidos del retorno de la server action

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { getAbsenteeismTrend } from '../actions.server';

interface Props {
  companyId: string;
  initialData?: TrendData[];
}

export function AbsenteeismTrendChart({ companyId, initialData }: Props) {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { from, to } = calculateDateRange(timeRange, selectedDate);

  const { data, isLoading } = useQuery({
    queryKey: ['absenteeism-trend', companyId, from, to],
    queryFn: () => getAbsenteeismTrend(companyId, from, to),
    initialData,
  });

  // Renderizar chart subcomponent con data
}
```

- [ ] **Step 2: Actualizar absenteeism-dashboard.tsx** para pasar `companyId` como prop

- [ ] **Step 3: Commit**

```
feat(dashboard/rrhh): migrate AbsenteeismTrendChart to Prisma + React Query
```

---

### Task 12: Migrar HeadcountTrendChart (supabaseBrowser → Prisma + React Query)

**Files:**

- Rewrite: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/HeadcountTrendChart.tsx`
- Keep: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/headcount-trend-chart.tsx` (visual puro)

- [ ] **Step 1: Reescribir HeadcountTrendChart.tsx**

Mismo patron que Task 11:

- Eliminar `supabaseBrowser()`, `useEffect`, `Cookies.get`, `console.error`
- Usar `useQuery` con `getDailyAbsenceTimeseries` de Prisma
- Recibir `companyId` como prop

- [ ] **Step 2: Commit**

```
feat(dashboard/rrhh): migrate HeadcountTrendChart to Prisma + React Query
```

---

### Task 13: Migrar DepartmentAbsenceCharts a Prisma

**Files:**

- Rewrite: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/DepartmentAbsenceCharts.tsx`
- Keep: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/department-absence-charts.tsx` (visual puro)

- [ ] **Step 1: Reescribir DepartmentAbsenceCharts.tsx**

Es un Server Component que hace SSR. Cambiar:

- De `getDepartmentAbsenceReasons` (Supabase RPC) → nueva server action Prisma
- Eliminar `:any` typing, usar tipos inferidos
- Agregar Logger

- [ ] **Step 2: Commit**

```
feat(dashboard/rrhh): migrate DepartmentAbsenceCharts to Prisma
```

---

### Task 14: Migrar EmployeeDistributionCharts a Prisma

**Files:**

- Rewrite: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/employee-distribution-charts.tsx`
- Modify: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/employee-gender-position-chart.tsx` (quitar dead code)
- Modify: `src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/employee-contract-type-chart.tsx` (useState → useMemo)

- [ ] **Step 1: Reescribir employee-distribution-charts.tsx**

- De `getEmployeesByGenderAndPosition` / `getEmployeesByContractType` (Supabase) → Prisma nativo (ya creadas en Task 6)
- Eliminar `console.error`, usar Logger
- Tipar correctamente

- [ ] **Step 2: Limpiar chart subcomponents**

En `employee-gender-position-chart.tsx`:

- Eliminar bloque de codigo comentado (lineas 171-295)
- Eliminar `useMemo` duplicado que construye el mismo Map

En `employee-contract-type-chart.tsx`:

- Cambiar `useState` con initializer → `useMemo` (el setter nunca se usa)

- [ ] **Step 3: Commit**

```
feat(dashboard/rrhh): migrate EmployeeDistributionCharts to Prisma + cleanup
```

---

## Fase 5: Integracion, Cleanup y Verificacion

### Task 15: Actualizar compositors y agregar Suspense

**Files:**

- Modify: `src/features/Dashboard/Estadisticas/RecursosHumanos/absenteeism-dashboard.tsx`
- Modify: `src/features/Dashboard/Estadisticas/EstadisticasTabComponent.tsx`
- Modify: `src/features/Dashboard/DashboardComponent.tsx`
- Create: `src/features/Dashboard/Estadisticas/RecursosHumanos/fallback/RRHHDashboardSkeleton.tsx`

- [ ] **Step 1: Actualizar absenteeism-dashboard.tsx**

Apuntar a los nuevos componentes. Envolver componentes async en `<Suspense>`:

- `SummaryCards` → `<Suspense fallback={<SummaryCardsSkeleton />}>`
- `DepartmentSummaryList` → `<Suspense fallback={<TableSkeleton />}>`
- `DailyAbsenceList` → `<Suspense fallback={<TableSkeleton />}>`
- Charts con SSR → `<Suspense>`

Pasar `companyId` a los componentes client que lo necesitan (charts con React Query).

- [ ] **Step 2: Crear skeletons**

`RRHHDashboardSkeleton.tsx` con estructura similar al layout actual.

- [ ] **Step 3: Agregar Suspense en EstadisticasTabComponent.tsx** para el tab RRHH

- [ ] **Step 4: Agregar Suspense en DashboardComponent.tsx** para tab Estadisticas

- [ ] **Step 5: Verificar tipos + commit**

```
refactor(dashboard): add Suspense boundaries and update compositors
```

---

### Task 16: Eliminar archivos viejos y limpiar imports

**Files:**

- Delete: todos los archivos listados en "Archivos a ELIMINAR" del mapa
- Grep: buscar imports rotos en todo el proyecto

- [ ] **Step 1: Eliminar archivos viejos de Dashboard Documentacion**

```
src/features/Dashboard/Documentacion/components/EmployeesTableServerWrapper.tsx
src/features/Dashboard/Documentacion/components/EmployeesTableServer.tsx
src/features/Dashboard/Documentacion/components/DocumentsTableServerWrapper.tsx
src/features/Dashboard/Documentacion/components/DocumentsTableServer.tsx
```

- [ ] **Step 2: Eliminar archivos viejos de RRHH**

```
src/features/Dashboard/Estadisticas/RecursosHumanos/actions/actions.ts
src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/department-summary-table.tsx
src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/detailed-absence-table.tsx
src/features/Dashboard/Estadisticas/RecursosHumanos/components/charts/employee-absence-table.tsx
```

- [ ] **Step 3: Eliminar archivos viejos de src/app/dashboard/componentDashboard/**

```
src/app/dashboard/componentDashboard/actions/server-actions.ts
src/app/dashboard/componentDashboard/table/employees-expiring-columns-server.tsx
src/app/dashboard/componentDashboard/table/equipment-expiring-columns-server.tsx
src/app/dashboard/componentDashboard/table/data-table-options.tsx
```

**CUIDADO**: Verificar que estos archivos no sean importados por OTROS modulos fuera del dashboard antes de eliminar. Hacer grep global.

- [ ] **Step 4: Grep por imports rotos**

```bash
# Buscar imports a archivos eliminados
grep -r "componentDashboard/actions/server-actions" src/
grep -r "componentDashboard/table/" src/
grep -r "EmployeesTableServer" src/
grep -r "DocumentsTableServer" src/
grep -r "actions/actions" src/features/Dashboard/Estadisticas/
```

Corregir cualquier import roto.

- [ ] **Step 5: Verificar tipos + commit**

```bash
npm run check-types
```

```
refactor(dashboard): remove deprecated Supabase files and fix imports
```

---

### Task 17: Verificacion visual completa

**Files:** Ninguno (solo verificacion)

**CRITICO**: Esta task verifica que todo siga funcionando identico al baseline capturado en Task 1.

- [ ] **Step 1: Verificar Dashboard Documentacion — Empleados**

Navegar a `/dashboard?tab=documentacion&subtab=empleados`:

1. ¿La tabla renderiza? ¿Hay errores en consola?
2. ¿La cantidad de registros coincide con el baseline de Task 1?
3. ¿Los datos (nombre, documento, fecha) coinciden?
4. ¿Los filtros funcionan? (probar filtro de texto por nombre)
5. ¿El export Excel funciona?
6. ¿Las acciones de fila funcionan? (historial, dar de baja)
7. ¿El icono de vencimiento (rojo/naranja) se muestra correctamente?

- [ ] **Step 2: Verificar Dashboard Documentacion — Vehiculos**

Mismas verificaciones que Step 1 para `/dashboard?tab=documentacion&subtab=vehiculos`.

- [ ] **Step 3: Verificar RRHH — KPI Cards**

Navegar a `/dashboard?tab=estadisticas&subtab=rrhh`:

1. ¿Las cards de KPI muestran valores?
2. ¿Los valores coinciden con el baseline? (dotacion, altas, bajas, ausentes, %)

- [ ] **Step 4: Verificar RRHH — Tabla "Resumen por Sector"**

1. ¿La tabla renderiza con datos?
2. ¿Cantidad de filas coincide con baseline?
3. Hacer click en una fila → ¿Se abre el modal?
4. ¿El modal muestra la tabla de empleados ausentes?
5. ¿La cantidad de empleados en el modal coincide con el numero "Ausentes" de la fila?
6. Cerrar modal, hacer click en otra fila → verificar que muestra datos diferentes

- [ ] **Step 5: Verificar RRHH — Tabla "Ausentismo Diario"**

1. ¿La tabla renderiza con datos?
2. ¿Datos de primera/ultima fila coinciden con baseline?
3. Hacer click en una fila → ¿Se abre el modal?
4. Si el modal tiene tabs (Bajas/Ausentes/Altas): ¿cada tab muestra su tabla?
5. ¿La suma de registros en las tabs coincide con "Total Ausentes" de la fila?

- [ ] **Step 6: Verificar RRHH — Tabla "Detalle de Ausencias por Empleado"**

1. ¿La tabla principal renderiza?
2. ¿Filtros funcionan? (probar filtro por motivo, por nombre)
3. ¿Export Excel funciona?

- [ ] **Step 7: Verificar RRHH — Graficos**

1. **Variacion de Ausentismo** (AbsenteeismTrendChart): ¿Renderiza linea? ¿Cambiar rango temporal funciona?
2. **Variacion de Dotacion** (HeadcountTrendChart): ¿Renderiza? ¿Responde a filtros?
3. **Motivos de Ausencia por Departamento** (torta): ¿Renderiza con datos?
4. **Distribucion por Genero/Posicion** (barras): ¿Renderiza?
5. **Distribucion por Tipo de Contrato** (barras): ¿Renderiza?

- [ ] **Step 8: Verificacion cruzada con base de datos**

Usando MCP supabase-PROD, ejecutar las mismas queries de referencia de Task 1 Step 4 y comparar con los numeros que muestra la UI post-migracion.

- [ ] **Step 9: Verificar consola del navegador**

Usando chrome-devtools MCP:

1. Abrir la consola
2. Navegar por todas las tabs/modales
3. Verificar que NO haya errores en consola
4. Verificar que NO haya warnings de `supabaseBrowser` o llamadas a RPCs directas

- [ ] **Step 10: Tomar screenshots finales**

Capturar screenshots de cada vista para comparacion con baseline.

---

### Task 18: Commit final y resumen

- [ ] **Step 1: Verificar tipos una ultima vez**

```bash
npm run check-types
```

- [ ] **Step 2: Verificar que no queden referencias a Supabase en los archivos modificados**

```bash
grep -r "supabaseBrowser\|supabaseServer\|queryWithPagination\|BaseDataTable" \
  src/features/Dashboard/Documentacion/ \
  src/features/Dashboard/Estadisticas/RecursosHumanos/
```

Debe retornar CERO resultados.

- [ ] **Step 3: Verificar que no queden console.\*\_**

```bash
grep -r "console\.\(log\|error\|warn\|debug\)" \
  src/features/Dashboard/Documentacion/ \
  src/features/Dashboard/Estadisticas/RecursosHumanos/
```

Debe retornar CERO resultados.

- [ ] **Step 4: Verificar que no quede `:any`**

```bash
grep -rn ": any\|as any" \
  src/features/Dashboard/Documentacion/ \
  src/features/Dashboard/Estadisticas/RecursosHumanos/
```

Debe retornar CERO resultados (o solo en tipos genericos necesarios como `Record<string, any>` de librerias externas).

- [ ] **Step 5: Commit final si hay cambios pendientes**

```
chore(dashboard): final cleanup and verification
```

---

## Checklist de Verificacion de Consistencia de Datos

Este checklist resume las verificaciones de consistencia que se deben hacer durante y despues de la migracion:

| Verificacion                            | Cuando                             | Como                                |
| --------------------------------------- | ---------------------------------- | ----------------------------------- |
| Cantidad de docs empleados por vencer   | Task 1 (baseline) + Task 17 (post) | Comparar UI vs query SQL            |
| Cantidad de docs equipos por vencer     | Task 1 (baseline) + Task 17 (post) | Comparar UI vs query SQL            |
| Valores KPI cards (dotacion, %, etc.)   | Task 1 (baseline) + Task 17 (post) | Comparar valores visibles           |
| Filas en "Resumen por Sector"           | Task 1 (baseline) + Task 17 (post) | Contar filas                        |
| Modal sector: ausentes = numero en fila | Task 17 Step 4                     | Click fila → contar registros modal |
| Modal fecha: suma tabs = total ausentes | Task 17 Step 5                     | Click fila → sumar registros tabs   |
| Graficos renderizan sin error           | Task 17 Step 7                     | Visual + consola limpia             |
| Cero supabase\* en archivos migrados    | Task 18 Step 2                     | grep                                |
| Cero console.\*                         | Task 18 Step 3                     | grep                                |
| Cero :any                               | Task 18 Step 4                     | grep                                |
| npm run check-types sin errores         | Task 18 Step 1                     | Comando                             |
