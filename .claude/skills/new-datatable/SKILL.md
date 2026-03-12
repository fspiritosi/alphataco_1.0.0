---
name: new-datatable
description: Crear una nueva DataTable con columnas configuradas. Usar cuando el usuario quiera crear una tabla de datos, lista con columnas, o grid para mostrar registros.
---

# Skill: Crear Nueva DataTable

Esta skill guia el proceso de crear una DataTable server-side siguiendo los estandares del proyecto.

> **Documentacion completa**: `src/shared/components/common/DataTable/DOCS.md` > **Regla de filtros**: `.claude/rules/datatable-filters.md` > **Agente especializado**: `.claude/agents/table-expert.md`

---

## CRITICAL: Legacy Tables → Recreate From Scratch

**If the existing table uses the OLD system, it MUST be completely recreated.** Do NOT patch or fix old implementations.

**How to detect OLD system:**

- Imports from `@/shared/components/data-table/base/` or `data-table-server`
- Uses `queryWithPagination`, `fetchData` from `probando.ts`, or `supabaseServer()` directly
- Uses `BaseDataTable` component with `toolbarOptions` prop
- Has dot-notation `accessorKey` like `'provinces.name'` (Supabase relation pattern)
- Uses `filterableColumns` / `searchableColumns` config pattern

**NEW system (the ONLY valid one):**

- Imports from `@/shared/components/common/DataTable/`
- Uses Prisma (`prisma.entity.findMany`) in `actions.server.ts`
- Uses `DataTable` component with `facetedFilters` + `exportConfig` props
- Uses `accessorFn` for FK columns (NOT dot-notation `accessorKey`)
- Follows 3-layer architecture: page → List (Server) → \_DataTable (Client)

**When recreating:** Create ALL new files, do NOT reuse old ones. Then update the page import.

---

## Arquitectura (3 capas)

```
page.tsx (thin)
  └── {Entity}List.tsx  (Server Component — fetch + permisos + preferencias)
        └── _{Entity}DataTable.tsx  (Client Component — interactividad)
              └── <DataTable />  (componente compartido)
```

- El **Server Component** ejecuta la query paginada, carga permisos y preferencias de tabla, y pasa todo al Client.
- El **Client Component** llama a `useQuery` SOLO para cargar las **facetas** (counts + opciones de filtros FK), NO para el dato principal.
- Los **permisos** se cargan en el servidor y se pasan como prop — nunca se re-fetchean en el cliente para la tabla.

---

## Paso 1: Server Action (`actions.server.ts`)

