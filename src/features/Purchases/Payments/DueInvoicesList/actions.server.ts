'use server';

import { checkPermissionServer } from '@/features/Permissions';
import { pickFilters } from '@/features/Warehouses/lib/filters';
import { Prisma } from '@/generated/prisma/client';
import type { payment_order_status } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import {
  buildDateRangeFiltersWhere,
  buildFiltersWhere,
  NULL_FILTER_VALUE,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import moment from 'moment';
import { supplierInvoiceLabel } from '../../lib/invoices';
import { openInvoicePendingMap } from '../../lib/payment-balances';

const logger = new Logger('features/Purchases/Payments/DueInvoicesList');

type InvoiceWhere = Prisma.supplier_invoicesWhereInput;
type InvoiceOrderBy = Prisma.supplier_invoicesOrderByWithRelationInput;
type FilterState = ReturnType<typeof parseSearchParams>;

// ============================================================================
// CONSTANTS
// ============================================================================

/** Ordenables (campos directos). `pending` y `days` se resuelven aparte. */
const VALID_SORT_FIELDS = new Set(['cbte_type', 'issue_date', 'total']);

const SORT_MAP: Record<string, (dir: 'asc' | 'desc') => InvoiceOrderBy[]> = {
  number: (dir) => [{ sales_point: dir }, { number: dir }],
  supplier: (dir) => [{ supplier: { name: dir } }],
  // Mas dias = vence mas tarde: ordenar por dias equivale a ordenar por vencimiento (nulos al final).
  due_date: (dir) => [{ due_date: { sort: dir, nulls: 'last' } }],
  days: (dir) => [{ due_date: { sort: dir, nulls: 'last' } }],
};

const DATE_RANGE_COLUMNS = ['issue_date', 'due_date'];

/** Unicas columnas que pasan por `buildFiltersWhere` (lista de permitidas). */
const FACETED_COLUMNS = ['supplier'] as const;

/** columnId (URL) -> campo Prisma. */
const COLUMN_MAP: Record<string, string> = { supplier: 'supplier_id' };

/** Ordenes "en curso": no anuladas y no pagadas. */
const OPEN_ORDER_STATUSES: payment_order_status[] = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'];

const DEFAULT_ORDER_BY: InvoiceOrderBy[] = [
  { due_date: { sort: 'asc', nulls: 'last' } },
  { issue_date: 'asc' },
  { number: 'asc' },
];

const digitsOf = (value: string) => value.replace(/\D/g, '');

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/** Empresa si el usuario puede ver la tabla; `null` = sin acceso -> lista vacia. */
async function resolveCompanyId(): Promise<string | null> {
  const canView = await checkPermissionServer('compras', 'pagos', 'view');
  if (!canView) return null;
  return getActiveCompanyId();
}

/** "Hoy" como fecha (DATE, medianoche UTC) en horario de Argentina (UTC-3): el vencimiento es un dia, no un instante. */
function todayDate(): Date {
  return new Date(`${moment().utcOffset(-180).format('YYYY-MM-DD')}T00:00:00.000Z`);
}

/** Numero de comprobante: "00003-00012345" (punto de venta + numero) o solo el numero. Coincidencia exacta. */
function voucherNumberWhere(text: string): InvoiceWhere | null {
  const parts = text.split('-').map(digitsOf).filter(Boolean);
  if (parts.length === 2) return { sales_point: Number(parts[0]), number: BigInt(parts[1]) };
  if (parts.length === 1) return { number: BigInt(parts[0]) };
  return null;
}

/** Importe tipeado ("1234,56" o "1234.56") -> Decimal exacto; `null` si no es un numero. */
function parseAmount(text: string): Prisma.Decimal | null {
  const normalized = text.trim().replace(/\./g, (m, _offset, s: string) => (s.includes(',') ? '' : m)).replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return new Prisma.Decimal(normalized);
}

/**
 * WHERE compartido entre paginated, export y facets. El pendiente tiene UNA sola definicion
 * (`openInvoicePendingMap`): la tabla solo lista los ids que esa funcion devuelve.
 */
function buildWhereClause(companyId: string, state: FilterState, pendingMap: Map<string, string>): InvoiceWhere {
  const f = state.filters;
  let ids = [...pendingMap.keys()];

  // Pendiente (texto, exacto): se resuelve sobre el mapa, que es la unica fuente del pendiente.
  const pendingText = f.pending?.[0]?.trim();
  if (pendingText) {
    const amount = parseAmount(pendingText);
    ids = amount ? ids.filter((id) => new Prisma.Decimal(pendingMap.get(id) ?? 0).equals(amount)) : [];
  }

  const and: InvoiceWhere[] = [{ company_id: companyId }, { id: { in: ids } }];

  const search = state.search?.trim();
  if (search) {
    const or: InvoiceWhere[] = [{ supplier: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { trade_name: { contains: search, mode: 'insensitive' } }] } }];
    const byNumber = /^[\d-]+$/.test(search) ? voucherNumberWhere(search) : null;
    if (byNumber) or.push(byNumber);
    and.push({ OR: or });
  }

  and.push(buildFiltersWhere(pickFilters(f, FACETED_COLUMNS), COLUMN_MAP) as InvoiceWhere);
  and.push(buildDateRangeFiltersWhere(f, DATE_RANGE_COLUMNS) as InvoiceWhere);

  // Texto: comprobante (exacto) y total (exacto, decimal)
  const numberText = f.number?.[0]?.trim();
  if (numberText) and.push(voucherNumberWhere(numberText) ?? { id: { in: [] } });

  const totalText = f.total?.[0]?.trim();
  if (totalText) {
    const amount = parseAmount(totalText);
    and.push(amount ? { total: amount } : { id: { in: [] } });
  }

  // Tipo de comprobante (Int): conversion manual
  const cbteTypes = f.cbte_type?.map(Number).filter((n) => !Number.isNaN(n));
  if (cbteTypes?.length) and.push({ cbte_type: { in: cbteTypes } });

  // Dias (derivado de due_date vs hoy): overdue / upcoming / none
  const dayValues = f.days ?? [];
  if (dayValues.length > 0) {
    const today = todayDate();
    const conditions: InvoiceWhere[] = [];
    if (dayValues.includes('overdue')) conditions.push({ due_date: { lt: today } });
    if (dayValues.includes('upcoming')) conditions.push({ due_date: { gte: today } });
    if (dayValues.includes('none')) conditions.push({ due_date: null });
    and.push(conditions.length === 1 ? conditions[0] : { OR: conditions });
  }

  // Ordenes de pago en curso (M:M); NULL_FILTER_VALUE = sin orden
  const orderValues = f.orders ?? [];
  if (orderValues.length > 0) {
    const wantsNone = orderValues.includes(NULL_FILTER_VALUE);
    const orderIds = orderValues.filter((v) => v !== NULL_FILTER_VALUE);
    const open = { status: { in: OPEN_ORDER_STATUSES } };
    const conditions: InvoiceWhere[] = [];
    if (orderIds.length) {
      conditions.push({ payment_lines: { some: { payment_order: { id: { in: orderIds }, ...open } } } });
    }
    if (wantsNone) conditions.push({ payment_lines: { none: { payment_order: open } } });
    and.push(conditions.length === 1 ? conditions[0] : { OR: conditions });
  }

  return { AND: and };
}

