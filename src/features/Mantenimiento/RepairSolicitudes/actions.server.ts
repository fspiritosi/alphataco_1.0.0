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

const logger = new Logger('RepairSolicitudes/actions.server');

// ============================================================================
// CONSTANTS
// ============================================================================

/** Campos directos de repair_solicitudes que se pueden ordenar server-side */
const VALID_SORT_FIELDS = new Set([
  'created_at',
  'updated_at',
  'state',
  'user_description',
  // FK columns (sorted by relation name)
  'vehicle',
  'reparation_type',
  'criticity',
]);

/**
 * Mapeo de columnId → orderBy de Prisma para columnas FK.
 */
const FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicle: (dir) => ({ vehicles: { domain: dir } }),
  reparation_type: (dir) => ({ types_of_repairs: { name: dir } }),
  criticity: (dir) => ({ types_of_repairs: { criticity: dir } }),
};

/** Params de URL que NO son filtros de la tabla */
const IGNORED_PARAMS = new Set(['tab', 'subtab', 'operations_subtab', 'taller_subtab', 'config_subtab']);

/** Columnas con filtro de texto libre en campos DIRECTOS de repair_solicitudes */
const TEXT_FILTER_COLUMNS = ['user_description'];

/** Columnas con filtro de texto libre en campos de la relación vehicles (manejadas manualmente) */
const VEHICLE_TEXT_FILTER_COLUMNS = ['domain', 'serie', 'intern_number'];

/** Columnas con filtro de rango de fechas */
const DATE_RANGE_COLUMNS = ['created_at', 'updated_at'];

/**
 * Mapping de columnId (URL) → campo real en Prisma
 */
const COLUMN_MAP: Record<string, string> = {
  vehicle: 'equipment_id',
  reparation_type: 'reparation_type',
  state: 'state',
};

/** Select común con todas las relaciones resueltas */
const REPAIR_SOLICITUDES_SELECT = {
  id: true,
  created_at: true,
  updated_at: true,
  state: true,
  user_description: true,
  mechanic_description: true,
  kilometer: true,
  // user_images y mechanic_images se cargan lazily en el dialog (via supabaseBrowser)
  // porque Prisma 7 falla con null dentro de String[] arrays en la BD
  scheduled: true,
  equipment_id: true,
  // FK relations
  vehicles: {
    select: {
      id: true,
      domain: true,
      serie: true,
      intern_number: true,
      year: true,
      engine: true,
      chassis: true,
      status: true,
      condition: true,
      picture: true,
      type_vehicles_typeTotype: {
        select: { id: true, name: true },
      },
      brand_vehicles: {
        select: { id: true, name: true },
      },
      model_vehicles: {
        select: { id: true, name: true },
      },
      sub_type: {
        select: { id: true, name: true },
      },
    },
  },
  types_of_repairs: {
    select: {
      id: true,
      name: true,
      criticity: true,
      type_of_maintenance: true,
    },
  },
  // Logs de la solicitud (todos, para timeline completa)
  repairlogs: {
    orderBy: { created_at: 'desc' as const },
    select: {
      id: true,
      created_at: true,
      title: true,
      description: true,
      kilometer: true,
      modified_by_user: true,
      modified_by_employee: true,
      profile: {
        select: { id: true, fullname: true },
      },
      employees: {
        select: { id: true, firstname: true, lastname: true },
      },
    },
  },
} as const;

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/**
 * Resuelve los IDs de solicitudes cuyo ÚLTIMO repairlog fue de uno de los usuarios dados.
 * Necesario porque Prisma no soporta "WHERE último log.modified_by_user IN (...)" nativamente.
 * Retorna undefined si no hay filtro activo.
 */
