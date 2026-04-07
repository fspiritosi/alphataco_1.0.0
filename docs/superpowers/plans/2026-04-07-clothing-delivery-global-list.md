# Clothing Delivery: Tabla Global + Botón Nueva Entrega + Precarga Empleado

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar tabla de TODAS las entregas de indumentaria en la página `/clothing/delivery`, botón "Nueva Entrega" en la tab de indumentaria del detalle de empleado que abre esa página en nueva pestaña, y precargar el empleado en el wizard via URL param.

**Architecture:** La página `/clothing/delivery` pasa de mostrar solo el wizard a mostrar una tabla global de entregas + el wizard. El wizard acepta un `initialEmployeeId` via searchParams para precargar el step 0. La tab de indumentaria del empleado agrega un botón que abre `/clothing/delivery?employee_id=XXX` en nueva pestaña.

**Tech Stack:** Next.js 16, React 19, Prisma, DataTable con lazy-load facets, Server Components.

---

## File Map

| Acción    | Archivo                                                                                         | Responsabilidad                                                          |
| --------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Crear     | `src/features/Clothing/AllDeliveries/AllDeliveriesList/actions.server.ts`                       | Server actions Prisma: paginated, export, single facet para tabla global |
| Crear     | `src/features/Clothing/AllDeliveries/AllDeliveriesList/columns.tsx`                             | Columnas de la tabla global (incluye columna empleado receptor)          |
| Crear     | `src/features/Clothing/AllDeliveries/AllDeliveriesList/components/_AllDeliveriesDataTable.tsx`  | Client component con DataTable, filtros, export                          |
| Crear     | `src/features/Clothing/AllDeliveries/AllDeliveriesList/AllDeliveriesList.tsx`                   | Server component: fetch paginado + preferences                           |
| Crear     | `src/features/Clothing/AllDeliveries/AllDeliveriesList/fallback/AllDeliveriesTableSkeleton.tsx` | Skeleton para Suspense                                                   |
| Modificar | `src/app/clothing/(panel)/delivery/page.tsx`                                                    | Agregar tabla global + pasar searchParams al wizard                      |
| Modificar | `src/features/Clothing/ClothingDelivery/components/DeliveryWizard.tsx`                          | Aceptar `initialEmployeeId`, fetch y precarga                            |
| Modificar | `src/features/Clothing/EmployeeDeliveries/EmployeeDeliveriesTabContent.tsx`                     | Agregar botón "Nueva Entrega" con link a nueva pestaña                   |

---

## Task 1: Server actions para tabla global de entregas

**Files:**

- Create: `src/features/Clothing/AllDeliveries/AllDeliveriesList/actions.server.ts`

Este archivo es una adaptación del existente `src/features/Clothing/EmployeeDeliveries/EmployeeDeliveriesList/actions.server.ts`, pero SIN filtrar por `employee_id` y AGREGANDO columna de empleado receptor + su legajo como filtros.

- [ ] **Step 1: Crear actions.server.ts**

