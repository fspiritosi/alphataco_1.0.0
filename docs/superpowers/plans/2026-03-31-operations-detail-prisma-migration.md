# Operations Detail Prisma Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `/dashboard/operations/[uuid]` from Supabase + BaseDataTable to Prisma + new DataTable system, with atomic Suspense boundaries and on-demand data loading.

**Architecture:** Bottom-up rewrite — server actions first, then DataTables (via table-expert agent), then page composition with Suspense streaming. All employee/equipment selectors are full server-side DataTables that mount on-demand. Form decomposed into 5 sub-components. Modals pesados lazy-loaded con `next/dynamic`.

**Tech Stack:** Prisma, React 19 Server Components, DataTable (new system), React Query, Zustand, shadcn/ui, moment.js, Zod

**Spec:** `docs/superpowers/specs/2026-03-31-operations-detail-prisma-migration-design.md`

---

## File Map

### New Files (create)

| File                                                                  | Responsibility                                            |
| --------------------------------------------------------------------- | --------------------------------------------------------- |
| `detail/actions.server.ts`                                            | All server actions (READ + WRITE) for daily report detail |
| `detail/types/index.ts`                                               | Inferred types from server actions                        |
| `detail/hooks/useDailyReportDetail.ts`                                | Query keys + invalidation helpers                         |
| `detail/DailyReportHeader.tsx`                                        | Server Component async — header card                      |
| `detail/DailyReportDetailTable.tsx`                                   | Server Component async — wraps DataTable                  |
| `detail/columns.tsx`                                                  | Column definitions for main DataTable                     |
| `detail/components/_DailyReportDetailDataTable.tsx`                   | Client Component — main DataTable                         |
| `detail/components/DailyReportRowForm/schema.ts`                      | Zod schema + FormValues type                              |
| `detail/components/DailyReportRowForm/index.tsx`                      | Sheet orchestrator                                        |
| `detail/components/DailyReportRowForm/CustomerServiceSection.tsx`     | Cascading comboboxes                                      |
| `detail/components/DailyReportRowForm/EmployeeSection.tsx`            | Employee list + selector trigger                          |
| `detail/components/DailyReportRowForm/EquipmentSection.tsx`           | Equipment list + selector trigger                         |
| `detail/components/DailyReportRowForm/ScheduleSection.tsx`            | Schedule, status, description                             |
| `detail/components/EmployeeSelector/actions.server.ts`                | Paginated employees + facets                              |
| `detail/components/EmployeeSelector/columns.tsx`                      | Employee selector columns                                 |
| `detail/components/EmployeeSelector/_EmployeeSelectorDataTable.tsx`   | Client DataTable                                          |
| `detail/components/EmployeeSelector/EmployeeSelectorDialog.tsx`       | Dialog wrapper                                            |
| `detail/components/EquipmentSelector/actions.server.ts`               | Paginated equipment + facets                              |
| `detail/components/EquipmentSelector/columns.tsx`                     | Equipment selector columns                                |
| `detail/components/EquipmentSelector/_EquipmentSelectorDataTable.tsx` | Client DataTable                                          |
| `detail/components/EquipmentSelector/EquipmentSelectorDialog.tsx`     | Dialog wrapper                                            |
| `detail/components/DeleteRowDialog.tsx`                               | AlertDialog for row deletion                              |
| `detail/components/ServiceDetailDialog.tsx`                           | Read-only row detail                                      |
| `detail/components/HistoryDialog.tsx`                                 | Row audit history                                         |
| `detail/components/BulkEditModal.tsx`                                 | Bulk status/field update                                  |
| `detail/components/CloneRowsDialog.tsx`                               | Clone rows to other dates                                 |
| `detail/components/RemitosManager/actions.server.ts`                  | Remitos CRUD server actions                               |
| `detail/components/RemitosManager/RemitosManagerDialog.tsx`           | Root remit manager                                        |
| `detail/components/RemitosManager/AddRemitDialog.tsx`                 | Create new remit                                          |
| `detail/components/RemitosManager/LinkRemitDialog.tsx`                | Link existing remit                                       |
| `detail/fallback/DailyReportHeaderSkeleton.tsx`                       | Atomic skeleton for header                                |
| `detail/fallback/DailyReportDetailSkeleton.tsx`                       | Atomic skeleton for table                                 |

### Modified Files

| File                                           | Change                                        |
| ---------------------------------------------- | --------------------------------------------- |
| `src/app/dashboard/operations/[uuid]/page.tsx` | Rewrite: thin page with 2 Suspense boundaries |
| `store/dailyReportFormStore.ts`                | Simplify to isOpen + editingRowId only        |

### Deleted Files (Task 13)

All files listed in spec section "Archivos a Eliminar" (20 files).

---

## Task 1: Server Actions — READ Operations

**Files:**

- Create: `src/features/Operaciones/PartesDiarios/detail/actions.server.ts`
- Create: `src/features/Operaciones/PartesDiarios/detail/types/index.ts`
- Reference: `prisma/schema.prisma` (models dailyreportrows, dailyreport, etc.)
- Reference: `src/shared/components/common/DataTable/types.ts` (DataTableSearchParams)
- Reference: `src/shared/components/common/DataTable/helpers.ts` (parseSearchParams, stateToPrismaParams, build\*Where helpers)

This task creates ALL read server actions for the detail page. These are the foundation — everything else depends on them.

- [ ] **Step 1: Create actions.server.ts with getDailyReportHeader**

Create `src/features/Operaciones/PartesDiarios/detail/actions.server.ts`:

```typescript
'use server';

import { prisma } from '@/shared/lib/prisma';
import { Logger } from '@/lib/logger';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import {
  parseSearchParams,
  stateToPrismaParams,
  buildSearchWhere,
  buildFiltersWhere,
  buildTextFiltersWhere,
  buildDateRangeFiltersWhere,
} from '@/shared/components/common/DataTable';

const logger = new Logger('features/Operaciones/PartesDiarios/detail');

// ============================================================================
// READ — Header
// ============================================================================

export async function getDailyReportHeader(dailyReportId: string) {
  logger.debug('getDailyReportHeader', { data: { dailyReportId } });

  try {
    const data = await prisma.dailyreport.findUnique({
      where: { id: dailyReportId },
      select: {
        id: true,
        date: true,
        status: true,
      },
    });

    return data;
  } catch (error) {
    logger.error('Error en getDailyReportHeader', { data: { error, dailyReportId } });
    throw error;
  }
}
```

- [ ] **Step 2: Add getDailyReportDetailPaginated — the main query with JOINs**

This is the critical function. One Prisma query replaces 4 Supabase queries + 1 RPC.

Append to `actions.server.ts`:

```typescript
// ============================================================================
// READ — Paginated detail rows (main table)
// ============================================================================

// Shared select for rows — used by paginated, export, and single row queries
const DETAIL_ROW_SELECT = {
  id: true,
  daily_report_id: true,
  customer_id: true,
  service_id: true,
  item_id: true,
  start_time: true,
  end_time: true,
  description: true,
  status: true,
  working_day: true,
  document_path: true,
  sector_service_id: true,
  areas_service_id: true,
  remit_number: true,
  cancel_reason: true,
  type_service: true,
  completed_day: true,
  completed_night: true,
  preparte_id: true,
  last_comercial_edit_at: true,
  customers: { select: { id: true, name: true } },
  customer_services: { select: { id: true, service_name: true } },
  service_items: { select: { id: true, item_name: true } },
  service_sectors: { select: { id: true, sectors: { select: { id: true, name: true } } } },
  service_areas: { select: { id: true, areas_cliente: { select: { id: true, descripcion_corta: true } } } },
  preparte: { select: { id: true } },
  remitos: {
    select: {
      id: true,
      remit_number: true,
      is_linked: true,
      _count: { select: { remito_documents: true } },
    },
  },
} as const;

// Employee relations select — includes diagram for deviation detection
function getEmployeeRelationSelect(reportDate: Date) {
  return {
    select: {
      id: true,
      employee_id: true,
      role: true,
      employees: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          file_number: true,
          employees_diagram: {
            where: { date: reportDate },
            take: 1,
            select: {
              id: true,
              diagram_type: { select: { id: true, name: true, is_working_day: true } },
            },
          },
        },
      },
    },
  } as const;
}

const EQUIPMENT_RELATION_SELECT = {
  select: {
    id: true,
    equipment_id: true,
    other_equipment_id: true,
    vehicles: {
      select: {
        id: true,
        domain: true,
        intern_number: true,
        brand_vehicles: { select: { name: true } },
      },
    },
    other_equipment: {
      select: {
        id: true,
        intern_number: true,
        serial_number: true,
      },
    },
  },
} as const;

const CUSTOMER_EQUIPMENT_RELATION_SELECT = {
  select: {
    id: true,
    customer_equipment_id: true,
    equipos_clientes: { select: { id: true, name: true, type: true } },
  },
} as const;

// Valid sort fields whitelist
const VALID_SORT_FIELDS = [
  'status',
  'working_day',
  'start_time',
  'end_time',
  'description',
  'remit_number',
  'type_service',
  'completed_day',
  'completed_night',
  'cancel_reason',
] as const;

// FK sort mapping
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  customer: (dir) => ({ customers: { name: dir } }),
  service: (dir) => ({ customer_services: { service_name: dir } }),
  item: (dir) => ({ service_items: { item_name: dir } }),
  sector: (dir) => ({ service_sectors: { sectors: { name: dir } } }),
  area: (dir) => ({ service_areas: { areas_cliente: { descripcion_corta: dir } } }),
};

// Text filter columns to exclude from faceted buildFiltersWhere
const TEXT_FILTER_COLUMNS = ['description', 'remit_number', 'start_time', 'end_time'];

// Build the shared WHERE clause — used by paginated, export, and facets
function buildWhereClause(dailyReportId: string, state: ReturnType<typeof parseSearchParams>, excludeColumn?: string) {
  const baseWhere = { daily_report_id: dailyReportId };

  const searchWhere = state.search
    ? buildSearchWhere(state.search, [
        'description',
        'remit_number',
        'customers.name',
        'customer_services.service_name',
        'service_items.item_name',
      ])
    : {};

  const filtersWhere = buildFiltersWhere(
    state.columnFilters.filter((f) => !TEXT_FILTER_COLUMNS.includes(f.id)),
    {
      // FK mappings: columnId → { prismaRelation: prismaField }
      customer: { customers: 'id' },
      service: { customer_services: 'id' },
      item: { service_items: 'id' },
      sector: { service_sectors: 'id' },
      area: { service_areas: 'id' },
    },
    excludeColumn
  );

  const textWhere = buildTextFiltersWhere(state.columnFilters.filter((f) => TEXT_FILTER_COLUMNS.includes(f.id)));

  const dateWhere = buildDateRangeFiltersWhere(state.columnFilters);

  return {
    AND: [baseWhere, searchWhere, filtersWhere, textWhere, dateWhere].filter((w) => Object.keys(w).length > 0),
  };
}

export async function getDailyReportDetailPaginated(
  dailyReportId: string,
  searchParams: DataTableSearchParams,
  reportDate?: Date
) {
  logger.debug('getDailyReportDetailPaginated', { data: { dailyReportId } });

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildWhereClause(dailyReportId, state);

    // Resolve sorting
    let orderBy: Record<string, unknown>[] = [];
    for (const sort of state.sorting) {
      const fkMapper = FK_SORT_MAP[sort.id];
      if (fkMapper) {
        orderBy.push(fkMapper(sort.desc ? 'desc' : 'asc'));
      } else if ((VALID_SORT_FIELDS as readonly string[]).includes(sort.id)) {
        orderBy.push({ [sort.id]: sort.desc ? 'desc' : 'asc' });
      }
    }
    if (orderBy.length === 0) {
      orderBy = [{ customers: { name: 'asc' } }];
    }

    // Need reportDate for employee diagram JOIN
    let effectiveReportDate = reportDate;
    if (!effectiveReportDate) {
      const header = await prisma.dailyreport.findUnique({
        where: { id: dailyReportId },
        select: { date: true },
      });
      effectiveReportDate = header?.date ?? new Date();
    }

    const [data, total] = await Promise.all([
      prisma.dailyreportrows.findMany({
        where,
        select: {
          ...DETAIL_ROW_SELECT,
          dailyreportemployeerelations: getEmployeeRelationSelect(effectiveReportDate),
          dailyreportequipmentrelations: EQUIPMENT_RELATION_SELECT,
          dailyreport_customer_equipment_relations: CUSTOMER_EQUIPMENT_RELATION_SELECT,
        },
        skip,
        take,
        orderBy,
      }),
      prisma.dailyreportrows.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error en getDailyReportDetailPaginated', { data: { error, dailyReportId } });
    throw error;
  }
}
```