const INVOICE_SELECT = {
  id: true,
  cbte_type: true,
  sales_point: true,
  number: true,
  issue_date: true,
  due_date: true,
  total: true,
  supplier: { select: { id: true, name: true } },
  payment_lines: {
    where: { payment_order: { status: { in: OPEN_ORDER_STATUSES } } },
    select: { payment_order: { select: { id: true, number: true } } },
  },
} satisfies Prisma.supplier_invoicesSelect;

function shape(rows: Prisma.supplier_invoicesGetPayload<{ select: typeof INVOICE_SELECT }>[], pendingMap: Map<string, string>) {
  const today = moment.utc(todayDate());
  return rows.map((r) => {
    const orders = new Map<string, { id: string; number: string }>();
    for (const l of r.payment_lines) orders.set(l.payment_order.id, l.payment_order);

    return {
      id: r.id,
      label: supplierInvoiceLabel(r),
      cbte_type: r.cbte_type,
      issue_date: r.issue_date,
      due_date: r.due_date,
      /** Dias hasta el vencimiento (negativo = vencido); `null` si no tiene vencimiento. */
      days_to_due: r.due_date ? moment.utc(r.due_date).diff(today, 'days') : null,
      total: r.total.toString(),
      pending: pendingMap.get(r.id) ?? '0',
      supplier: { id: r.supplier.id, name: r.supplier.name },
      orders: [...orders.values()].sort((a, b) => a.number.localeCompare(b.number)),
    };
  });
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getDueInvoicesPaginated(searchParams: DataTableSearchParams) {
  const companyId = await resolveCompanyId();
  if (!companyId) return { data: [], total: 0 };

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const pendingMap = await openInvoicePendingMap(prisma, companyId);
    const where = buildWhereClause(companyId, state, pendingMap);

    // Pendiente: no es un campo de la tabla (sale del mapa), asi que cuando es el primer criterio
    // se ordena el conjunto filtrado completo en memoria y se pagina por ids. Sigue siendo
    // server-side (ordena TODAS las paginas, no solo la visible).
    const primary = state.sorting[0];
    if (primary?.id === 'pending') {
      const dir = primary.desc ? -1 : 1;
      const matches = await prisma.supplier_invoices.findMany({ where, select: { id: true } });
      const sorted = matches
        .map((m) => ({ id: m.id, pending: new Prisma.Decimal(pendingMap.get(m.id) ?? 0) }))
        .sort((a, b) => dir * a.pending.comparedTo(b.pending) || a.id.localeCompare(b.id));
      const pageIds = sorted.slice(skip, skip + take).map((m) => m.id);
      const rows = await prisma.supplier_invoices.findMany({ where: { id: { in: pageIds } }, select: INVOICE_SELECT });
      const byId = new Map(rows.map((r) => [r.id, r]));
      const ordered = pageIds.flatMap((id) => byId.get(id) ?? []);
      return { data: shape(ordered, pendingMap), total: sorted.length };
    }

    const resolvedSorts: InvoiceOrderBy[] = [];
    for (const s of state.sorting) {
      const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
      const mapper = SORT_MAP[s.id];
      if (mapper) resolvedSorts.push(...mapper(dir));
      else if (VALID_SORT_FIELDS.has(s.id)) resolvedSorts.push({ [s.id]: dir });
    }
    const orderBy: InvoiceOrderBy[] = resolvedSorts.length ? [...resolvedSorts, { issue_date: 'asc' }] : DEFAULT_ORDER_BY;

    const [rows, total] = await Promise.all([
      prisma.supplier_invoices.findMany({ where, orderBy, skip, take, select: INVOICE_SELECT }),
      prisma.supplier_invoices.count({ where }),
    ]);
    return { data: shape(rows, pendingMap), total };
  } catch (error) {
    logger.error('Error al obtener vencimientos', { data: { error } });
    throw new Error('No se pudo obtener la lista de vencimientos');
  }
}