```typescript
// modules/{module}/features/list/actions.server.ts
'use server';

import { prisma } from '@/shared/lib/prisma';
import { logger } from '@/lib/logger';
import { getActiveCompanyId } from '@/shared/lib/company';
import { assertCompanyId } from '@/shared/lib/errors';
import {
  parseSearchParams,
  stateToPrismaParams,
  buildSearchWhere,
  buildFiltersWhere,
  buildTextFiltersWhere,
  buildDateRangeFiltersWhere,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';

// ── Campos validos para ordenamiento ────────────────────────────────────
// Solo campos REALES de la BD. Columnas virtuales (accessorFn) NO van aqui.
const VALID_SORT_FIELDS = new Set([
  'name',
  'code',
  'status',
  'createdAt',
  // Agregar todos los campos reales de BD que sean ordenables
]);

// ── Query principal paginada ───────────────────────────────────────────

export async function get{Entity}sPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getActiveCompanyId();
  assertCompanyId(companyId);

  const state = parseSearchParams(searchParams);
  const { skip, take, orderBy } = stateToPrismaParams(state);

  // Busqueda de texto libre sobre campos clave
  const searchWhere = buildSearchWhere(state.search, ['name', 'code']);

  // Filtros faceteados (columnas simples — enum o FK string)
  const filtersWhere = buildFiltersWhere(
    state.filters,
    {
      status: 'status',          // columnId === campo Prisma
      category: 'categoryId',    // columnId 'category' → campo Prisma 'categoryId'
    },
    { exclude: ['name', 'code', 'phone', 'email'] } // Excluir TODOS los campos con filtro text
  );

  // Filtros de texto libre (contains insensitive)
  // REGLA: TODA columna de texto necesita su filtro text individual,
  // incluso si tambien esta en buildSearchWhere (busqueda global).
  const textFiltersWhere = buildTextFiltersWhere(state.filters, ['name', 'code', 'phone', 'email']);

  // Filtros de rango de fecha
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, ['createdAt', 'hireDate']);

  // Para FK con IDs Int (nationality, province, city) — conversion manual
  const nationalityIds = state.filters.nationality?.map(Number).filter((n) => !isNaN(n));
  if (nationalityIds?.length) {
    filtersWhere.nationalityId = nationalityIds.length === 1 ? nationalityIds[0] : { in: nationalityIds };
  }

  // Filtro booleano isActive (viene como string 'true'/'false' desde URL)
  if (state.filters.isActive?.length) {
    filtersWhere.isActive = state.filters.isActive[0] === 'true';
  }

  const where = {
    companyId,
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
  };

  // Validar campo de ordenamiento — columnas virtuales (accessorFn) no existen en BD
  // Si la entidad tiene isActive, SIEMPRE ponerlo primero para que inactivos queden al final
  const userOrderBy =
    orderBy && state.sortBy && VALID_SORT_FIELDS.has(state.sortBy)
      ? (Array.isArray(orderBy) ? orderBy : [orderBy])
      : [{ name: 'asc' as const }];

  // Inactivos SIEMPRE al final, independientemente del ordenamiento del usuario
  const safeOrderBy = [
    { isActive: 'desc' as const },  // true (activos) antes que false (inactivos)
    ...userOrderBy,
  ];
  // NOTA: Si la entidad NO tiene campo isActive, quitar la linea de isActive del orderBy

  try {
    const [data, total] = await Promise.all([
      prisma.{entity}.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
          isActive: true,
          phone: true,
          email: true,
          createdAt: true,
          hireDate: true,
          // Relaciones FK — solo id + name
          category: { select: { id: true, name: true } },
          nationality: { select: { id: true, name: true } },
          // Agregar TODOS los campos que se muestran en las columnas
        },
      }),
      prisma.{entity}.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener {entity}s', { data: { error } });
    throw new Error('No se pudo obtener la lista. Intente nuevamente.');
  }
}

// ── Export completo (sin paginacion) ──────────────────────────────────
// IMPORTANTE: Debe duplicar TODA la logica de filtros de la query principal

export async function getAll{Entity}sForExport(searchParams: DataTableSearchParams) {
  const companyId = await getActiveCompanyId();
  assertCompanyId(companyId);

  try {
    const state = parseSearchParams(searchParams);

    const searchWhere = buildSearchWhere(state.search, ['name', 'code']);
    const filtersWhere = buildFiltersWhere(
      state.filters,
      { status: 'status', category: 'categoryId' },
      { exclude: ['name', 'code', 'phone', 'email'] }
    );
    const textFiltersWhere = buildTextFiltersWhere(state.filters, ['name', 'code', 'phone', 'email']);
    const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, ['createdAt', 'hireDate']);

    // FK Int — misma logica que la query principal
    const nationalityIds = state.filters.nationality?.map(Number).filter((n) => !isNaN(n));
    if (nationalityIds?.length) {
      filtersWhere.nationalityId = nationalityIds.length === 1 ? nationalityIds[0] : { in: nationalityIds };
    }

    if (state.filters.isActive?.length) {
      filtersWhere.isActive = state.filters.isActive[0] === 'true';
    }

    const where = {
      companyId,
      ...searchWhere,
      ...filtersWhere,
      ...textFiltersWhere,
      ...dateFiltersWhere,
    };

    const safeOrderBy = [
      { isActive: 'desc' as const },
      ...(state.sortBy && VALID_SORT_FIELDS.has(state.sortBy)
        ? [{ [state.sortBy]: state.sortOrder }]
        : [{ name: 'asc' as const }]),
    ];

    // SIN skip/take para obtener todos
    return await prisma.{entity}.findMany({
      where,
      orderBy: safeOrderBy,
      select: {
        // Mismos campos que la query principal
        id: true,
        name: true,
        code: true,
        status: true,
        isActive: true,
        phone: true,
        email: true,
        createdAt: true,
        hireDate: true,
        category: { select: { id: true, name: true } },
        nationality: { select: { id: true, name: true } },
      },
    });
  } catch (error) {
    logger.error('Error al exportar {entity}s', { data: { error } });
    throw new Error('No se pudo exportar la lista. Intente nuevamente.');
  }
}

// ── Facetas para filtros (counts + opciones FK) ───────────────────────
// Se llama desde el Client Component via useQuery.
// PATRON DE 2 RONDAS: primero groupBy para obtener IDs con datos,
// luego findMany solo para esos IDs (no trae opciones sin registros).

export async function get{Entity}sFacets() {
  const companyId = await getActiveCompanyId();
  if (!companyId) return null;

  try {
    // Ronda 1: groupBy para counts
    const [statusCounts, categoryCounts, isActiveCounts] = await Promise.all([
      prisma.{entity}.groupBy({ by: ['status'], where: { companyId }, _count: true }),
      prisma.{entity}.groupBy({ by: ['categoryId'], where: { companyId }, _count: true }),
      prisma.{entity}.groupBy({ by: ['isActive'], where: { companyId }, _count: true }),
    ]);

    // Ronda 2: resolver nombres de FK solo para IDs que tienen datos
    const catIds = categoryCounts.filter((r) => r.categoryId).map((r) => r.categoryId!);

    const [categoryOptions] = await Promise.all([
      catIds.length > 0
        ? prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
        : [],
    ]);

    return {
      status: new Map(statusCounts.map((r) => [r.status as string, r._count])),
      category: new Map(categoryCounts.filter((r) => r.categoryId).map((r) => [r.categoryId!, r._count])),
      categoryOptions,
      isActive: new Map(isActiveCounts.map((r) => [String(r.isActive), r._count])),
    };
  } catch (error) {
    logger.error('Error al obtener facetas de {entity}s', { data: { error } });
    return null;
  }
}

// ── Tipos exportados ──────────────────────────────────────────────────

export type {Entity}ListItem = Awaited<ReturnType<typeof get{Entity}sPaginated>>['data'][number];
export type {Entity}Facets = Awaited<ReturnType<typeof get{Entity}sFacets>>;
```

---

## Paso 2: Columnas (`columns.tsx`)

