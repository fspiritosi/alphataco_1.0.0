'use server';

import { checkPermissionServer } from '@/features/Permissions';
import { formatCuit } from '../../lib/supplier-ids';
import { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import {
  buildDateRangeFiltersWhere,
  NULL_FILTER_VALUE,
  parseSearchParams,
  stateToPrismaParams,
} from '@/shared/components/common/DataTable/helpers';
import type { DataTableSearchParams } from '@/shared/components/common/DataTable/types';
import { isReceiverVatConditionId, RECEIVER_VAT_CONDITIONS } from '@/shared/lib/arca/catalogs';
import { prisma } from '@/shared/lib/prisma';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import {
  deriveSupplierDocumentState,
  SUPPLIER_DOCUMENT_STATES,
  supplierDocumentDates,
  type SupplierDocumentState,
} from './labels';

const logger = new Logger('features/Purchases/Suppliers/SuppliersList');

type SupplierWhere = Prisma.suppliersWhereInput;
type SupplierOrderBy = Prisma.suppliersOrderByWithRelationInput;
type FilterState = ReturnType<typeof parseSearchParams>;

// ============================================================================
// CONSTANTS
// ============================================================================

/** Ordenables (campos directos). Contacto, rubros y documentos son derivados / M:M: no ordenables. */
const VALID_SORT_FIELDS = new Set(['name', 'cuit', 'created_at', 'is_active']);

const SORT_MAP: Record<string, (dir: 'asc' | 'desc') => SupplierOrderBy> = {
  vat_condition: (dir) => ({ vat_condition_id: dir }),
};

const DATE_RANGE_COLUMNS = ['created_at'];

const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/** Empresa si el usuario puede ver proveedores; `null` = sin acceso -> lista vacia. */
async function resolveCompanyId(): Promise<string | null> {
  if (!(await checkPermissionServer('compras', 'proveedores', 'view'))) return null;
  return getActiveCompanyId();
}

/**
 * Digitos del texto buscado (acepta "30-71234567-8", "30 7123" o "30.71"). `null` si trae letras u
 * otros simbolos: un CUIT nunca los tiene, asi que ese texto no puede coincidir con ninguno.
 */
function cuitDigits(raw: string): string | null {
  const digits = raw.replace(/[\s.-]/g, '');
  return /^\d+$/.test(digits) ? digits : null;
}

/** Ids de proveedores cuyo CUIT contiene los digitos (BigInt no admite `contains` en Prisma). */
async function findSupplierIdsByCuit(companyId: string, digits: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM suppliers
    WHERE company_id = ${companyId}::uuid AND cuit::text LIKE ${`%${digits}%`}
  `;
  return rows.map((r) => r.id);
}

/** Condicion Prisma de cada estado de documentacion (sobre documentos vigentes). */
function documentStateWhere(state: SupplierDocumentState, dates: { today: string; soon: string }): SupplierWhere {
  const today = new Date(`${dates.today}T00:00:00Z`);
  const soon = new Date(`${dates.soon}T00:00:00Z`);
  const expired = { replaced_by_id: null, expires_at: { lt: today } };
  switch (state) {
    case 'EXPIRED':
      return { documents: { some: expired } };
    case 'EXPIRING':
      return {
        AND: [
          { documents: { none: expired } },
          { documents: { some: { replaced_by_id: null, expires_at: { gte: today, lte: soon } } } },
        ],
      };
    case 'OK':
      return {
        documents: {
          some: { replaced_by_id: null },
          none: { replaced_by_id: null, expires_at: { lte: soon } },
        },
      };
    case 'NONE':
      return { documents: { none: { replaced_by_id: null } } };
  }
}

/** WHERE compartido entre paginated, export y facets. */
async function buildWhereClause(companyId: string, state: FilterState): Promise<SupplierWhere> {
  const f = state.filters;
  const and: SupplierWhere[] = [{ company_id: companyId }];

  // Busqueda global: razon social, nombre de fantasia y CUIT
  const search = state.search?.trim();
  if (search) {
    const or: SupplierWhere[] = [{ name: contains(search) }, { trade_name: contains(search) }];
    const digits = cuitDigits(search);
    if (digits && digits.length >= 3) or.push({ id: { in: await findSupplierIdsByCuit(companyId, digits) } });
    and.push({ OR: or });
  }

  // Texto: razon social / fantasia
  const name = f.name?.[0]?.trim();
  if (name) and.push({ OR: [{ name: contains(name) }, { trade_name: contains(name) }] });

  // Texto: CUIT con o sin guiones
  const cuitRaw = f.cuit?.[0]?.trim();
  if (cuitRaw) {
    const digits = cuitDigits(cuitRaw);
    and.push({ id: { in: digits ? await findSupplierIdsByCuit(companyId, digits) : [] } });
  }

  // Texto: contacto principal (nombre, mail o telefono)
  const contact = f.contact?.[0]?.trim();
  if (contact) {
    and.push({
      contacts: {
        some: { is_primary: true, OR: [{ name: contains(contact) }, { email: contains(contact) }, { phone: contains(contact) }] },
      },
    });
  }

  // Condicion de IVA (FK Int -> ids numericos)
  const vatIds = f.vat_condition?.map(Number).filter((n) => !Number.isNaN(n));
  if (vatIds?.length) and.push({ vat_condition_id: { in: vatIds } });

  // Rubros (M:M) con "Sin rubro"
  if (f.categories?.length) {
    const hasNull = f.categories.includes(NULL_FILTER_VALUE);
    const ids = f.categories.filter((v) => v !== NULL_FILTER_VALUE);
    const parts: SupplierWhere[] = [];
    if (ids.length) parts.push({ category_links: { some: { category_id: { in: ids } } } });
    if (hasNull) parts.push({ category_links: { none: {} } });
    and.push(parts.length === 1 ? parts[0] : { OR: parts });
  }

  // Estado de la documentacion (derivado)
  const docStates = (f.documents ?? []).filter((v): v is SupplierDocumentState =>
    (SUPPLIER_DOCUMENT_STATES as readonly string[]).includes(v)
  );
  if (docStates.length) {
    const dates = supplierDocumentDates();
    and.push({ OR: docStates.map((s) => documentStateWhere(s, dates)) });
  }

  // Activo / inactivo (llega como 'true' / 'false'); con ambos no se filtra
  if (f.is_active?.length === 1) and.push({ is_active: f.is_active[0] === 'true' });

  and.push(buildDateRangeFiltersWhere(f, DATE_RANGE_COLUMNS) as SupplierWhere);

  return { AND: and };
}

const SUPPLIER_SELECT = {
  id: true,
  name: true,
  trade_name: true,
  cuit: true,
  vat_condition_id: true,
  is_active: true,
  created_at: true,
  category_links: { select: { category: { select: { id: true, name: true } } } },
  contacts: {
    where: { is_primary: true },
    take: 1,
    select: { name: true, email: true, phone: true },
  },
  documents: { where: { replaced_by_id: null }, select: { expires_at: true } },
} as const;

function shape(rows: Prisma.suppliersGetPayload<{ select: typeof SUPPLIER_SELECT }>[]) {
  const dates = supplierDocumentDates();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    trade_name: r.trade_name,
    // BigInt no se serializa hacia el cliente
    cuit: formatCuit(r.cuit.toString()),
    vat_condition_id: r.vat_condition_id,
    vat_condition: isReceiverVatConditionId(r.vat_condition_id)
      ? RECEIVER_VAT_CONDITIONS[r.vat_condition_id].label
      : String(r.vat_condition_id),
    is_active: r.is_active,
    created_at: r.created_at,
    categories: r.category_links.map((l) => l.category).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    contact: r.contacts[0] ?? null,
    documents: deriveSupplierDocumentState(r.documents, dates),
  }));
}

/** Inactivos SIEMPRE al final, sin importar el orden elegido. */
function buildOrderBy(state: FilterState): SupplierOrderBy[] {
  const sorts: SupplierOrderBy[] = [];
  for (const s of state.sorting) {
    const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
    const mapper = SORT_MAP[s.id];
    if (mapper) sorts.push(mapper(dir));
    else if (VALID_SORT_FIELDS.has(s.id) && s.id !== 'is_active') sorts.push({ [s.id]: dir });
  }
  return [{ is_active: 'desc' }, ...sorts, { name: 'asc' }];
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getSuppliersPaginated(searchParams: DataTableSearchParams) {
  const companyId = await resolveCompanyId();
  if (!companyId) return { data: [], total: 0 };

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = await buildWhereClause(companyId, state);

    const [rows, total] = await Promise.all([
      prisma.suppliers.findMany({ where, orderBy: buildOrderBy(state), skip, take, select: SUPPLIER_SELECT }),
      prisma.suppliers.count({ where }),
    ]);
    return { data: shape(rows), total };
  } catch (error) {
    logger.error('Error al obtener proveedores', { data: { error } });
    throw new Error('No se pudo obtener la lista de proveedores');
  }
}

// ============================================================================
// EXPORT (sin paginacion)
// ============================================================================

export async function getAllSuppliersForExport(searchParams: DataTableSearchParams) {
  const companyId = await resolveCompanyId();
  if (!companyId) return [];

  try {
    const state = parseSearchParams(searchParams);
    const where = await buildWhereClause(companyId, state);
    const rows = await prisma.suppliers.findMany({ where, orderBy: buildOrderBy(state), select: SUPPLIER_SELECT });
    return shape(rows);
  } catch (error) {
    logger.error('Error al exportar proveedores', { data: { error } });
    throw new Error('No se pudo exportar la lista de proveedores');
  }
}

// ============================================================================
// SINGLE FACET (lazy-load, con cross-filter)
// ============================================================================

export async function getSupplierSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{ counts: Map<string, number>; resolvedOptions?: Array<{ id: string; name: string | null }> } | null> {
  const companyId = await resolveCompanyId();
  if (!companyId) return null;

  const parsed = searchParams && Object.keys(searchParams).length > 0 ? parseSearchParams(searchParams) : null;

  /** WHERE con todos los filtros activos MENOS el de la columna que se esta abriendo. */
  function crossWhere(excludeColumn: string): Promise<SupplierWhere> {
    const base: FilterState = parsed ?? parseSearchParams({});
    const filters = { ...base.filters };
    delete filters[excludeColumn];
    return buildWhereClause(companyId as string, { ...base, filters });
  }

  try {
    const where = await crossWhere(columnId);

    if (columnId === 'vat_condition') {
      const rows = await prisma.suppliers.groupBy({ by: ['vat_condition_id'], where, _count: true });
      return {
        counts: new Map(rows.map((r) => [String(r.vat_condition_id), r._count])),
        resolvedOptions: rows
          .map((r) => ({
            id: String(r.vat_condition_id),
            name: isReceiverVatConditionId(r.vat_condition_id)
              ? RECEIVER_VAT_CONDITIONS[r.vat_condition_id].label
              : String(r.vat_condition_id),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'es')),
      };
    }

    if (columnId === 'categories') {
      const [rows, withoutCategory] = await Promise.all([
        prisma.supplier_category_links.groupBy({ by: ['category_id'], where: { supplier: where }, _count: true }),
        prisma.suppliers.count({ where: { AND: [where, { category_links: { none: {} } }] } }),
      ]);
      const ids = rows.map((r) => r.category_id);
      const categories = ids.length
        ? await prisma.supplier_categories.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          })
        : [];
      const counts = new Map(rows.map((r) => [r.category_id, r._count]));
      if (withoutCategory > 0) counts.set(NULL_FILTER_VALUE, withoutCategory);
      return { counts, resolvedOptions: categories };
    }

    if (columnId === 'documents') {
      const dates = supplierDocumentDates();
      const entries = await Promise.all(
        SUPPLIER_DOCUMENT_STATES.map(async (state) => {
          const count = await prisma.suppliers.count({ where: { AND: [where, documentStateWhere(state, dates)] } });
          return [state, count] as const;
        })
      );
      return { counts: new Map<string, number>(entries) };
    }

    if (columnId === 'is_active') {
      const rows = await prisma.suppliers.groupBy({ by: ['is_active'], where, _count: true });
      return { counts: new Map(rows.map((r) => [String(r.is_active), r._count])) };
    }

    logger.warn('Facet no reconocido', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error al obtener facet de proveedores', { data: { error, columnId } });
    return null;
  }
}

// ============================================================================
// TIPOS
// ============================================================================

export type SupplierListItem = Awaited<ReturnType<typeof getSuppliersPaginated>>['data'][number];
