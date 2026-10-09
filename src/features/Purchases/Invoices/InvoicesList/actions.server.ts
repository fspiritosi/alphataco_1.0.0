'use server';

import { checkPermissionServer } from '@/features/Permissions';
import { pickFilters } from '@/features/Warehouses/lib/filters';
import { Prisma } from '@/generated/prisma/client';
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
import { supplierInvoiceLabel } from '../../lib/invoices';

const logger = new Logger('features/Purchases/Invoices/InvoicesList');

type InvoiceWhere = Prisma.supplier_invoicesWhereInput;
type InvoiceOrderBy = Prisma.supplier_invoicesOrderByWithRelationInput;
type FilterState = ReturnType<typeof parseSearchParams>;

// ============================================================================
// CONSTANTS
// ============================================================================

/** Ordenables (campos directos). Las FK y los compuestos se resuelven en SORT_MAP. */
const VALID_SORT_FIELDS = new Set(['cbte_type', 'issue_date', 'vat_period', 'total', 'due_date', 'status', 'arca_check_result', 'created_at']);

const SORT_MAP: Record<string, (dir: 'asc' | 'desc') => InvoiceOrderBy[]> = {
  number: (dir) => [{ sales_point: dir }, { number: dir }],
  supplier: (dir) => [{ supplier: { name: dir } }],
  supplier_cuit: (dir) => [{ supplier: { cuit: dir } }],
  creator: (dir) => [{ creator: { fullname: dir } }],
};

const DATE_RANGE_COLUMNS = ['issue_date', 'due_date', 'created_at'];

/** Unicas columnas que pasan por `buildFiltersWhere` (lista de permitidas). */
const FACETED_COLUMNS = ['supplier', 'vat_period', 'status', 'arca_check_result', 'creator'] as const;

/** columnId (URL) -> campo Prisma. */
const COLUMN_MAP: Record<string, string> = {
  supplier: 'supplier_id',
  vat_period: 'vat_period',
  status: 'status',
  arca_check_result: 'arca_check_result',
  creator: 'created_by',
};

const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });
const digitsOf = (value: string) => value.replace(/\D/g, '');

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/** Empresa si el usuario puede ver la tabla; `null` = sin acceso -> lista vacia. */
async function resolveCompanyId(): Promise<string | null> {
  const canView = await checkPermissionServer('compras', 'facturas', 'view');
  if (!canView) return null;
  return getActiveCompanyId();
}

/** Numero de comprobante: "00003-00012345" (punto de venta + numero) o solo el numero. Coincidencia exacta. */
function voucherNumberWhere(text: string): InvoiceWhere | null {
  const parts = text.split('-').map(digitsOf).filter(Boolean);
  if (parts.length === 2) return { sales_point: Number(parts[0]), number: BigInt(parts[1]) };
  if (parts.length === 1) return { number: BigInt(parts[0]) };
  return null;
}