```typescript
// modules/{module}/features/list/columns.tsx
'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import moment from 'moment';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { type ModulePermissions } from '@/features/Permissions';
import { {status}Badges, getLabel, getBadgeConfig } from '@/shared/utils/mappers';
import { cn } from '@/lib/utils';
import { type {Entity}ListItem } from './actions.server';

// Columnas que se ocultan por defecto (visibilidad inicial)
export const HIDDEN_COLUMNS_BY_DEFAULT: string[] = [
  'phone',
  'email',
  'createdAt',
  // Agregar columnas secundarias aqui
];

export function getColumns(permissions: ModulePermissions): ColumnDef<{Entity}ListItem>[] {
  const { canView, canUpdate, canDelete } = permissions;
  const hasAnyAction = canView || canUpdate || canDelete;

  const baseColumns: ColumnDef<{Entity}ListItem>[] = [
    // ── Seleccion ──────────────────────────────────────────────────────
    {
      id: 'select',
      meta: { excludeFromExport: true },
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },

    // ── Texto simple ───────────────────────────────────────────────────
    {
      accessorKey: 'name',
      meta: { title: 'Nombre' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => (
        <span className={cn('font-medium', !row.original.isActive && 'opacity-50')}>
          {row.getValue('name')}
        </span>
      ),
    },

    // ── Columna combinada (accessorFn retorna dato combinado para export) ─
    // Si el cell muestra datos de multiples campos, usar accessorFn que combine todo.
    // Ejemplo: tipo de documento + numero
    // {
    //   id: 'document',
    //   accessorFn: (row) => `${row.identityDocumentType} ${row.documentNumber}`,
    //   meta: { title: 'Documento' },
    //   header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
    //   cell: ({ row }) => <span>{row.original.identityDocumentType} {row.original.documentNumber}</span>,
    // },

    // ── Relacion FK (accessorFn + id explicito + filterFn por ID) ────
    {
      id: 'category',
      accessorFn: (row) => row.category?.name ?? '',
      meta: { title: 'Categoria' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Categoria" />,
      cell: ({ row }) => <span>{row.original.category?.name || '—'}</span>,
      filterFn: (row, _id, value) => value.includes(String(row.original.category?.id)),
    },

    // ── FK con ID Int (nationality, province, city) ──────────────────
    // filterFn DEBE convertir a String porque los IDs Int llegan como String desde URL
    // {
    //   id: 'nationality',
    //   accessorFn: (row) => row.nationality?.name ?? '',
    //   meta: { title: 'Nacionalidad' },
    //   header: ({ column }) => <DataTableColumnHeader column={column} title="Nacionalidad" />,
    //   cell: ({ row }) => <span>{row.original.nationality?.name || '—'}</span>,
    //   filterFn: (row, _id, value) => value.includes(String(row.original.nationality?.id)),
    // },

    // ── Enum con Badge y filterFn ────────────────────────────────────
    {
      accessorKey: 'status',
      meta: { title: 'Estado' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const badge = getBadgeConfig(row.original.status, {status}Badges);
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },

    // ── Booleano (isActive) ──────────────────────────────────────────
    {
      accessorKey: 'isActive',
      meta: { title: 'Activo' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Activo" />,
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
      filterFn: (row, id, value) => value.includes(String(row.getValue(id))),
    },

    // ── Fecha ────────────────────────────────────────────────────────
    {
      accessorKey: 'createdAt',
      meta: { title: 'Fecha de Creacion' },
      enableHiding: true,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de Creacion" />,
      cell: ({ row }) => (
        <span>{row.original.createdAt ? moment(row.original.createdAt).format('DD/MM/YYYY') : '—'}</span>
      ),
    },

    // ── Texto libre (phone, email — sin filterFn, usa filtro tipo text) ─
    {
      accessorKey: 'phone',
      meta: { title: 'Telefono' },
      enableHiding: true,
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Telefono" />,
      cell: ({ row }) => <span>{row.original.phone || '—'}</span>,
    },
  ];

  // Columna de acciones — SOLO si el usuario tiene al menos un permiso
  if (hasAnyAction) {
    baseColumns.push({
      id: 'actions',
      meta: { excludeFromExport: true },
      cell: ({ row }) => {
        const item = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canView && (
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/{module}/${item.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    Ver detalle
                  </Link>
                </DropdownMenuItem>
              )}
              {canUpdate && (
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/{module}/${item.id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Link>
                </DropdownMenuItem>
              )}
              {(canView || canUpdate) && canDelete && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });
  }

  return baseColumns;
}
```

---

## Paso 3: Server Component (`{Entity}List.tsx`)

```typescript
// modules/{module}/features/list/{Entity}List.tsx
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { type DataTableSearchParams } from '@/shared/components/common/DataTable';

import { get{Entity}sPaginated } from './actions.server';
import { _{Entity}DataTable } from './components/_{Entity}DataTable';
import { getModulePermissions } from '@/features/Permissions';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';

interface Props {
  searchParams: DataTableSearchParams;
}

export async function {Entity}List({ searchParams }: Props) {
  // Cargar datos, permisos y preferencias de tabla EN PARALELO
  const [{ data, total }, permissions, tablePreferences] = await Promise.all([
    get{Entity}sPaginated(searchParams),
    getModulePermissions('{module}'),
    getTablePreferences('{entity}s'),  // tableId para preferencias guardadas
  ]);

  return (
    <PermissionGuard module="{module}" action="view" redirect>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{Entity}s</h1>
          {/* Boton "Nuevo" protegido por permisos — server-side, sin flash */}
          <PermissionGuard module="{module}" action="create">
            <Button asChild>
              <Link href="/dashboard/{module}/new">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo
              </Link>
            </Button>
          </PermissionGuard>
        </div>

        <_{Entity}DataTable
          data={data}
          totalRows={total}
          searchParams={searchParams}
          permissions={permissions}
          initialColumnVisibility={tablePreferences.columnVisibility}
          initialFilterVisibility={tablePreferences.filterVisibility}
        />
      </div>
    </PermissionGuard>
  );
}
```

---

## Paso 4: Client Component (`_{Entity}DataTable.tsx`)