// ============================================================================
// EXPORT (sin paginacion)
// ============================================================================

export async function getAllDueInvoicesForExport(searchParams: DataTableSearchParams) {
  const companyId = await resolveCompanyId();
  if (!companyId) return [];

  try {
    const state = parseSearchParams(searchParams);
    const pendingMap = await openInvoicePendingMap(prisma, companyId);
    const where = buildWhereClause(companyId, state, pendingMap);
    const rows = await prisma.supplier_invoices.findMany({ where, orderBy: DEFAULT_ORDER_BY, select: INVOICE_SELECT });
    return shape(rows, pendingMap);
  } catch (error) {
    logger.error('Error al exportar vencimientos', { data: { error } });
    throw new Error('No se pudo exportar la lista de vencimientos');
  }
}

// ============================================================================
// SINGLE FACET (lazy-load, con cross-filter)
// ============================================================================

export async function getDueInvoiceSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{ counts: Map<string, number>; resolvedOptions?: Array<{ id: string; name: string | null }> } | null> {
  const companyId = await resolveCompanyId();
  if (!companyId) return null;

  const parsed = searchParams && Object.keys(searchParams).length > 0 ? parseSearchParams(searchParams) : null;

  try {
    const pendingMap = await openInvoicePendingMap(prisma, companyId);

    /** WHERE con todos los filtros activos MENOS el de la columna que se esta abriendo. */
    const crossWhere = (excludeColumn: string): InvoiceWhere => {
      const base: FilterState = parsed ?? parseSearchParams({});
      const filters = { ...base.filters };
      delete filters[excludeColumn];
      return buildWhereClause(companyId, { ...base, filters }, pendingMap);
    };

    const toFacetMap = (rows: { key: string | number | null; count: number }[]): Map<string, number> => {
      const map = new Map<string, number>();
      for (const { key, count } of rows) {
        const k = key == null ? NULL_FILTER_VALUE : String(key);
        map.set(k, (map.get(k) ?? 0) + count);
      }
      return map;
    };

    const where = crossWhere(columnId);

    if (columnId === 'cbte_type') {
      const rows = await prisma.supplier_invoices.groupBy({ by: ['cbte_type'], where, _count: true });
      return { counts: toFacetMap(rows.map((r) => ({ key: r.cbte_type, count: r._count }))) };
    }

    if (columnId === 'days') {
      const today = todayDate();
      const [overdue, upcoming, none] = await Promise.all([
        prisma.supplier_invoices.count({ where: { AND: [where, { due_date: { lt: today } }] } }),
        prisma.supplier_invoices.count({ where: { AND: [where, { due_date: { gte: today } }] } }),
        prisma.supplier_invoices.count({ where: { AND: [where, { due_date: null }] } }),
      ]);
      return {
        counts: new Map([
          ['overdue', overdue],
          ['upcoming', upcoming],
          ['none', none],
        ]),
      };
    }

    if (columnId === 'supplier') {
      const rows = await prisma.supplier_invoices.groupBy({ by: ['supplier_id'], where, _count: true });
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

    if (columnId === 'orders') {
      // M:M: cuantos comprobantes (distintos) tiene cada orden en curso; sin orden = "Sin orden"
      const invoices = await prisma.supplier_invoices.findMany({
        where,
        select: { payment_lines: INVOICE_SELECT.payment_lines },
      });
      const counts = new Map<string, number>();
      const names = new Map<string, string>();
      for (const inv of invoices) {
        const seen = new Set<string>();
        for (const l of inv.payment_lines) {
          const order = l.payment_order;
          names.set(order.id, order.number);
          if (!seen.has(order.id)) {
            seen.add(order.id);
            counts.set(order.id, (counts.get(order.id) ?? 0) + 1);
          }
        }
        if (seen.size === 0) counts.set(NULL_FILTER_VALUE, (counts.get(NULL_FILTER_VALUE) ?? 0) + 1);
      }
      const resolvedOptions = [...names.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => b.name.localeCompare(a.name));
      return { counts, resolvedOptions };
    }

    logger.warn('Facet no reconocido', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error al obtener facet de vencimientos', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// TIPOS
// ============================================================================

export type DueInvoiceListItem = Awaited<ReturnType<typeof getDueInvoicesPaginated>>['data'][number];
