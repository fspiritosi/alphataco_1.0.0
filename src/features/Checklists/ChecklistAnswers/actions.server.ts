'use server';

import { Logger } from '@/lib/logger';
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
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { normalizeResult } from './utils';

const logger = new Logger('ChecklistAnswers/actions.server');

/**
 * Empresa activa, tras comprobar que la plantilla pedida le pertenece.
 *
 * `templateId` llega del cliente en las tres actions de esta tabla (son endpoints públicos
 * sin RLS): sin esta verificación, cualquier UUID de plantilla dejaba consultar las
 * respuestas de otra empresa. Devuelve `null` si la plantilla no es de la empresa activa.
 */
async function resolveTemplateCompanyId(templateId: string): Promise<string | null> {
  const company_id = await getActiveCompanyId();
  const template = await prisma.checklist_templates.findFirst({
    where: withCompany({ id: templateId }, company_id),
    select: { id: true },
  });
  if (!template) {
    logger.warn('Plantilla de checklist fuera de la empresa activa', { data: { templateId, company_id } });
    return null;
  }
  return company_id;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos directos de checklist_answers que se pueden ordenar server-side */
const VALID_SORT_FIELDS = new Set(['created_at', 'result', 'kilometraje', 'horometro']);

/** Params de URL de navegación que NO son filtros de la tabla */
const IGNORED_PARAMS = new Set(['tab', 'subtab']);

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['created_at'];

/**
 * Columnas manejadas manualmente en buildWhereClause (no pasar a buildFiltersWhere).
 * result: valores inconsistentes (B/M/passed/failed/null)
 * equipment_id: FK con soporte null
 * user_id: FK con soporte null
 * customer_id: columna GENERATED desde JSONB — FK a customers
 * chofer_employee_id: FK a employees (columna directa)
 */
const MANUALLY_HANDLED_COLUMNS = ['result', 'equipment_id', 'user_id', 'customer_id', 'chofer_employee_id'];

/** Columnas con filtro de texto individual */
const TEXT_FILTER_COLUMNS = ['observations'];

/**
 * Mapping de columnId (URL) → campo real en Prisma.
 * Solo columnas procesadas genéricamente por buildFiltersWhere.
 */
const COLUMN_MAP: Record<string, string> = {};

// ============================================================================
// SELECT COMÚN
// ============================================================================

const CHECKLIST_ANSWER_SELECT = {
  id: true,
  created_at: true,
  result: true,
  answer_data: true,
  observations: true,
  equipment_id: true,
  user_id: true,
  // Nuevas columnas: FK directa de chofer y columnas GENERATED desde JSONB
  chofer_employee_id: true,
  customer_id: true,
  kilometraje: true,
  horometro: true,
  // Relación equipo (vehicle)
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
      brand_vehicles: { select: { name: true } },
      model_vehicles: { select: { name: true } },
    },
  },
  // Relación usuario
  profile: {
    select: {
      id: true,
      fullname: true,
    },
  },
} as const;

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/**
 * Construye el WHERE clause compartido entre paginated, export y facets.
 * Filtra SIEMPRE por `template_id` + `company_id` (sin RLS, el perímetro va explícito).
 */