```typescript
// modules/{module}/features/list/components/_{Entity}DataTable.tsx
'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';

import {
  DataTable,
  type DataTableExportConfig,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
} from '@/shared/components/common/DataTable';
import { type ModulePermissions } from '@/features/Permissions';
import { {status}Labels } from '@/shared/utils/mappers';
import { Status } from '@/generated/prisma/enums';

import { getColumns, HIDDEN_COLUMNS_BY_DEFAULT } from '../columns';
import {
  get{Entity}sFacets,
  getAll{Entity}sForExport,
  type {Entity}ListItem,
} from '../actions.server';

interface Props {
  data: {Entity}ListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  permissions: ModulePermissions;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
}

export function _{Entity}DataTable({
  data,
  totalRows,
  searchParams,
  permissions,
  initialColumnVisibility: savedColumnVisibility,
  initialFilterVisibility,
}: Props) {
  // Facetas cargadas en el cliente via useQuery (no bloquean el render inicial)
  const { data: facets } = useQuery({
    queryKey: ['{entity}s-facets'],
    queryFn: () => get{Entity}sFacets(),
    staleTime: 5 * 60 * 1000,
  });

  const columns = useMemo(() => getColumns(permissions), [permissions]);

  // Visibilidad inicial: preferencias guardadas en BD > defaults
  const defaultColumnVisibility = useMemo(
    () => Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false])),
    []
  );
  const initialColumnVisibility =
    savedColumnVisibility && Object.keys(savedColumnVisibility).length > 0
      ? savedColumnVisibility
      : defaultColumnVisibility;

  // ── Filtros faceteados ──────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      // Enum → opciones estaticas, counts dinamicos del servidor
      // REGLA: los labels de las opciones DEBEN coincidir con lo mostrado en la celda de la tabla.
      // Si la columna muestra "Vigente" en el badge, el filtro NO puede decir "Presentado".
      // REGLA: si existen iconos acordes a las opciones, agregarlos (lucide-react).
      // Solo agregar iconos cuando sean semanticamente claros (estados, tipos de recurso).
      {
        columnId: 'status',
        title: 'Estado',
        options: Object.values(Status).map((value) => ({
          value,
          label: {status}Labels[value],
          icon: statusIcons[value],  // Icono sutil por opcion (lucide-react)
        })),
        externalCounts: facets?.status,
      },
      // FK → opciones dinamicas + counts del servidor
      {
        columnId: 'category',
        title: 'Categoria',
        options: facets?.categoryOptions?.map((c) => ({ value: c.id, label: c.name })) ?? [],
        externalCounts: facets?.category,
      },
      // Booleano isActive → "Activo" / "Inactivo"
      {
        columnId: 'isActive',
        title: 'Activo',
        options: [
          { value: 'true', label: 'Activo' },
          { value: 'false', label: 'Inactivo' },
        ],
        externalCounts: facets?.isActive,
      },
      // Rango de fechas
      {
        columnId: 'createdAt',
        title: 'Fecha de Creacion',
        type: 'dateRange' as const,
      },
      // Texto — TODA columna de texto necesita su filtro text individual
      // (incluso si tambien esta en searchPlaceholder/buildSearchWhere)
      {
        columnId: 'name',
        title: 'Nombre',
        type: 'text' as const,
        placeholder: 'Buscar por nombre...',
      },
      {
        columnId: 'code',
        title: 'Codigo',
        type: 'text' as const,
        placeholder: 'Buscar por codigo...',
      },
      {
        columnId: 'phone',
        title: 'Telefono',
        type: 'text' as const,
        placeholder: 'Buscar por telefono...',
      },
    ],
    [facets]
  );

  // ── Exportacion a Excel ────────────────────────────────────────────
  // REGLA: TODAS las columnas exportables deben tener:
  //   1. Nombre legible en cabecera (viene de meta.title)
  //   2. Dato formateado (formatter para enums, fechas, booleanos)
  const exportConfig: DataTableExportConfig<{Entity}ListItem> = useMemo(
    () => ({
      fetchAllData: () => getAll{Entity}sForExport(searchParams),
      options: {
        filename: '{entity}s',
        title: 'Listado de {Entity}s',
        sheetName: '{Entity}s',
      },
      formatters: {
        // TODOS los enums — sin excepcion
        status: (val) => {status}Labels[val as Status] || String(val),
        // gender: (val) => genderLabels[val as Gender] || String(val),
        // maritalStatus: (val) => maritalStatusLabels[val as MaritalStatus] || String(val),
        // ... CADA enum de la tabla necesita su formatter

        // TODAS las fechas — sin excepcion
        createdAt: (val) => val ? moment(val as string).format('DD/MM/YYYY HH:mm') : '',
        hireDate: (val) => val ? moment(val as string).format('DD/MM/YYYY') : '',
        // ... CADA fecha de la tabla necesita su formatter

        // TODOS los booleanos — sin excepcion
        isActive: (val) => val ? 'Si' : 'No',
        // ... CADA booleano de la tabla necesita su formatter

        // Columnas FK con accessorFn que retorna .name → NO necesitan formatter
        // Columnas de texto simple → NO necesitan formatter
      },
    }),
    [searchParams]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      searchPlaceholder="Buscar por nombre o codigo..."
      facetedFilters={facetedFilters}
      exportConfig={exportConfig}
      enableRowSelection={true}
      showRowSelection={true}
      emptyMessage="No hay registros"
      tableId="{entity}s"
      showFilterToggle={true}
      initialColumnVisibility={initialColumnVisibility}
      initialFilterVisibility={initialFilterVisibility}
      data-testid="{entity}s-table"
    />
  );
}
```

---

## Paso 5: Pagina (`page.tsx`)

```typescript
// app/(core)/dashboard/{module}/page.tsx
import { type Metadata } from 'next';
import { type DataTableSearchParams } from '@/shared/components/common/DataTable';
import { {Entity}List } from '@/modules/{module}/features/list';

export const metadata: Metadata = { title: '{Entity}s' };

interface PageProps {
  searchParams: Promise<DataTableSearchParams>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  return <{Entity}List searchParams={params} />;
}
```

---

## Patron: Consistencia de labels entre columna y filtro

**REGLA CRITICA: Los labels mostrados en las opciones del filtro DEBEN coincidir EXACTAMENTE con los labels mostrados en la celda de la columna de la tabla.** Si el usuario ve "Vigente" en la tabla pero el filtro dice "Presentado", es confuso e inutilizable.

### Problema comun

Cuando un enum tiene labels context-aware (ej: `APPROVED` muestra "Vigente" si tiene vencimiento, "Presentado" si no), el filtro NO puede usar el label generico del mapper. Debe usar la misma logica de labels que usa la columna.

```typescript
// ❌ INCORRECTO — la columna muestra "Vigente" pero el filtro dice "Presentado"
// Columna (columns.tsx):
cell: () => getDocumentStateBadge(state, hasExpiration); // → "Vigente"
// Filtro (_DataTable.tsx):
label: documentStateLabels[value]; // → "Presentado"

// ✅ CORRECTO — ambos usan el mismo mapper/logica
// Si los labels son fijos (1 label por valor), usar el mismo mapper en ambos.
// Si los labels son context-aware, generar las opciones del filtro con los labels
// que el usuario realmente ve en la tabla.
```

### Regla para verificar

Al crear o auditar una tabla, para CADA filtro faceteado:

1. Mirar que label muestra la **celda** de la columna para cada valor
2. Mirar que label muestra la **opcion del filtro** para ese mismo valor
3. Si no coinciden → BUG. Corregir el filtro para que use el mismo label.

