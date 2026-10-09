'use server';

import { checkPermissionServer } from '@/features/Permissions';
import { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import {
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  buildTextFiltersWhere,
  NULL_FILTER_VALUE,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { pickFilters } from '@/features/Warehouses/lib/filters';
import { computeOrderTotals } from '../../lib/order-totals';

const logger = new Logger('features/Purchases/Quotes/QuotesList');

type QuoteWhere = Prisma.purchase_quotesWhereInput;
type QuoteOrderBy = Prisma.purchase_quotesOrderByWithRelationInput;
type FilterState = ReturnType<typeof parseSearchParams>;

// ============================================================================
// CONSTANTS
// ============================================================================

/** Ordenables (campos directos). `supplier` / `creator` se resuelven en FK_SORT_MAP. */
const VALID_SORT_FIELDS = new Set(['number', 'status', 'created_at', 'sent_at', 'received_at', 'valid_until']);

const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => QuoteOrderBy> = {
  supplier: (dir) => ({ supplier: { name: dir } }),
  creator: (dir) => ({ creator: { fullname: dir } }),
};

const TEXT_FILTER_COLUMNS = ['number'];
const DATE_RANGE_COLUMNS = ['created_at', 'sent_at', 'received_at', 'valid_until'];

/** Unicas columnas que pasan por `buildFiltersWhere` (lista de permitidas). */
const FACETED_COLUMNS = ['status', 'supplier', 'creator'] as const;

/** columnId (URL) -> campo Prisma, solo donde difieren. */
const COLUMN_MAP: Record<string, string> = {
  supplier: 'supplier_id',
  creator: 'created_by',
};

const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/** Empresa si el usuario puede ver la tabla; `null` = sin acceso -> lista vacia. */
async function resolveCompanyId(): Promise<string | null> {
  const canView = await checkPermissionServer('compras', 'cotizaciones', 'view');
  if (!canView) return null;
  return getActiveCompanyId();
}

/** WHERE compartido entre paginated, export y facets. */
function buildWhereClause(companyId: string, state: FilterState): QuoteWhere {
  const f = state.filters;
  const and: QuoteWhere[] = [{ company_id: companyId }];

  const search = state.search?.trim();
  if (search) {
    and.push({
      OR: [
        { number: contains(search) },
        { supplier: { OR: [{ name: contains(search) }, { trade_name: contains(search) }] } },
      ],
    });
  }

  and.push(buildFiltersWhere(pickFilters(f, FACETED_COLUMNS), COLUMN_MAP) as QuoteWhere);
  and.push(buildTextFiltersWhere(f, TEXT_FILTER_COLUMNS) as QuoteWhere);
  and.push(buildDateRangeFiltersWhere(f, DATE_RANGE_COLUMNS) as QuoteWhere);

  // Solicitudes de origen (M:M via lineas): alcanza con que una linea venga de alguna de las elegidas
  const requestIds = f.requests?.filter((v) => v !== NULL_FILTER_VALUE) ?? [];
  if (requestIds.length > 0) {
    and.push({ lines: { some: { request_line: { request_id: { in: requestIds } } } } });
  }

  return { AND: and };
}

const QUOTE_SELECT = {
  id: true,
  number: true,
  status: true,
  created_at: true,
  sent_at: true,
  received_at: true,
  valid_until: true,
  supplier: { select: { id: true, name: true } },
  creator: { select: { id: true, fullname: true, email: true } },
  lines: {
    select: {
      quantity: true,
      unit_price: true,
      vat_rate_id: true,
      not_quoted: true,
      request_line: { select: { request: { select: { id: true, number: true } } } },
    },
  },
} as const;

const profileName = (p: { fullname: string | null; email: string | null }) => p.fullname ?? p.email ?? '-';

function shape(rows: Prisma.purchase_quotesGetPayload<{ select: typeof QUOTE_SELECT }>[]) {
  return rows.map((r) => {
    // Total cotizado: solo lineas con precio y alicuota (las "no cotizadas" quedan afuera)
    const priced = r.lines.filter((l) => !l.not_quoted && l.unit_price != null && l.vat_rate_id != null);
    const total_quoted =
      priced.length > 0
        ? computeOrderTotals(
            priced.map((l) => ({
              quantity: l.quantity.toFixed(),
              unitPrice: (l.unit_price as Prisma.Decimal).toFixed(),
              vatRateId: l.vat_rate_id as number,
            }))
          ).total
        : null;

    const requests = new Map<string, { id: string; number: string }>();
    for (const l of r.lines) requests.set(l.request_line.request.id, l.request_line.request);

    return {
      id: r.id,
      number: r.number,
      status: r.status,
      created_at: r.created_at,
      sent_at: r.sent_at,
      received_at: r.received_at,
      valid_until: r.valid_until,
      supplier: r.supplier,
      creator: { id: r.creator.id, name: profileName(r.creator) },
      total_quoted,
      requests: [...requests.values()].sort((a, b) => a.number.localeCompare(b.number)),
    };
  });
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getPurchaseQuotesPaginated(searchParams: DataTableSearchParams) {
  const companyId = await resolveCompanyId();
  if (!companyId) return { data: [], total: 0 };

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildWhereClause(companyId, state);

    const resolvedSorts: QuoteOrderBy[] = [];
    for (const s of state.sorting) {
      const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
      const fkMapper = FK_SORT_MAP[s.id];
      if (fkMapper) resolvedSorts.push(fkMapper(dir));
      else if (VALID_SORT_FIELDS.has(s.id)) resolvedSorts.push({ [s.id]: dir });
    }
    const orderBy: QuoteOrderBy[] = [...resolvedSorts, { created_at: 'desc' }, { number: 'desc' }];

    const [rows, total] = await Promise.all([
      prisma.purchase_quotes.findMany({ where, orderBy, skip, take, select: QUOTE_SELECT }),
      prisma.purchase_quotes.count({ where }),
    ]);
    return { data: shape(rows), total };
  } catch (error) {
    logger.error('Error al obtener pedidos de cotizacion', { data: { error } });
    throw new Error('No se pudo obtener la lista de pedidos de cotización');
  }
}

// ============================================================================
// EXPORT (sin paginacion)
// ============================================================================

export async function getAllPurchaseQuotesForExport(searchParams: DataTableSearchParams) {
  const companyId = await resolveCompanyId();
  if (!companyId) return [];

  try {
    const state = parseSearchParams(searchParams);
    const where = buildWhereClause(companyId, state);
    const rows = await prisma.purchase_quotes.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { number: 'desc' }],
      select: QUOTE_SELECT,
    });
    return shape(rows);
  } catch (error) {
    logger.error('Error al exportar pedidos de cotizacion', { data: { error } });
    throw new Error('No se pudo exportar la lista de pedidos de cotización');
  }
}