async function resolveLastModifiedByIds(companyId: string, userIds: string[]): Promise<string[]> {
  // Obtener el log más reciente de cada solicitud para los usuarios indicados.
  // Usamos findMany en repairlogs ordenado desc, agrupando manualmente.
  // Para escalar: traemos todos los logs de las solicitudes de la compañía
  // ordenados por created_at desc, y para cada repair_id nos quedamos con el primero.
  // Luego filtramos los que pertenecen a uno de los userIds.

  // Paso 1: Obtener todos los repair_ids distintos de solicitudes de la compañía
  const allLogs = await prisma.repairlogs.findMany({
    where: {
      repair_solicitudes: {
        vehicles: { company_id: companyId },
      },
    },
    select: { repair_id: true, modified_by_user: true, created_at: true },
    orderBy: { created_at: 'desc' },
  });

  // Paso 2: Para cada repair_id, tomar solo el primer log (el más reciente)
  const latestLogByRepair = new Map<string, string | null>();
  for (const log of allLogs) {
    if (log.repair_id && !latestLogByRepair.has(log.repair_id)) {
      latestLogByRepair.set(log.repair_id, log.modified_by_user ?? null);
    }
  }

  // Paso 3: Filtrar los repair_ids cuyo último log fue de uno de los userIds
  const matchingIds: string[] = [];
  for (const [repairId, userId] of latestLogByRepair.entries()) {
    if (userId && userIds.includes(userId)) {
      matchingIds.push(repairId);
    }
  }

  return matchingIds;
}

function buildWhereClause(
  companyId: string,
  state: ReturnType<typeof parseSearchParams>,
  resolvedSolicitudIds?: string[]
) {
  const searchWhere = buildSearchWhere(state.search, ['user_description']);

  // Columnas manejadas manualmente (excluidas del buildFiltersWhere genérico)
  const MANUALLY_HANDLED = [
    'vehicle', // FK → equipment_id, manejado con vehicleFilter
    'criticity', // campo en types_of_repairs (relación), no en repair_solicitudes
    'last_modified_by', // filtro sobre repairlogs
    ...VEHICLE_TEXT_FILTER_COLUMNS, // domain, serie, intern_number en relación vehicles
  ];

  const filtersWhere = buildFiltersWhere(state.filters, COLUMN_MAP, {
    exclude: [
      ...TEXT_FILTER_COLUMNS,
      ...MANUALLY_HANDLED,
      ...DATE_RANGE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
    ],
  });

  const textFiltersWhere = buildTextFiltersWhere(state.filters, ['user_description']);

  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, DATE_RANGE_COLUMNS);

  // ─── Filtro vehicle (FK UUID → equipment_id) ───────────────────────────────
  const vehicleFilter: Record<string, unknown> = {};
  const vehicleValues = state.filters['vehicle'];
  if (vehicleValues?.length) {
    const hasNull = vehicleValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // caso mixto se maneja en extraAndConditions
    } else if (hasNull) {
      vehicleFilter.equipment_id = null;
    } else {
      vehicleFilter.equipment_id = { in: realValues };
    }
  }

  // ─── Filtros de texto en campos de vehicles ────────────────────────────────
  const vehicleTextConditions: Record<string, unknown>[] = [];
  const domainValues = state.filters['domain'];
  const serieValues = state.filters['serie'];
  const internNumberValues = state.filters['intern_number'];

  if (domainValues?.length && typeof domainValues[0] === 'string') {
    vehicleTextConditions.push({ vehicles: { domain: { contains: domainValues[0], mode: 'insensitive' } } });
  }
  if (serieValues?.length && typeof serieValues[0] === 'string') {
    vehicleTextConditions.push({ vehicles: { serie: { contains: serieValues[0], mode: 'insensitive' } } });
  }
  if (internNumberValues?.length && typeof internNumberValues[0] === 'string') {
    vehicleTextConditions.push({
      vehicles: { intern_number: { contains: internNumberValues[0], mode: 'insensitive' } },
    });
  }

  // ─── Filtro criticity (campo en types_of_repairs) ─────────────────────────
  const criticityFilter: Record<string, unknown> = {};
  const criticityValues = state.filters['criticity'];
  if (criticityValues?.length) {
    const hasNull = criticityValues.includes(NULL_FILTER_VALUE);
    const realValues = criticityValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // caso mixto se maneja en extraAndConditions
    } else if (hasNull) {
      criticityFilter.types_of_repairs = { criticity: null };
    } else {
      criticityFilter.types_of_repairs = { criticity: { in: realValues } };
    }
  }

  // ─── Filtro last_modified_by (profile UUID en repairlogs) ─────────────────
  // IMPORTANTE: la columna "Últ. modif. por" muestra el ÚLTIMO log de cada solicitud.
  // El filtro debe buscar solicitudes cuyo log más reciente pertenece al usuario seleccionado.
  // resolvedSolicitudIds contiene los IDs de solicitudes pre-resueltos (ver resolveLastModifiedByIds).
  const lastModifiedByFilter: Record<string, unknown> = {};
  const lastModifiedByValues = state.filters['last_modified_by'];
  if (lastModifiedByValues?.length) {
    const hasNull = lastModifiedByValues.includes(NULL_FILTER_VALUE);
    const realValues = lastModifiedByValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      // caso mixto se maneja en extraAndConditions
    } else if (hasNull) {
      lastModifiedByFilter.repairlogs = { none: {} };
    } else if (resolvedSolicitudIds !== undefined) {
      // IDs pre-resueltos: solicitudes cuyo último log fue del usuario seleccionado
      lastModifiedByFilter.id = { in: resolvedSolicitudIds };
    } else {
      // Fallback (no debería ocurrir): búsqueda amplia por cualquier log
      lastModifiedByFilter.repairlogs = { some: { modified_by_user: { in: realValues } } };
    }
  }

  // ─── Condiciones AND para casos mixtos (null + reales) ────────────────────
  const extraAndConditions: Record<string, unknown>[] = [...vehicleTextConditions];

  // Caso mixto para vehicle
  if (vehicleValues?.length) {
    const hasNull = vehicleValues.includes(NULL_FILTER_VALUE);
    const realValues = vehicleValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [{ equipment_id: { in: realValues } }, { equipment_id: null }],
      });
    }
  }

  // Caso mixto para criticity
  if (criticityValues?.length) {
    const hasNull = criticityValues.includes(NULL_FILTER_VALUE);
    const realValues = criticityValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [{ types_of_repairs: { criticity: { in: realValues } } }, { types_of_repairs: { criticity: null } }],
      });
    }
  }

  // Caso mixto para last_modified_by (null + usuarios reales)
  if (lastModifiedByValues?.length) {
    const hasNull = lastModifiedByValues.includes(NULL_FILTER_VALUE);
    const realValues = lastModifiedByValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      if (resolvedSolicitudIds !== undefined) {
        // IDs pre-resueltos + solicitudes sin logs
        extraAndConditions.push({
          OR: [{ id: { in: resolvedSolicitudIds } }, { repairlogs: { none: {} } }],
        });
      } else {
        // Fallback
        extraAndConditions.push({
          OR: [{ repairlogs: { some: { modified_by_user: { in: realValues } } } }, { repairlogs: { none: {} } }],
        });
      }
    }
  }

  return {
    vehicles: {
      company_id: companyId,
    },
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
    ...vehicleFilter,
    ...criticityFilter,
    ...lastModifiedByFilter,
    ...(extraAndConditions.length > 0 ? { AND: extraAndConditions } : {}),
  };
}