---

## Patron: Iconos en filtros y columnas

Agregar **iconos sutiles** (lucide-react) a las opciones de filtros faceteados y a los badges de las columnas cuando existan iconos semanticamente claros. NO forzar iconos donde no tienen sentido.

### Cuando SI agregar iconos

- **Estados** (pendiente → Clock, aprobado → CheckCircle2, rechazado → XCircle, vencido → AlertCircle)
- **Tipos de recurso** (empleado → User, equipo → Truck, empresa → Building)
- **Booleanos** (activo → Check, inactivo → X)
- **Prioridades** (alta → ArrowUp, media → ArrowRight, baja → ArrowDown)

### Cuando NO agregar iconos

- Relaciones FK (nombres de puestos, categorias, departamentos — no hay icono semantico claro)
- Textos libres (filtros text)
- Fechas (filtros dateRange)

### Patron de implementacion

```typescript
// En _DataTable.tsx (client component) — definir iconos como constante
import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const statusIcons = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  EXPIRED: AlertCircle,
};

// En filtro faceteado — agregar icon por opcion
{
  columnId: 'status',
  title: 'Estado',
  options: Object.values(Status).map((value) => ({
    value,
    label: statusLabels[value],
    icon: statusIcons[value],  // Icono sutil junto al label
  })),
  externalCounts: facets?.status,
},

// En columna (columns.tsx) — icono sutil en el badge
cell: ({ row }) => {
  const status = row.original.status;
  const badge = statusBadges[status];
  const Icon = statusIcons[status];
  return (
    <Badge variant={badge.variant} className="gap-1">
      {Icon && <Icon className="h-3 w-3" />}
      {badge.label}
    </Badge>
  );
},
```

---

## Patron: Filtros Base (permanent/monthly, sub-tabs)

Algunas tablas muestran un subconjunto fijo de datos (ej: documentos permanentes vs mensuales). El **filtro base** NO es un filtro de usuario — es un parametro fijo que se pasa a la server action.

### Regla fundamental

Si la tabla tiene un filtro base, las **facetas, el export y los counts** tambien deben aplicar el mismo filtro base. De lo contrario, las opciones del filtro mostrarian items de otro contexto.

### Ejemplo: documentos con `isMonthly`

```typescript
// Server Component — renderiza 2 instancias de la misma DataTable con distinto filtro base
const [permanentResult, monthlyResult] = await Promise.all([
  getDocumentsPaginated(searchParams, false),   // isMonthly = false
  getDocumentsPaginated(searchParams, true),    // isMonthly = true
]);

<TabsContent value="permanent">
  <_DocumentsDataTable data={permanentResult.data} totalRows={permanentResult.total} />
</TabsContent>
<TabsContent value="monthly">
  <_DocumentsDataTable data={monthlyResult.data} totalRows={monthlyResult.total} isMonthly={true} />
</TabsContent>
```

```typescript
// Server Action — recibe el filtro base como parametro
export async function getDocumentsPaginated(searchParams: DataTableSearchParams, isMonthly: boolean) {
  const baseWhere = {
    employee: { companyId, isActive: true },
    documentType: { isMonthly }, // ← filtro base, NO controlado por usuario
  };
  const where = { ...baseWhere, ...searchWhere, ...filtersWhere };
  // ...
}

// Facetas — DEBEN aplicar el MISMO filtro base
export async function getDocumentsFacets(isMonthly: boolean) {
  const baseWhere = {
    employee: { companyId, isActive: true },
    documentType: { isMonthly }, // ← mismo filtro base
  };
  const [stateCounts, docTypeCounts] = await Promise.all([
    prisma.document.groupBy({ by: ['state'], where: baseWhere, _count: true }),
    prisma.document.groupBy({ by: ['documentTypeId'], where: baseWhere, _count: true }),
  ]);
  // ...
}

// Export — DEBE aplicar el MISMO filtro base
export async function getAllDocumentsForExport(searchParams: DataTableSearchParams, isMonthly: boolean) {
  // ... misma logica con baseWhere incluyendo isMonthly ...
}
```

```typescript
// Client Component — useQuery key DEBE incluir el filtro base para cache separado
const { data: facets } = useQuery({
  queryKey: ['documents-facets', isMonthly], // ← cache distinto por filtro base
  queryFn: () => getDocumentsFacets(isMonthly),
  staleTime: 5 * 60 * 1000,
});

// Filtros condicionales segun el filtro base
const facetedFilters = useMemo(
  () => [
    // ... filtros comunes ...
    ...(isMonthly
      ? [
          {
            columnId: 'period',
            title: 'Periodo',
            type: 'text' as const,
            placeholder: 'Ej: 2024-01',
          },
        ]
      : []),
  ],
  [facets, isMonthly]
);
```

---

## Patron: Permisos en la tabla

Los permisos se cargan **en el servidor** y se pasan como props para evitar flash de contenido (el boton aparece y desaparece).

### Flujo completo

```
Server Component
  ├── getModulePermissions('{module}')  → { canView, canCreate, canUpdate, canDelete }
  ├── <PermissionGuard module="{module}" action="view" redirect>  → protege toda la pagina
  ├── <PermissionGuard module="{module}" action="create">  → protege boton "Nuevo"
  └── permissions={permissions}  → pasa al Client Component
        └── getColumns(permissions)  → columna actions condicional
              ├── if (hasAnyAction) → agrega columna actions
              ├── canView → "Ver detalle"
              ├── canUpdate → "Editar"
              └── canDelete → "Eliminar"
```

### `ModulePermissions` interface

```typescript
// src/shared/lib/permissions
export interface ModulePermissions {
  canView: boolean; // Ver registros
  canCreate: boolean; // Crear nuevos
  canUpdate: boolean; // Editar existentes (NO es canEdit)
  canDelete: boolean; // Eliminar registros
}
```

**IMPORTANTE**: El campo es `canUpdate`, NO `canEdit`. `canEdit` no existe.

---

## Tipos de columnas y sus filtros

### Columna enum → `faceted` con `filterFn` por valor

