'use server';

import { checkPermissionServer } from '@/features/Permissions';
import type { Prisma } from '@/generated/prisma/client';
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
import { toDateOnly } from '@/shared/lib/date-only';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { cbteLabel, formatVoucherNumber } from '../lib/invoice-type';

const logger = new Logger('Comercial/Facturacion/list/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Columnas ordenables server-side (directas o mapeadas vía FK_SORT_MAP). */
const VALID_SORT_FIELDS = new Set([
  'issue_date',
  'cbte_type',
  'voucher_number',
  'sales_point',
  'customer',
  'cuit',
  'status',
  'environment',
  'simulated',
  'currency',
  'total',
  'cae',
  'cae_due_date',
  'created_at',
]);

/** Columnas cuyo orderBy no es `{ [columnId]: dir }`. */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  voucher_number: (dir) => ({ number: dir }),
  sales_point: (dir) => ({ sales_point: { number: dir } }),
  customer: (dir) => ({ customer: { name: dir } }),
  cuit: (dir) => ({ customer: { cuit: dir } }),
};

/** columnId → campo de Prisma para los filtros faceteados de valor string. */
const FACETED_COLUMN_MAP: Record<string, string> = {
  sales_point: 'sales_point_id',
  customer: 'customer_id',
  status: 'status',
  environment: 'environment',
  currency: 'currency',
};

/** Filtros que se resuelven a mano (no pasan por buildFiltersWhere). */
const MANUAL_FILTER_COLUMNS = ['cbte_type', 'simulated', 'voucher_number', 'cuit', 'total'];
const TEXT_COLUMNS = ['cae'];
const DATE_COLUMNS = ['issue_date', 'cae_due_date', 'created_at'];

type TableState = ReturnType<typeof parseSearchParams>;

/** "00003-00000124", "3-124" (punto de venta + número) o "124" (solo número). */
const VOUCHER_RE = /^\s*(?:(\d{1,5})\s*-\s*)?(\d{1,8})\s*$/;

// ============================================================================
// WHERE
// ============================================================================

/** WHERE compartido entre la query paginada, el export y las facetas. */
function buildWhereClause(companyId: string, canViewPrices: boolean, state: TableState): Prisma.invoicesWhereInput {
  const and: Prisma.invoicesWhereInput[] = [];

  // Búsqueda global: número de comprobante, CAE o cliente
  const search = state.search.trim();
  if (search) {
    const or: Prisma.invoicesWhereInput[] = [
      { cae: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
    ];
    const voucher = VOUCHER_RE.exec(search);
    if (voucher) {
      or.push(
        voucher[1]
          ? { sales_point: { number: Number(voucher[1]) }, number: Number(voucher[2]) }
          : { number: Number(voucher[2]) }
      );
    }
    and.push({ OR: or });
  }

  const filtersWhere = buildFiltersWhere(state.filters, FACETED_COLUMN_MAP, {
    exclude: [...MANUAL_FILTER_COLUMNS, ...TEXT_COLUMNS, ...DATE_COLUMNS],
  });
  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_COLUMNS);
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_COLUMNS);

  // Tipo de comprobante (Int)
  const cbteTypes = state.filters.cbte_type?.map(Number).filter((n) => !isNaN(n));
  if (cbteTypes?.length) and.push({ cbte_type: { in: cbteTypes } });

  // Simulado (boolean desde string): con ambos valores marcados no filtra
  const simulated = state.filters.simulated?.filter((v) => v === 'true' || v === 'false');
  if (simulated?.length === 1) and.push({ simulated: simulated[0] === 'true' });

  // Número: coincidencia exacta
  const voucherFilter = state.filters.voucher_number?.[0];
  if (voucherFilter) {
    const match = VOUCHER_RE.exec(voucherFilter);
    if (!match) {
      and.push({ id: { in: [] } });
    } else if (match[1]) {
      and.push({ sales_point: { number: Number(match[1]) }, number: Number(match[2]) });
    } else {
      and.push({ number: Number(match[2]) });
    }
  }

  // CUIT del cliente: solo dígitos, coincidencia exacta
  const rawCuit = state.filters.cuit?.[0];
  if (rawCuit) {
    const digits = rawCuit.replace(/\D/g, '');
    and.push(digits ? { customer: { cuit: BigInt(digits) } } : { id: { in: [] } });
  }

  // Total: solo con view_prices; coincidencia exacta del importe
  const totalFilter = state.filters.total?.[0];
  if (canViewPrices && totalFilter) {
    const normalized = totalFilter.trim().replace(',', '.');
    and.push(/^\d+(\.\d{1,2})?$/.test(normalized) ? { total: normalized } : { id: { in: [] } });
  }

  const filtersAnd = (filtersWhere.AND as Prisma.invoicesWhereInput[] | undefined) ?? [];
  const { AND: _discarded, ...filtersWithoutAnd } = filtersWhere as Record<string, unknown> & { AND?: unknown };

  return {
    company_id: companyId,
    ...(filtersWithoutAnd as Prisma.invoicesWhereInput),
    ...(textFiltersWhere as Prisma.invoicesWhereInput),
    ...(dateFiltersWhere as Prisma.invoicesWhereInput),
    ...(filtersAnd.length + and.length > 0 ? { AND: [...filtersAnd, ...and] } : {}),
  };
}

