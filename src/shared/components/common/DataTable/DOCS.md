# DataTable - Documentación

Componente de tabla de datos server-side con soporte para paginación, sorting, filtros y selección de filas. Diseñado para trabajar con Next.js App Router y Prisma.

## Tabla de Contenidos

- [Características](#características)
- [Arquitectura](#arquitectura)
- [Implementación completa](#implementación-completa)
- [Props del DataTable](#props-del-datatable)
- [Definición de Columnas](#definición-de-columnas)
- [Filtros](#filtros)
- [Helpers de Prisma](#helpers-de-prisma)
- [Exportación a Excel](#exportación-a-excel)
- [Columnas ocultas por defecto](#columnas-ocultas-por-defecto)
- [Persistencia de preferencias](#persistencia-de-preferencias)
- [Selección de Filas](#selección-de-filas)
- [Estado en URL](#estado-en-url)
- [URL Param Isolation (paramNamespace)](#url-param-isolation-paramnamespace)
- [Cross-Filter Facets](#cross-filter-facets)
- [buildWhereClause — Helper DRY](#buildwhereclause--helper-dry)
- [Multi-Sort con resolución FK](#multi-sort-con-resolución-fk)
- [Troubleshooting](#troubleshooting)

---

## Características

- ✅ **Server-Side Pagination** - Los datos se paginan en el servidor con Prisma
- ✅ **Server-Side Sorting** - El ordenamiento se ejecuta en la base de datos
- ✅ **Server-Side Filtering** - Los filtros se aplican en el servidor
- ✅ **Estado en URL** - El estado se sincroniza con searchParams para compartir links
- ✅ **Filtros Faceteados** - Multi-select con conteo de resultados desde el servidor
- ✅ **Filtros de Rango de Fechas** - Selector de fechas con parámetros `_from` / `_to`
- ✅ **Filtros de Texto Libre** - Input de texto que filtra por substring en una columna
- ✅ **Toggle de Columnas** - Mostrar/ocultar columnas, persiste por usuario
- ✅ **Toggle de Filtros** - Mostrar/ocultar filtros, persiste por usuario
- ✅ **Exportación a Excel** - Exporta datos filtrados con un click
- ✅ **Selección de Filas** - Con checkbox y callback de selección
- ✅ **Tipado Completo** - TypeScript con inferencia de tipos
- ✅ **Cross-Filter Facets** - Facet counts excluden su propio filtro para cross-filtering preciso
- ✅ **URL Param Isolation** - Múltiples tablas en la misma página con params de URL independientes via `paramNamespace`
- ✅ **Multi-Sort** - Sort por múltiples columnas con Shift+Click, incluyendo columnas FK via `FK_SORT_MAP`
- ✅ **Sticky Header** - El encabezado de columnas permanece visible al hacer scroll vertical interno (max-h 60vh)

---

## Arquitectura

El patrón correcto tiene **tres capas**:

```
┌─────────────────────────────────────────────────────────────────┐
│  page.tsx (Server Component — delgado)                          │
│  - Recibe searchParams como prop                                │
│  - Renderiza el Server Component del módulo                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  XxxList.tsx (Server Component — módulo)                        │
│  - Llama a getXxxPaginated(searchParams) → datos + total        │
│  - Pasa data, total, searchParams y permissions al Client       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  _XxxDataTable.tsx (Client Component)                           │
│  - useQuery(getXxxFacets) → carga opciones de filtros           │
│  - useMemo → construye facetedFilters con externalCounts        │
│  - Renderiza <DataTable> con toda la configuración              │
└─────────────────────────────────────────────────────────────────┘
```

> **IMPORTANTE**: El `DataTable` nunca se renderiza directamente en un Server Component.
> Las opciones de filtros (facets) se cargan en el Client Component con `useQuery`.

### Flujo de datos

```
URL: ?page=2&status=APPROVED&hireDate_from=2024-01-01&phone=123

     ↓ parseSearchParams()

state = { page: 1, filters: { status: ['APPROVED'], phone: ['123'] }, ... }

     ↓ buildFiltersWhere() + buildTextFiltersWhere() + buildDateRangeFiltersWhere()

where = { status: 'APPROVED', phone: { contains: '123' }, hireDate: { gte: ... } }

     ↓ prisma.employee.findMany({ where, skip, take, orderBy })

data + total → Server Component → Client Component → DataTable
```

---

## Implementación completa

### 1. Server Action

```typescript
// modules/employees/features/list/actions.server.ts
'use server';

import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/company';
import { logger } from '@/shared/lib/logger';
import {
  parseSearchParams,
  stateToPrismaParams,
  buildSearchWhere,
  buildFiltersWhere,
  buildTextFiltersWhere,
  buildDateRangeFiltersWhere,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable';

export async function getEmployeesPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getActiveCompanyId();
  if (!companyId) throw new Error('No hay empresa activa');

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take, orderBy } = stateToPrismaParams(state);

    // 1. Búsqueda global (OR en múltiples campos de texto)
    const searchWhere = buildSearchWhere(state.search, ['firstName', 'lastName', 'documentNumber', 'cuil']);

    // 2. Filtros de valores discretos (enum, FK UUID)
    // Usar exclude para columnas que se manejan con buildTextFiltersWhere
    const filtersWhere = buildFiltersWhere(
      state.filters,
      {
        status: 'status',
        jobPosition: 'jobPositionId', // columnId → campo de Prisma
        contractType: 'contractTypeId',
        gender: 'gender',
      },
      { exclude: ['phone', 'email'] } // excluir columnas de texto libre
    );

    // 3. Filtros de texto libre (contains insensitive — un campo específico)
    const textFiltersWhere = buildTextFiltersWhere(state.filters, ['phone', 'email']);

    // 4. Filtros FK con IDs numéricos (Int — requieren conversión de string a number)
    const provinceIds = state.filters.province?.map(Number).filter((n) => !isNaN(n));
    if (provinceIds?.length) {
      filtersWhere.provinceId = provinceIds.length === 1 ? provinceIds[0] : { in: provinceIds };
    }

    // 5. Filtros de rango de fechas
    const dateRangeWhere = buildDateRangeFiltersWhere(state.filters, ['hireDate', 'birthDate']);

    const where = {
      companyId,
      isActive: true,
      ...searchWhere,
      ...filtersWhere,
      ...textFiltersWhere,
      ...dateRangeWhere,
    };

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          phone: true,
          email: true,
          hireDate: true,
          jobPosition: { select: { id: true, name: true } },
          province: { select: { id: true, name: true } },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener empleados', { data: { error } });
    throw new Error('Error al obtener empleados');
  }
}

// Facets: contadores agrupados por valor de cada columna filtrable
// Se cargan en el Client Component con useQuery (no bloquean el render inicial)
export async function getEmployeesFacets() {
  const companyId = await getActiveCompanyId();
  if (!companyId) return null;

  const [statusCounts, jobPositionCounts, provinceCounts] = await Promise.all([
    prisma.employee.groupBy({ by: ['status'], where: { companyId, isActive: true }, _count: true }),
    prisma.employee.groupBy({ by: ['jobPositionId'], where: { companyId, isActive: true }, _count: true }),
    prisma.employee.groupBy({ by: ['provinceId'], where: { companyId, isActive: true }, _count: true }),
  ]);

  // Para FK, resolver los nombres en una segunda ronda de queries
  const jpIds = jobPositionCounts.filter((r) => r.jobPositionId).map((r) => r.jobPositionId!);
  const provIds = provinceCounts.filter((r) => r.provinceId).map((r) => r.provinceId!);

  const [jobPositions, provinces] = await Promise.all([
    jpIds.length > 0
      ? prisma.jobPosition.findMany({ where: { id: { in: jpIds } }, select: { id: true, name: true } })
      : [],
    provIds.length > 0
      ? prisma.province.findMany({
          where: { id: { in: provIds } },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        })
      : [],
  ]);

  return {
    // Enums: Map<valorEnum, count>
    status: new Map(statusCounts.map((r) => [r.status as string, r._count])),

    // FK UUID: Map<id, count> + array de opciones con nombre
    jobPosition: new Map(jobPositionCounts.filter((r) => r.jobPositionId).map((r) => [r.jobPositionId!, r._count])),
    jobPositionOptions: jobPositions,

    // FK Int: Map<String(id), count> (claves siempre string para URL params)
    province: new Map(provinceCounts.filter((r) => r.provinceId).map((r) => [String(r.provinceId!), r._count])),
    provinceOptions: provinces,
  };
}

export type EmployeeListItem = Awaited<ReturnType<typeof getEmployeesPaginated>>['data'][number];
```

### 2. Definición de columnas

```typescript
// modules/employees/features/list/columns.tsx
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { Badge } from '@/shared/components/ui/badge';
import { employeeStatusBadges } from '@/shared/utils/mappers';
import type { EmployeeListItem } from './actions.server';

export const columns: ColumnDef<EmployeeListItem>[] = [
  // NOTA: NO agregar columna 'select' por defecto.
  // Solo agregarla si la tabla tiene funcionalidad de seleccion de filas
  // (ej: acciones masivas). Ver seccion "Seleccion de Filas" mas abajo.

  // Columna simple
  {
    accessorKey: 'employeeNumber',
    meta: { title: 'Legajo' },          // ← SIEMPRE requerido en columnas de datos
    header: ({ column }) => <DataTableColumnHeader column={column} title="Legajo" />,
    cell: ({ row }) => <span>{row.getValue('employeeNumber')}</span>,
  },

  // Columna con filterFn para enum
  {
    accessorKey: 'status',
    meta: { title: 'Estado' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const badge = employeeStatusBadges[row.getValue('status') as string];
      return <Badge variant={badge.variant}>{badge.label}</Badge>;
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },

  // Columna computada (accessorFn) con filterFn para FK UUID
  {
    id: 'jobPosition',
    accessorFn: (row) => row.jobPosition?.name || '',
    meta: { title: 'Puesto' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Puesto" />,
    cell: ({ row }) => <span>{row.original.jobPosition?.name || '—'}</span>,
    filterFn: (row, id, value) => value.includes(row.original.jobPosition?.id),
  },

  // Columna computada con filterFn para FK Int (comparar como String)
  {
    id: 'province',
    accessorFn: (row) => row.province?.name || '',
    meta: { title: 'Provincia' },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Provincia" />,
    cell: ({ row }) => <span>{row.original.province?.name || '—'}</span>,
    filterFn: (row, id, value) => value.includes(String(row.original.province?.id)),
  },

  // Columna de acciones — sin meta.title, usar meta.excludeFromExport
  {
    id: 'actions',
    meta: { excludeFromExport: true },
    cell: ({ row }) => <ActionsMenu row={row.original} />,
  },
];

// Columnas ocultas por defecto (el usuario puede activarlas desde el toggle)
export const HIDDEN_COLUMNS_BY_DEFAULT = ['birthDate', 'phone', 'email', 'province'];
```

### 3. Server Component (lista)

```typescript
// modules/employees/features/list/EmployeesList.tsx
import { getEmployeesPaginated } from './actions.server';
import { _EmployeesDataTable } from './components/_EmployeesDataTable';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable';

interface Props {
  searchParams: DataTableSearchParams;
}

export async function EmployeesList({ searchParams }: Props) {
  const { data, total } = await getEmployeesPaginated(searchParams);

  return (
    <_EmployeesDataTable
      data={data}
      totalRows={total}
      searchParams={searchParams}
    />
  );
}
```

### 4. Client Component (DataTable)

```typescript
// modules/employees/features/list/components/_EmployeesDataTable.tsx
'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmployeeStatus, Gender } from '@/generated/prisma/enums';
import { DataTable, type DataTableFacetedFilterConfig, type DataTableSearchParams } from '@/shared/components/common/DataTable';
import { employeeStatusLabels, genderLabels } from '@/shared/utils/mappers';
import { columns, HIDDEN_COLUMNS_BY_DEFAULT } from '../columns';
import { getEmployeesFacets, getAllEmployeesForExport, type EmployeeListItem } from '../actions.server';

interface Props {
  data: EmployeeListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
}

export function _EmployeesDataTable({ data, totalRows, searchParams }: Props) {
  // Facets se cargan en el cliente con useQuery — no bloquean el render inicial
  const { data: facets } = useQuery({
    queryKey: ['employees-facets'],
    queryFn: () => getEmployeesFacets(),
    staleTime: 5 * 60 * 1000,
  });

  const initialColumnVisibility = useMemo(
    () => Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false])),
    []
  );

  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(() => [
    // Filtro de enum — opciones estáticas del cliente
    {
      columnId: 'status',
      title: 'Estado',
      options: Object.values(EmployeeStatus).map((value) => ({
        value,
        label: employeeStatusLabels[value],
      })),
      externalCounts: facets?.status,   // Conteos del servidor (se muestran junto a la opción)
    },

    // Filtro de FK UUID — opciones dinámicas del servidor (solo las que tienen datos)
    {
      columnId: 'jobPosition',
      title: 'Puesto',
      options: facets?.jobPositionOptions?.map((p) => ({ value: p.id, label: p.name })) ?? [],
      externalCounts: facets?.jobPosition,
    },

    // Filtro de FK Int — value debe ser String (para URL params)
    {
      columnId: 'province',
      title: 'Provincia',
      options: facets?.provinceOptions?.map((p) => ({ value: String(p.id), label: p.name })) ?? [],
      externalCounts: facets?.province,
    },

    // Filtro de rango de fechas
    {
      columnId: 'hireDate',
      title: 'Fecha de Ingreso',
      type: 'dateRange',
    },

    // Filtro de texto libre (contains, no exact match)
    {
      columnId: 'phone',
      title: 'Teléfono',
      type: 'text',
      placeholder: 'Buscar por teléfono...',
    },
  ], [facets]);

  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      searchPlaceholder="Buscar por nombre, legajo, documento..."
      facetedFilters={facetedFilters}
      initialColumnVisibility={initialColumnVisibility}
      tableId="employees"
      showFilterToggle={true}
      enableRowSelection={true}
      showRowSelection={true}
      exportConfig={{
        fetchAllData: () => getAllEmployeesForExport(searchParams),
        options: { filename: 'empleados', title: 'Listado de Empleados', sheetName: 'Empleados' },
        formatters: {
          status: (val) => employeeStatusLabels[val as EmployeeStatus] || String(val),
        },
      }}
      emptyMessage="No hay empleados registrados"
    />
  );
}
```

### 5. Page (delgada)

```typescript
// app/(core)/dashboard/employees/page.tsx
import { EmployeesList } from '@/modules/employees';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable';

interface Props {
  searchParams: Promise<DataTableSearchParams>;
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  return <EmployeesList searchParams={params} />;
}
```

---

## Props del DataTable

| Prop                      | Tipo                             | Default                           | Descripción                                          |
| ------------------------- | -------------------------------- | --------------------------------- | ---------------------------------------------------- |
| `columns`                 | `ColumnDef<TData>[]`             | **required**                      | Definiciones de columnas de TanStack Table           |
| `data`                    | `TData[]`                        | **required**                      | Datos de la página actual                            |
| `totalRows`               | `number`                         | **required**                      | Total de filas en el servidor                        |
| `searchParams`            | `DataTableSearchParams`          | `{}`                              | Search params actuales de la URL                     |
| `facetedFilters`          | `DataTableFacetedFilterConfig[]` | `[]`                              | Configuración de filtros                             |
| `searchPlaceholder`       | `string`                         | `'Buscar...'`                     | Placeholder del input de búsqueda global             |
| `showColumnToggle`        | `boolean`                        | `true`                            | Mostrar selector de columnas                         |
| `showRowSelection`        | `boolean`                        | `false`                           | Mostrar contador de selección                        |
| `enableRowSelection`      | `boolean`                        | `false`                           | Habilitar checkboxes de selección                    |
| `onRowSelectionChange`    | `(rows: TData[]) => void`        | `undefined`                       | Callback de selección                                |
| `emptyMessage`            | `string`                         | `'No se encontraron resultados.'` | Mensaje cuando no hay datos                          |
| `pageSizeOptions`         | `number[]`                       | `[10, 20, 30, 50, 100]`           | Opciones de filas por página                         |
| `toolbarActions`          | `ReactNode`                      | `undefined`                       | Acciones adicionales en el toolbar                   |
| `exportConfig`            | `DataTableExportConfig<TData>`   | `undefined`                       | Configuración de exportación Excel                   |
| `initialColumnVisibility` | `Record<string, boolean>`        | `{}`                              | Columnas ocultas por defecto                         |
| `tableId`                 | `string`                         | `undefined`                       | ID para persistir preferencias de columnas y filtros |
| `showFilterToggle`        | `boolean`                        | `false`                           | Mostrar botón para ocultar/mostrar filtros           |
| `initialFilterVisibility` | `Record<string, boolean>`        | `{}`                              | Visibilidad inicial de filtros (desde BD)            |
| `paramNamespace`          | `string`                         | `undefined`                       | Namespace para aislar params de URL entre DataTables en la misma página |
| `data-testid`             | `string`                         | `'data-table'`                    | ID para testing con Cypress                          |

---

## Definición de Columnas

### `meta.title` — Requerido en columnas de datos

Todas las columnas de datos deben incluir `meta: { title: 'Título' }` para que:

- El dropdown "Mostrar columnas" muestre nombres legibles
- El exportador Excel use el nombre correcto como header

```typescript
// ✅ Correcto
{ accessorKey: 'employeeNumber', meta: { title: 'Legajo' }, ... }

// ❌ Incorrecto — el dropdown mostraría "employeeNumber"
{ accessorKey: 'employeeNumber', ... }
```

### `meta.excludeFromExport` — Para columnas UI

```typescript
{ id: 'select', meta: { excludeFromExport: true }, ... }
{ id: 'actions', meta: { excludeFromExport: true }, ... }
```

### `filterFn` — Necesario para filtros faceteados

Las columnas que usan `facetedFilters` **deben** declarar `filterFn` para que el filtrado client-side funcione correctamente:

```typescript
// Enum NOT NULL — comparar el valor directo
filterFn: (row, id, value) => value.includes(row.getValue(id)),

// Enum NULLABLE — manejar null con NULL_FILTER_VALUE
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
filterFn: (row, id, value: string[]) => {
  const val = row.getValue(id);
  if (val == null) return value.includes(NULL_FILTER_VALUE);
  return value.includes(val as string);
},

// FK UUID — comparar por ID de la relación
filterFn: (row, id, value) => value.includes(row.original.jobPosition?.id),

// FK Int — convertir ID a String para comparar con URL params
filterFn: (row, id, value) => value.includes(String(row.original.province?.id)),

// FK UUID nullable — manejar null con NULL_FILTER_VALUE
filterFn: (row, _id, value: string[]) => {
  const id = row.original.relation?.id;
  if (id == null) return value.includes(NULL_FILTER_VALUE);
  return value.includes(id);
},
```

> Las columnas con filtro `dateRange` o `text` NO necesitan `filterFn` (se manejan por URL).

### Sorting — TODAS las columnas ordenables

TODAS las columnas deben ser ordenables excepto `select`, `actions`, y M:M. **NO poner `enableSorting: false`** en columnas FK ni directas.

Para columnas FK, el servidor necesita un `FK_SORT_MAP` que traduzca el columnId a un `orderBy` de Prisma con relación:

```typescript
// En actions.server.ts
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  type: (dir) => ({ type: { name: dir } }),
  brand: (dir) => ({ brand_vehicles: { name: dir } }),
};
```

### NULL handling — "Sin asignar" (TODA columna nullable)

Para **TODA columna nullable** (FK, enum, booleano), usar `NULL_FILTER_VALUE` (`'__null__'`) de `helpers.ts`. No aplica solo a FK — aplica a cualquier campo que pueda ser null en la BD.

1. En `filterFn`: Si el valor es null, comparar contra `NULL_FILTER_VALUE`
2. En facets: Incluir conteo de null en el Map con key `NULL_FILTER_VALUE` (usar `toFacetMap()`)
3. En opciones del filtro: Agregar `{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }` condicionalmente:
   ```typescript
   ...(facets?.field?.has(NULL_FILTER_VALUE) ? [{ value: NULL_FILTER_VALUE, label: 'Sin asignar', icon: CircleOff }] : []),
   ```
4. Server-side: `buildFiltersWhere` ya maneja `NULL_FILTER_VALUE` para cualquier tipo de columna

### Cuándo usar `meta.title`

| Tipo de Columna                  | `meta.title` | Notas                                    |
| -------------------------------- | :----------: | ---------------------------------------- |
| Columna de datos                 |      ✅      | Aparece en toggle de columnas            |
| Columna `accessorFn` (computada) |      ✅      | Requiere `id` explícito también          |
| Columna de acciones              |      ❌      | Usar `meta: { excludeFromExport: true }` |
| Columna de selección             |      ❌      | Usar `enableHiding: false`               |

---

## Filtros

### Tipos de filtro

| Tipo                | UI                          | Cuándo usar                             |
| ------------------- | --------------------------- | --------------------------------------- |
| `faceted` (default) | Dropdown multi-select       | Enums, FK con valores discretos         |
| `dateRange`         | Popover con dos calendarios | Campos de fecha                         |
| `text`              | Popover con input de texto  | Campos de texto libre (teléfono, email) |

### Tipo `faceted` — Multi-select con conteos

Para enums (opciones estáticas) y FK (opciones dinámicas del servidor):

```typescript
// Enum — opciones conocidas en el cliente
{
  columnId: 'status',
  title: 'Estado',
  options: Object.values(EmployeeStatus).map((value) => ({
    value,
    label: employeeStatusLabels[value],
    icon: statusIcons[value],   // opcional
  })),
  externalCounts: facets?.status,  // Map<string, number> del servidor
},

// FK UUID — opciones solo de los valores presentes en la BD
{
  columnId: 'jobPosition',
  title: 'Puesto',
  options: facets?.jobPositionOptions?.map((p) => ({ value: p.id, label: p.name })) ?? [],
  externalCounts: facets?.jobPosition,   // Map<id, count>
},

// FK Int — value debe ser String (los URL params son siempre strings)
{
  columnId: 'province',
  title: 'Provincia',
  options: facets?.provinceOptions?.map((p) => ({ value: String(p.id), label: p.name })) ?? [],
  externalCounts: facets?.province,   // Map<String(id), count>
},
```

### Tipo `dateRange` — Rango de fechas

```typescript
{
  columnId: 'hireDate',
  title: 'Fecha de Ingreso',
  type: 'dateRange',
},
```

URL params generados: `?hireDate_from=2024-01-01&hireDate_to=2024-12-31`

### Tipo `text` — Texto libre

```typescript
{
  columnId: 'phone',
  title: 'Teléfono',
  type: 'text',
  placeholder: 'Buscar por teléfono...',   // opcional
},
```

URL param generado: `?phone=1130`
Comportamiento server-side: `{ phone: { contains: '1130', mode: 'insensitive' } }`

### `externalCounts` — Conteos del servidor

`externalCounts` es un `Map<string, number>` que se muestra junto a cada opción en el filtro. Se obtiene con `groupBy` de Prisma en la función `getXxxFacets()`.

Sin `externalCounts`, el filtro muestra los conteos calculados localmente sobre los datos de la página actual (impreciso con paginación). Con `externalCounts`, muestra el total real en la base de datos.

---

## Helpers de Prisma

### `parseSearchParams(searchParams)`

Convierte los search params de URL a un objeto estructurado.

```typescript
const state = parseSearchParams({ page: '2', status: 'APPROVED,PENDING', search: 'juan' });
// { page: 1, pageSize: 10, filters: { status: ['APPROVED', 'PENDING'] }, search: 'juan', ... }
```

### `stateToPrismaParams(state)`

Genera `skip`, `take` y `orderBy` para Prisma.

```typescript
const { skip, take, orderBy } = stateToPrismaParams(state);
```

### `buildSearchWhere(search, fields)`

Genera cláusula `OR` para búsqueda global en múltiples campos de texto.

```typescript
buildSearchWhere('juan', ['firstName', 'lastName', 'cuil']);
// { OR: [{ firstName: { contains: 'juan', mode: 'insensitive' } }, ...] }
```

### `buildFiltersWhere(filters, columnMap?, options?)`

Genera cláusula `where` para filtros de valores discretos (enums, FK).

```typescript
buildFiltersWhere(
  state.filters,
  {
    status: 'status', // columnId → campo de Prisma (mismo nombre → se puede omitir)
    jobPosition: 'jobPositionId', // columnId distinto al campo de Prisma → mapear
    contractType: 'contractTypeId',
  },
  { exclude: ['phone', 'email'] } // columnas de texto que maneja buildTextFiltersWhere
);
// { status: 'APPROVED', jobPositionId: { in: ['uuid-1', 'uuid-2'] } }
```

> **`options.exclude`**: Lista de `columnId`s a ignorar. Usar cuando esas columnas se procesan con `buildTextFiltersWhere`. Sin `exclude`, `buildFiltersWhere` las procesaría como match exacto.

> **FK con IDs Int**: Los IDs numéricos llegan como strings desde URL params. Convertir manualmente:
>
> ```typescript
> const provinceIds = state.filters.province?.map(Number).filter((n) => !isNaN(n));
> if (provinceIds?.length) {
>   filtersWhere.provinceId = provinceIds.length === 1 ? provinceIds[0] : { in: provinceIds };
> }
> ```

### `buildTextFiltersWhere(filters, textColumns, columnMap?)`

Genera cláusula `where` con `contains` para columnas de texto libre. Usar con filtros de tipo `text`.

```typescript
buildTextFiltersWhere(state.filters, ['phone', 'email']);
// { phone: { contains: '1130', mode: 'insensitive' }, email: { contains: 'gmail', mode: 'insensitive' } }
```

### `buildDateRangeFiltersWhere(filters, dateColumns, columnMap?)`

Genera cláusula `where` con `gte` / `lte` para columnas de fecha. Usar con filtros de tipo `dateRange`.

```typescript
buildDateRangeFiltersWhere(state.filters, ['hireDate', 'birthDate', 'terminationDate']);
// { hireDate: { gte: Date('2024-01-01T00:00:00Z'), lte: Date('2024-12-31T23:59:59Z') } }
```

---

## Exportación a Excel

Configura `exportConfig` para habilitar el botón "Exportar" en el toolbar. La exportación respeta los filtros activos.

```typescript
exportConfig={{
  // Función que trae TODOS los datos (sin paginación) con los filtros actuales
  fetchAllData: () => getAllEmployeesForExport(searchParams),
  options: {
    filename: 'empleados',            // Nombre del archivo .xlsx
    title: 'Listado de Empleados',    // Título en la primera fila del Excel
    sheetName: 'Empleados',           // Nombre de la hoja
  },
  // Formatters para convertir valores antes de escribir en Excel
  formatters: {
    status: (val) => employeeStatusLabels[val as EmployeeStatus] || String(val),
    gender: (val) => genderLabels[val as Gender] || String(val),
  },
}}
```

> Las columnas con `meta: { excludeFromExport: true }` (select, actions) se omiten automáticamente.
> Las columnas con `accessorFn` necesitan `id` explícito para que el exportador las incluya.

---

## Columnas ocultas por defecto

Para tablas con muchas columnas, algunas pueden estar ocultas por defecto y el usuario las activa desde el toggle:

```typescript
// columns.tsx
export const HIDDEN_COLUMNS_BY_DEFAULT = [
  'birthDate', 'phone', 'email', 'maritalStatus', 'province', 'city',
];

// _XxxDataTable.tsx
const initialColumnVisibility = useMemo(
  () => Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false])),
  []
);

<DataTable
  initialColumnVisibility={initialColumnVisibility}
  ...
/>
```

---

## Filtros visibles por defecto (máximo 3)

Todas las tablas deben crear TODOS los filtros necesarios, pero **solo mostrar 3 por defecto**. El usuario activa los demás con el toggle de filtros (`showFilterToggle`). Si ya hay preferencias guardadas en BD, se usan en su lugar.

```typescript
// _XxxDataTable.tsx — elegir los 3 filtros más comunes para la entidad
const DEFAULT_VISIBLE_FILTERS = ['status', 'type', 'condition'];

const mergedFilterVisibility = useMemo(() => {
  // Preferencias guardadas del usuario tienen prioridad
  if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
    return initialFilterVisibility;
  }
  // Sin preferencias → solo los 3 default visibles
  const allFilterIds = facetedFilters.map((f) => f.columnId);
  return Object.fromEntries(
    allFilterIds.map((id) => [id, DEFAULT_VISIBLE_FILTERS.includes(id)])
  );
}, [initialFilterVisibility, facetedFilters]);

<DataTable
  initialFilterVisibility={mergedFilterVisibility}   // ← NO pasar initialFilterVisibility directo
  showFilterToggle={true}                             // ← SIEMPRE habilitar
  ...
/>
```

> **Cómo elegir los 3**: Seleccionar las columnas que el usuario más probablemente use para filtrar rápido — típicamente: estado/condición principal, categoría/tipo, y uno más específico del dominio (activo/inactivo, propietario, etc.).

---

## Card wrapper obligatorio

El `DataTable` **debe estar envuelto en `<Card><CardContent className="pt-6">`** para dar fondo y contención visual. Sin esto, la tabla queda con fondo transparente.

```typescript
// Server Component (XxxList.tsx)
import { Card, CardContent } from '@/components/ui/card';

return (
  <Card>
    <CardContent className="pt-6">
      <_XxxDataTable ... />
    </CardContent>
  </Card>
);
```

---

## Persistencia de preferencias

Con `tableId`, el DataTable persiste automáticamente en base de datos:

- Qué columnas están visibles/ocultas (por usuario)
- Qué filtros están visibles/ocultos (por usuario)

```typescript
<DataTable
  tableId="employees"          // ID único de la tabla
  showFilterToggle={true}      // Habilita el botón de toggle de filtros
  ...
/>
```

La persistencia usa `UserPreference.tablePreferences` (JSON) en la base de datos, gestionado por `src/shared/actions/table-preferences.ts`.

---

## Seleccion de Filas (OPCIONAL)

**NO agregar por defecto.** Solo usar cuando la tabla tenga funcionalidad real de seleccion
(acciones masivas como eliminar seleccionados, exportar seleccion, etc.).

```typescript
// 1. Agregar columna select en columns.tsx (SOLO si se necesita)
{
  id: 'select',
  meta: { excludeFromExport: true },
  header: ({ table }) => (
    <Checkbox
      checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
      onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      checked={row.getIsSelected()}
      onCheckedChange={(value) => row.toggleSelected(!!value)}
    />
  ),
  enableSorting: false,
  enableHiding: false,
},

// 2. Habilitar en DataTable
<DataTable
  enableRowSelection={true}
  showRowSelection={true}   // Muestra "N seleccionados" junto al total en la paginacion
  onRowSelectionChange={(selectedRows) => setSelected(selectedRows)}
  ...
/>
```

---

## Estado en URL

Todos los filtros y el estado del DataTable se sincronizan con la URL:

| Parámetro         | Tipo                          | Ejemplo                      |
| ----------------- | ----------------------------- | ---------------------------- |
| `page`            | Pagina actual (1-indexed)     | `?page=2`                    |
| `pageSize`        | Filas por pagina              | `?pageSize=20`               |
| `sort`            | Multi-sort compacto           | `?sort=name.asc,status.desc` |
| `search`          | Búsqueda global               | `?search=juan`               |
| `{columnId}`      | Filtro facetado (multi-valor) | `?status=APPROVED,COMPLETE`  |
| `{columnId}_from` | Inicio de rango de fecha      | `?hireDate_from=2024-01-01`  |
| `{columnId}_to`   | Fin de rango de fecha         | `?hireDate_to=2024-12-31`    |
| `{columnId}`      | Filtro de texto libre         | `?phone=1130`                |

Ejemplo de URL compleja:

```
/dashboard/employees?page=1&sortBy=lastName&status=APPROVED&jobPosition=uuid-1,uuid-2&hireDate_from=2024-01-01&phone=11
```

---

## URL Param Isolation (paramNamespace)

Cuando múltiples DataTables comparten la misma página (tabs, subtabs), sus filtros se escriben en la misma URL. Sin aislamiento, los filtros de una tabla afectan a las demás.

### Problema

```
Tab: Vehículos → filtrar por type=uuid-123
URL: /dashboard/equipment?type=uuid-123

Cambiar a Tab: Otros Equipos
URL: /dashboard/equipment?type=uuid-123&subtab=others
→ La tabla de "Otros Equipos" intenta filtrar por type=uuid-123 → 0 resultados
```

### Solución: `paramNamespace`

Cada tabla prefija sus params con `{tableId}__`:

```
Tab: Vehículos → filtrar por type
URL: /dashboard/equipment?vehicles__type=uuid-123

Cambiar a Tab: Otros Equipos → filtrar por status
URL: /dashboard/equipment?vehicles__type=uuid-123&others__status=ACTIVE&subtab=others
→ Cada tabla solo lee SUS params
```

### Implementación (3 pasos)

#### 1. Server Component: Strip prefix

```typescript
import { stripPrefixFromSearchParams, type DataTableSearchParams } from '@/shared/components/common/DataTable';

const tableId = 'vehicles';
const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, tableId);

const [{ data, total }, preferences] = await Promise.all([
  getVehiclesPaginated(tableParams),   // ← params limpios
  getTablePreferences(tableId),
]);

<_VehicleDataTable searchParams={tableParams} tableId={tableId} ... />
```

#### 2. Client Component: Pass paramNamespace

```typescript
<DataTable
  paramNamespace={tableId}  // ← aísla params en URL
  tableId={tableId}          // ← persistencia de preferencias
  searchParams={searchParams}
  ...
/>
```

#### 3. DataTable internals

El hook `useDataTable` automáticamente:
- **Lee** solo params con el prefijo `{tableId}__`
- **Escribe** params con el prefijo, preservando los de otras tablas
- **Limpia** solo sus propios params al resetear filtros

### Cuándo usar

| Situación | paramNamespace |
|-----------|---------------|
| Cualquier DataTable | **SIEMPRE OBLIGATORIO** — previene bugs futuros si la página crece |

---

## Cross-Filter Facets

Las facetas con cross-filtering muestran counts que reflejan los filtros activos de OTRAS columnas, pero excluyen el filtro de la PROPIA columna. Esto permite ver cuántos resultados tendría cada opción si se cambiara solo ese filtro.

### Sin cross-filter (incorrecto)

```
Filtro activo: brand=Toyota
→ Faceta de brand muestra: Toyota (5) — solo Toyota, porque el filtro ya restringe
→ El usuario no sabe cuántos registros tienen otras marcas
```

### Con cross-filter (correcto)

```
Filtro activo: brand=Toyota
→ Faceta de brand muestra: Toyota (5), Ford (3), Chevrolet (2)
→ Los counts son correctos considerando OTROS filtros activos, pero no el de brand
```

### Implementación

#### Server Action: `getEntityFacets(searchParams)`

```typescript
export async function getEntityFacets(searchParams?: DataTableSearchParams) {
  const companyId = await getServerCompanyId();
  const baseWhere = { company_id: companyId, is_active: true };

  // Parse active filters
  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) delete parsedState.filters[key];
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  // WHERE con todos los filtros EXCEPTO el de la columna indicada
  function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) return baseWhere;
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildWhereClause(companyId, modified);  // ← reutiliza helper DRY
  }

  const [statusCounts, typeCounts] = await Promise.all([
    prisma.entity.groupBy({ by: ['status'], where: crossWhere('status'), _count: true }),
    prisma.entity.groupBy({ by: ['type'], where: crossWhere('type'), _count: true }),
  ]);

  // toFacetMap: convierte groupBy results a Map<string, number> con null support
  function toFacetMap(rows: { key: string | bigint | null | undefined; count: number }[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const { key, count } of rows) {
      map.set(key == null ? NULL_FILTER_VALUE : String(key), count);
    }
    return map;
  }

  return {
    status: toFacetMap(statusCounts.map((r) => ({ key: r.status, count: r._count }))),
    type: toFacetMap(typeCounts.map((r) => ({ key: r.type, count: r._count }))),
    typeOptions: types,  // resueltos en Round 2
  };
}
```

#### Client Component: Pass filter params to facets

```typescript
// Extraer solo params de filtros (sin page/sort)
const facetParams = useMemo(() => {
  const { page, pageSize, sort, sortBy, sortOrder, ...rest } = searchParams;
  return rest;
}, [searchParams]);

// Facets se recalculan cuando cambian los filtros
const { data: facets } = useQuery({
  queryKey: ['entity-facets', facetParams],
  queryFn: () => getEntityFacets(facetParams),
  staleTime: 5 * 60 * 1000,
});
```

> **IMPORTANTE**: `toFacetMap()` retorna `Map<string, number>` que es el tipo esperado por `externalCounts`. NO usar `Record<string, number>` — requeriría conversión innecesaria en el cliente.

---

## buildWhereClause — Helper DRY

La lógica de WHERE debe extraerse en una función interna, compartida entre las 3 funciones del server action:

```typescript
// actions.server.ts — helper interno (NO exportado)
function buildWhereClause(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, ['domain', 'chassis', 'intern_number']);

  const MANUALLY_HANDLED = ['brand', 'model', 'contractor_equipment'];
  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [...TEXT_FILTER_COLUMNS, ...MANUALLY_HANDLED, ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`])],
  });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS);
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // BigInt FK, M:M handling...

  return {
    company_id: companyId,
    is_active: true,
    ...searchWhere, ...filtersWhere, ...textFiltersWhere, ...dateFiltersWhere,
    ...bigintFilters, ...m2mFilters,
    ...(extraAndConditions.length > 0 ? { AND: extraAndConditions } : {}),
  };
}

// Uso en las 3 funciones:
// getEntityPaginated → const where = buildWhereClause(companyId, state);
// getAllEntityForExport → const where = buildWhereClause(companyId, state);
// getEntityFacets → crossWhere uses buildWhereClause internally
```

Beneficios:
- **DRY**: Un solo lugar para la lógica de filtros
- **Consistencia**: Export y facets siempre aplican los mismos filtros que la query paginada
- **Cross-filter**: `crossWhere()` puede reutilizar `buildWhereClause()` con filtros modificados

---

## Multi-Sort con resolución FK

El DataTable soporta multi-sort (Shift+Click en headers). El servidor debe manejar múltiples columnas de ordenamiento, incluyendo columnas FK que necesitan `{ relation: { field: dir } }`:

```typescript
// actions.server.ts
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  type: (dir) => ({ type_relation: { name: dir } }),
  brand: (dir) => ({ brand_relation: { name: dir } }),
  owner: (dir) => ({ owner_relation: { name: dir } }),
};

// En la query paginada — iterar state.sorting (array)
const resolvedSorts: Record<string, unknown>[] = [];
for (const s of state.sorting) {
  if (VALID_SORT_FIELDS.has(s.id)) {
    const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
    const fkMapper = FK_SORT_MAP[s.id];
    resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
  }
}
const safeOrderBy = [...resolvedSorts, { name: 'asc' as const }]; // fallback sort
```

> **REGLA**: `VALID_SORT_FIELDS` debe incluir tanto campos directos como IDs de columnas FK. Cada FK en `VALID_SORT_FIELDS` debe tener su entrada en `FK_SORT_MAP`.

---

## Troubleshooting

### El filtro facetado no filtra en servidor

Verificar que `columnId` esté en el `columnMap` de `buildFiltersWhere` o que el `columnId` coincida exactamente con el campo de Prisma.

### El filtro de FK con ID Int no funciona

Los IDs Int necesitan conversión manual antes de pasarlos a Prisma:

```typescript
const ids = state.filters.province?.map(Number).filter((n) => !isNaN(n));
if (ids?.length) filtersWhere.provinceId = ids.length === 1 ? ids[0] : { in: ids };
```

### El filtro de texto hace match exacto en vez de contains

Agregar la columna a `buildTextFiltersWhere` y excluirla de `buildFiltersWhere` con `{ exclude: ['phone'] }`.

### Las opciones del filtro FK aparecen vacías al cargar

Es normal — `facets` empieza como `undefined` mientras carga `useQuery`. Usar `?? []` como fallback en las opciones.

### La columna no aparece en "Mostrar columnas"

Agregar `meta: { title: 'Nombre' }` a la definición de la columna.

### El exportador Excel omite una columna con `accessorFn`

Las columnas con `accessorFn` necesitan `id` explícito:

```typescript
{ id: 'fullName', accessorFn: (row) => `${row.lastName}, ${row.firstName}`, meta: { title: 'Nombre' }, ... }
```

### Los filtros de una tabla afectan a otra en la misma página

Configurar `paramNamespace={tableId}` en el DataTable y usar `stripPrefixFromSearchParams(searchParams, tableId)` en el Server Component.

### Los counts de facetas no cambian al aplicar filtros

La función de facetas debe recibir `searchParams` y usar `crossWhere(excludeColumn)` en cada `groupBy`. Si usa un `baseWhere` fijo, los counts serán siempre los mismos.

### El sort no funciona en columnas FK

Verificar que el columnId de la FK está en `VALID_SORT_FIELDS` Y tiene una entrada en `FK_SORT_MAP` que mapea a `{ relation: { field: dir } }`.

### Performance lenta en filtros

- Agregar índices en Prisma para campos de búsqueda/filtro frecuentes
- Usar `select` para traer solo los campos necesarios
- El `staleTime: 5 * 60 * 1000` en el `useQuery` de facets evita refetches innecesarios

---

## Componentes disponibles

| Componente                 | Descripción                       |
| -------------------------- | --------------------------------- |
| `DataTable`                | Componente principal              |
| `DataTableColumnHeader`    | Header de columna con sorting     |
| `DataTableFacetedFilter`   | Filtro multi-select con conteos   |
| `DataTableDateRangeFilter` | Filtro de rango de fechas         |
| `DataTableTextFilter`      | Filtro de texto libre por columna |
| `DataTableFilterOptions`   | Toggle de visibilidad de filtros  |
| `DataTablePagination`      | Controles de paginación           |
| `DataTableToolbar`         | Barra de herramientas             |
| `DataTableViewOptions`     | Toggle de columnas                |

## Helpers disponibles

| Helper                       | Descripción                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| `parseSearchParams`          | URL params → `DataTableState`                               |
| `stateToPrismaParams`        | `DataTableState` → `{ skip, take, orderBy }`                |
| `buildSearchWhere`           | Búsqueda global en múltiples campos (OR + contains)         |
| `buildFiltersWhere`          | Filtros de valores discretos (enum, FK) → match exacto o IN |
| `buildTextFiltersWhere`      | Filtros de texto libre → contains insensitive               |
| `buildDateRangeFiltersWhere` | Filtros de fecha → gte / lte                                |
| `stateToSearchParams`        | `DataTableState` → `URLSearchParams`                        |
| `stripPrefixFromSearchParams` | Extrae params de una tabla específica (quita el prefijo `tableId__`) |
| `PARAM_SEPARATOR`             | Constante `'__'` usada como separador de namespace en URL params     |

---

## Auto-auditoría Post-Implementación

**Todo agente que cree o modifique una tabla DEBE ejecutar una auto-auditoría completa al terminar**, verificando el checklist obligatorio de `.claude/rules/datatable.md` antes de reportar el trabajo como completo.

### Checklist de filtros (el punto más frecuentemente incompleto)

| Tipo de columna | Filtro requerido | Notas |
|---|---|---|
| FK UUID/Int nullable | `faceted` + `NULL_FILTER_VALUE` + `filterFn` + `CircleOff` icon | `crossWhere` en facets |
| FK UUID/Int NOT NULL | `faceted` + `filterFn` | `crossWhere` en facets |
| Enum nullable | `faceted` + `NULL_FILTER_VALUE` + `filterFn` | `crossWhere` en facets |
| Enum NOT NULL | `faceted` + `filterFn` | `crossWhere` en facets |
| Texto | `text` | `buildTextFiltersWhere` en action |
| Fecha | `dateRange` | `buildDateRangeFiltersWhere` en action |
| JSONB / virtual / calculada | SIN filtro | No filtrable server-side |
| Acciones / select | SIN filtro | — |

### Reglas de íconos en filtros facetados

- Si el filtro tiene categorías semánticamente claras (estados, tipos): TODAS las opciones deben tener ícono.
- Opciones con `NULL_FILTER_VALUE` ("Sin asignar", "Sin equipo", etc.): siempre `icon: CircleOff`.
- Los íconos del filtro DEBEN coincidir con los íconos del badge en la celda de la columna.

### `enableSorting` en columnas FK

- Columnas FK con `accessorFn` que NO tienen entrada en `FK_SORT_MAP` en el server action → agregar `enableSorting: false`.
- Sin esto, el DataTable muestra la opción de ordenar pero la ignorará silenciosamente.