```typescript
// columns.tsx
{ accessorKey: 'status', meta: { title: 'Estado' },
  filterFn: (row, id, value) => value.includes(row.getValue(id)) }

// _DataTable.tsx
{ columnId: 'status', title: 'Estado', options: [...], externalCounts: facets?.status }

// actions.server.ts
buildFiltersWhere(state.filters, { status: 'status' })
```

### Columna FK (id: string UUID) → `faceted` con `filterFn` por ID

```typescript
// columns.tsx
{ id: 'category', accessorFn: (row) => row.category?.name ?? '',
  filterFn: (row, _id, value) => value.includes(String(row.original.category?.id)) }

// _DataTable.tsx
{ columnId: 'category', title: 'Categoria', options: facets?.categoryOptions?.map(...) ?? [] }

// actions.server.ts
buildFiltersWhere(state.filters, { category: 'categoryId' })
```

### Columna con ID externo enriquecido (userId de auth, etc.) → `faceted`

Columnas que almacenan un ID de un sistema externo (ej: userId de auth) y se enriquecen post-query con datos legibles (nombre, avatar). El ID raw ES un campo real de BD, así que el filtro funciona server-side.

```typescript
// columns.tsx — column muestra dato enriquecido, filterFn compara por ID raw
{ id: 'performedBy',
  accessorFn: (row) => `${row.performedByUser.firstName} ${row.performedByUser.lastName}`,
  meta: { title: 'Usuario' },
  filterFn: (row, _id, value) => value.includes(row.original.performedBy), // raw auth user ID
  enableSorting: false,
}

// actions.server.ts — buildFiltersWhere usa el campo raw (es columna real de BD)
buildFiltersWhere(state.filters, { performedBy: 'performedBy' })

// facets — groupBy en campo raw + enriquecer IDs únicos con servicio externo
const performedByCounts = await prisma.entity.groupBy({ by: ['performedBy'], where, _count: true });
// Enrich unique IDs with profile/employees to get displayable names for filter option labels
// Return: performedBy Map<userId, count> + performedByLabels Map<userId, "First Last">

// _DataTable.tsx — opciones con value=rawId, label=nombre enriquecido
{ columnId: 'performedBy', title: 'Usuario',
  options: facets?.performedBy
    ? Array.from(facets.performedBy.keys()).map((userId) => ({
        value: userId,
        label: facets.performedByLabels?.get(userId) ?? userId,
        icon: User,
      }))
    : [],
  externalCounts: facets?.performedBy,
}
```

**REGLA**: NO omitir el filtro porque "es un ID externo". Si el campo existe en la BD, es filtrable. Las facetas enriquecen los IDs para que las opciones sean legibles.

### Columna FK (id: Int) → conversion manual

```typescript
// actions.server.ts — NO usar buildFiltersWhere para IDs Int
const rawIds = state.filters['nationality'] ?? [];
const ids = rawIds.map(Number).filter((n) => !isNaN(n));
if (ids.length > 0) filtersWhere.nationalityId = ids.length === 1 ? ids[0] : { in: ids };

// columns.tsx — filterFn convierte a String
filterFn: (row, _id, value) => value.includes(String(row.original.nationality?.id));

// _DataTable.tsx — opciones con value como String
options: facets?.nationalityOptions?.map((n) => ({ value: String(n.id), label: n.name })) ?? [];
```

### Columna booleano → `faceted` con conversion String

```typescript
// columns.tsx
{ accessorKey: 'isActive', meta: { title: 'Activo' },
  filterFn: (row, id, value) => value.includes(String(row.getValue(id))) }

// _DataTable.tsx
{ columnId: 'isActive', title: 'Activo',
  options: [{ value: 'true', label: 'Activo' }, { value: 'false', label: 'Inactivo' }],
  externalCounts: facets?.isActive }

// actions.server.ts
if (state.filters.isActive?.length) {
  filtersWhere.isActive = state.filters.isActive[0] === 'true';
}
```

### Columna fecha → `dateRange` (no necesita `filterFn`)

```typescript
// _DataTable.tsx
{ columnId: 'createdAt', title: 'Fecha', type: 'dateRange' as const }

// actions.server.ts
const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, ['createdAt']);
```

### Patron: Filtro "Sin asignar" (NULL_FILTER_VALUE)

Para columnas nullable (FK, enum, M:M), se debe incluir una opcion "Sin asignar" que filtre por registros donde el campo es null. Se usa un valor sentinel:

```typescript
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
// NULL_FILTER_VALUE = '__null__'
```

**En facetas**: incluir bucket null con key `NULL_FILTER_VALUE` cuando `groupBy` retorna filas con valor null.
**En builders de filtros**: agregar opcion `{ value: NULL_FILTER_VALUE, label: 'Sin asignar' }` si el count > 0.
**En filterFn**: si el valor del campo es null, retornar `value.includes(NULL_FILTER_VALUE)`.
**En server action**: para BigInt FK, usar `OR` a nivel raiz; para M:M, usar `{ none: {} }`.

Ver la tabla de empleados como referencia completa de implementacion.

---

### Regla: Columna FK de Empleado → columna y filtro de Legajo OBLIGATORIOS

Toda tabla que tenga una columna FK de empleado (sea `faceted` o `text`) DEBE tener tambien una columna y filtro SEPARADOS para el numero de legajo (`file_number`). Los usuarios identifican empleados por su legajo — el nombre puede repetirse, el legajo es unico.

**Requisitos:**

1. **Columna separada**: El legajo NO puede estar integrado dentro de la columna del nombre del empleado. Debe ser una columna independiente con su propio `id`, `accessorFn` y `meta: { title: 'Legajo' }`.
2. **Filtro separado**: El legajo debe tener su propio filtro de tipo `text`, independiente del filtro de empleado. No se puede reutilizar el filtro de empleado para buscar por legajo.
3. **Coincidencia EXACTA**: El filtro de legajo DEBE usar `equals` (coincidencia exacta), NO `contains` (coincidencia parcial). Si el usuario escribe "1", solo debe aparecer el empleado con legajo "1", NO los legajos "10", "100", "101", etc. Esto es porque los legajos son numeros cortos y la busqueda parcial genera falsos positivos masivos.
4. **Indicador visual de coincidencia exacta**: El filtro debe incluir un tooltip o icono (`HelpCircle` o `Info`) que al hacer hover muestre un mensaje como "Coincidencia exacta: ingrese el numero de legajo completo". Esto comunica al usuario que debe escribir el legajo completo, no parcial.
5. **Aplica a TODA tabla con FK de empleado**: tablas de documentos, diagramas, solicitudes de mantenimiento, ordenes de trabajo, formularios — cualquier tabla que muestre datos de empleados.