- [ ] **Step 3: Add getDailyReportDetailForExport**

Append to `actions.server.ts`:

```typescript
// ============================================================================
// READ — Export (all rows with active filters, no pagination)
// ============================================================================

export async function getDailyReportDetailForExport(dailyReportId: string, searchParams: DataTableSearchParams) {
  logger.debug('getDailyReportDetailForExport', { data: { dailyReportId } });

  try {
    const state = parseSearchParams(searchParams);
    const where = buildWhereClause(dailyReportId, state);

    const header = await prisma.dailyreport.findUnique({
      where: { id: dailyReportId },
      select: { date: true },
    });

    const data = await prisma.dailyreportrows.findMany({
      where,
      select: {
        ...DETAIL_ROW_SELECT,
        dailyreportemployeerelations: getEmployeeRelationSelect(header?.date ?? new Date()),
        dailyreportequipmentrelations: EQUIPMENT_RELATION_SELECT,
        dailyreport_customer_equipment_relations: CUSTOMER_EQUIPMENT_RELATION_SELECT,
      },
      orderBy: { customers: { name: 'asc' } },
    });

    return data;
  } catch (error) {
    logger.error('Error en getDailyReportDetailForExport', { data: { error, dailyReportId } });
    throw error;
  }
}
```

- [ ] **Step 4: Add getDailyReportDetailSingleFacet**

Append to `actions.server.ts`. This replaces the 10 `querySelectDistinct` RPC calls with a single-column facet query with cross-filter:

```typescript
// ============================================================================
// READ — Single facet (lazy-load, cross-filter)
// ============================================================================

export async function getDailyReportDetailSingleFacet(
  dailyReportId: string,
  columnId: string,
  searchParams: DataTableSearchParams
) {
  logger.debug('getDailyReportDetailSingleFacet', { data: { dailyReportId, columnId } });

  try {
    const state = parseSearchParams(searchParams);
    // Cross-filter: exclude the column being faceted
    const where = buildWhereClause(dailyReportId, state, columnId);

    // Map columnId to Prisma groupBy field or custom query
    // Each case returns { counts: Map<string, number>, resolvedOptions?: Array<{value, label}> }

    switch (columnId) {
      case 'status': {
        const groups = await prisma.dailyreportrows.groupBy({
          by: ['status'],
          where,
          _count: true,
        });
        const counts = new Map(groups.map((g) => [g.status ?? '__null__', g._count]));
        return { counts };
      }

      case 'type_service': {
        const groups = await prisma.dailyreportrows.groupBy({
          by: ['type_service'],
          where,
          _count: true,
        });
        const counts = new Map(groups.map((g) => [g.type_service ?? '__null__', g._count]));
        return { counts };
      }

      case 'working_day': {
        const groups = await prisma.dailyreportrows.groupBy({
          by: ['working_day'],
          where,
          _count: true,
        });
        const counts = new Map(groups.map((g) => [g.working_day ?? '__null__', g._count]));
        return { counts };
      }

      case 'completed_day':
      case 'completed_night': {
        const groups = await prisma.dailyreportrows.groupBy({
          by: [columnId],
          where,
          _count: true,
        });
        const counts = new Map(groups.map((g) => [String(g[columnId] ?? '__null__'), g._count]));
        return { counts };
      }

      case 'customer': {
        const groups = await prisma.dailyreportrows.groupBy({
          by: ['customer_id'],
          where,
          _count: true,
        });
        const customerIds = groups.map((g) => g.customer_id).filter(Boolean) as string[];
        const customers = await prisma.customers.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, name: true },
        });
        const counts = new Map(groups.map((g) => [g.customer_id ?? '__null__', g._count]));
        const resolvedOptions = customers.map((c) => ({ value: c.id, label: c.name }));
        return { counts, resolvedOptions };
      }

      case 'service': {
        const groups = await prisma.dailyreportrows.groupBy({
          by: ['service_id'],
          where,
          _count: true,
        });
        const serviceIds = groups.map((g) => g.service_id).filter(Boolean) as string[];
        const services = await prisma.customer_services.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, service_name: true },
        });
        const counts = new Map(groups.map((g) => [g.service_id ?? '__null__', g._count]));
        const resolvedOptions = services.map((s) => ({ value: s.id, label: s.service_name }));
        return { counts, resolvedOptions };
      }

      case 'item': {
        const groups = await prisma.dailyreportrows.groupBy({
          by: ['item_id'],
          where,
          _count: true,
        });
        const itemIds = groups.map((g) => g.item_id).filter(Boolean) as string[];
        const items = await prisma.service_items.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, item_name: true },
        });
        const counts = new Map(groups.map((g) => [g.item_id ?? '__null__', g._count]));
        const resolvedOptions = items.map((i) => ({ value: i.id, label: i.item_name }));
        return { counts, resolvedOptions };
      }

      case 'sector': {
        const groups = await prisma.dailyreportrows.groupBy({
          by: ['sector_service_id'],
          where,
          _count: true,
        });
        const sectorIds = groups.map((g) => g.sector_service_id).filter(Boolean) as string[];
        const sectors = await prisma.service_sectors.findMany({
          where: { id: { in: sectorIds } },
          select: { id: true, sectors: { select: { name: true } } },
        });
        const counts = new Map(groups.map((g) => [g.sector_service_id ?? '__null__', g._count]));
        const resolvedOptions = sectors.map((s) => ({
          value: s.id,
          label: s.sectors?.name ?? 'Sin nombre',
        }));
        return { counts, resolvedOptions };
      }

      case 'area': {
        const groups = await prisma.dailyreportrows.groupBy({
          by: ['areas_service_id'],
          where,
          _count: true,
        });
        const areaIds = groups.map((g) => g.areas_service_id).filter(Boolean) as string[];
        const areas = await prisma.service_areas.findMany({
          where: { id: { in: areaIds } },
          select: { id: true, areas_cliente: { select: { descripcion_corta: true } } },
        });
        const counts = new Map(groups.map((g) => [g.areas_service_id ?? '__null__', g._count]));
        const resolvedOptions = areas.map((a) => ({
          value: a.id,
          label: a.areas_cliente?.descripcion_corta ?? 'Sin nombre',
        }));
        return { counts, resolvedOptions };
      }

      default: {
        logger.warn('Unknown facet column', { data: { columnId } });
        return { counts: new Map<string, number>() };
      }
    }
  } catch (error) {
    logger.error('Error en getDailyReportDetailSingleFacet', { data: { error, columnId } });
    throw error;
  }
}
```

- [ ] **Step 5: Add getDailyReportRowHistory**

Append to `actions.server.ts`:

```typescript
// ============================================================================
// READ — Row history
// ============================================================================

export async function getDailyReportRowHistory(rowId: string) {
  logger.debug('getDailyReportRowHistory', { data: { rowId } });

  try {
    const history = await prisma.dailyreportrows_history.findMany({
      where: { daily_report_row_id: rowId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        action_type: true,
        related_table: true,
        related_id: true,
        changed_fields: true,
        changed_data: true,
        metadata: true,
        reassignment_reason: true,
        changed_by: true,
        created_at: true,
      },
    });

    return history;
  } catch (error) {
    logger.error('Error en getDailyReportRowHistory', { data: { error, rowId } });
    throw error;
  }
}
```

- [ ] **Step 6: Create types/index.ts with inferred types**

Create `src/features/Operaciones/PartesDiarios/detail/types/index.ts`:

```typescript
import type {
  getDailyReportHeader,
  getDailyReportDetailPaginated,
  getDailyReportDetailForExport,
  getDailyReportRowHistory,
} from '../actions.server';

// Header
export type DailyReportHeaderData = NonNullable<Awaited<ReturnType<typeof getDailyReportHeader>>>;

// Detail row (from paginated)
export type DailyReportDetailPaginatedResult = Awaited<ReturnType<typeof getDailyReportDetailPaginated>>;
export type DailyReportDetailRow = DailyReportDetailPaginatedResult['data'][number];

// Export row
export type DailyReportExportRow = Awaited<ReturnType<typeof getDailyReportDetailForExport>>[number];

// History entry
export type DailyReportHistoryEntry = Awaited<ReturnType<typeof getDailyReportRowHistory>>[number];
```

- [ ] **Step 7: Run check-types**

Run: `npm run check-types`
Expected: No errors in the new files. If there are Prisma schema mismatches, fix the select/include fields.

---