function buildWhereClause(templateId: string, companyId: string, state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, []);

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...MANUALLY_HANDLED_COLUMNS,
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      ...TEXT_FILTER_COLUMNS,
    ],
  });

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  const textFiltersWhere = buildTextFiltersWhere(state.filters, TEXT_FILTER_COLUMNS);

  // Manejo manual de result (valores inconsistentes: B/passed/M/failed/null)
  const manualFilters: Record<string, unknown> = {};
  const resultValues = state.filters['result'];
  if (resultValues?.length) {
    const rawValues: (string | null)[] = [];
    for (const v of resultValues) {
      if (v === NULL_FILTER_VALUE) {
        rawValues.push(null);
      } else if (v === 'passed') {
        rawValues.push('B', 'passed');
      } else if (v === 'failed') {
        rawValues.push('M', 'failed');
      }
    }
    // Prisma OR para manejar null y múltiples valores
    const nonNullValues = rawValues.filter((v): v is string => v !== null);
    const includesNull = rawValues.includes(null);
    if (includesNull && nonNullValues.length > 0) {
      manualFilters.OR = [{ result: { in: nonNullValues } }, { result: null }];
    } else if (includesNull) {
      manualFilters.result = null;
    } else {
      manualFilters.result = { in: nonNullValues };
    }
  }

  // Manejo manual de equipment_id (FK UUID — buildFiltersWhere lo pone en el map pero
  // necesitamos asegurarnos que no se duplique)
  const equipmentValues = state.filters['equipment_id'];
  const manualEquipment: Record<string, unknown> = {};
  if (equipmentValues?.length) {
    const realValues = equipmentValues.filter((v) => v !== NULL_FILTER_VALUE);
    const includesNull = equipmentValues.includes(NULL_FILTER_VALUE);
    if (includesNull && realValues.length > 0) {
      manualEquipment.OR = [{ equipment_id: { in: realValues } }, { equipment_id: null }];
    } else if (includesNull) {
      manualEquipment.equipment_id = null;
    } else {
      manualEquipment.equipment_id = { in: realValues };
    }
  }

  // Manejo manual de user_id (FK UUID con soporte null)
  const userValues = state.filters['user_id'];
  const manualUser: Record<string, unknown> = {};
  if (userValues?.length) {
    const realValues = userValues.filter((v) => v !== NULL_FILTER_VALUE);
    const includesNull = userValues.includes(NULL_FILTER_VALUE);
    if (includesNull && realValues.length > 0) {
      manualUser.OR = [{ user_id: { in: realValues } }, { user_id: null }];
    } else if (includesNull) {
      manualUser.user_id = null;
    } else {
      manualUser.user_id = { in: realValues };
    }
  }

  // Manejo manual de customer_id (columna GENERATED desde JSONB — FK a customers)
  const customerValues = state.filters['customer_id'];
  const manualCustomer: Record<string, unknown> = {};
  if (customerValues?.length) {
    const realValues = customerValues.filter((v) => v !== NULL_FILTER_VALUE);
    const includesNull = customerValues.includes(NULL_FILTER_VALUE);
    if (includesNull && realValues.length > 0) {
      manualCustomer.OR = [{ customer_id: { in: realValues } }, { customer_id: null }];
    } else if (includesNull) {
      manualCustomer.customer_id = null;
    } else {
      manualCustomer.customer_id = { in: realValues };
    }
  }

  // Manejo manual de chofer_employee_id (FK directa a employees)
  const choferValues = state.filters['chofer_employee_id'];
  const manualChofer: Record<string, unknown> = {};
  if (choferValues?.length) {
    const realValues = choferValues.filter((v) => v !== NULL_FILTER_VALUE);
    const includesNull = choferValues.includes(NULL_FILTER_VALUE);
    if (includesNull && realValues.length > 0) {
      manualChofer.OR = [{ chofer_employee_id: { in: realValues } }, { chofer_employee_id: null }];
    } else if (includesNull) {
      manualChofer.chofer_employee_id = null;
    } else {
      manualChofer.chofer_employee_id = { in: realValues };
    }
  }

  const baseFilters = withCompany({ template_id: templateId }, companyId);

  return {
    ...baseFilters,
    ...searchWhere,
    ...filtersWhere,
    ...dateFiltersWhere,
    ...textFiltersWhere,
    ...(Object.keys(manualFilters).length > 0 ? manualFilters : {}),
    ...(Object.keys(manualEquipment).length > 0 ? manualEquipment : {}),
    ...(Object.keys(manualUser).length > 0 ? manualUser : {}),
    ...(Object.keys(manualCustomer).length > 0 ? manualCustomer : {}),
    ...(Object.keys(manualChofer).length > 0 ? manualChofer : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getChecklistAnswersPaginated(searchParams: DataTableSearchParams, templateId: string) {
  try {
    const companyId = await resolveTemplateCompanyId(templateId);
    if (!companyId) return { data: [], total: 0 };

    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const { skip, take } = stateToPrismaParams(state);
    const where = buildWhereClause(templateId, companyId, state);

    // Multi-sort — solo campos válidos
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        resolvedSorts.push({ [s.id]: dir });
      }
    }

    const safeOrderBy = resolvedSorts.length > 0 ? resolvedSorts : [{ created_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.checklist_answers.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: CHECKLIST_ANSWER_SELECT,
      }),
      prisma.checklist_answers.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener respuestas de checklist paginadas', { data: { error } });
    throw new Error('No se pudo obtener la lista de respuestas. Intente nuevamente.');
  }
}

export type ChecklistAnswerListItem = Awaited<ReturnType<typeof getChecklistAnswersPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllChecklistAnswersForExport(searchParams: DataTableSearchParams, templateId: string) {
  try {
    const companyId = await resolveTemplateCompanyId(templateId);
    if (!companyId) return [];

    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const where = buildWhereClause(templateId, companyId, state);

    return await prisma.checklist_answers.findMany({
      where,
      orderBy: [{ created_at: 'desc' as const }],
      select: CHECKLIST_ANSWER_SELECT,
    });
  } catch (error) {
    logger.error('Error al exportar respuestas de checklist', { data: { error } });
    throw new Error('No se pudo exportar la lista de respuestas. Intente nuevamente.');
  }
}

// ============================================================================
// FACETS (con cross-filtering)
// ============================================================================

/**
 * Facets con cross-filtering: los counts de cada columna excluyen su propio filtro,
 * mostrando cuántos registros tendría cada opción si se cambiara solo ese filtro.
 */