**Implementacion:**

```typescript
// columns.tsx — columna separada de legajo
{
  id: 'fileNumber',
  accessorFn: (row) => row.employee?.file_number ?? '',
  meta: { title: 'Legajo' },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Legajo" />,
  cell: ({ row }) => <span>{row.original.employee?.file_number ?? '-'}</span>,
},

// _DataTable.tsx — filtro text separado con tooltip de coincidencia exacta
{
  columnId: 'fileNumber',
  title: 'Legajo',
  type: 'text' as const,
  placeholder: 'Nro. de legajo exacto...',
  exactMatch: true,  // Indica al DataTable que este filtro usa coincidencia exacta
  tooltip: 'Coincidencia exacta: ingrese el numero de legajo completo',
}

// actions.server.ts — incluir file_number en el select de la relacion
select: {
  employee: { select: { id: true, firstname: true, lastname: true, file_number: true } },
}

// actions.server.ts — IMPORTANTE: usar `equals` (NO `contains`)
// El filtro de legajo usa coincidencia EXACTA
const fileNumberFilter = state.filters['fileNumber'];
if (fileNumberFilter?.length) {
  andConditions.push({
    employees: { file_number: { equals: fileNumberFilter[0], mode: 'insensitive' } },
  });
}
// NUNCA usar `contains` para legajo — genera falsos positivos masivos
// (ej: buscar "1" trae "1", "10", "100", "101", "112", etc.)
```

**Deteccion en auditoria**: Si una tabla tiene columna `employee` (FK) pero NO tiene columna `fileNumber` con filtro `text` separado → **MISSING — HIGH priority**. Si el filtro de legajo usa `contains` en vez de `equals` → **BUG — HIGH priority**.

---

### Columna texto (nombre, codigo, direccion, email, telefono, etc.) → `text`

**REGLA: TODA columna de texto necesita su propio filtro `text`, incluso si tambien esta en `searchPlaceholder`.** La busqueda global busca en TODOS los campos a la vez — no permite filtrar por un campo especifico. Ambos mecanismos coexisten.

Las unicas columnas que NO llevan filtro son: `select`, `actions`, avatar/foto, y columnas virtuales/computadas sin campo en BD.

```typescript
// columns.tsx — no necesita filterFn (el filtro text se resuelve server-side)

// _DataTable.tsx — un filtro text por cada columna de texto
{ columnId: 'name', title: 'Nombre', type: 'text' as const, placeholder: 'Buscar por nombre...' },
{ columnId: 'code', title: 'Codigo', type: 'text' as const, placeholder: 'Buscar por codigo...' },
{ columnId: 'address', title: 'Direccion', type: 'text' as const, placeholder: 'Buscar por direccion...' },
{ columnId: 'email', title: 'Email', type: 'text' as const, placeholder: 'Buscar por email...' },

// actions.server.ts — excluir del buildFiltersWhere + agregar a buildTextFiltersWhere
buildFiltersWhere(state.filters, {...}, { exclude: ['name', 'code', 'address', 'email'] });
const textFiltersWhere = buildTextFiltersWhere(state.filters, ['name', 'code', 'address', 'email']);
```

---

## Propiedades de `<DataTable />`

| Prop                      | Tipo                             | Descripcion                                           |
| ------------------------- | -------------------------------- | ----------------------------------------------------- |
| `columns`                 | `ColumnDef[]`                    | Definicion de columnas                                |
| `data`                    | `T[]`                            | Datos de la pagina actual                             |
| `totalRows`               | `number`                         | Total en BD (para paginacion server-side)             |
| `searchParams`            | `DataTableSearchParams`          | Parametros de URL actuales                            |
| `searchPlaceholder`       | `string`                         | Placeholder del input de busqueda                     |
| `facetedFilters`          | `DataTableFacetedFilterConfig[]` | Config de filtros                                     |
| `exportConfig`            | `DataTableExportConfig<T>`       | Config de exportacion Excel                           |
| `tableId`                 | `string`                         | Clave para persistir preferencias de columnas/filtros |
| `showFilterToggle`        | `boolean`                        | Muestra dropdown para mostrar/ocultar filtros         |
| `initialFilterVisibility` | `Record<string,boolean>`         | Visibilidad inicial de filtros (de BD)                |
| `initialColumnVisibility` | `Record<string,boolean>`         | Columnas ocultas por defecto (de BD o defaults)       |
| `enableRowSelection`      | `boolean`                        | Habilita seleccion de filas                           |
| `showRowSelection`        | `boolean`                        | Muestra contador de filas seleccionadas               |
| `emptyMessage`            | `string`                         | Mensaje cuando no hay datos                           |

---

## Checklist

### Columnas

- [ ] Cada columna (excepto `select` y `actions`) tiene `meta: { title: 'X' }`
- [ ] `select` y `actions` tienen `meta: { excludeFromExport: true }`
- [ ] `columns.tsx` empieza con `'use client'`
- [ ] Relaciones FK usan `accessorFn` + `id` explicito (NO `accessorKey` sobre el ID)
- [ ] Columnas combinadas usan `accessorFn` que retorna el dato combinado (para export)
- [ ] Columnas filtrables tienen `filterFn` definido
- [ ] `filterFn` de FK compara por ID (`row.original.xxx?.id`), no por nombre
- [ ] `filterFn` de FK Int convierte a `String()` para comparar
- [ ] `filterFn` de booleano convierte a `String()` para comparar
- [ ] Fechas formateadas con `moment.js` (NUNCA `date-fns`)
- [ ] Inactivos con estilo visual distinto (`opacity-50` o similar)
- [ ] **NO agregar columnas de IDs/UUIDs técnicos** si ya existe una columna con el dato legible (ej: NO `targetId` si `targetName` existe, NO `performedBy` raw si se muestra el nombre del usuario)

