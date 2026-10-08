'use server';

import { checkPermissionServer } from '@/features/Permissions';
import { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { getServerAuthProfile } from '@/shared/actions/auth.actions';
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
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { pickFilters } from '@/features/Warehouses/lib/filters';
import { DESTINATION_SELECT, destinationLabel } from '@/features/Warehouses/lib/labels';

const logger = new Logger('features/Purchases/Requests/RequestsList');

type RequestWhere = Prisma.purchase_requestsWhereInput;
type RequestOrderBy = Prisma.purchase_requestsOrderByWithRelationInput;
type FilterState = ReturnType<typeof parseSearchParams>;

// ============================================================================
// CONSTANTS
// ============================================================================

/** Ordenables (campos directos). `destination` y `lines` se resuelven aparte. */
const VALID_SORT_FIELDS = new Set(['number', 'status', 'destination_type', 'created_at', 'needed_by']);

const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => RequestOrderBy> = {
  requester: (dir) => ({ requester: { fullname: dir } }),
  lines_count: (dir) => ({ lines: { _count: dir } }),
  material_request: (dir) => ({ material_request: { number: dir } }),
};

const TEXT_FILTER_COLUMNS = ['number'];
const DATE_RANGE_COLUMNS = ['created_at', 'needed_by'];

/** Unicas columnas que pasan por `buildFiltersWhere` (lista de permitidas). */
const FACETED_COLUMNS = ['status', 'requester', 'destination_type'] as const;

/** columnId (URL) -> campo Prisma, solo donde difieren. */
const COLUMN_MAP: Record<string, string> = {
  requester: 'requested_by',
};

const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

interface Scope {
  companyId: string;
  /** Si no es null, el usuario solo ve sus propias solicitudes (sin `view_all_requests`). */
  ownProfileId: string | null;
}

/** Empresa + visibilidad. `null` = sin acceso (sin `view` o sin perfil) -> lista vacia. */
async function resolveScope(): Promise<Scope | null> {
  const [canView, canViewAll] = await Promise.all([
    checkPermissionServer('compras', 'solicitudes', 'view'),
    checkPermissionServer('compras', 'solicitudes', 'view_all_requests'),
  ]);
  if (!canView) return null;

  const companyId = await getActiveCompanyId();
  if (canViewAll) return { companyId, ownProfileId: null };

  const profile = await getServerAuthProfile();
  if (!profile) return null;
  return { companyId, ownProfileId: profile.id };
}

/** WHERE compartido entre paginated, export y facets (incluye la visibilidad). */
function buildWhereClause(scope: Scope, state: FilterState): RequestWhere {
  const f = state.filters;
  const and: RequestWhere[] = [{ company_id: scope.companyId }];

  // Visibilidad: sin `view_all_requests` solo las solicitudes propias
  if (scope.ownProfileId) and.push({ requested_by: scope.ownProfileId });

  and.push(buildSearchWhere(state.search, ['number', 'notes']) as RequestWhere);
  and.push(buildFiltersWhere(pickFilters(f, FACETED_COLUMNS), COLUMN_MAP) as RequestWhere);
  and.push(buildTextFiltersWhere(f, TEXT_FILTER_COLUMNS) as RequestWhere);
  and.push(buildDateRangeFiltersWhere(f, DATE_RANGE_COLUMNS) as RequestWhere);

  // Pedido de origen (texto sobre su numero)
  const origin = f.material_request?.[0]?.trim();
  if (origin) and.push({ material_request: { number: contains(origin) } });

  // Destino (texto): mismo criterio que el filtro `destination` de las solicitudes de Almacenes
  const dest = f.destination?.[0]?.trim();
  if (dest) {
    and.push({
      OR: [
        { employee: { OR: [{ file: contains(dest) }, { lastname: contains(dest) }, { firstname: contains(dest) }] } },
        { vehicle: { OR: [{ domain: contains(dest) }, { intern_number: contains(dest) }] } },
        { other_equipment: { intern_number: contains(dest) } },
        { maintenance_order: { order_number: contains(dest) } },
        { customer: { name: contains(dest) } },
      ],
    });
  }

  return { AND: and };
}

const REQUEST_SELECT = {
  id: true,
  number: true,
  status: true,
  created_at: true,
  needed_by: true,
  requester: { select: { id: true, fullname: true, email: true } },
  material_request: { select: { id: true, number: true } },
  _count: { select: { lines: true } },
  ...DESTINATION_SELECT,
} as const;

const profileName = (p: { fullname: string | null; email: string | null }) => p.fullname ?? p.email ?? '-';

function shape(rows: Prisma.purchase_requestsGetPayload<{ select: typeof REQUEST_SELECT }>[]) {
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    status: r.status,
    created_at: r.created_at,
    needed_by: r.needed_by,
    destination_type: r.destination_type,
    destination: destinationLabel(r),
    requester: { id: r.requester.id, name: profileName(r.requester) },
    material_request: r.material_request,
    lines_count: r._count.lines,
  }));
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getPurchaseRequestsPaginated(searchParams: DataTableSearchParams) {
  const scope = await resolveScope();
  if (!scope) return { data: [], total: 0 };

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildWhereClause(scope, state);

    const resolvedSorts: RequestOrderBy[] = [];
    for (const s of state.sorting) {
      const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
      const fkMapper = FK_SORT_MAP[s.id];
      if (fkMapper) resolvedSorts.push(fkMapper(dir));
      else if (VALID_SORT_FIELDS.has(s.id)) resolvedSorts.push({ [s.id]: dir });
    }
    const orderBy: RequestOrderBy[] = [...resolvedSorts, { created_at: 'desc' }, { number: 'desc' }];

    const [rows, total] = await Promise.all([
      prisma.purchase_requests.findMany({ where, orderBy, skip, take, select: REQUEST_SELECT }),
      prisma.purchase_requests.count({ where }),
    ]);
    return { data: shape(rows), total };
  } catch (error) {
    logger.error('Error al obtener solicitudes de compra', { data: { error } });
    throw new Error('No se pudo obtener la lista de solicitudes de compra');
  }
}