/** Multi-sort del usuario (solo campos válidos) y, de fondo, fecha de emisión descendente. */
function buildOrderBy(state: TableState, canViewPrices: boolean): Prisma.invoicesOrderByWithRelationInput[] {
  const resolved: Record<string, unknown>[] = [];
  for (const s of state.sorting) {
    if (!VALID_SORT_FIELDS.has(s.id)) continue;
    if (s.id === 'total' && !canViewPrices) continue;
    const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
    const mapper = FK_SORT_MAP[s.id];
    resolved.push(mapper ? mapper(dir) : { [s.id]: dir });
  }
  return [...resolved, { issue_date: 'desc' }, { created_at: 'desc' }] as Prisma.invoicesOrderByWithRelationInput[];
}

// ============================================================================
// SELECT / MAPPING
// ============================================================================

const INVOICE_SELECT = {
  id: true,
  cbte_type: true,
  number: true,
  status: true,
  environment: true,
  simulated: true,
  issue_date: true,
  currency: true,
  total: true,
  cae: true,
  cae_due_date: true,
  created_at: true,
  sales_point: { select: { id: true, number: true, name: true } },
  customer: { select: { id: true, name: true, cuit: true } },
} satisfies Prisma.invoicesSelect;

type InvoiceRow = Prisma.invoicesGetPayload<{ select: typeof INVOICE_SELECT }>;

/** Serializa para el cliente: fechas `YYYY-MM-DD`, importe como texto (nunca Number). */
function mapInvoice(row: InvoiceRow, canViewPrices: boolean) {
  return {
    id: row.id,
    cbteType: row.cbte_type,
    cbteLabel: cbteLabel(row.cbte_type),
    number: row.number,
    voucherNumber: formatVoucherNumber(row.sales_point.number, row.number),
    status: row.status,
    environment: row.environment,
    simulated: row.simulated,
    issueDate: toDateOnly(row.issue_date) ?? '',
    currency: row.currency,
    total: canViewPrices ? row.total.toFixed(2) : null,
    cae: row.cae,
    caeDueDate: toDateOnly(row.cae_due_date),
    createdAt: row.created_at.toISOString(),
    salesPoint: { id: row.sales_point.id, number: row.sales_point.number, name: row.sales_point.name },
    customer: { id: row.customer.id, name: row.customer.name, cuit: String(row.customer.cuit) },
  };
}