/** Ids de proveedores de la empresa cuyo CUIT contiene los digitos (columna bigint: busqueda por texto en SQL). */
async function supplierIdsByCuit(companyId: string, digits: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM suppliers WHERE company_id = ${companyId}::uuid AND cuit::text LIKE ${`%${digits}%`}
  `;
  return rows.map((r) => r.id);
}

/** Importe tipeado ("1234,56" o "1234.56") -> Decimal exacto; `null` si no es un numero. */
function parseAmount(text: string): Prisma.Decimal | null {
  const normalized = text.trim().replace(/\./g, (m, offset, s: string) => (s.includes(',') ? '' : m)).replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return new Prisma.Decimal(normalized);
}

/** WHERE compartido entre paginated, export y facets. */
async function buildWhereClause(companyId: string, state: FilterState): Promise<InvoiceWhere> {
  const f = state.filters;
  const and: InvoiceWhere[] = [{ company_id: companyId }];

  const search = state.search?.trim();
  if (search) {
    const or: InvoiceWhere[] = [{ supplier: { OR: [{ name: contains(search) }, { trade_name: contains(search) }] } }];
    const byNumber = /^[\d-]+$/.test(search) ? voucherNumberWhere(search) : null;
    if (byNumber) or.push(byNumber);
    and.push({ OR: or });
  }

  and.push(buildFiltersWhere(pickFilters(f, FACETED_COLUMNS), COLUMN_MAP) as InvoiceWhere);
  and.push(buildDateRangeFiltersWhere(f, DATE_RANGE_COLUMNS) as InvoiceWhere);

  // Text: comprobante (exacto), CUIT (parcial, bigint) y total (exacto, decimal)
  const numberText = f.number?.[0]?.trim();
  if (numberText) and.push(voucherNumberWhere(numberText) ?? { id: { in: [] } });

  const cuitDigits = digitsOf(f.supplier_cuit?.[0] ?? '');
  if (cuitDigits) and.push({ supplier_id: { in: await supplierIdsByCuit(companyId, cuitDigits) } });

  const totalText = f.total?.[0]?.trim();
  if (totalText) {
    const amount = parseAmount(totalText);
    and.push(amount ? { total: amount } : { id: { in: [] } });
  }

  // Tipo de comprobante (Int): conversion manual
  const cbteTypes = f.cbte_type?.map(Number).filter((n) => !Number.isNaN(n));
  if (cbteTypes?.length) and.push({ cbte_type: { in: cbteTypes } });

  // OC vinculadas (M:M via lineas); NULL_FILTER_VALUE = sin lineas de OC (gastos)
  const orderValues = f.orders ?? [];
  if (orderValues.length > 0) {
    const wantsNone = orderValues.includes(NULL_FILTER_VALUE);
    const orderIds = orderValues.filter((v) => v !== NULL_FILTER_VALUE);
    const conditions: InvoiceWhere[] = [];
    if (orderIds.length) conditions.push({ lines: { some: { order_line: { order_id: { in: orderIds } } } } });
    if (wantsNone) conditions.push({ lines: { none: { order_line_id: { not: null } } } });
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
  vat_period: true,
  total: true,
  status: true,
  arca_check_result: true,
  created_at: true,
  supplier: { select: { id: true, name: true, cuit: true } },
  creator: { select: { id: true, fullname: true, email: true } },
  lines: { select: { order_line: { select: { order: { select: { id: true, number: true } } } } } },
} as const;

const profileName = (p: { fullname: string | null; email: string | null }) => p.fullname ?? p.email ?? '-';

function shape(rows: Prisma.supplier_invoicesGetPayload<{ select: typeof INVOICE_SELECT }>[]) {
  return rows.map((r) => {
    const orders = new Map<string, { id: string; number: string }>();
    for (const l of r.lines) if (l.order_line) orders.set(l.order_line.order.id, l.order_line.order);

    return {
      id: r.id,
      label: supplierInvoiceLabel(r),
      cbte_type: r.cbte_type,
      issue_date: r.issue_date,
      due_date: r.due_date,
      vat_period: r.vat_period,
      total: r.total.toString(),
      status: r.status,
      arca_check_result: r.arca_check_result,
      created_at: r.created_at,
      supplier: { id: r.supplier.id, name: r.supplier.name, cuit: r.supplier.cuit.toString() },
      creator: { id: r.creator.id, name: profileName(r.creator) },
      orders: [...orders.values()].sort((a, b) => a.number.localeCompare(b.number)),
    };
  });
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getSupplierInvoicesPaginated(searchParams: DataTableSearchParams) {
  const companyId = await resolveCompanyId();
  if (!companyId) return { data: [], total: 0 };

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = await buildWhereClause(companyId, state);

    const resolvedSorts: InvoiceOrderBy[] = [];
    for (const s of state.sorting) {
      const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
      const mapper = SORT_MAP[s.id];
      if (mapper) resolvedSorts.push(...mapper(dir));
      else if (VALID_SORT_FIELDS.has(s.id)) resolvedSorts.push({ [s.id]: dir });
    }
    const orderBy: InvoiceOrderBy[] = [...resolvedSorts, { issue_date: 'desc' }, { created_at: 'desc' }];

    const [rows, total] = await Promise.all([
      prisma.supplier_invoices.findMany({ where, orderBy, skip, take, select: INVOICE_SELECT }),
      prisma.supplier_invoices.count({ where }),
    ]);
    return { data: shape(rows), total };
  } catch (error) {
    logger.error('Error al obtener comprobantes de proveedor', { data: { error } });
    throw new Error('No se pudo obtener la lista de comprobantes');
  }
}

// ============================================================================
// EXPORT (sin paginacion)
// ============================================================================

export async function getAllSupplierInvoicesForExport(searchParams: DataTableSearchParams) {
  const companyId = await resolveCompanyId();
  if (!companyId) return [];

  try {
    const state = parseSearchParams(searchParams);
    const where = await buildWhereClause(companyId, state);
    const rows = await prisma.supplier_invoices.findMany({
      where,
      orderBy: [{ issue_date: 'desc' }, { created_at: 'desc' }],
      select: INVOICE_SELECT,
    });
    return shape(rows);
  } catch (error) {
    logger.error('Error al exportar comprobantes de proveedor', { data: { error } });
    throw new Error('No se pudo exportar la lista de comprobantes');
  }
}

// ============================================================================
// SINGLE FACET (lazy-load, con cross-filter)
// ============================================================================

export async function getSupplierInvoiceSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{ counts: Map<string, number>; resolvedOptions?: Array<{ id: string; name: string | null }> } | null> {
  const companyId = await resolveCompanyId();
  if (!companyId) return null;

  const parsed = searchParams && Object.keys(searchParams).length > 0 ? parseSearchParams(searchParams) : null;

  /** WHERE con todos los filtros activos MENOS el de la columna que se esta abriendo. */
  function crossWhere(excludeColumn: string): Promise<InvoiceWhere> {
    const base: FilterState = parsed ?? parseSearchParams({});
    const filters = { ...base.filters };
    delete filters[excludeColumn];
    return buildWhereClause(companyId as string, { ...base, filters });
  }

  function toFacetMap(rows: { key: string | number | null; count: number }[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const { key, count } of rows) {
      const k = key == null ? NULL_FILTER_VALUE : String(key);
      map.set(k, (map.get(k) ?? 0) + count);
    }
    return map;
  }

  try {
    const where = await crossWhere(columnId);

    if (columnId === 'cbte_type') {
      const rows = await prisma.supplier_invoices.groupBy({ by: ['cbte_type'], where, _count: true });
      return { counts: toFacetMap(rows.map((r) => ({ key: r.cbte_type, count: r._count }))) };
    }

    if (columnId === 'status') {
      const rows = await prisma.supplier_invoices.groupBy({ by: ['status'], where, _count: true });
      return { counts: toFacetMap(rows.map((r) => ({ key: r.status, count: r._count }))) };
    }

    if (columnId === 'arca_check_result') {
      const rows = await prisma.supplier_invoices.groupBy({ by: ['arca_check_result'], where, _count: true });
      return { counts: toFacetMap(rows.map((r) => ({ key: r.arca_check_result, count: r._count }))) };
    }

    if (columnId === 'vat_period') {
      const rows = await prisma.supplier_invoices.groupBy({ by: ['vat_period'], where, _count: true });
      return {
        counts: toFacetMap(rows.map((r) => ({ key: r.vat_period, count: r._count }))),
        resolvedOptions: rows
          .map((r) => ({ id: r.vat_period, name: r.vat_period }))
          .sort((a, b) => b.id.localeCompare(a.id)),
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

    if (columnId === 'creator') {
      const rows = await prisma.supplier_invoices.groupBy({ by: ['created_by'], where, _count: true });
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

    if (columnId === 'orders') {
      // M:M: cuantos comprobantes (distintos) tiene cada OC; sin lineas de OC = "Sin OC"
      const invoices = await prisma.supplier_invoices.findMany({
        where,
        select: { lines: { select: { order_line: { select: { order: { select: { id: true, number: true } } } } } } },
      });
      const counts = new Map<string, number>();
      const names = new Map<string, string>();
      for (const inv of invoices) {
        const seen = new Set<string>();
        for (const l of inv.lines) {
          const order = l.order_line?.order;
          if (!order) continue;
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
    logger.error('Error al obtener facet de comprobantes', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// TIPOS
// ============================================================================

export type SupplierInvoiceListItem = Awaited<ReturnType<typeof getSupplierInvoicesPaginated>>['data'][number];
