'use server';

import type { Prisma } from '@/generated/prisma/client';
import type { condition_enum } from '@/generated/prisma/enums';
import { Logger } from '@/lib/logger';
import {
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
import { cache } from 'react';
import { getOperationToday } from '../lib/dashboard-dates';
import { aggregateEquipmentIndicators } from '../lib/indicators';
import { mapVehicleToResult, toFacetMap } from '../lib/row-mapping';
import type { EquipmentIndicatorResult, VehicleNotInReportResult } from './types';

const logger = new Logger('features/Dashboard/Principal/fleet');

/** Condiciones que dejan a un equipo disponible para el parte. */
const AVAILABLE_CONDITIONS: condition_enum[] = ['operativo', 'operativo_condicionado'];
/** Condiciones que dejan a un equipo fuera de servicio (diálogo "en reparación"). */
const REPAIR_CONDITIONS: condition_enum[] = ['no_operativo', 'en_reparacion', 'en_preparacion'];

/**
 * Flota del dashboard principal: indicadores de uso de equipos, equipos fuera del parte,
 * equipos en reparación y las tablas paginadas de los diálogos.
 *
 * Perímetro: todo sale de `getActiveCompanyId()`; los `typeIds` que manda el cliente sólo
 * acotan más el listado, nunca lo amplían fuera de la empresa activa.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Indicadores
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Indicador de uso de equipos por tipo.
 * Memoizado por request con `cache()`: las tarjetas de KPIs y la sección de flota lo piden
 * en el mismo render.
 */
export const getEquipmentIndicators = cache(async (typeIds?: string[]): Promise<EquipmentIndicatorResult[]> => {
  logger.debug('Obteniendo indicadores de equipos', { data: { typeIds } });

  try {
    const companyId = await getActiveCompanyId();
    const todayDate = getOperationToday();
    const typeFilter = typeIds?.length ? { type: { in: typeIds } } : {};

    const [allVehicles, usedInReport] = await Promise.all([
      prisma.vehicles.findMany({
        where: withCompany({ is_active: true, ...typeFilter }, companyId),
        select: { id: true, condition: true, type_vehicles_typeTotype: { select: { name: true } } },
      }),
      prisma.dailyreportequipmentrelations.findMany({
        where: {
          equipment_id: { not: null },
          dailyreportrows: {
            dailyreport: { date: new Date(todayDate), is_active: true, company_id: companyId },
          },
          vehicles: { is_active: true, company_id: companyId, ...typeFilter },
        },
        select: { equipment_id: true },
        distinct: ['equipment_id'],
      }),
    ]);

    const usedIds = new Set(usedInReport.map((row) => row.equipment_id).filter((id): id is string => id != null));

    return aggregateEquipmentIndicators(allVehicles, usedIds);
  } catch (error) {
    logger.error('Error al obtener indicadores de equipos', { data: { error } });
    return [];
  }
});

export type EquipmentIndicatorsData = Awaited<ReturnType<typeof getEquipmentIndicators>>;

// ─────────────────────────────────────────────────────────────────────────────
// Listados simples (secciones del tablero)
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLE_SELECT = {
  id: true,
  domain: true,
  type_vehicles_typeTotype: { select: { name: true } },
  sub_type: { select: { name: true } },
  contractor_equipment: { select: { customers: { select: { name: true } } } },
} as const;

/** Equipos operativos que no están en el parte diario de hoy. */
export async function getVehiclesNotInDailyReport(typeIds?: string[]): Promise<VehicleNotInReportResult[]> {
  logger.debug('Obteniendo vehículos fuera del parte diario', { data: { typeIds } });

  try {
    const companyId = await getActiveCompanyId();
    const todayDate = getOperationToday();
    const typeFilter = typeIds?.length ? { type: { in: typeIds } } : {};

    const vehiclesInReport = await prisma.dailyreportequipmentrelations.findMany({
      where: {
        equipment_id: { not: null },
        dailyreportrows: { dailyreport: { date: new Date(todayDate), is_active: true } },
        vehicles: { is_active: true, company_id: companyId, ...typeFilter },
      },
      select: { equipment_id: true },
      distinct: ['equipment_id'],
    });

    const inReportIds = vehiclesInReport.map((row) => row.equipment_id).filter((id): id is string => id != null);

    const vehicles = await prisma.vehicles.findMany({
      where: withCompany(
        {
          is_active: true,
          condition: { in: AVAILABLE_CONDITIONS },
          ...typeFilter,
          ...(inReportIds.length > 0 ? { id: { notIn: inReportIds } } : {}),
        },
        companyId
      ),
      select: VEHICLE_SELECT,
      orderBy: [{ domain: 'asc' }],
    });

    return vehicles.map(mapVehicleToResult);
  } catch (error) {
    logger.error('Error al obtener vehículos fuera del parte', { data: { error } });
    return [];
  }
}

export type VehiclesNotInDailyReportData = Awaited<ReturnType<typeof getVehiclesNotInDailyReport>>;

/** Equipos no operativos (en reparación). */
export async function getVehiclesOnRepair(): Promise<VehicleNotInReportResult[]> {
  logger.debug('Obteniendo vehículos en reparación');

  try {
    const companyId = await getActiveCompanyId();

    const vehicles = await prisma.vehicles.findMany({
      where: withCompany({ is_active: true, condition: 'no_operativo' as condition_enum }, companyId),
      select: VEHICLE_SELECT,
      orderBy: [{ domain: 'asc' }],
    });

    return vehicles.map(mapVehicleToResult);
  } catch (error) {
    logger.error('Error al obtener vehículos en reparación', { data: { error } });
    return [];
  }
}

export type VehiclesOnRepairData = Awaited<ReturnType<typeof getVehiclesOnRepair>>;

/**
 * Tipos de vehículo disponibles para el filtro: los de la empresa activa más los globales
 * (`company_id IS NULL`).
 */
export async function getAllVehicleTypes() {
  logger.debug('Obteniendo todos los tipos de vehículos');

  try {
    const companyId = await getActiveCompanyId();

    return await prisma.type.findMany({
      where: {
        is_active: true,
        applies_to: 'vehicle',
        OR: [{ company_id: companyId }, { company_id: null }],
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error('Error al obtener tipos de vehículos', { data: { error } });
    throw error;
  }
}

export type AllVehicleTypesData = Awaited<ReturnType<typeof getAllVehicleTypes>>;
export type VehicleTypeItem = AllVehicleTypesData[number];

// ─────────────────────────────────────────────────────────────────────────────
// Diálogos — DataTable server-side (disponibles + en reparación)
// ─────────────────────────────────────────────────────────────────────────────

const VEHICLE_TEXT_COLUMNS = ['domain', 'serie', 'intern_number'];
const VALID_VEHICLE_SORT_FIELDS = new Set(['domain', 'serie', 'intern_number']);
const VEHICLE_FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  vehicleType: (dir) => ({ type_vehicles_typeTotype: { name: dir } }),
  subType: (dir) => ({ sub_type: { name: dir } }),
};

const VEHICLE_DIALOG_SELECT = {
  id: true,
  domain: true,
  serie: true,
  intern_number: true,
  condition: true,
  type: true,
  subType: true,
  type_vehicles_typeTotype: { select: { id: true, name: true } },
  sub_type: { select: { id: true, name: true } },
  contractor_equipment: { select: { customers: { select: { id: true, name: true } } } },
} as const;

function buildVehicleFiltersWhere(state: ReturnType<typeof parseSearchParams>) {
  const filtersWhere = buildFiltersWhere(
    state.filters,
    { vehicleType: 'type', subType: 'subType' },
    { exclude: [...VEHICLE_TEXT_COLUMNS, 'contractor_equipment'] }
  );

  const contractorValues = state.filters['contractor_equipment'];
  const extraAndConditions: Record<string, unknown>[] = [];
  const directM2mFilters: Record<string, unknown> = {};

  if (contractorValues?.length) {
    const hasNull = contractorValues.includes(NULL_FILTER_VALUE);
    const realValues = contractorValues.filter((value) => value !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [
          { contractor_equipment: { some: { contractor_id: { in: realValues } } } },
          { contractor_equipment: { none: {} } },
        ],
      });
    } else if (hasNull) {
      directM2mFilters['contractor_equipment'] = { none: {} };
    } else {
      directM2mFilters['contractor_equipment'] = { some: { contractor_id: { in: realValues } } };
    }
  }

  const filtersWhereRecord = filtersWhere as Record<string, unknown> & { AND?: Record<string, unknown>[] };
  const allAndConditions = [...(filtersWhereRecord.AND ?? []), ...extraAndConditions];
  const { AND: _discarded, ...filtersWhereWithoutAnd } = filtersWhereRecord;

  return {
    ...buildSearchWhere(state.search, VEHICLE_TEXT_COLUMNS),
    ...filtersWhereWithoutAnd,
    ...buildTextFiltersWhere(state.filters, VEHICLE_TEXT_COLUMNS),
    ...directM2mFilters,
    ...(allAndConditions.length > 0 ? { AND: allAndConditions } : {}),
  };
}

async function buildAvailableVehiclesWhereClause(
  companyId: string,
  typeIds: string[] | undefined,
  state: ReturnType<typeof parseSearchParams>
) {
  const todayDate = getOperationToday();

  const vehiclesInReport = await prisma.dailyreportequipmentrelations.findMany({
    where: {
      equipment_id: { not: null },
      dailyreportrows: { dailyreport: { date: new Date(todayDate), is_active: true } },
      vehicles: { is_active: true, company_id: companyId, ...(typeIds?.length ? { type: { in: typeIds } } : {}) },
    },
    select: { equipment_id: true },
    distinct: ['equipment_id'],
  });

  const inReportIds = vehiclesInReport.map((row) => row.equipment_id).filter((id): id is string => id != null);

  return {
    is_active: true,
    company_id: companyId,
    condition: { in: AVAILABLE_CONDITIONS },
    ...(typeIds?.length ? { type: { in: typeIds } } : {}),
    ...(inReportIds.length > 0 ? { id: { notIn: inReportIds } } : {}),
    ...buildVehicleFiltersWhere(state),
  };
}

function buildRepairVehiclesWhereClause(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  return {
    is_active: true,
    company_id: companyId,
    condition: { in: REPAIR_CONDITIONS },
    ...buildVehicleFiltersWhere(state),
  };
}

function buildVehicleOrderBy(state: ReturnType<typeof parseSearchParams>) {
  const resolvedSorts: Record<string, unknown>[] = [];
  for (const sort of state.sorting) {
    if (!VALID_VEHICLE_SORT_FIELDS.has(sort.id)) continue;
    const dir: 'asc' | 'desc' = sort.desc ? 'desc' : 'asc';
    const fkMapper = VEHICLE_FK_SORT_MAP[sort.id];
    resolvedSorts.push(fkMapper ? fkMapper(dir) : { [sort.id]: dir });
  }
  return [...resolvedSorts, { domain: 'asc' as const }];
}

type VehicleWhere = Prisma.vehiclesWhereInput;

/**
 * Facetas de los diálogos de equipos. `buildWhere` es el `crossWhere` ya armado por el
 * llamador (disponibles o en reparación), así que la lógica de cada columna se escribe
 * una sola vez para los dos diálogos.
 */
async function getVehicleFacet(
  columnId: string,
  buildWhere: (excludeColumn: string) => Promise<VehicleWhere> | VehicleWhere
): Promise<{ counts: Map<string, number>; resolvedOptions?: Array<{ id: string; name: string | null }> } | null> {
  if (columnId === 'vehicleType') {
    const where = await buildWhere('vehicleType');
    const rows = await prisma.vehicles.groupBy({ by: ['type'], where, _count: true });
    const ids = rows.map((row) => row.type).filter((id): id is string => id != null);
    const resolvedOptions =
      ids.length > 0
        ? await prisma.type.findMany({ where: { id: { in: ids } }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
        : [];
    return { counts: toFacetMap(rows.map((row) => ({ key: row.type, count: row._count }))), resolvedOptions };
  }

  if (columnId === 'subType') {
    const where = await buildWhere('subType');
    const rows = await prisma.vehicles.groupBy({ by: ['subType'], where, _count: true });
    const ids = rows.map((row) => row.subType).filter((id): id is string => id != null);
    const resolvedOptions =
      ids.length > 0
        ? await prisma.sub_type.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          })
        : [];
    return { counts: toFacetMap(rows.map((row) => ({ key: row.subType, count: row._count }))), resolvedOptions };
  }

  if (columnId === 'contractor_equipment') {
    const where = await buildWhere('contractor_equipment');
    const [distinctRelations, allRelations, totalInCross, withSome] = await Promise.all([
      prisma.contractor_equipment.findMany({
        where: { vehicles: where },
        select: { contractor_id: true, customers: { select: { id: true, name: true } } },
        distinct: ['contractor_id'],
      }),
      prisma.contractor_equipment.findMany({ where: { vehicles: where }, select: { contractor_id: true } }),
      prisma.vehicles.count({ where }),
      prisma.vehicles.count({ where: { ...where, contractor_equipment: { some: {} } } }),
    ]);

    const counts = new Map<string, number>();
    for (const relation of allRelations) {
      if (relation.contractor_id) counts.set(relation.contractor_id, (counts.get(relation.contractor_id) ?? 0) + 1);
    }
    const unassigned = totalInCross - withSome;
    if (unassigned > 0) counts.set(NULL_FILTER_VALUE, unassigned);

    return {
      counts,
      resolvedOptions: distinctRelations
        .filter((relation) => relation.contractor_id && relation.customers)
        .map((relation) => ({ id: relation.customers!.id, name: relation.customers!.name })),
    };
  }

  return null;
}

export async function getAvailableVehiclesPaginated(searchParams: DataTableSearchParams, typeIds?: string[]) {
  // Fuera del try a propósito: una sesión sin empresa activa es un error de sesión, no
  // "no hay datos" — el catch de abajo es para fallas de la query.
  const companyId = await getActiveCompanyId();
  logger.debug('Obteniendo vehículos disponibles paginados', { data: { typeIds } });

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = (await buildAvailableVehiclesWhereClause(companyId, typeIds, state)) as VehicleWhere;

    const [data, total] = await Promise.all([
      prisma.vehicles.findMany({
        skip,
        take,
        orderBy: buildVehicleOrderBy(state),
        where,
        select: VEHICLE_DIALOG_SELECT,
      }),
      prisma.vehicles.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener vehículos disponibles paginados', { data: { error } });
    throw error;
  }
}

export type AvailableVehicleItem = Awaited<ReturnType<typeof getAvailableVehiclesPaginated>>['data'][number];

export async function getAvailableVehiclesForExport(searchParams: DataTableSearchParams, typeIds?: string[]) {
  const companyId = await getActiveCompanyId();
  logger.debug('Exportando vehículos disponibles', { data: { typeIds } });

  try {
    const state = parseSearchParams(searchParams);
    const where = (await buildAvailableVehiclesWhereClause(companyId, typeIds, state)) as VehicleWhere;

    return await prisma.vehicles.findMany({ orderBy: [{ domain: 'asc' }], where, select: VEHICLE_DIALOG_SELECT });
  } catch (error) {
    logger.error('Error al exportar vehículos disponibles', { data: { error } });
    throw error;
  }
}

export async function getAvailableVehicleSingleFacet(
  columnId: string,
  typeIds: string[] | undefined,
  searchParams?: DataTableSearchParams
): Promise<{ counts: Map<string, number>; resolvedOptions?: Array<{ id: string; name: string | null }> } | null> {
  // Fuera del try: sin empresa activa el filtro NO debe verse como "no hay opciones".
  const companyId = await getActiveCompanyId();
  logger.debug('Obteniendo facet de vehículos disponibles', { data: { columnId } });

  try {
    const parsedState = parseSearchParams(searchParams && Object.keys(searchParams).length > 0 ? searchParams : {});

    const result = await getVehicleFacet(columnId, async (excludeColumn) => {
      const modified = { ...parsedState, filters: { ...parsedState.filters } };
      delete modified.filters[excludeColumn];
      return (await buildAvailableVehiclesWhereClause(companyId, typeIds, modified)) as VehicleWhere;
    });

    if (!result) logger.warn('Available vehicle facet column not recognized', { data: { columnId } });
    return result;
  } catch (error) {
    logger.error('Error al obtener facet de vehículos disponibles', { data: { error, columnId } });
    return null;
  }
}

export async function getRepairVehiclesPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getActiveCompanyId();
  logger.debug('Obteniendo vehículos en reparación paginados');

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildRepairVehiclesWhereClause(companyId, state) as VehicleWhere;

    const [data, total] = await Promise.all([
      prisma.vehicles.findMany({
        skip,
        take,
        orderBy: buildVehicleOrderBy(state),
        where,
        select: VEHICLE_DIALOG_SELECT,
      }),
      prisma.vehicles.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener vehículos en reparación paginados', { data: { error } });
    throw error;
  }
}

export type RepairVehicleItem = Awaited<ReturnType<typeof getRepairVehiclesPaginated>>['data'][number];

export async function getRepairVehiclesForExport(searchParams: DataTableSearchParams) {
  const companyId = await getActiveCompanyId();
  logger.debug('Exportando vehículos en reparación');

  try {
    const state = parseSearchParams(searchParams);
    const where = buildRepairVehiclesWhereClause(companyId, state) as VehicleWhere;

    return await prisma.vehicles.findMany({ orderBy: [{ domain: 'asc' }], where, select: VEHICLE_DIALOG_SELECT });
  } catch (error) {
    logger.error('Error al exportar vehículos en reparación', { data: { error } });
    throw error;
  }
}

export async function getRepairVehicleSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{ counts: Map<string, number>; resolvedOptions?: Array<{ id: string; name: string | null }> } | null> {
  // Fuera del try: sin empresa activa el filtro NO debe verse como "no hay opciones".
  const companyId = await getActiveCompanyId();
  logger.debug('Obteniendo facet de vehículos en reparación', { data: { columnId } });

  try {
    const parsedState = parseSearchParams(searchParams && Object.keys(searchParams).length > 0 ? searchParams : {});

    const result = await getVehicleFacet(columnId, (excludeColumn) => {
      const modified = { ...parsedState, filters: { ...parsedState.filters } };
      delete modified.filters[excludeColumn];
      return buildRepairVehiclesWhereClause(companyId, modified) as VehicleWhere;
    });

    if (!result) logger.warn('Repair vehicle facet column not recognized', { data: { columnId } });
    return result;
  } catch (error) {
    logger.error('Error al obtener facet de vehículos en reparación', { data: { error, columnId } });
    return null;
  }
}