```typescript
'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import {
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildSearchWhere,
  buildTextFiltersWhere,
  NULL_FILTER_VALUE,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('Clothing/AllDeliveries/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_SORT_FIELDS = new Set(['delivered_at', 'delivery_type', 'created_at', 'notes']);

const TEXT_FILTER_COLUMNS = ['notes'];

const DATE_RANGE_COLUMNS = ['delivered_at'];

const MANUALLY_HANDLED_COLUMNS = [
  ...TEXT_FILTER_COLUMNS,
  ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
  'delivered_by_id',
  'delivered_by_file',
  'employee_id',
  'employee_file',
];

const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  delivered_by_id: (dir) => ({
    employees_clothing_deliveries_delivered_by_idToemployees: { lastname: dir },
  }),
  employee_id: (dir) => ({
    employees_clothing_deliveries_employee_idToemployees: { lastname: dir },
  }),
};

// ============================================================================
// SHARED SELECT
// ============================================================================

const DELIVERY_SELECT = {
  id: true,
  delivery_type: true,
  delivered_at: true,
  notes: true,
  signature_url: true,
  employee_id: true,
  employees_clothing_deliveries_employee_idToemployees: {
    select: {
      id: true,
      firstname: true,
      lastname: true,
      file: true,
    },
  },
  employees_clothing_deliveries_delivered_by_idToemployees: {
    select: {
      id: true,
      firstname: true,
      lastname: true,
      file: true,
    },
  },
  clothing_delivery_items: {
    select: {
      id: true,
      quantity: true,
      clothing_items: {
        select: { id: true, name: true },
      },
      clothing_brands: {
        select: { id: true, name: true },
      },
      clothing_sizes: {
        select: { id: true, name: true },
      },
    },
  },
} as const;

// ============================================================================
// WHERE CLAUSE (sin employee_id fijo)
// ============================================================================

function buildWhereClause(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, ['notes']);

  const filtersWhere = buildFiltersWhere(state.filters, {}, { exclude: MANUALLY_HANDLED_COLUMNS });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS);

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // FK filter: delivered_by_id
  let deliveredByWhere: Record<string, unknown> = {};
  const deliveredByFilter = state.filters['delivered_by_id'];
  if (deliveredByFilter && Array.isArray(deliveredByFilter) && deliveredByFilter.length > 0) {
    const values = deliveredByFilter as string[];
    if (values.includes(NULL_FILTER_VALUE)) {
      const nonNullValues = values.filter((v) => v !== NULL_FILTER_VALUE);
      deliveredByWhere = {
        OR: [
          { delivered_by_id: null },
          ...(nonNullValues.length > 0 ? [{ delivered_by_id: { in: nonNullValues } }] : []),
        ],
      };
    } else {
      deliveredByWhere = { delivered_by_id: { in: values } };
    }
  }

  // FK filter: employee_id (empleado receptor)
  let employeeWhere: Record<string, unknown> = {};
  const employeeFilter = state.filters['employee_id'];
  if (employeeFilter && Array.isArray(employeeFilter) && employeeFilter.length > 0) {
    const values = employeeFilter as string[];
    if (values.includes(NULL_FILTER_VALUE)) {
      const nonNullValues = values.filter((v) => v !== NULL_FILTER_VALUE);
      employeeWhere = {
        OR: [{ employee_id: null }, ...(nonNullValues.length > 0 ? [{ employee_id: { in: nonNullValues } }] : [])],
      };
    } else {
      employeeWhere = { employee_id: { in: values } };
    }
  }

  // Text filter: delivered_by_file (legajo del que entrega)
  const deliveredByFileValues = state.filters['delivered_by_file'];
  const deliveredByFileSearch = deliveredByFileValues?.[0]?.trim();
  let deliveredByFileWhere: Record<string, unknown> = {};
  if (deliveredByFileSearch) {
    deliveredByFileWhere = {
      employees_clothing_deliveries_delivered_by_idToemployees: {
        file: { contains: deliveredByFileSearch, mode: 'insensitive' },
      },
    };
  }

  // Text filter: employee_file (legajo del receptor)
  const employeeFileValues = state.filters['employee_file'];
  const employeeFileSearch = employeeFileValues?.[0]?.trim();
  let employeeFileWhere: Record<string, unknown> = {};
  if (employeeFileSearch) {
    employeeFileWhere = {
      employees_clothing_deliveries_employee_idToemployees: {
        file: { contains: employeeFileSearch, mode: 'insensitive' },
      },
    };
  }

  return {
    company_id: companyId,
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...deliveredByWhere,
    ...employeeWhere,
    ...deliveredByFileWhere,
    ...employeeFileWhere,
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getAllDeliveriesPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildWhereClause(companyId, state);

    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
      const fkMapper = FK_SORT_MAP[s.id];
      if (fkMapper) {
        resolvedSorts.push(fkMapper(dir));
      } else if (VALID_SORT_FIELDS.has(s.id)) {
        resolvedSorts.push({ [s.id]: dir });
      }
    }
    const safeOrderBy = [...resolvedSorts, { delivered_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.clothing_deliveries.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: DELIVERY_SELECT,
      }),
      prisma.clothing_deliveries.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener todas las entregas paginadas', { data: { error } });
    throw new Error(`Error al obtener las entregas: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// EXPORT QUERY
// ============================================================================