// ============================================================================
// PAGINATED QUERY
// ============================================================================

export async function getRepairSolicitudesPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    const { skip, take } = stateToPrismaParams(state);

    // Pre-resolver IDs para filtro last_modified_by (último log de cada solicitud)
    let resolvedLastModifiedByIds: string[] | undefined;
    const lastModifiedByValues = state.filters['last_modified_by'];
    if (lastModifiedByValues?.length) {
      const realValues = lastModifiedByValues.filter((v) => v !== NULL_FILTER_VALUE);
      if (realValues.length > 0) {
        resolvedLastModifiedByIds = await resolveLastModifiedByIds(companyId, realValues);
      }
    }

    const where = buildWhereClause(companyId, state, resolvedLastModifiedByIds);

    // Safe orderBy: multi-sort, solo campos válidos
    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }

    const safeOrderBy = [...resolvedSorts, { created_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.repair_solicitudes.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: REPAIR_SOLICITUDES_SELECT,
      }),
      prisma.repair_solicitudes.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener solicitudes de reparación paginadas', { data: { error } });
    throw new Error('Error al obtener las solicitudes de reparación');
  }
}

export type RepairSolicitudListItem = Awaited<ReturnType<typeof getRepairSolicitudesPaginated>>['data'][number];

// ============================================================================
// EXPORT QUERY (sin paginación)
// ============================================================================

