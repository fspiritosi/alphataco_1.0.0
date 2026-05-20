'use server';

import type { TireRetreadLevel, TireStatus } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import {
  NULL_FILTER_VALUE,
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildSearchWhere,
  buildTextFiltersWhere,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/Mantenimiento/Gomeria/Catalogo');

// ============================================================================
// TIRES CATALOG — CONSTANTS
// ============================================================================

const TIRE_SELECT = {
  id: true,
  serial_number: true,
  brand_id: true,
  tire_type_id: true,
  is_new: true,
  retread_level: true,
  tread_depth: true,
  status: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  discard_photo: true,
  discard_comment: true,
  discarded_at: true,
  brand: { select: { id: true, name: true } },
  tire_type: { select: { id: true, name: true, size: true, tread_type: true } },
  vehicle_tire_positions: {
    select: { vehicle: { select: { id: true, domain: true } } },
    take: 1,
  },
};

/** Sortable direct fields */
const VALID_SORT_FIELDS = new Set([
  'serial_number',
  'status',
  'is_new',
  'retread_level',
  'tread_depth',
  'created_at',
  'brand_id',
  'tire_type_id',
]);

/** FK columns mapped to nested Prisma orderBy */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  brand_id: (dir) => ({ brand: { name: dir } }),
  tire_type_id: (dir) => ({ tire_type: { name: dir } }),
};

/** Text filter columns */
const TEXT_FILTER_COLUMNS = ['serial_number'];

/** Date range columns */
const DATE_RANGE_COLUMNS = ['created_at'];

// ============================================================================
// INTERNAL WHERE BUILDER
// ============================================================================