export async function getAllDeliveriesForExport(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    const where = buildWhereClause(companyId, state);

    const data = await prisma.clothing_deliveries.findMany({
      orderBy: [{ delivered_at: 'desc' }],
      where,
      select: DELIVERY_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar todas las entregas', { data: { error } });
    throw new Error('Error al exportar las entregas');
  }
}

// ============================================================================
// SINGLE FACET
// ============================================================================

export async function getAllDeliveriesSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  const companyId = await getServerCompanyId();

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) {
      return { company_id: companyId };
    }
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildWhereClause(companyId, modified);
  }

  function toFacetMap(rows: { key: string | null | undefined; count: number }[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const { key, count } of rows) {
      if (key == null) {
        map.set(NULL_FILTER_VALUE, (map.get(NULL_FILTER_VALUE) ?? 0) + count);
      } else {
        map.set(String(key), count);
      }
    }
    return map;
  }

  try {
    const where = crossWhere(columnId);

    // ── Enum: delivery_type ──
    if (columnId === 'delivery_type') {
      const rows = await prisma.clothing_deliveries.groupBy({
        by: ['delivery_type'],
        where,
        _count: true,
      });
      return {
        counts: toFacetMap(rows.map((r) => ({ key: r.delivery_type, count: r._count }))),
      };
    }

    // ── FK: delivered_by_id ──
    if (columnId === 'delivered_by_id') {
      const rows = await prisma.clothing_deliveries.groupBy({
        by: ['delivered_by_id'],
        where,
        _count: true,
      });

      const counts = toFacetMap(rows.map((r) => ({ key: r.delivered_by_id, count: r._count })));

      const nonNullIds = rows.map((r) => r.delivered_by_id).filter((id): id is string => id != null);
      let resolvedOptions: Array<{ id: string; name: string | null }> = [];
      if (nonNullIds.length > 0) {
        const employees = await prisma.employees.findMany({
          where: { id: { in: nonNullIds } },
          select: { id: true, firstname: true, lastname: true, file: true },
        });
        resolvedOptions = employees.map((e) => ({
          id: e.id,
          name: `[${e.file ?? ''}] ${e.lastname ?? ''} ${e.firstname ?? ''}`.trim(),
        }));
      }

      return { counts, resolvedOptions };
    }

    // ── FK: employee_id (receptor) ──
    if (columnId === 'employee_id') {
      const rows = await prisma.clothing_deliveries.groupBy({
        by: ['employee_id'],
        where,
        _count: true,
      });

      const counts = toFacetMap(rows.map((r) => ({ key: r.employee_id, count: r._count })));

      const nonNullIds = rows.map((r) => r.employee_id).filter((id): id is string => id != null);
      let resolvedOptions: Array<{ id: string; name: string | null }> = [];
      if (nonNullIds.length > 0) {
        const employees = await prisma.employees.findMany({
          where: { id: { in: nonNullIds } },
          select: { id: true, firstname: true, lastname: true, file: true },
        });
        resolvedOptions = employees.map((e) => ({
          id: e.id,
          name: `[${e.file ?? ''}] ${e.lastname ?? ''} ${e.firstname ?? ''}`.trim(),
        }));
      }

      return { counts, resolvedOptions };
    }

    logger.warn('Facet column not recognized for all deliveries', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error al obtener facet de todas las entregas', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export type AllDeliveryListItem = Awaited<ReturnType<typeof getAllDeliveriesPaginated>>['data'][number];
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit --pretty` en el archivo (o `npm run check-types`)

---

## Task 2: Columnas para tabla global

**Files:**

- Create: `src/features/Clothing/AllDeliveries/AllDeliveriesList/columns.tsx`

Basado en las columnas existentes de `EmployeeDeliveries`, pero agregando columnas de empleado receptor (legajo + nombre).

- [ ] **Step 1: Crear columns.tsx**

```typescript
'use client';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DeliveryReceiptButton } from '@/features/Clothing/pdf/DeliveryReceiptButton';
import { clothingDeliveryTypeBadges, clothingDeliveryTypeLabels } from '@/features/Clothing/utils/mappers';
import { DataTableColumnHeader } from '@/shared/components/common/DataTable';
import { NULL_FILTER_VALUE } from '@/shared/components/common/DataTable/helpers';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, X } from 'lucide-react';
import moment from 'moment';
import type { AllDeliveryListItem } from './actions.server';

// ============================================================================
// COLUMNS HIDDEN BY DEFAULT
// ============================================================================

export const HIDDEN_COLUMNS_BY_DEFAULT = ['notes', 'delivered_by_file', 'employee_file'];

// ============================================================================
// COLUMNS
// ============================================================================