### Server Action

- [ ] `VALID_SORT_FIELDS` Set con solo campos reales de BD
- [ ] Validacion de sortBy contra `VALID_SORT_FIELDS` antes de usar
- [ ] `isActive: 'desc'` como primer orderBy (si aplica)
- [ ] `parseSearchParams` + `stateToPrismaParams` para paginacion/orden
- [ ] `buildSearchWhere` para busqueda de texto
- [ ] `buildFiltersWhere` para filtros faceteados (con `exclude` si hay text filters)
- [ ] `buildTextFiltersWhere` para campos de texto libre
- [ ] `buildDateRangeFiltersWhere` para filtros de fecha
- [ ] IDs Int convertidos manualmente (`map(Number).filter(...)`)
- [ ] Booleanos convertidos desde string (`=== 'true'`)
- [ ] `get{Entity}sFacets()` usa patron de 2 rondas (groupBy → resolve nombres)
- [ ] `getAll{Entity}sForExport()` duplica TODA la logica de filtros (sin skip/take)
- [ ] Filtros base (si aplican) presentes en query, facets y export
- [ ] Tipos exportados: `{Entity}ListItem`, `{Entity}Facets`

### Server Component

- [ ] `Promise.all` con datos + permisos + `getTablePreferences`
- [ ] `PermissionGuard` con `redirect` envuelve toda la pagina
- [ ] `PermissionGuard` protege boton "Nuevo" (action="create")
- [ ] `permissions` pasados como prop al Client Component
- [ ] `initialColumnVisibility` y `initialFilterVisibility` pasados como props

### Client Component

- [ ] `useQuery` solo para facetas — NO para datos principales
- [ ] `initialColumnVisibility` mergea preferencias guardadas con defaults
- [ ] `initialFilterVisibility` pasado al `<DataTable />`
- [ ] `facetedFilters` con `externalCounts` del servidor
- [ ] Filtro `isActive` con opciones "Activo"/"Inactivo" (si aplica)
- [ ] `tableId` unico para persistir preferencias

### Consistencia Labels e Iconos (CRITICO)

- [ ] Labels de opciones de filtro coinciden EXACTAMENTE con labels de celdas de columna
- [ ] Si celda muestra label context-aware (ej: "Vigente"/"Presentado"), el filtro usa el mismo
- [ ] Iconos sutiles (lucide-react) en filtros faceteados de estados/tipos/booleanos
- [ ] **COMPLETENESS**: Toda columna de estado/enum, tipo de recurso (employee→User, vehicle→Truck, company→Building2), booleano o prioridad DEBE tener iconos en el filtro
- [ ] **COMPLETENESS**: Si un filtro de FK representa un tipo de recurso (employee, vehicle, company), TODAS sus opciones deben tener el mismo icono del recurso (ej: User para cada empleado)
- [ ] **CONSISTENCY**: Si un filtro tiene icono en sus opciones, la celda de la columna DEBE mostrar el MISMO icono junto al badge/texto (excepto FK que renderizan nombre/link, donde icono solo va en filtro)
- [ ] **CONSISTENCY**: Si una celda de columna muestra icono en su badge, el filtro DEBE mostrar el MISMO icono en sus opciones
- [ ] NO se fuerzan iconos en FK genéricas (puestos, categorías, departamentos, tipos de doc por nombre)

### Export Excel (CRITICO)

- [ ] TODOS los enums tienen formatter (enum → label legible)
- [ ] TODAS las fechas tienen formatter (Date → DD/MM/YYYY)
- [ ] TODOS los booleanos tienen formatter (true/false → Si/No)
- [ ] Columnas FK con `accessorFn` retornan string (no necesitan formatter)
- [ ] Columnas combinadas tienen `accessorFn` que retorna dato completo
- [ ] `meta: { title }` en cada columna para nombre de cabecera en Excel

### DataTable

- [ ] `searchPlaceholder` descriptivo
- [ ] **Column→Filter Matrix completa**: para CADA columna verificar que tiene su filtro (faceted para enums/FK/booleans, text para textos, dateRange para fechas). NO puede faltar ninguna columna filtrable.
- [ ] TODA columna FK (employee, vehicle, category, jobPosition, etc.) tiene filtro `faceted` con opciones del servidor
- [ ] **Si la tabla tiene FK de empleado → DEBE tener columna `fileNumber` separada (legajo) + filtro `text` separado. El legajo NO va integrado en la columna del nombre.**
- [ ] TODA columna con ID externo enriquecido (userId de auth → nombre usuario) tiene filtro `faceted` — el ID raw ES un campo real de BD filtrable server-side, y las facetas deben enriquecer los IDs agrupados para mostrar labels legibles
- [ ] TODA columna de texto tiene filtro `text` individual
- [ ] TODA columna de fecha tiene filtro `dateRange`
- [ ] TODA columna enum tiene filtro `faceted`
- [ ] TODA columna boolean tiene filtro `faceted`
- [ ] `data-testid` para Cypress
- [ ] `emptyMessage` en espanol

### Columnas Condicionales (permanent/monthly)

- [ ] Si la tabla tiene modos permanent/monthly, la columna `period` solo existe en monthly
- [ ] Si la tabla tiene modos permanent/monthly, la columna `expirationDate` solo existe en permanent
- [ ] La función de columnas acepta `isMonthly` y usa spread condicional `...(isMonthly ? [...] : [])`
- [ ] Los filtros de columnas condicionales son también condicionales

### Archivos

- [ ] Server Component (`{Entity}List.tsx`) sin `'use client'`
- [ ] Client Component (`_{Entity}DataTable.tsx`) con `'use client'` y prefijo `_`
- [ ] `columns.tsx` con `'use client'` en `features/list/`
- [ ] Tipos exportados al final de `actions.server.ts`