## Task 2: Server Actions — WRITE Operations

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/actions.server.ts`
- Reference: Current `actions/actions.ts` (for understanding existing write logic)

**Depends on:** Task 1

- [ ] **Step 1: Add createDailyReportRow with $transaction**

Read the current `createDailyReportRow` in `actions/actions.ts` to understand the field mapping. Then append to `detail/actions.server.ts` the new version using `prisma.$transaction`. Include creating employee relations, equipment relations, and customer equipment relations atomically.

- [ ] **Step 2: Add updateDailyReportRow with $transaction**

Read the current `updateDailyReportRow` in `actions/actions.ts`. The new version uses `prisma.$transaction` to:

1. Update the row fields
2. Delete all existing relations (employee, equipment, customer_equipment)
3. Re-create relations from the new data
   This replaces the current pattern of 4-5 sequential Supabase calls.

- [ ] **Step 3: Add deleteDailyReportRow**

Read the current `deleteDailyReportRow`. The new version uses `prisma.$transaction` to:

1. If the row has a `preparte_id`, revert the preparte status
2. Delete the row (cascade deletes relations via FK constraints)

- [ ] **Step 4: Add bulkUpdateRowStatus**

Server action that receives an array of row IDs and updates their status (and optionally other fields like `working_day`). Uses `prisma.dailyreportrows.updateMany`.

- [ ] **Step 5: Add cloneDailyReportRows**

Read the current clone logic in `ClonarRegistrosButton.tsx`. The new version is a server action that:

1. Receives source daily_report_id, target dates, and row IDs to clone
2. For each target date, ensures a `dailyreport` header exists (findOrCreate)
3. Clones each selected row with its relations into the target daily report
4. All within a `prisma.$transaction`

- [ ] **Step 6: Run check-types**

Run: `npm run check-types`

---

## Task 3: Skeletons, Store, and Hooks

**Files:**

- Create: `src/features/Operaciones/PartesDiarios/detail/fallback/DailyReportHeaderSkeleton.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/fallback/DailyReportDetailSkeleton.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/hooks/useDailyReportDetail.ts`
- Modify: `src/features/Operaciones/PartesDiarios/store/dailyReportFormStore.ts`

**Depends on:** None (can run in parallel with Task 1 and 2)

- [ ] **Step 1: Create DailyReportHeaderSkeleton**

Create `src/features/Operaciones/PartesDiarios/detail/fallback/DailyReportHeaderSkeleton.tsx`:

```tsx
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DailyReportHeaderSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-1 h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-9 w-20" />
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Create DailyReportDetailSkeleton**