// ============================================================================
// EXPORT (sin paginacion)
// ============================================================================

export async function getAllPurchaseRequestsForExport(searchParams: DataTableSearchParams) {
  const scope = await resolveScope();
  if (!scope) return [];

  try {
    const state = parseSearchParams(searchParams);
    const where = buildWhereClause(scope, state);
    const rows = await prisma.purchase_requests.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { number: 'desc' }],
      select: REQUEST_SELECT,
    });
    return shape(rows);
  } catch (error) {
    logger.error('Error al exportar solicitudes de compra', { data: { error } });
    throw new Error('No se pudo exportar la lista de solicitudes de compra');
  }
}

// ============================================================================
// SINGLE FACET (lazy-load, con cross-filter)
// ============================================================================

export async function getPurchaseRequestSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{ counts: Map<string, number>; resolvedOptions?: Array<{ id: string; name: string | null }> } | null> {
  const scope = await resolveScope();
  if (!scope) return null;

  const parsed = searchParams && Object.keys(searchParams).length > 0 ? parseSearchParams(searchParams) : null;

  /** WHERE con todos los filtros activos MENOS el de la columna que se esta abriendo. */
  function crossWhere(excludeColumn: string): RequestWhere {
    const base: FilterState = parsed ?? parseSearchParams({});
    const filters = { ...base.filters };
    delete filters[excludeColumn];
    return buildWhereClause(scope as Scope, { ...base, filters });
  }

  function toFacetMap(rows: { key: string | null; count: number }[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const { key, count } of rows) {
      const k = key == null ? NULL_FILTER_VALUE : key;
      map.set(k, (map.get(k) ?? 0) + count);
    }
    return map;
  }

  try {
    const where = crossWhere(columnId);

    if (columnId === 'status') {
      const rows = await prisma.purchase_requests.groupBy({ by: ['status'], where, _count: true });
      return { counts: toFacetMap(rows.map((r) => ({ key: r.status, count: r._count }))) };
    }

    if (columnId === 'destination_type') {
      const rows = await prisma.purchase_requests.groupBy({ by: ['destination_type'], where, _count: true });
      return { counts: toFacetMap(rows.map((r) => ({ key: r.destination_type, count: r._count }))) };
    }

    if (columnId === 'requester') {
      const rows = await prisma.purchase_requests.groupBy({ by: ['requested_by'], where, _count: true });
      const ids = rows.map((r) => r.requested_by);
      const profiles = ids.length
        ? await prisma.profile.findMany({
            where: { id: { in: ids } },
            select: { id: true, fullname: true, email: true },
            orderBy: { fullname: 'asc' },
          })
        : [];
      return {
        counts: toFacetMap(rows.map((r) => ({ key: r.requested_by, count: r._count }))),
        resolvedOptions: profiles.map((p) => ({ id: p.id, name: profileName(p) })),
      };
    }

    logger.warn('Facet no reconocido', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error al obtener facet de solicitudes de compra', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// TIPOS
// ============================================================================

export type PurchaseRequestListItem = Awaited<ReturnType<typeof getPurchaseRequestsPaginated>>['data'][number];