function buildTiresWhereClause(state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, ['serial_number']);

  const filtersWhere = buildFiltersWhere(
    state.filters,
    {},
    {
      exclude: [...TEXT_FILTER_COLUMNS, ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`])],
    }
  );

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS);
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  const filtersWhereAndConditions = (filtersWhere.AND as Record<string, unknown>[] | undefined) ?? [];
  const { AND: _discarded, ...filtersWhereWithoutAnd } = filtersWhere as Record<string, unknown> & {
    AND?: unknown;
  };

  return {
    is_active: true,
    ...searchWhere,
    ...filtersWhereWithoutAnd,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...(filtersWhereAndConditions.length > 0 ? { AND: filtersWhereAndConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getTiresPaginated(searchParams: DataTableSearchParams) {
  logger.debug('Fetching tires paginated');

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildTiresWhereClause(state);

    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }
    const safeOrderBy = [...resolvedSorts, { created_at: 'desc' as const }];

    const [raw, total] = await Promise.all([
      prisma.tires.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: TIRE_SELECT,
      }),
      prisma.tires.count({ where }),
    ]);

    // Prisma returns Decimal objects for tread_depth — serialize to number for RSC→Client serialization
    const data = raw.map((t) => ({ ...t, tread_depth: t.tread_depth != null ? t.tread_depth.toNumber() : null }));

    return { data, total };
  } catch (error) {
    logger.error('Error fetching tires paginated', { data: { error } });
    throw new Error(`Error al obtener las cubiertas: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// EXPORT QUERY
// ============================================================================

export async function getTiresForExport(searchParams: DataTableSearchParams) {
  logger.debug('Exporting tires');

  try {
    const state = parseSearchParams(searchParams);
    const where = buildTiresWhereClause(state);

    const raw = await prisma.tires.findMany({
      orderBy: [{ created_at: 'desc' }],
      where,
      select: TIRE_SELECT,
    });

    return raw.map((t) => ({ ...t, tread_depth: t.tread_depth != null ? t.tread_depth.toNumber() : null }));
  } catch (error) {
    logger.error('Error exporting tires', { data: { error } });
    throw new Error('Error al exportar las cubiertas');
  }
}

// ============================================================================
// SINGLE FACET (lazy-load, cross-filtering)
// ============================================================================

/**
 * Returns options and counts for a SINGLE faceted filter, with cross-filtering.
 * Called on-demand when a filter popover is opened.
 */
export async function getTireSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  const baseWhere = { is_active: true };

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) return baseWhere;
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildTiresWhereClause(modified);
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

    // ── Status enum (direct field on tires) ──
    if (columnId === 'status') {
      const rows = await prisma.tires.groupBy({
        by: ['status'],
        where,
        _count: true,
      });
      return {
        counts: toFacetMap(rows.map((r) => ({ key: r.status as string | null, count: r._count }))),
      };
    }

    // ── Retread level enum (direct field on tires, nullable) ──
    if (columnId === 'retread_level') {
      const rows = await prisma.tires.groupBy({
        by: ['retread_level'],
        where,
        _count: true,
      });
      return {
        counts: toFacetMap(rows.map((r) => ({ key: r.retread_level as string | null, count: r._count }))),
      };
    }

    // ── Tread type — via tire_type relation ──
    if (columnId === 'tread_type') {
      const grouped = await prisma.tires.groupBy({
        by: ['tire_type_id'],
        where,
        _count: true,
      });
      const typeIds = grouped.map((g) => g.tire_type_id).filter(Boolean) as string[];
      const types =
        typeIds.length > 0
          ? await prisma.tire_types.findMany({
              where: { id: { in: typeIds } },
              select: { id: true, tread_type: true },
            })
          : [];
      const typeMap = new Map(types.map((t) => [t.id, t.tread_type as string]));
      const finalCounts = new Map<string, number>();
      for (const g of grouped) {
        const tt = typeMap.get(g.tire_type_id);
        if (tt) {
          finalCounts.set(tt, (finalCounts.get(tt) ?? 0) + g._count);
        }
      }
      return { counts: finalCounts };
    }

    // ── Size — via tire_type relation ──
    if (columnId === 'size') {
      const grouped = await prisma.tires.groupBy({
        by: ['tire_type_id'],
        where,
        _count: true,
      });
      const typeIds = grouped.map((g) => g.tire_type_id).filter(Boolean) as string[];
      const types =
        typeIds.length > 0
          ? await prisma.tire_types.findMany({
              where: { id: { in: typeIds } },
              select: { id: true, size: true },
            })
          : [];
      const typeMap = new Map(types.map((t) => [t.id, t.size]));
      const finalCounts = new Map<string, number>();
      for (const g of grouped) {
        const sz = typeMap.get(g.tire_type_id);
        if (sz) {
          finalCounts.set(sz, (finalCounts.get(sz) ?? 0) + g._count);
        }
      }
      return { counts: finalCounts };
    }

    // ── Boolean: is_new ──
    if (columnId === 'is_new') {
      const rows = await prisma.tires.groupBy({ by: ['is_new'], where, _count: true });
      return {
        counts: toFacetMap(rows.map((r) => ({ key: String(r.is_new), count: r._count }))),
      };
    }

    // ── FK UUID: brand_id ──
    if (columnId === 'brand_id') {
      const rows = await prisma.tires.groupBy({ by: ['brand_id'], where, _count: true });
      const counts = toFacetMap(rows.map((r) => ({ key: r.brand_id, count: r._count })));
      const ids = rows.map((r) => r.brand_id).filter(Boolean) as string[];
      const resolvedOptions =
        ids.length > 0
          ? await prisma.tire_brands.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            })
          : [];
      return { counts, resolvedOptions };
    }

    // ── FK UUID: tire_type_id ──
    if (columnId === 'tire_type_id') {
      const rows = await prisma.tires.groupBy({ by: ['tire_type_id'], where, _count: true });
      const counts = toFacetMap(rows.map((r) => ({ key: r.tire_type_id, count: r._count })));
      const ids = rows.map((r) => r.tire_type_id).filter(Boolean) as string[];
      const resolvedOptions =
        ids.length > 0
          ? await prisma.tire_types.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            })
          : [];
      return { counts, resolvedOptions };
    }

    // ── Vehicle (current installation) — derived via vehicle_tire_positions ──
    if (columnId === 'vehicle') {
      const tiresWithVehicles = await prisma.tires.findMany({
        where,
        select: {
          id: true,
          vehicle_tire_positions: {
            where: { tire_id: { not: null } },
            select: { vehicle: { select: { id: true, domain: true } } },
            take: 1,
          },
        },
      });

      const countMap = new Map<string, number>();
      for (const tire of tiresWithVehicles) {
        const vehicleId = tire.vehicle_tire_positions[0]?.vehicle?.id ?? null;
        if (vehicleId == null) {
          countMap.set(NULL_FILTER_VALUE, (countMap.get(NULL_FILTER_VALUE) ?? 0) + 1);
        } else {
          countMap.set(vehicleId, (countMap.get(vehicleId) ?? 0) + 1);
        }
      }

      const vehicleIds = [...countMap.keys()].filter((k) => k !== NULL_FILTER_VALUE);
      const resolvedOptions =
        vehicleIds.length > 0
          ? (
              await prisma.vehicles.findMany({
                where: { id: { in: vehicleIds } },
                select: { id: true, domain: true },
              })
            ).map((v) => ({ id: v.id, name: v.domain }))
          : [];

      return { counts: countMap, resolvedOptions };
    }

    logger.warn('getTireSingleFacet: unknown columnId', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error getting tire single facet', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// CRUD ACTIONS
// ============================================================================

export async function createTire(data: {
  serial_number: string;
  brand_id: string;
  tire_type_id: string;
  is_new: boolean;
  retread_level?: TireRetreadLevel | null;
  tread_depth?: number | null;
  company_id: string;
}) {
  logger.debug('Creating tire', { data: { serial_number: data.serial_number } });
  try {
    const tire = await prisma.tires.create({
      data: {
        serial_number: data.serial_number,
        brand_id: data.brand_id,
        tire_type_id: data.tire_type_id,
        is_new: data.is_new,
        retread_level: data.retread_level ?? null,
        tread_depth: data.tread_depth ?? null,
        company_id: data.company_id,
      },
    });
    return tire;
  } catch (error) {
    logger.error('Error creating tire', { data: { error } });
    throw error;
  }
}

export async function createTiresBulk(data: {
  prefix: string;
  rangeFrom: number;
  rangeTo: number;
  brand_id: string;
  tire_type_id: string;
  is_new: boolean;
  retread_level?: TireRetreadLevel | null;
  tread_depth?: number | null;
  company_id: string;
}) {
  logger.debug('Creating tires bulk', {
    data: { prefix: data.prefix, rangeFrom: data.rangeFrom, rangeTo: data.rangeTo },
  });

  const count = data.rangeTo - data.rangeFrom + 1;
  if (count > 500) {
    throw new Error(`El rango supera el máximo permitido (500). Se intentaron crear ${count} cubiertas.`);
  }
  if (data.rangeFrom > data.rangeTo) {
    throw new Error('El número inicial no puede ser mayor al número final.');
  }

  // Generate serial numbers
  const serials = Array.from({ length: count }, (_, i) => `${data.prefix}${data.rangeFrom + i}`);

  // Check for conflicts in bulk
  const existing = await prisma.tires.findMany({
    where: { serial_number: { in: serials }, company_id: data.company_id },
    select: { serial_number: true },
  });

  if (existing.length > 0) {
    const conflicting = existing.map((t) => t.serial_number).join(', ');
    throw new Error(`Los siguientes números de serie ya existen: ${conflicting}`);
  }

  try {
    const result = await prisma.tires.createMany({
      data: serials.map((serial_number) => ({
        serial_number,
        brand_id: data.brand_id,
        tire_type_id: data.tire_type_id,
        is_new: data.is_new,
        retread_level: data.retread_level ?? null,
        tread_depth: data.tread_depth ?? null,
        company_id: data.company_id,
      })),
    });
    return result;
  } catch (error) {
    logger.error('Error in createTiresBulk', { data: { error } });
    throw error;
  }
}

export async function updateTire(
  id: string,
  data: {
    serial_number?: string;
    brand_id?: string;
    tire_type_id?: string;
    is_new?: boolean;
    retread_level?: TireRetreadLevel | null;
    tread_depth?: number | null;
  }
) {
  logger.debug('Updating tire', { data: { id } });
  try {
    const tire = await prisma.tires.update({
      where: { id },
      data: {
        ...data,
        tread_depth: data.tread_depth ?? null,
        retread_level: data.retread_level ?? null,
      },
    });
    return tire;
  } catch (error) {
    logger.error('Error updating tire', { data: { error, id } });
    throw error;
  }
}

export async function updateTireStatus(id: string, status: TireStatus) {
  logger.debug('Updating tire status', { data: { id, status } });
  try {
    const tire = await prisma.tires.update({
      where: { id },
      data: { status },
    });
    return tire;
  } catch (error) {
    logger.error('Error updating tire status', { data: { error, id } });
    throw error;
  }
}

export async function deleteTire(id: string) {
  logger.debug('Soft-deleting tire', { data: { id } });
  try {
    const tire = await prisma.tires.update({
      where: { id },
      data: { is_active: false },
    });
    return tire;
  } catch (error) {
    logger.error('Error deleting tire', { data: { error, id } });
    throw error;
  }
}

// ============================================================================
// HELPER: Get brands for forms (client-side selects)
// ============================================================================

export async function getTireBrandsForSelect() {
  logger.debug('Fetching tire brands for select');
  try {
    return prisma.tire_brands.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  } catch (error) {
    logger.error('Error fetching tire brands for select', { data: { error } });
    throw error;
  }
}

// ============================================================================
// HELPER: Get tire types for forms (client-side selects)
// ============================================================================

export async function getTireTypesForSelect(companyId: string) {
  logger.debug('Fetching tire types for select');
  try {
    return prisma.tire_types.findMany({
      where: { is_active: true, company_id: companyId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, size: true, tread_type: true },
    });
  } catch (error) {
    logger.error('Error fetching tire types for select', { data: { error } });
    throw error;
  }
}

// ============================================================================
// EXPORTED TYPES
// ============================================================================

export type TireListItem = Awaited<ReturnType<typeof getTiresPaginated>>['data'][number];