export function getColumns(): ColumnDef<AllDeliveryListItem>[] {
  return [
    // ── delivered_at ──────────────────────────────────────────────────────────
    {
      accessorKey: 'delivered_at',
      id: 'delivered_at',
      meta: { title: 'Fecha de entrega' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de entrega" />,
      cell: ({ row }) => (row.original.delivered_at ? moment(row.original.delivered_at).format('DD/MM/YYYY') : '-'),
    },

    // ── employee_file — legajo del receptor ──────────────────────────────────
    {
      id: 'employee_file',
      accessorFn: (row) => row.employees_clothing_deliveries_employee_idToemployees?.file ?? '',
      meta: { title: 'Legajo Receptor' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Legajo" />,
      cell: ({ row }) => {
        const file = row.original.employees_clothing_deliveries_employee_idToemployees?.file;
        return <span className="font-mono text-xs">{file ?? '-'}</span>;
      },
    },

    // ── employee_id — nombre del receptor ────────────────────────────────────
    {
      id: 'employee_id',
      accessorFn: (row) => {
        const emp = row.original.employees_clothing_deliveries_employee_idToemployees;
        if (!emp) return null;
        return emp.id;
      },
      meta: { title: 'Empleado Receptor' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Empleado" />,
      cell: ({ row }) => {
        const emp = row.original.employees_clothing_deliveries_employee_idToemployees;
        if (!emp) return <span className="text-muted-foreground">-</span>;
        return (
          <span>
            {emp.lastname ?? ''} {emp.firstname ?? ''}
          </span>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const emp = row.original.employees_clothing_deliveries_employee_idToemployees;
        const id = emp?.id ?? null;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },

    // ── delivery_type ─────────────────────────────────────────────────────────
    {
      accessorKey: 'delivery_type',
      id: 'delivery_type',
      meta: { title: 'Tipo de entrega' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de entrega" />,
      cell: ({ row }) => {
        const type = row.original.delivery_type;
        if (!type) return <span className="text-muted-foreground">-</span>;
        return <Badge variant={clothingDeliveryTypeBadges[type]}>{clothingDeliveryTypeLabels[type]}</Badge>;
      },
      filterFn: (row, id, value: string[]) => {
        const val = row.getValue(id);
        if (val == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(val as string);
      },
    },

    // ── delivered_by_file — legajo del que entrega ────────────────────────────
    {
      id: 'delivered_by_file',
      accessorFn: (row) => row.employees_clothing_deliveries_delivered_by_idToemployees?.file ?? '',
      meta: { title: 'Legajo Entregado por' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Legajo (entregó)" />,
      cell: ({ row }) => {
        const file = row.original.employees_clothing_deliveries_delivered_by_idToemployees?.file;
        return <span className="font-mono text-xs">{file ?? '-'}</span>;
      },
    },

    // ── delivered_by_id ──────────────────────────────────────────────────────
    {
      id: 'delivered_by_id',
      accessorFn: (row) => {
        const emp = row.original.employees_clothing_deliveries_delivered_by_idToemployees;
        if (!emp) return null;
        return emp.id;
      },
      meta: { title: 'Entregado por' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Entregado por" />,
      cell: ({ row }) => {
        const emp = row.original.employees_clothing_deliveries_delivered_by_idToemployees;
        if (!emp) return <span className="text-muted-foreground">-</span>;
        return (
          <span>
            {emp.lastname ?? ''} {emp.firstname ?? ''}
          </span>
        );
      },
      filterFn: (row, _id, value: string[]) => {
        const emp = row.original.employees_clothing_deliveries_delivered_by_idToemployees;
        const id = emp?.id ?? null;
        if (id == null) return value.includes(NULL_FILTER_VALUE);
        return value.includes(id);
      },
    },

    // ── items_detail (virtual) ────────────────────────────────────────────────
    {
      id: 'items_detail',
      accessorFn: () => null,
      meta: { title: 'Artículos' },
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Artículos" />,
      cell: ({ row }) => {
        const items = row.original.clothing_delivery_items ?? [];
        if (items.length === 0) {
          return <span className="text-muted-foreground">Sin artículos</span>;
        }

        const itemLabels = items.map((item) => {
          const name = item.clothing_items?.name ?? 'Artículo';
          const brand = item.clothing_brands?.name;
          const size = item.clothing_sizes?.name;
          const qty = item.quantity;
          const detail = [brand, size].filter(Boolean).join(', ');
          return `${name}${detail ? ` (${detail})` : ''} x${qty}`;
        });

        const firstLabel = itemLabels[0];
        const hasMore = itemLabels.length > 1;

        return (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex cursor-default">
                  <span className="text-sm">
                    {firstLabel}
                    {hasMore && <span className="ml-1 text-muted-foreground">+{itemLabels.length - 1} más</span>}
                  </span>
                </div>
              </TooltipTrigger>
              {hasMore && (
                <TooltipContent className="rounded-lg bg-black p-2 text-white">
                  <div className="flex flex-col gap-1">
                    {itemLabels.map((label, idx) => (
                      <span key={idx} className="text-sm">
                        {label}
                      </span>
                    ))}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
    },

    // ── has_signature ─────────────────────────────────────────────────────────
    {
      id: 'has_signature',
      accessorFn: (row) => (row.signature_url != null ? 'true' : 'false'),
      meta: { title: 'Firma' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Firma" />,
      cell: ({ row }) =>
        row.original.signature_url ? (
          <Check className="h-4 w-4 text-green-600" aria-label="Con firma" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" aria-label="Sin firma" />
        ),
      filterFn: (row, id, value: string[]) => {
        return value.includes(String(row.getValue(id)));
      },
    },

    // ── notes (hidden by default) ─────────────────────────────────────────────
    {
      accessorKey: 'notes',
      id: 'notes',
      meta: { title: 'Notas' },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Notas" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.notes ?? '-'}</span>,
    },

    // ── actions — PDF download ──────────────────────────────────────────────────
    {
      id: 'actions',
      meta: { excludeFromExport: true, title: '' },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => <DeliveryReceiptButton deliveryId={row.original.id} compact />,
    },
  ];
}
```

---

## Task 3: Client component DataTable global

**Files:**

- Create: `src/features/Clothing/AllDeliveries/AllDeliveriesList/components/_AllDeliveriesDataTable.tsx`

- [ ] **Step 1: Crear \_AllDeliveriesDataTable.tsx**

```typescript
'use client';

import { clothingDeliveryTypeLabels } from '@/features/Clothing/utils/mappers';
import { clothing_delivery_type } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import {
  DataTable,
  type DataTableFacetedFilterConfig,
  type DataTableSearchParams,
  type FacetResult,
} from '@/shared/components/common/DataTable';
import moment from 'moment';
import { useCallback, useMemo, useState } from 'react';
import {
  getAllDeliveriesForExport,
  getAllDeliveriesPaginated,
  getAllDeliveriesSingleFacet,
  type AllDeliveryListItem,
} from '../actions.server';
import { HIDDEN_COLUMNS_BY_DEFAULT, getColumns } from '../columns';

const logger = new Logger('_AllDeliveriesDataTable');

// ============================================================================
// TYPES
// ============================================================================

interface AllDeliveriesDataTableProps {
  data: AllDeliveryListItem[];
  totalRows: number;
  searchParams: DataTableSearchParams;
  tableId: string;
  initialColumnVisibility?: Record<string, boolean>;
  initialFilterVisibility?: Record<string, boolean>;
}

// ============================================================================
// HELPERS
// ============================================================================

function buildEnumFacetResult(
  enumValues: string[],
  labels: Record<string, string>,
  counts: Map<string, number>
): FacetResult {
  const options = enumValues.map((v) => ({
    value: v,
    label: labels[v] ?? v,
  }));
  return { options, counts };
}

function buildFkFacetResult(
  resolvedOptions: Array<{ id: string; name: string | null }> | undefined,
  counts: Map<string, number>
): FacetResult {
  const options = (resolvedOptions ?? []).map((o) => ({
    value: o.id,
    label: o.name ?? o.id,
  }));
  return { options, counts };
}

// ============================================================================
// DEFAULT VISIBLE FILTERS (max 3)
// ============================================================================

const DEFAULT_VISIBLE_FILTERS = ['delivered_at', 'employee_id', 'delivery_type'];

// ============================================================================
// COMPONENT
// ============================================================================

export default function _AllDeliveriesDataTable({
  data,
  totalRows,
  searchParams,
  tableId,
  initialColumnVisibility,
  initialFilterVisibility,
}: AllDeliveriesDataTableProps) {
  logger.debug('Rendering all deliveries table', { data: { totalRows } });

  // ─── Client-side navigation ───────────────────────────────────────────────
  const [currentParams, setCurrentParams] = useState<DataTableSearchParams>(searchParams);

  const handleStateChange = useCallback((params: DataTableSearchParams) => {
    setCurrentParams(params);
  }, []);

  const tableQueryFn = useCallback(
    (params: DataTableSearchParams) => getAllDeliveriesPaginated(params),
    []
  );

  // ─── Lazy-load facets — factories ─────────────────────────────────────────
  const makeEnumFetchFacet = useCallback(
    (columnId: string, enumValues: string[], labels: Record<string, string>) =>
      async (facetParams: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getAllDeliveriesSingleFacet(columnId, facetParams);
        if (!result) return { options: [], counts: new Map() };
        return buildEnumFacetResult(enumValues, labels, result.counts);
      },
    []
  );

  const makeFkFetchFacet = useCallback(
    (columnId: string) =>
      async (facetParams: DataTableSearchParams): Promise<FacetResult> => {
        const result = await getAllDeliveriesSingleFacet(columnId, facetParams);
        if (!result) return { options: [], counts: new Map() };
        return buildFkFacetResult(result.resolvedOptions, result.counts);
      },
    []
  );

  // ─── Columns ──────────────────────────────────────────────────────────────
  const columns = useMemo(() => getColumns(), []);

  // ─── Faceted filters ──────────────────────────────────────────────────────
  const facetedFilters: DataTableFacetedFilterConfig[] = useMemo(
    () => [
      {
        columnId: 'delivered_at',
        title: 'Fecha de entrega',
        type: 'dateRange' as const,
      },
      {
        columnId: 'employee_file',
        title: 'Legajo Receptor',
        type: 'text' as const,
        placeholder: 'Buscar por legajo...',
      },
      {
        columnId: 'employee_id',
        title: 'Empleado Receptor',
        fetchFacet: makeFkFetchFacet('employee_id'),
      },
      {
        columnId: 'delivery_type',
        title: 'Tipo de entrega',
        fetchFacet: makeEnumFetchFacet(
          'delivery_type',
          Object.values(clothing_delivery_type),
          clothingDeliveryTypeLabels
        ),
      },
      {
        columnId: 'delivered_by_file',
        title: 'Legajo Entregado por',
        type: 'text' as const,
        placeholder: 'Buscar por legajo...',
      },
      {
        columnId: 'delivered_by_id',
        title: 'Entregado por',
        fetchFacet: makeFkFetchFacet('delivered_by_id'),
      },
      {
        columnId: 'has_signature',
        title: 'Firma',
        fetchFacet: async (): Promise<FacetResult> => {
          const trueCount = data.filter((d) => d.signature_url != null).length;
          const falseCount = data.filter((d) => d.signature_url == null).length;
          const counts = new Map<string, number>();
          if (trueCount > 0) counts.set('true', trueCount);
          if (falseCount > 0) counts.set('false', falseCount);
          return {
            options: [
              { value: 'true', label: 'Con firma' },
              { value: 'false', label: 'Sin firma' },
            ],
            counts,
          };
        },
      },
      {
        columnId: 'notes',
        title: 'Notas',
        type: 'text' as const,
        placeholder: 'Buscar en notas...',
      },
    ],
    [makeEnumFetchFacet, makeFkFetchFacet, data]
  );

  // ─── Filter visibility ────────────────────────────────────────────────────
  const mergedFilterVisibility = useMemo(() => {
    if (initialFilterVisibility && Object.keys(initialFilterVisibility).length > 0) {
      return initialFilterVisibility;
    }
    return Object.fromEntries(facetedFilters.map((f) => [f.columnId, DEFAULT_VISIBLE_FILTERS.includes(f.columnId)]));
  }, [initialFilterVisibility, facetedFilters]);

  // ─── Column visibility ────────────────────────────────────────────────────
  const mergedColumnVisibility = useMemo(() => {
    const defaults = Object.fromEntries(HIDDEN_COLUMNS_BY_DEFAULT.map((col) => [col, false]));
    return { ...defaults, ...(initialColumnVisibility ?? {}) };
  }, [initialColumnVisibility]);

  // ─── Export config ────────────────────────────────────────────────────────
  const exportConfig = useMemo(
    () => ({
      fetchAllData: () => getAllDeliveriesForExport(currentParams),
      options: {
        filename: 'todas-entregas-indumentaria',
        sheetName: 'Entregas',
        title: 'Todas las Entregas de Indumentaria',
      },
      formatters: {
        delivered_at: (val: unknown) => (val ? moment(val as Date).format('DD/MM/YYYY') : '-'),
        delivery_type: (val: unknown) =>
          val ? clothingDeliveryTypeLabels[val as keyof typeof clothingDeliveryTypeLabels] ?? String(val) : '-',
        has_signature: (val: unknown) => (val === 'true' ? 'Sí' : 'No'),
        delivered_by_file: (val: unknown) => (val != null ? String(val) : '-'),
        employee_file: (val: unknown) => (val != null ? String(val) : '-'),
      },
    }),
    [currentParams]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      totalRows={totalRows}
      searchParams={searchParams}
      paramNamespace={tableId}
      tableId={tableId}
      queryFn={tableQueryFn}
      queryKey={['all-deliveries']}
      onStateChange={handleStateChange}
      facetedFilters={facetedFilters}
      initialFilterVisibility={mergedFilterVisibility}
      initialColumnVisibility={mergedColumnVisibility}
      searchPlaceholder="Buscar en notas..."
      showFilterToggle={true}
      showSearch={true}
      emptyMessage="No hay entregas registradas"
      exportConfig={exportConfig}
    />
  );
}
```

---

## Task 4: Server component + Skeleton

**Files:**

- Create: `src/features/Clothing/AllDeliveries/AllDeliveriesList/AllDeliveriesList.tsx`
- Create: `src/features/Clothing/AllDeliveries/AllDeliveriesList/fallback/AllDeliveriesTableSkeleton.tsx`

- [ ] **Step 1: Crear AllDeliveriesList.tsx**

```typescript
import { Card, CardContent } from '@/components/ui/card';
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { getAllDeliveriesPaginated } from './actions.server';
import _AllDeliveriesDataTable from './components/_AllDeliveriesDataTable';

const TABLE_ID = 'all-deliveries';

interface AllDeliveriesListProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function AllDeliveriesList({ searchParams }: AllDeliveriesListProps) {
  const tableParams = stripPrefixFromSearchParams(searchParams as DataTableSearchParams, TABLE_ID);

  const [{ data, total }, preferences] = await Promise.all([
    getAllDeliveriesPaginated(tableParams),
    getTablePreferences(TABLE_ID),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_AllDeliveriesDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={TABLE_ID}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Crear AllDeliveriesTableSkeleton.tsx**

```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AllDeliveriesTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Task 5: Modificar página `/clothing/delivery` para incluir tabla global

**Files:**

- Modify: `src/app/clothing/(panel)/delivery/page.tsx`

La página pasa de renderizar solo `<DeliveryWizard />` a mostrar la tabla global de entregas arriba del wizard, envuelta en Suspense. También pasa `searchParams` al wizard para la precarga de empleado.

- [ ] **Step 1: Actualizar page.tsx**

```typescript
import AllDeliveriesList from '@/features/Clothing/AllDeliveries/AllDeliveriesList/AllDeliveriesList';
import { AllDeliveriesTableSkeleton } from '@/features/Clothing/AllDeliveries/AllDeliveriesList/fallback/AllDeliveriesTableSkeleton';
import { DeliveryWizard } from '@/features/Clothing/ClothingDelivery/components/DeliveryWizard';
import { Suspense } from 'react';

interface ClothingDeliveryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ClothingDeliveryPage({ searchParams }: ClothingDeliveryPageProps) {
  const resolvedSearchParams = await searchParams;
  const employeeId = typeof resolvedSearchParams.employee_id === 'string' ? resolvedSearchParams.employee_id : undefined;

  return (
    <div className="space-y-6">
      <Suspense fallback={<AllDeliveriesTableSkeleton />}>
        <AllDeliveriesList searchParams={resolvedSearchParams} />
      </Suspense>

      <DeliveryWizard initialEmployeeId={employeeId} />
    </div>
  );
}
```

- [ ] **Step 2: Ampliar max-width del layout**

El layout actual tiene `max-w-4xl`. Con la tabla global necesitamos más ancho. Modificar `src/app/clothing/(panel)/layout.tsx` línea 43:

Cambiar:

```tsx
<main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">{children}</main>
```

Por:

```tsx
<main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">{children}</main>
```

Y en el skeleton (línea 19), cambiar `max-w-4xl` por `max-w-7xl`:

```tsx
<main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
```

---

## Task 6: Precarga de empleado en DeliveryWizard

**Files:**

- Modify: `src/features/Clothing/ClothingDelivery/components/DeliveryWizard.tsx`

El wizard acepta un prop `initialEmployeeId`. Si se provee, hace un fetch del empleado al montar y lo setea en el step 0, auto-avanzando al step 1.

- [ ] **Step 1: Agregar prop y lógica de precarga**

En `DeliveryWizard.tsx`, modificar la firma del componente y agregar el efecto de precarga:

Cambiar la firma:

```typescript
export function DeliveryWizard() {
```

Por:

```typescript
interface DeliveryWizardProps {
  initialEmployeeId?: string;
}

export function DeliveryWizard({ initialEmployeeId }: DeliveryWizardProps) {
```

Agregar import de `useEffect`:

```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';
```

Agregar import de la server action para fetch individual:

```typescript
import { getEmployeeForDeliveryById } from '@/features/Clothing/ClothingDelivery/actions/actionsServer';
```

Después de la línea `const [validationError, setValidationError] = useState<string | null>(null);` (línea 163), agregar:

```typescript
// Pre-load employee from URL param
useEffect(() => {
  if (!initialEmployeeId || data.employee) return;

  getEmployeeForDeliveryById(companyId, initialEmployeeId).then((employee) => {
    if (employee) {
      setData((prev) => ({ ...prev, employee }));
      setCurrentStep(1);
      logger.info('Employee pre-loaded from URL', { data: { employeeId: initialEmployeeId } });
    }
  });
}, [initialEmployeeId, companyId]); // eslint-disable-line react-hooks/exhaustive-deps
```

---

## Task 7: Server action para fetch de empleado individual

**Files:**

- Modify: `src/features/Clothing/ClothingDelivery/actions/actionsServer.ts`

Agregar una función que busca un empleado por ID (para la precarga desde URL param).

- [ ] **Step 1: Agregar getEmployeeForDeliveryById**

Agregar después de la definición de `EmployeeForDelivery` (línea 55):

```typescript
/**
 * Gets a single employee by ID for pre-loading in the delivery wizard.
 * Returns null if not found or not active.
 */
export async function getEmployeeForDeliveryById(
  companyId: string,
  employeeId: string
): Promise<EmployeeForDelivery | null> {
  logger.debug('Getting employee by ID for delivery pre-load', { data: { companyId, employeeId } });

  try {
    const employee = await prisma.employees.findFirst({
      where: {
        id: employeeId,
        company_id: companyId,
        is_active: true,
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        file: true,
        cuil: true,
        company_positions: { select: { name: true } },
      },
    });

    return employee;
  } catch (error) {
    logger.error('Error getting employee by ID for delivery', { data: { error, employeeId } });
    return null;
  }
}
```

---

## Task 8: Botón "Nueva Entrega" en tab de indumentaria del empleado

**Files:**

- Modify: `src/features/Clothing/EmployeeDeliveries/EmployeeDeliveriesTabContent.tsx`

Agregar un botón que abre `/clothing/delivery?employee_id=XXX` en nueva pestaña.

- [ ] **Step 1: Actualizar EmployeeDeliveriesTabContent.tsx**

```typescript
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/features/Permissions/components/PermissionGuard';
import { ExternalLink } from 'lucide-react';
import EmployeeDeliveriesList from './EmployeeDeliveriesList/EmployeeDeliveriesList';

interface EmployeeDeliveriesTabContentProps {
  employeeId: string;
  searchParams: Record<string, string | string[] | undefined>;
}

export async function EmployeeDeliveriesTabContent({ employeeId, searchParams }: EmployeeDeliveriesTabContentProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PermissionGuard module="empleados" tab="indumentaria_empleado" action="create">
          <a href={`/clothing/delivery?employee_id=${employeeId}`} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Nueva Entrega
            </Button>
          </a>
        </PermissionGuard>
      </div>
      <EmployeeDeliveriesList employeeId={employeeId} searchParams={searchParams} />
    </div>
  );
}
```

> **Nota sobre permisos**: La tab `indumentaria_empleado` actualmente solo tiene `allowedActions: ['view']`. Si el permiso `create` no existe, el botón no se mostrará. En ese caso, se puede quitar el `PermissionGuard` y dejar el botón siempre visible (ya que la acción real de crear se hace en el portal de clothing con su propia autenticación), o agregar el permiso `create` a la tab. **Decisión del usuario requerida en implementación.**

---

## Task 9: Verificación final

- [ ] **Step 1: Verificar tipos**

Run: `npm run check-types`

- [ ] **Step 2: Verificar visualmente**

1. Ir a `/clothing/delivery` → debe mostrar tabla de TODAS las entregas arriba del wizard
2. Ir a detalle de empleado → tab indumentaria → debe verse botón "Nueva Entrega"
3. Click en "Nueva Entrega" → abre nueva pestaña con `/clothing/delivery?employee_id=XXX`
4. En la nueva pestaña, el wizard debe precargar el empleado y estar en step 1 (Tipo)
5. La tabla global debe mostrar columna de empleado receptor con legajo y nombre
6. Filtros deben funcionar (empleado receptor, tipo, fecha, entregado por)
7. Export a Excel debe incluir todas las columnas nuevas