async function loadContext() {
  const companyId = await getActiveCompanyId();
  const [canView, canViewPrices] = await Promise.all([
    checkPermissionServer('comercial', 'facturacion', 'view'),
    checkPermissionServer('comercial', 'facturacion', 'view_prices'),
  ]);
  if (!canView) throw new Error('No tenés permiso para ver los comprobantes.');
  return { companyId, canViewPrices };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getInvoicesPaginated(searchParams: DataTableSearchParams) {
  try {
    const { companyId, canViewPrices } = await loadContext();
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildWhereClause(companyId, canViewPrices, state);

    const [rows, total] = await Promise.all([
      prisma.invoices.findMany({
        skip,
        take,
        where,
        orderBy: buildOrderBy(state, canViewPrices),
        select: INVOICE_SELECT,
      }),
      prisma.invoices.count({ where }),
    ]);

    return { data: rows.map((r) => mapInvoice(r, canViewPrices)), total };
  } catch (error) {
    logger.error('Error al obtener comprobantes paginados', { data: { error } });
    throw new Error('No se pudieron obtener los comprobantes. Intente nuevamente.');
  }
}

// ============================================================================
// EXPORT (sin paginación)
// ============================================================================

export async function getInvoicesForExport(searchParams: DataTableSearchParams) {
  try {
    const { companyId, canViewPrices } = await loadContext();
    const state = parseSearchParams(searchParams);
    const where = buildWhereClause(companyId, canViewPrices, state);

    const rows = await prisma.invoices.findMany({
      where,
      orderBy: buildOrderBy(state, canViewPrices),
      select: INVOICE_SELECT,
    });
    return rows.map((r) => mapInvoice(r, canViewPrices));
  } catch (error) {
    logger.error('Error al exportar comprobantes', { data: { error } });
    throw new Error('No se pudo exportar el listado. Intente nuevamente.');
  }
}

// ============================================================================
// SINGLE FACET (lazy-load, con cross-filter)
// ============================================================================

export async function getInvoiceSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  try {
    const { companyId, canViewPrices } = await loadContext();
    const baseState = parseSearchParams(searchParams ?? {});

    /** WHERE con todos los filtros activos EXCEPTO el de la propia columna. */
    function crossWhere(excludeColumn: string) {
      const modified = { ...baseState, filters: { ...baseState.filters } };
      delete modified.filters[excludeColumn];
      delete modified.filters[`${excludeColumn}_from`];
      delete modified.filters[`${excludeColumn}_to`];
      return buildWhereClause(companyId, canViewPrices, modified);
    }

    function toFacetMap(rows: { key: string | number | boolean | null; count: number }[]) {
      const map = new Map<string, number>();
      for (const { key, count } of rows) {
        const k = key == null ? NULL_FILTER_VALUE : String(key);
        map.set(k, (map.get(k) ?? 0) + count);
      }
      return map;
    }

    const where = crossWhere(columnId);

    switch (columnId) {
      case 'cbte_type': {
        const rows = await prisma.invoices.groupBy({ by: ['cbte_type'], where, _count: true });
        return { counts: toFacetMap(rows.map((r) => ({ key: r.cbte_type, count: r._count }))) };
      }
      case 'status': {
        const rows = await prisma.invoices.groupBy({ by: ['status'], where, _count: true });
        return { counts: toFacetMap(rows.map((r) => ({ key: r.status, count: r._count }))) };
      }
      case 'environment': {
        const rows = await prisma.invoices.groupBy({ by: ['environment'], where, _count: true });
        return { counts: toFacetMap(rows.map((r) => ({ key: r.environment, count: r._count }))) };
      }
      case 'simulated': {
        const rows = await prisma.invoices.groupBy({ by: ['simulated'], where, _count: true });
        return { counts: toFacetMap(rows.map((r) => ({ key: r.simulated, count: r._count }))) };
      }
      case 'currency': {
        const rows = await prisma.invoices.groupBy({ by: ['currency'], where, _count: true });
        return {
          counts: toFacetMap(rows.map((r) => ({ key: r.currency, count: r._count }))),
          resolvedOptions: rows
            .map((r) => ({ id: r.currency, name: r.currency }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        };
      }
      case 'sales_point': {
        const rows = await prisma.invoices.groupBy({ by: ['sales_point_id'], where, _count: true });
        const ids = rows.map((r) => r.sales_point_id);
        const options = ids.length
          ? await prisma.sales_points.findMany({
              where: { id: { in: ids } },
              select: { id: true, number: true, name: true },
              orderBy: { number: 'asc' },
            })
          : [];
        return {
          counts: toFacetMap(rows.map((r) => ({ key: r.sales_point_id, count: r._count }))),
          resolvedOptions: options.map((o) => ({
            id: o.id,
            name: `${String(o.number).padStart(5, '0')} - ${o.name}`,
          })),
        };
      }
      case 'customer': {
        const rows = await prisma.invoices.groupBy({ by: ['customer_id'], where, _count: true });
        const ids = rows.map((r) => r.customer_id);
        const options = ids.length
          ? await prisma.customers.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            })
          : [];
        return {
          counts: toFacetMap(rows.map((r) => ({ key: r.customer_id, count: r._count }))),
          resolvedOptions: options,
        };
      }
      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener facetas de comprobantes', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// TYPES
// ============================================================================

export type InvoiceListItem = Awaited<ReturnType<typeof getInvoicesPaginated>>['data'][number];