export async function getAllRepairSolicitudesForExport(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();

  try {
    const state = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete state.filters[key];
    }

    // Pre-resolver IDs para filtro last_modified_by (último log de cada solicitud)
    let resolvedLastModifiedByIds: string[] | undefined;
    const lastModifiedByValues = state.filters['last_modified_by'];
    if (lastModifiedByValues?.length) {
      const realValues = lastModifiedByValues.filter((v) => v !== NULL_FILTER_VALUE);
      if (realValues.length > 0) {
        resolvedLastModifiedByIds = await resolveLastModifiedByIds(companyId, realValues);
      }
    }

    const where = buildWhereClause(companyId, state, resolvedLastModifiedByIds);

    const data = await prisma.repair_solicitudes.findMany({
      orderBy: [{ created_at: 'desc' }],
      where,
      select: REPAIR_SOLICITUDES_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar solicitudes de reparación', { data: { error } });
    throw new Error('Error al exportar las solicitudes de reparación');
  }
}

// ============================================================================
// FACETS
// ============================================================================

/**
 * Facets con cross-filtering: los counts de cada columna excluyen su propio filtro.
 */
export async function getRepairSolicitudesFacets(searchParams?: DataTableSearchParams) {
  const companyId = await getServerCompanyId();
  const baseWhere = { vehicles: { company_id: companyId } };

  let parsedState: ReturnType<typeof parseSearchParams> | null = null;
  if (searchParams && Object.keys(searchParams).length > 0) {
    parsedState = parseSearchParams(searchParams);
    for (const key of IGNORED_PARAMS) {
      delete parsedState.filters[key];
    }
  }

  const hasActiveFilters = parsedState && (Object.keys(parsedState.filters).length > 0 || parsedState.search);

  async function crossWhere(excludeColumn: string) {
    if (!parsedState || !hasActiveFilters) return baseWhere;
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    delete modified.filters[`${excludeColumn}_from`];
    delete modified.filters[`${excludeColumn}_to`];

    // Para columnas distintas a last_modified_by, no necesitamos resolver IDs
    if (excludeColumn === 'last_modified_by') {
      // Excluimos last_modified_by → no necesitamos pasar resolvedSolicitudIds
      return buildWhereClause(companyId, modified);
    }

    // Si hay filtro last_modified_by activo (y no es la columna excluida), resolver IDs
    const lmbValues = modified.filters['last_modified_by'];
    if (lmbValues?.length) {
      const realValues = lmbValues.filter((v: string) => v !== NULL_FILTER_VALUE);
      if (realValues.length > 0) {
        const resolvedIds = await resolveLastModifiedByIds(companyId, realValues);
        return buildWhereClause(companyId, modified, resolvedIds);
      }
    }

    return buildWhereClause(companyId, modified);
  }

  // Helper: construir Map<string, count> con soporte para null → NULL_FILTER_VALUE
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
    // Resolver crossWhere para cada columna (async porque last_modified_by puede necesitar IDs)
    const [crossWhereState, crossWhereVehicle, crossWhereReparationType, crossWhereCriticity, crossWhereLmb] =
      await Promise.all([
        crossWhere('state'),
        crossWhere('vehicle'),
        crossWhere('reparation_type'),
        crossWhere('criticity'),
        crossWhere('last_modified_by'),
      ]);

    const [stateCounts, vehicleCounts, repairTypeCounts, criticityCounts] = await Promise.all([
      prisma.repair_solicitudes.groupBy({
        by: ['state'],
        where: crossWhereState,
        _count: true,
      }),
      prisma.repair_solicitudes.groupBy({
        by: ['equipment_id'],
        where: crossWhereVehicle,
        _count: true,
      }),
      prisma.repair_solicitudes.groupBy({
        by: ['reparation_type'],
        where: crossWhereReparationType,
        _count: true,
      }),
      // criticity viene de types_of_repairs — necesitamos un groupBy distinto
      prisma.types_of_repairs
        .findMany({
          where: {
            repair_solicitudes: {
              some: crossWhereCriticity,
            },
          },
          select: {
            criticity: true,
            _count: { select: { repair_solicitudes: true } },
          },
          distinct: ['criticity'],
        })
        .then((rows) => rows.map((r) => ({ key: r.criticity, count: r._count.repair_solicitudes }))),
    ]);

    // Resolver nombres de vehiculos para el filtro
    const vehicleIds = vehicleCounts.map((r) => r.equipment_id).filter(Boolean) as string[];
    const vehicles =
      vehicleIds.length > 0
        ? await prisma.vehicles.findMany({
            where: { id: { in: vehicleIds } },
            select: { id: true, domain: true, serie: true, intern_number: true },
          })
        : [];

    // Resolver nombres de tipos de reparación
    const repairTypeIds = repairTypeCounts.map((r) => r.reparation_type).filter(Boolean) as string[];
    const repairTypes =
      repairTypeIds.length > 0
        ? await prisma.types_of_repairs.findMany({
            where: { id: { in: repairTypeIds } },
            select: { id: true, name: true, criticity: true },
          })
        : [];

    // ─── Facets last_modified_by ───────────────────────────────────────────────
    // Contamos solicitudes cuyo ÚLTIMO log pertenece a cada usuario.
    // La columna muestra el log más reciente, así que los counts deben reflejar eso.
    //
    // Estrategia: traer todos los logs de solicitudes que cumplan crossWhereLmb,
    // ordenados desc, y para cada repair_id tomar solo el primero (el más reciente).
    // Luego agrupar por modified_by_user y contar.

    const allLmbLogs = await prisma.repairlogs.findMany({
      where: {
        repair_solicitudes: crossWhereLmb,
      },
      select: { repair_id: true, modified_by_user: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });

    // Para cada repair_id, tomar el primer log (más reciente)
    const latestUserByRepair = new Map<string, string | null>();
    for (const log of allLmbLogs) {
      if (log.repair_id && !latestUserByRepair.has(log.repair_id)) {
        latestUserByRepair.set(log.repair_id, log.modified_by_user ?? null);
      }
    }

    // Contar solicitudes por usuario (último log)
    const lastModifiedByCountMap = new Map<string, number>();
    for (const userId of latestUserByRepair.values()) {
      if (userId) {
        lastModifiedByCountMap.set(userId, (lastModifiedByCountMap.get(userId) ?? 0) + 1);
      }
    }

    // Contar solicitudes sin ningún log (NULL case)
    const totalInLmbCross = await prisma.repair_solicitudes.count({ where: crossWhereLmb });
    const withAnyLog = await prisma.repair_solicitudes.count({
      where: { ...crossWhereLmb, repairlogs: { some: {} } },
    });
    const unassignedLmb = totalInLmbCross - withAnyLog;
    if (unassignedLmb > 0) {
      lastModifiedByCountMap.set(NULL_FILTER_VALUE, unassignedLmb);
    }

    // Resolver perfiles de los usuarios con último log
    const lastModifiedByUserIds = [...lastModifiedByCountMap.keys()].filter((k) => k !== NULL_FILTER_VALUE);
    const lastModifiedByProfiles =
      lastModifiedByUserIds.length > 0
        ? await prisma.profile.findMany({
            where: { id: { in: lastModifiedByUserIds } },
            select: { id: true, fullname: true },
          })
        : [];

    return {
      state: toFacetMap(stateCounts.map((r) => ({ key: r.state as string, count: r._count }))),
      vehicle: toFacetMap(vehicleCounts.map((r) => ({ key: r.equipment_id, count: r._count }))),
      vehicleOptions: vehicles,
      reparation_type: toFacetMap(repairTypeCounts.map((r) => ({ key: r.reparation_type, count: r._count }))),
      repairTypeOptions: repairTypes,
      criticity: toFacetMap(criticityCounts),
      last_modified_by: lastModifiedByCountMap,
      lastModifiedByOptions: lastModifiedByProfiles,
    };
  } catch (error) {
    logger.error('Error al obtener facets de solicitudes de reparación', { data: { error } });
    return null;
  }
}

export type RepairSolicitudesFacets = Awaited<ReturnType<typeof getRepairSolicitudesFacets>>;