export async function getChecklistAnswersFacets(searchParams?: DataTableSearchParams, templateId?: string) {
  if (!templateId) return null;

  const resolvedCompanyId = await resolveTemplateCompanyId(templateId);
  if (!resolvedCompanyId) return null;
  // Copia con tipo estrecho: `crossWhere` es una function declaration y no ve el narrowing.
  const companyId: string = resolvedCompanyId;

  const baseWhere = withCompany({ template_id: templateId }, companyId);

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete parsedState.filters[key];
    }
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  // Helper: WHERE con todos los filtros EXCEPTO el de la columna indicada
  function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) return baseWhere;
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];
    return buildWhereClause(templateId!, companyId, modified);
  }

  // Helper: construye Map<string, number> con soporte para null → NULL_FILTER_VALUE
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
    // Counts de resultado (raw — B, M, passed, failed, null) → normalizados
    const [rawResultCounts, equipmentCounts, userCounts, choferCounts, customerCounts] = await Promise.all([
      prisma.checklist_answers.groupBy({
        by: ['result'],
        where: crossWhere('result'),
        _count: true,
      }),
      prisma.checklist_answers.groupBy({
        by: ['equipment_id'],
        where: crossWhere('equipment_id'),
        _count: true,
      }),
      prisma.checklist_answers.groupBy({
        by: ['user_id'],
        where: crossWhere('user_id'),
        _count: true,
      }),
      // chofer_employee_id — FK directa a employees
      prisma.checklist_answers.groupBy({
        by: ['chofer_employee_id'],
        where: crossWhere('chofer_employee_id'),
        _count: true,
      }),
      // customer_id — columna GENERATED desde JSONB
      prisma.checklist_answers.groupBy({
        by: ['customer_id'],
        where: crossWhere('customer_id'),
        _count: true,
      }),
    ]);

    // Normalizar result counts (B/passed → passed, M/failed → failed, null → pending)
    const normalizedResultMap = new Map<string, number>();
    for (const { result, _count } of rawResultCounts) {
      const normalized = normalizeResult(result);
      normalizedResultMap.set(normalized, (normalizedResultMap.get(normalized) ?? 0) + _count);
    }

    // Para equipment, cargar nombres de los vehículos
    const equipmentIds = equipmentCounts.map((r) => r.equipment_id).filter((id): id is string => id != null);

    const vehicles =
      equipmentIds.length > 0
        ? await prisma.vehicles.findMany({
            where: { id: { in: equipmentIds } },
            select: {
              id: true,
              domain: true,
              serie: true,
              intern_number: true,
            },
          })
        : [];

    const vehicleMap = new Map(
      vehicles.map((v) => [
        v.id,
        v.domain
          ? `${v.domain}${v.intern_number ? ` - ${v.intern_number}` : ''}`
          : `${v.serie ?? ''}${v.intern_number ? ` - ${v.intern_number}` : ''}`,
      ])
    );

    // Map de equipment_id → count (para externalCounts)
    const equipmentFacetMap = toFacetMap(equipmentCounts.map((r) => ({ key: r.equipment_id, count: r._count })));

    // Para users, cargar nombres de perfil
    const userIds = userCounts.map((r) => r.user_id).filter((id): id is string => id != null);

    const profiles =
      userIds.length > 0
        ? await prisma.profile.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullname: true },
          })
        : [];

    const profileMap = new Map(profiles.map((p) => [p.id, p.fullname ?? p.id]));

    // Map de user_id → count (para externalCounts)
    const userFacetMap = toFacetMap(userCounts.map((r) => ({ key: r.user_id, count: r._count })));

    // Para chofer_employee_id, cargar nombres desde employees con legajo (obligatorio por estándar)
    const choferIds = choferCounts.map((r) => r.chofer_employee_id).filter((id): id is string => id != null);

    const choferEmployees =
      choferIds.length > 0
        ? await prisma.employees.findMany({
            where: { id: { in: choferIds } },
            select: {
              id: true,
              firstname: true,
              lastname: true,
              // El campo 'file' es el número de legajo en este proyecto
              file: true,
            },
          })
        : [];

    // Label: [legajo] Apellido Nombre — legajo obligatorio por estándar del proyecto
    const choferNameMap = new Map(
      choferEmployees.map((e) => [e.id, `[${e.file ?? '—'}] ${e.lastname ?? ''} ${e.firstname ?? ''}`.trim()])
    );

    // Map de chofer_employee_id → count (para externalCounts)
    const choferFacetMap = toFacetMap(choferCounts.map((r) => ({ key: r.chofer_employee_id, count: r._count })));

    // Para customer_id, cargar nombres desde customers
    const customerIds = customerCounts.map((r) => r.customer_id).filter((id): id is string => id != null);

    const customersList =
      customerIds.length > 0
        ? await prisma.customers.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, name: true },
          })
        : [];

    const customerNameMap = new Map(customersList.map((c) => [c.id, c.name]));

    // Map de customer_id → count (para externalCounts)
    const customerFacetMap = toFacetMap(customerCounts.map((r) => ({ key: r.customer_id, count: r._count })));

    return {
      result: normalizedResultMap,
      equipment_id: equipmentFacetMap,
      vehicleNames: vehicleMap,
      user_id: userFacetMap,
      userNames: profileMap,
      chofer_employee_id: choferFacetMap,
      choferNames: choferNameMap,
      customer_id: customerFacetMap,
      customerNames: customerNameMap,
    };
  } catch (error) {
    logger.error('Error al obtener facets de respuestas de checklist', { data: { error } });
    return null;
  }
}

export type ChecklistAnswersFacets = Awaited<ReturnType<typeof getChecklistAnswersFacets>>;