// ============================================================================
// SINGLE FACET (lazy-load, con cross-filter)
// ============================================================================

export async function getPurchaseQuoteSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{ counts: Map<string, number>; resolvedOptions?: Array<{ id: string; name: string | null }> } | null> {
  const companyId = await resolveCompanyId();
  if (!companyId) return null;

  const parsed = searchParams && Object.keys(searchParams).length > 0 ? parseSearchParams(searchParams) : null;

  /** WHERE con todos los filtros activos MENOS el de la columna que se esta abriendo. */
  function crossWhere(excludeColumn: string): QuoteWhere {
    const base: FilterState = parsed ?? parseSearchParams({});
    const filters = { ...base.filters };
    delete filters[excludeColumn];
    return buildWhereClause(companyId as string, { ...base, filters });
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
      const rows = await prisma.purchase_quotes.groupBy({ by: ['status'], where, _count: true });
      return { counts: toFacetMap(rows.map((r) => ({ key: r.status, count: r._count }))) };
    }

    if (columnId === 'supplier') {
      const rows = await prisma.purchase_quotes.groupBy({ by: ['supplier_id'], where, _count: true });
      const ids = rows.map((r) => r.supplier_id);
      const suppliers = ids.length
        ? await prisma.suppliers.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          })
        : [];
      return {
        counts: toFacetMap(rows.map((r) => ({ key: r.supplier_id, count: r._count }))),
        resolvedOptions: suppliers,
      };
    }

    if (columnId === 'creator') {
      const rows = await prisma.purchase_quotes.groupBy({ by: ['created_by'], where, _count: true });
      const ids = rows.map((r) => r.created_by);
      const profiles = ids.length
        ? await prisma.profile.findMany({
            where: { id: { in: ids } },
            select: { id: true, fullname: true, email: true },
            orderBy: { fullname: 'asc' },
          })
        : [];
      return {
        counts: toFacetMap(rows.map((r) => ({ key: r.created_by, count: r._count }))),
        resolvedOptions: profiles.map((p) => ({ id: p.id, name: profileName(p) })),
      };
    }

    if (columnId === 'requests') {
      // M:M: cuantos pedidos de cotizacion (distintos) tiene cada solicitud de origen
      const quotes = await prisma.purchase_quotes.findMany({
        where,
        select: { lines: { select: { request_line: { select: { request: { select: { id: true, number: true } } } } } } },
      });
      const counts = new Map<string, number>();
      const names = new Map<string, string>();
      for (const q of quotes) {
        const seen = new Set<string>();
        for (const l of q.lines) {
          const req = l.request_line.request;
          names.set(req.id, req.number);
          if (!seen.has(req.id)) {
            seen.add(req.id);
            counts.set(req.id, (counts.get(req.id) ?? 0) + 1);
          }
        }
      }
      const resolvedOptions = [...names.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return { counts, resolvedOptions };
    }

    logger.warn('Facet no reconocido', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error al obtener facet de pedidos de cotizacion', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// TIPOS
// ============================================================================

export type PurchaseQuoteListItem = Awaited<ReturnType<typeof getPurchaseQuotesPaginated>>['data'][number];