Create `src/features/Operaciones/PartesDiarios/detail/fallback/DailyReportDetailSkeleton.tsx`:

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DailyReportDetailSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-9 w-9" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          {/* Table header */}
          <div className="flex gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 flex-1" />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              {Array.from({ length: 8 }).map((_, j) => (
                <Skeleton key={j} className="h-10 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create useDailyReportDetail hook**

Create `src/features/Operaciones/PartesDiarios/detail/hooks/useDailyReportDetail.ts`:

```typescript
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export const DAILY_REPORT_DETAIL_QUERY_KEY = ['daily-report-detail'] as const;

export function useDailyReportDetailInvalidation() {
  const queryClient = useQueryClient();

  const invalidateDetail = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [...DAILY_REPORT_DETAIL_QUERY_KEY] });
  }, [queryClient]);

  return { invalidateDetail };
}
```

- [ ] **Step 4: Simplify Zustand store**

Read current `store/dailyReportFormStore.ts`, then rewrite:

```typescript
import { create } from 'zustand';

interface DailyReportFormStore {
  isOpen: boolean;
  editingRowId: string | null;
  open: (rowId?: string) => void;
  close: () => void;
}

export const useDailyReportFormStore = create<DailyReportFormStore>((set) => ({
  isOpen: false,
  editingRowId: null,
  open: (rowId) => set({ isOpen: true, editingRowId: rowId ?? null }),
  close: () => set({ isOpen: false, editingRowId: null }),
}));
```

- [ ] **Step 5: Run check-types**

Run: `npm run check-types`

---

## Task 4: Main DataTable — Delegate to table-expert

**Files:**

- Create: `src/features/Operaciones/PartesDiarios/detail/columns.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/_DailyReportDetailDataTable.tsx`

**Depends on:** Task 1

**IMPORTANT:** This task MUST be delegated to the `table-expert` agent with mode CREATE. Provide it with:

- **Entity**: `dailyreportrows` (detail rows of a specific daily report)
- **tableId**: `daily-report-detail`
- **paramNamespace**: `daily-report-detail`
- **Server actions**: Already created in `detail/actions.server.ts` (Task 1):
  - `getDailyReportDetailPaginated(dailyReportId, searchParams, reportDate)` for queryFn
  - `getDailyReportDetailForExport(dailyReportId, searchParams)` for export
  - `getDailyReportDetailSingleFacet(dailyReportId, columnId, searchParams)` for lazy-load facets
- **Type**: `DailyReportDetailRow` from `detail/types/index.ts`
- **Columns spec**: See spec section "Tabla 1: Filas del Parte Diario (principal)"
- **Special**: The `queryFn` and `fetchFacet` callbacks need to bind `dailyReportId` (received as prop from Server Component)
- **Permisos**: Receives `canUpdate` and `canDelete` as boolean props (not permissionsMap)
- **Dynamic imports**: DailyReportRowForm, HistoryDialog, RemitosManagerDialog, CloneRowsDialog
- **actions column**: Ver detalle, Editar, Historial, Remitos, Eliminar (Editar/Eliminar conditioned to canUpdate/canDelete)
- **Employee cell**: Badge with `[legajo] Apellido` + deviation icons
- **`enableRowSelection`**: true (for bulk edit and clone)

- [ ] **Step 1: Dispatch table-expert agent in CREATE mode**
- [ ] **Step 2: Review output, verify columns match spec**
- [ ] **Step 3: Run check-types**

---

## Task 5: Server Components — Header + Page

**Files:**

- Create: `src/features/Operaciones/PartesDiarios/detail/DailyReportHeader.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/DailyReportDetailTable.tsx`
- Modify: `src/app/dashboard/operations/[uuid]/page.tsx`

**Depends on:** Task 1, Task 3, Task 4

- [ ] **Step 1: Create DailyReportHeader server component**

Create `src/features/Operaciones/PartesDiarios/detail/DailyReportHeader.tsx`:

```tsx
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { checkPermissionServer } from '@/features/Permissions';
import BackButton from '@/shared/components/common/BackButton';
import { dailyReportStatusBadges, dailyReportStatusLabels } from '@/shared/utils/mappers';
import moment from 'moment';
import { getDailyReportHeader } from './actions.server';

interface Props {
  uuid: string;
}

export async function DailyReportHeader({ uuid }: Props) {
  const [header, canUpdate] = await Promise.all([
    getDailyReportHeader(uuid),
    checkPermissionServer('operaciones', 'detalle-parte-diario', 'update'),
  ]);

  if (!header) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Parte diario</CardTitle>
              {header.status && (
                <Badge variant={dailyReportStatusBadges[header.status] ?? 'default'}>
                  {dailyReportStatusLabels[header.status] ?? header.status}
                </Badge>
              )}
            </div>
            <CardDescription>Fecha: {moment(header.date).format('DD/MM/YYYY')}</CardDescription>
          </div>
        </div>
        <BackButton />
      </div>
    </Card>
  );
}
```

Note: The "Crear" button will be inside the DataTable toolbar (managed by \_DailyReportDetailDataTable), not in the header.

- [ ] **Step 2: Create DailyReportDetailTable server component**

Create `src/features/Operaciones/PartesDiarios/detail/DailyReportDetailTable.tsx`:

```tsx
import { getTablePreferences } from '@/shared/actions/table-preferences';
import { stripPrefixFromSearchParams } from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { checkPermissionServer } from '@/features/Permissions';
import { Card, CardContent } from '@/components/ui/card';
import { getDailyReportDetailPaginated, getDailyReportHeader } from './actions.server';
import { _DailyReportDetailDataTable } from './components/_DailyReportDetailDataTable';

const TABLE_ID = 'daily-report-detail';

interface Props {
  uuid: string;
  searchParams: DataTableSearchParams;
}

export async function DailyReportDetailTable({ uuid, searchParams }: Props) {
  const tableParams = stripPrefixFromSearchParams(searchParams, TABLE_ID);

  // Get report date for employee diagram JOIN
  const header = await getDailyReportHeader(uuid);
  const reportDate = header?.date ?? new Date();

  const [{ data, total }, preferences, canUpdate, canDelete] = await Promise.all([
    getDailyReportDetailPaginated(uuid, tableParams, reportDate),
    getTablePreferences(TABLE_ID),
    checkPermissionServer('operaciones', 'detalle-parte-diario', 'update'),
    checkPermissionServer('operaciones', 'detalle-parte-diario', 'delete'),
  ]);

  return (
    <Card>
      <CardContent className="pt-6">
        <_DailyReportDetailDataTable
          data={data}
          totalRows={total}
          searchParams={tableParams}
          tableId={TABLE_ID}
          dailyReportId={uuid}
          reportDate={reportDate.toISOString()}
          canUpdate={canUpdate}
          canDelete={canDelete}
          initialColumnVisibility={preferences.columnVisibility ?? {}}
          initialFilterVisibility={preferences.filterVisibility ?? {}}
        />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Rewrite page.tsx with atomic Suspense**

Rewrite `src/app/dashboard/operations/[uuid]/page.tsx`:

```tsx
import { Suspense } from 'react';
import { DailyReportHeader } from '@/features/Operaciones/PartesDiarios/detail/DailyReportHeader';
import { DailyReportDetailTable } from '@/features/Operaciones/PartesDiarios/detail/DailyReportDetailTable';
import { DailyReportHeaderSkeleton } from '@/features/Operaciones/PartesDiarios/detail/fallback/DailyReportHeaderSkeleton';
import { DailyReportDetailSkeleton } from '@/features/Operaciones/PartesDiarios/detail/fallback/DailyReportDetailSkeleton';
import { checkPermissionServer } from '@/features/Permissions';
import { redirect } from 'next/navigation';
import { getDailyReportHeader } from '@/features/Operaciones/PartesDiarios/detail/actions.server';
import moment from 'moment';

async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  // Permission check — redirect if no view access
  const canView = await checkPermissionServer('operaciones', 'detalle-parte-diario', 'view');
  if (!canView) redirect('/dashboard');

  return (
    <div className="mx-6 mt-4 space-y-6">
      <Suspense fallback={<DailyReportHeaderSkeleton />}>
        <DailyReportHeader uuid={resolvedParams.uuid} />
      </Suspense>
      <Suspense fallback={<DailyReportDetailSkeleton />}>
        <DailyReportDetailTable uuid={resolvedParams.uuid} searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  );
}

export default Page;

export async function generateMetadata({ params }: { params: Promise<{ uuid: string }> }) {
  const resolvedParams = await params;
  const header = await getDailyReportHeader(resolvedParams.uuid);
  return {
    title: `Parte diario - ${header ? moment(header.date).format('DD/MM/YYYY') : ''}`,
    description: 'Detalle del parte diario',
  };
}
```

- [ ] **Step 4: Run check-types**

Run: `npm run check-types`

---

## Task 6: DailyReportRowForm — Decomposed

**Files:**

- Create: `src/features/Operaciones/PartesDiarios/detail/components/DailyReportRowForm/schema.ts`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/DailyReportRowForm/index.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/DailyReportRowForm/CustomerServiceSection.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/DailyReportRowForm/EmployeeSection.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/DailyReportRowForm/EquipmentSection.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/DailyReportRowForm/ScheduleSection.tsx`
- Reference: Current `components/DailyReportRowForm.tsx` (800+ lines, for field mapping)

**Depends on:** Task 2, Task 3

This is a complex task. Read the current `DailyReportRowForm.tsx` carefully to understand ALL fields and their behavior. Key changes:

1. **schema.ts**: Extract Zod schema from the monolith. Keep all refinements (cancel_reason required when cancelled, etc.)
2. **CustomerServiceSection**: 3 cascading Combobox (Cliente → Servicio → Ítem). Each loads on-demand with `useQuery` + `enabled`. Create server actions for `getServicesForCustomer(customerId)` and `getItemsForService(serviceId)` in `detail/actions.server.ts`.
3. **EmployeeSection**: Shows selected employees as badges with roles. "Seleccionar por característica" button opens EmployeeSelectorDialog (Task 7). Role assignment (chofer_dia, chofer_noche, etc.) for 12/24hr shifts.
4. **EquipmentSection**: Shows selected equipment as badges. Button opens EquipmentSelectorDialog (Task 8). Also handles "otros equipos" and "equipos cliente".
5. **ScheduleSection**: Working day select, start/end time inputs, status select, type_service, description textarea, cancel reason, reprogram date.
6. **index.tsx**: Sheet wrapper. Uses `useDailyReportFormStore` for open/close. `useForm` with zodResolver. Orchestrates sections. Calls `createDailyReportRow` or `updateDailyReportRow` on submit. Invalidates queries on success.

- [ ] **Step 1: Create schema.ts** — Extract Zod schema from current DailyReportRowForm.tsx. Replace `date-fns` with `moment`. Export `dailyReportRowSchema` and `DailyReportRowFormValues`.

- [ ] **Step 2: Add cascading server actions** — Add `getServicesForCustomer(customerId)` and `getItemsForService(serviceId)` to `detail/actions.server.ts`.

- [ ] **Step 3: Create CustomerServiceSection.tsx** — 3 Combobox with cascading `useQuery` + `enabled`.

- [ ] **Step 4: Create EmployeeSection.tsx** — Badge list with roles + trigger for EmployeeSelectorDialog.

- [ ] **Step 5: Create EquipmentSection.tsx** — Badge list + trigger for EquipmentSelectorDialog + otros equipos + equipos cliente.

- [ ] **Step 6: Create ScheduleSection.tsx** — All schedule/status fields.

- [ ] **Step 7: Create index.tsx (orchestrator)** — Sheet + useForm + sections + submit handlers. Max ~150 lines. Use `next/dynamic` for the selector dialogs.

- [ ] **Step 8: Run check-types**

---

## Task 7: Employee Selector DataTable — Delegate to table-expert

**Files:**

- Create: `src/features/Operaciones/PartesDiarios/detail/components/EmployeeSelector/actions.server.ts`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/EmployeeSelector/columns.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/EmployeeSelector/_EmployeeSelectorDataTable.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/EmployeeSelector/EmployeeSelectorDialog.tsx`

**Depends on:** Task 1 (for types)

**IMPORTANT:** Delegate to `table-expert` agent in CREATE mode. Provide:

- **Entity**: `employees` (active employees with diagram for a specific date)
- **tableId**: `employee-selector`
- **paramNamespace**: `emp-sel`
- **Special behavior**: `enableRowSelection: true`. Previously selected IDs (from form field) must be received as prop and rendered with disabled checkbox. Badge "No asignado" (orange) when employee is not in `contractor_employee` for the selected customer. Diagram deviation badges.
- **Columns spec**: See spec section "Tabla 2: Selector de Empleados"
- **Dialog wrapper**: `EmployeeSelectorDialog` wraps the DataTable in a `Dialog` component. Receives `onSelect(selectedIds: string[])` callback and `alreadySelectedIds: string[]` prop.
- **No export config** — this is a selector, not a data view
- **The `reportDate` must be passed** to the server action so it can include `employees_diagram` filtered for that date

- [ ] **Step 1: Create actions.server.ts** — `getActiveEmployeesPaginated(searchParams, reportDate)` and `getEmployeeSelectorSingleFacet(columnId, searchParams)`
- [ ] **Step 2: Dispatch table-expert for columns + DataTable client component**
- [ ] **Step 3: Create EmployeeSelectorDialog wrapper**
- [ ] **Step 4: Run check-types**

---

## Task 8: Equipment Selector DataTable — Delegate to table-expert

**Files:**

- Create: `src/features/Operaciones/PartesDiarios/detail/components/EquipmentSelector/actions.server.ts`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/EquipmentSelector/columns.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/EquipmentSelector/_EquipmentSelectorDataTable.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/EquipmentSelector/EquipmentSelectorDialog.tsx`

**Depends on:** Task 1 (for types)

**IMPORTANT:** Delegate to `table-expert` agent in CREATE mode. Same pattern as Task 7 but for vehicles/equipment.

- **Entity**: `vehicles` (active vehicles)
- **tableId**: `equipment-selector`
- **paramNamespace**: `eq-sel`
- **Columns spec**: See spec section "Tabla 3: Selector de Equipos"
- **Special behavior**: `enableRowSelection: true`. Already selected IDs disabled. Badge "No asignado" for equipment not in `contractor_equipment` for selected customer.
- **No export config**

- [ ] **Step 1: Create actions.server.ts** — `getActiveEquipmentPaginated(searchParams)` and `getEquipmentSelectorSingleFacet(columnId, searchParams)`
- [ ] **Step 2: Dispatch table-expert for columns + DataTable client component**
- [ ] **Step 3: Create EquipmentSelectorDialog wrapper**
- [ ] **Step 4: Run check-types**

---

## Task 9: Simple Modals — Delete, ServiceDetail, History, BulkEdit

**Files:**

- Create: `src/features/Operaciones/PartesDiarios/detail/components/DeleteRowDialog.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/ServiceDetailDialog.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/HistoryDialog.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/BulkEditModal.tsx`
- Reference: Current modals in `components/` for UI/UX behavior

**Depends on:** Task 1, Task 2, Task 3

- [ ] **Step 1: Create DeleteRowDialog** — AlertDialog using `deleteDailyReportRow` server action. Shows row info (customer + service). On success, calls `invalidateDetail()`.

- [ ] **Step 2: Create ServiceDetailDialog** — Read-only Dialog showing all row fields. Uses `DailyReportDetailRow` type. No server calls — data comes from the row prop.

- [ ] **Step 3: Create HistoryDialog** — Dialog that calls `getDailyReportRowHistory(rowId)` via `useQuery` on open. Shows timeline of changes. Skeleton while loading. No setTimeout.

- [ ] **Step 4: Create BulkEditModal** — Dialog for bulk updating status/working_day on selected rows. Calls `bulkUpdateRowStatus`. On success, invalidates detail query.

- [ ] **Step 5: Run check-types**

---

## Task 10: CloneRowsDialog

**Files:**

- Create: `src/features/Operaciones/PartesDiarios/detail/components/CloneRowsDialog.tsx`
- Reference: Current `ClonarRegistrosButton.tsx` for logic

**Depends on:** Task 2

- [ ] **Step 1: Create CloneRowsDialog** — Dialog that receives selected row IDs. User picks target dates (multi-date picker). Calls `cloneDailyReportRows(sourceId, targetDates, rowIds)`. Shows progress. On success, invalidates queries and shows toast.

- [ ] **Step 2: Run check-types**

---

## Task 11: Remitos Manager

**Files:**

- Create: `src/features/Operaciones/PartesDiarios/detail/components/RemitosManager/actions.server.ts`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/RemitosManager/RemitosManagerDialog.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/RemitosManager/AddRemitDialog.tsx`
- Create: `src/features/Operaciones/PartesDiarios/detail/components/RemitosManager/LinkRemitDialog.tsx`
- Reference: Current `remitManager/` for UI/logic

**Depends on:** Task 1, Task 2

- [ ] **Step 1: Create actions.server.ts** — All remito CRUD server actions with Prisma. Read current `remitManager/actionsClient.ts` for field mapping. Upload stays client-side (Supabase Storage).

- [ ] **Step 2: Create RemitosManagerDialog** — Root dialog. Lists remitos for a row via `useQuery` calling `getRemitosForRow`. Shows document counts. Actions: delete, unlink, edit number. Buttons to open AddRemitDialog and LinkRemitDialog.

- [ ] **Step 3: Create AddRemitDialog** — Nested dialog. Form with remit number + file upload. Calls `createRemito` server action + Supabase storage upload for documents.

- [ ] **Step 4: Create LinkRemitDialog** — Nested dialog. Lists available remitos via `getAvailableRemitosForLinking`. User selects one. Calls `linkExistingRemito`.

- [ ] **Step 5: Run check-types**

---

## Task 12: Integration — Wire Everything Together

**Files:**

- Modify: `src/features/Operaciones/PartesDiarios/detail/components/_DailyReportDetailDataTable.tsx`

**Depends on:** Tasks 4-11

- [ ] **Step 1: Wire all modals into the DataTable client component**

Verify that `_DailyReportDetailDataTable.tsx` correctly imports and renders:

- DailyReportRowForm (dynamic import) — triggered by "Crear" button + edit action
- BulkEditModal — triggered by bulk selection toolbar action
- CloneRowsDialog (dynamic import) — triggered by bulk selection toolbar action
- DeleteRowDialog — triggered by per-row action
- HistoryDialog (dynamic import) — triggered by per-row action
- ServiceDetailDialog — triggered by per-row action
- RemitosManagerDialog (dynamic import) — triggered by per-row action

- [ ] **Step 2: Verify query invalidation flow**

After every mutation (create, update, delete, bulk edit, clone), verify `invalidateDetail()` is called to refresh the table.

- [ ] **Step 3: Run check-types**

Run: `npm run check-types`
Expected: PASS with zero errors.

---

## Task 13: Cleanup + Final Verification

**Files:**

- Delete: All 20 files listed in spec "Archivos a Eliminar"
- Modify: Any remaining imports that reference deleted files

**Depends on:** Task 12

- [ ] **Step 1: Delete old files**

Delete each file listed in the spec's "Archivos a Eliminar" section. Before deleting, grep for imports of each file to ensure nothing outside the operations detail page references them.

- [ ] **Step 2: Update any remaining imports**

Search for imports referencing deleted files. Update them to point to the new locations. Pay special attention to:

- `transformDailyReports` was imported by `DailyReportRowForm.tsx` from `DayliReportDetailTable.tsx` — this dependency is eliminated in the new code
- `DailyReportRow` type was imported by `BulkEditModal.tsx` from legacy — new version uses `DailyReportDetailRow`

- [ ] **Step 3: Run final check-types**

Run: `npm run check-types`
Expected: PASS with zero errors.

- [ ] **Step 4: Manual smoke test checklist**

Test these flows in the browser:

1. Navigate to `/dashboard/operations/[uuid]` — header loads first, table streams in
2. Table loads with data, pagination works
3. Filters: open a faceted filter, verify lazy-load (skeleton then options)
4. Search: type in search bar, verify filtering
5. Create: click "Crear", fill form, save — row appears in table
6. Edit: click edit on a row, modify fields, save — row updates
7. Delete: click delete, confirm — row disappears
8. Bulk edit: select rows, click bulk edit, change status, save
9. Clone: select rows, clone to a future date, verify clone
10. History: click history on a row, verify timeline shows
11. Remitos: open remito manager, create/link/delete remitos
12. Export: export with active filters, verify Excel contains filtered data
13. Employee selector: open "Seleccionar por característica" in form, verify paginated table with filters
14. Equipment selector: same as above for equipment
