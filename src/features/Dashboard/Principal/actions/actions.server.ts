'use server';

import type { Prisma } from '@/generated/prisma/client';
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
import moment from 'moment';
import { cache } from 'react';

const logger = new Logger('features/Dashboard/Principal');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build the common WHERE for dailyreportrows scoped to today + company */
function buildTodayReportWhere(companyId: string, targetDate?: string) {
  const date = targetDate ?? moment().utcOffset(-3).format('YYYY-MM-DD');
  return {
    dailyreport: {
      date: new Date(date),
      is_active: true,
      company_id: companyId,
    },
  } as const;
}

// ─────────────────────────────────────────────────────────────────────────────
// Result Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ServicesSummaryResult {
  type_service: string;
  service_count: number;
  percentage: number;
}

export interface EmployeeIndicatorResult {
  employees_operativos: number;
  employees_used: number;
  indicator: number;
}

export interface DiagramIndicatorResult {
  diagram_type_id: string;
  diagram_type_name: string;
  diagram_type_color: string;
  cantidad_empleados: number;
}

export interface EmployeeNotInReportResult {
  employee_id: string;
  firstname: string;
  lastname: string;
  cuil: string | null;
  file_number: string | null;
  position_name: string | null;
  diagram_short_description: string | null;
  diagram_color: string | null;
  customers: { customer_name: string }[] | null;
}

export interface EquipmentIndicatorResult {
  type_name: string;
  type_color: string | null;
  available_units: number;
  used_units: number;
  not_available_units: number;
}

export interface VehicleNotInReportResult {
  vehicle_id: string;
  domain: string;
  type_name: string | null;
  sub_type_name: string | null;
  customers: { customer_name: string }[] | null;
}

export interface ServiceDetailByClient {
  client_name: string;
  mensual_count: number;
  adicional_count: number;
  total_count: number;
  status_distribution: {
    status: string;
    count: number;
  }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. KPIs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene los KPIs principales del dashboard:
 * empleados activos, vehículos activos, servicios totales, porcentaje de operatividad.
 */
export async function getDashboardKpis() {
  logger.debug('Obteniendo KPIs del dashboard');

  try {
    const companyId = await getServerCompanyId();

    const reportWhere = buildTodayReportWhere(companyId);

    const [activeEmployees, activeVehicles, totalServices, equipmentData] = await Promise.all([
      prisma.employees.count({
        where: { company_id: companyId, is_active: true },
      }),
      prisma.vehicles.count({
        where: { company_id: companyId, is_active: true },
      }),
      prisma.dailyreportrows.count({
        where: {
          status: { in: ['pendiente', 'ejecutado'] },
          ...reportWhere,
        },
      }),
      getEquipmentIndicators(),
    ]);

    let totalActive = 0;
    let totalNotAvailable = 0;
    for (const item of equipmentData) {
      totalActive += item.available_units;
      totalNotAvailable += item.not_available_units;
    }
    const totalFleet = totalActive + totalNotAvailable;
    const fleetMinusRepair = activeVehicles - totalNotAvailable;
    const operativityPercentage = totalFleet > 0 ? Math.round((totalActive / totalFleet) * 100) : 0;

    return {
      activeEmployees,
      activeVehicles,
      totalFleet,
      fleetMinusRepair,
      totalServices,
      operativityPercentage,
    };
  } catch (error) {
    logger.error('Error al obtener KPIs del dashboard', { data: { error } });
    throw error;
  }
}

export type DashboardKpisData = Awaited<ReturnType<typeof getDashboardKpis>>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Services Summary
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el resumen de servicios por tipo de operación.
 * Prisma groupBy en dailyreportrows por type_service para hoy.
 */
export async function getServicesSummary(): Promise<ServicesSummaryResult[]> {
  logger.debug('Obteniendo resumen de servicios por tipo');

  try {
    const companyId = await getServerCompanyId();
    const reportWhere = buildTodayReportWhere(companyId);

    const grouped = await prisma.dailyreportrows.groupBy({
      by: ['type_service'],
      where: {
        status: { in: ['pendiente', 'ejecutado'] },
        ...reportWhere,
      },
      _count: { id: true },
    });

    const totalCount = grouped.reduce((sum, g) => sum + g._count.id, 0);

    const result: ServicesSummaryResult[] = grouped
      .filter((g) => g.type_service != null)
      .map((g) => ({
        type_service: g.type_service!,
        service_count: g._count.id,
        percentage: totalCount > 0 ? Math.round((g._count.id / totalCount) * 100) : 0,
      }));

    return result;
  } catch (error) {
    logger.error('Error al obtener resumen de servicios', { data: { error } });
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Employee Indicators
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_EMPLOYEE_INDICATOR: EmployeeIndicatorResult = {
  employees_operativos: 0,
  employees_used: 0,
  indicator: 0,
};

/**
 * Obtiene el indicador de uso de empleados.
 * Cuenta empleados operativos (con diagrama activo) y usados (en parte diario).
 */
export async function getEmployeeIndicators(positionIds?: string[]): Promise<EmployeeIndicatorResult> {
  logger.debug('Obteniendo indicadores de empleados', { data: { positionIds } });

  try {
    const companyId = await getServerCompanyId();
    const now = moment().utcOffset(-3);
    const day = now.date();
    const month = now.month() + 1;
    const year = now.year();
    const todayDate = now.format('YYYY-MM-DD');

    const positionFilter = positionIds?.length ? { company_position: { in: positionIds } } : {};

    // Parallel: operativos (con diagrama de trabajo activo) + usados (en parte diario)
    const [operativeDiagrams, usedRelations] = await Promise.all([
      // Distinct employee IDs with active work diagram for today
      prisma.employees_diagram.findMany({
        where: {
          day,
          month,
          year,
          diagram_type_employees_diagram_diagram_typeTodiagram_type: {
            work_active: true,
            is_active: true,
          },
          employees: {
            is_active: true,
            company_id: companyId,
            ...positionFilter,
          },
        },
        select: { employee_id: true },
        distinct: ['employee_id'],
      }),
      // Distinct employee IDs in today's daily report (ALL employees, regardless of diagram)
      prisma.dailyreportemployeerelations.findMany({
        where: {
          employee_id: { not: null },
          dailyreportrows: {
            dailyreport: {
              date: new Date(todayDate),
              is_active: true,
              company_id: companyId,
            },
          },
          employees: {
            is_active: true,
            ...positionFilter,
          },
        },
        select: { employee_id: true },
        distinct: ['employee_id'],
      }),
    ]);

    const employeesOperativos = operativeDiagrams.length;
    const employeesUsed = usedRelations.length;
    const indicator = employeesOperativos > 0 ? Math.round((employeesUsed / employeesOperativos) * 100) : 0;

    return { employees_operativos: employeesOperativos, employees_used: employeesUsed, indicator };
  } catch (error) {
    logger.error('Error al obtener indicadores de empleados', { data: { error } });
    return DEFAULT_EMPLOYEE_INDICATOR;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Diagram Indicators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el conteo de empleados por diagrama para el día actual.
 * Prisma query en employees_diagram agrupado por diagram_type + "Sin diagrama".
 */
export async function getDiagramIndicators(positionIds?: string[]): Promise<DiagramIndicatorResult[]> {
  logger.debug('Obteniendo indicadores de diagramas', { data: { positionIds } });

  try {
    const companyId = await getServerCompanyId();
    const now = moment().utcOffset(-3);
    const day = now.date();
    const month = now.month() + 1;
    const year = now.year();

    const positionFilter = positionIds?.length ? { company_position: { in: positionIds } } : {};

    // Parallel: diagrams for today + total active employees
    const [diagrams, totalActiveEmployees] = await Promise.all([
      prisma.employees_diagram.findMany({
        where: {
          day,
          month,
          year,
          employees: {
            is_active: true,
            company_id: companyId,
            ...positionFilter,
          },
          diagram_type_employees_diagram_diagram_typeTodiagram_type: {
            is_active: true,
          },
        },
        include: {
          diagram_type_employees_diagram_diagram_typeTodiagram_type: {
            select: { name: true, color: true },
          },
        },
      }),
      prisma.employees.count({
        where: {
          is_active: true,
          company_id: companyId,
          ...positionFilter,
        },
      }),
    ]);

    // Group by diagram_type, counting distinct employees
    const typeMap = new Map<string, { name: string; color: string; employees: Set<string> }>();
    const allEmployeesWithDiagram = new Set<string>();

    for (const d of diagrams) {
      const dt = d.diagram_type_employees_diagram_diagram_typeTodiagram_type;
      if (!dt || !d.employee_id) continue;

      const key = d.diagram_type ?? 'unknown';
      allEmployeesWithDiagram.add(d.employee_id);

      if (!typeMap.has(key)) {
        typeMap.set(key, { name: dt.name ?? 'Sin nombre', color: dt.color ?? '#999999', employees: new Set() });
      }
      typeMap.get(key)!.employees.add(d.employee_id);
    }

    const result: DiagramIndicatorResult[] = Array.from(typeMap.entries()).map(([key, t]) => ({
      diagram_type_id: key,
      diagram_type_name: t.name,
      diagram_type_color: t.color,
      cantidad_empleados: t.employees.size,
    }));

    // "Sin diagrama" = total active - employees with any diagram
    const sinDiagrama = totalActiveEmployees - allEmployeesWithDiagram.size;
    if (sinDiagrama > 0) {
      result.push({
        diagram_type_id: '__none__',
        diagram_type_name: 'Sin diagrama',
        diagram_type_color: '#999999',
        cantidad_empleados: sinDiagrama,
      });
    }

    // Sort by cantidad descending
    result.sort((a, b) => b.cantidad_empleados - a.cantidad_empleados);

    return result;
  } catch (error) {
    logger.error('Error al obtener indicadores de diagramas', { data: { error } });
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Employees Not In Daily Report (Prisma — replaces RPC)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene los empleados con diagrama activo que no están en el parte diario de hoy.
 * Usa Prisma en vez de la RPC get_employees_not_in_daily_report.
 */
export async function getEmployeesNotInDailyReport(positionIds?: string[]): Promise<EmployeeNotInReportResult[]> {
  logger.debug('Obteniendo empleados fuera del parte diario', { data: { positionIds } });

  try {
    const companyId = await getServerCompanyId();
    const now = moment().utcOffset(-3);
    const day = now.date();
    const month = now.month() + 1;
    const year = now.year();
    const todayDate = now.format('YYYY-MM-DD');

    // 1. Employee IDs assigned to today's daily report
    const employeesInReport = await prisma.dailyreportemployeerelations.findMany({
      where: {
        employee_id: { not: null },
        dailyreportrows: {
          dailyreport: {
            date: new Date(todayDate),
            is_active: true,
            company_id: companyId,
          },
        },
        employees: {
          is_active: true,
          ...(positionIds?.length ? { company_position: { in: positionIds } } : {}),
        },
      },
      select: { employee_id: true },
      distinct: ['employee_id'],
    });

    const inReportIds = employeesInReport.map((r) => r.employee_id).filter((id): id is string => id != null);

    // 2. Employees with active work diagram for today NOT in the daily report
    const diagrams = await prisma.employees_diagram.findMany({
      where: {
        day,
        month,
        year,
        diagram_type_employees_diagram_diagram_typeTodiagram_type: {
          work_active: true,
          is_active: true,
        },
        employees: {
          is_active: true,
          company_id: companyId,
          ...(positionIds?.length ? { company_position: { in: positionIds } } : {}),
          ...(inReportIds.length > 0 ? { id: { notIn: inReportIds } } : {}),
        },
      },
      include: {
        employees: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            cuil: true,
            file: true,
            company_positions: { select: { name: true } },
            contractor_employee: {
              select: { customers: { select: { name: true } } },
            },
          },
        },
        diagram_type_employees_diagram_diagram_typeTodiagram_type: {
          select: { short_description: true, color: true },
        },
      },
      orderBy: { employees: { lastname: 'asc' } },
    });

    // 3. Deduplicate (an employee could have multiple diagram entries) and map to result type
    const seen = new Set<string>();
    const result: EmployeeNotInReportResult[] = [];

    for (const d of diagrams) {
      const emp = d.employees;
      if (!emp || seen.has(emp.id)) continue;
      seen.add(emp.id);

      const dt = d.diagram_type_employees_diagram_diagram_typeTodiagram_type;
      const customers = (emp.contractor_employee as { customers: { name: string | null } | null }[])
        ?.map((ce) => ce.customers?.name)
        .filter((n): n is string => n != null)
        .map((n) => ({ customer_name: n }));

      result.push({
        employee_id: emp.id,
        firstname: emp.firstname ?? '',
        lastname: emp.lastname ?? '',
        cuil: emp.cuil,
        file_number: emp.file ?? null,
        position_name: emp.company_positions?.name ?? null,
        diagram_short_description: dt?.short_description ?? null,
        diagram_color: dt?.color ?? null,
        customers: customers?.length ? customers : null,
      });
    }

    return result;
  } catch (error) {
    logger.error('Error al obtener empleados fuera del parte', { data: { error } });
    return [];
  }
}

export type EmployeesNotInDailyReportData = Awaited<ReturnType<typeof getEmployeesNotInDailyReport>>;

// ─────────────────────────────────────────────────────────────────────────────
// 6. Equipment Indicators (cached to deduplicate calls)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el indicador de uso de equipos (vehículos) por tipo.
 * Prisma queries: vehículos activos por tipo + usados en parte diario.
 * Wrapped con React.cache para deduplicar llamadas dentro del mismo render.
 */
export const getEquipmentIndicators = cache(async (typeIds?: string[]): Promise<EquipmentIndicatorResult[]> => {
  logger.debug('Obteniendo indicadores de equipos', { data: { typeIds } });

  try {
    const companyId = await getServerCompanyId();
    const todayDate = moment().utcOffset(-3).format('YYYY-MM-DD');

    const typeFilter = typeIds?.length ? { type: { in: typeIds } } : {};
    const NOT_OPERATIVE_CONDITIONS: ('no_operativo' | 'en_reparacion' | 'en_preparacion')[] = [
      'no_operativo',
      'en_reparacion',
      'en_preparacion',
    ];

    // Parallel: all active vehicles + vehicles used in today's report
    const [allVehicles, usedInReport] = await Promise.all([
      prisma.vehicles.findMany({
        where: {
          is_active: true,
          company_id: companyId,
          ...typeFilter,
        },
        select: {
          id: true,
          condition: true,
          type_vehicles_typeTotype: { select: { name: true } },
        },
      }),
      prisma.dailyreportequipmentrelations.findMany({
        where: {
          equipment_id: { not: null },
          dailyreportrows: {
            dailyreport: {
              date: new Date(todayDate),
              is_active: true,
              company_id: companyId,
            },
          },
          vehicles: {
            is_active: true,
            ...typeFilter,
          },
        },
        select: { equipment_id: true },
        distinct: ['equipment_id'],
      }),
    ]);

    const usedIds = new Set(usedInReport.map((r) => r.equipment_id).filter((id): id is string => id != null));

    // Group by type name
    const typeMap = new Map<string, { available: number; notAvailable: number; used: number }>();

    for (const v of allVehicles) {
      const typeName = v.type_vehicles_typeTotype?.name ?? 'Sin tipo';

      if (!typeMap.has(typeName)) {
        typeMap.set(typeName, { available: 0, notAvailable: 0, used: 0 });
      }
      const entry = typeMap.get(typeName)!;

      const isNotOperative =
        v.condition != null &&
        NOT_OPERATIVE_CONDITIONS.includes(v.condition as 'no_operativo' | 'en_reparacion' | 'en_preparacion');

      if (isNotOperative) {
        entry.notAvailable++;
      } else {
        entry.available++;
        if (usedIds.has(v.id)) {
          entry.used++;
        }
      }
    }

    const result: EquipmentIndicatorResult[] = Array.from(typeMap.entries()).map(([name, counts]) => ({
      type_name: name,
      type_color: null, // type model doesn't have color field
      available_units: counts.available,
      used_units: counts.used,
      not_available_units: counts.notAvailable,
    }));

    // Sort by available_units descending
    result.sort((a, b) => b.available_units + b.not_available_units - (a.available_units + a.not_available_units));

    return result;
  } catch (error) {
    logger.error('Error al obtener indicadores de equipos', { data: { error } });
    return [];
  }
});

export type EquipmentIndicatorsData = Awaited<ReturnType<typeof getEquipmentIndicators>>;

// ─────────────────────────────────────────────────────────────────────────────
// 7. Vehicles Not In Daily Report (Prisma — replaces RPC)
// ─────────────────────────────────────────────────────────────────────────────

const vehicleSelect = {
  id: true,
  domain: true,
  type_vehicles_typeTotype: { select: { name: true } },
  sub_type: { select: { name: true } },
  contractor_equipment: {
    select: { customers: { select: { name: true } } },
  },
};

type VehicleSelectResult = {
  id: string;
  domain: string | null;
  type_vehicles_typeTotype: { name: string | null } | null;
  sub_type: { name: string | null } | null;
  contractor_equipment: { customers: { name: string | null } | null }[];
};

function mapVehicleToResult(v: VehicleSelectResult): VehicleNotInReportResult {
  const customers = v.contractor_equipment
    ?.map((ce) => ce.customers?.name)
    .filter((n): n is string => n != null)
    .map((n) => ({ customer_name: n }));

  return {
    vehicle_id: v.id,
    domain: v.domain ?? '',
    type_name: v.type_vehicles_typeTotype?.name ?? null,
    sub_type_name: v.sub_type?.name ?? null,
    customers: customers?.length ? customers : null,
  };
}

/**
 * Obtiene los vehículos operativos que no están en el parte diario de hoy.
 * Usa Prisma en vez de la RPC get_vehicles_not_in_daily_report.
 */
export async function getVehiclesNotInDailyReport(typeIds?: string[]): Promise<VehicleNotInReportResult[]> {
  logger.debug('Obteniendo vehículos fuera del parte diario', { data: { typeIds } });

  try {
    const companyId = await getServerCompanyId();
    const todayDate = moment().utcOffset(-3).format('YYYY-MM-DD');

    // 1. Vehicle IDs assigned to today's daily report (async-parallel not applicable — sequential dependency)
    const vehiclesInReport = await prisma.dailyreportequipmentrelations.findMany({
      where: {
        equipment_id: { not: null },
        dailyreportrows: {
          dailyreport: {
            date: new Date(todayDate),
            is_active: true,
          },
        },
        vehicles: {
          is_active: true,
          company_id: companyId,
          ...(typeIds?.length ? { type: { in: typeIds } } : {}),
        },
      },
      select: { equipment_id: true },
      distinct: ['equipment_id'],
    });

    const inReportIds = vehiclesInReport.map((r) => r.equipment_id).filter((id): id is string => id != null);

    // 2. Operative vehicles NOT in the daily report
    const vehicles = await prisma.vehicles.findMany({
      where: {
        is_active: true,
        condition: { in: ['operativo', 'operativo_condicionado'] },
        company_id: companyId,
        ...(typeIds?.length ? { type: { in: typeIds } } : {}),
        ...(inReportIds.length > 0 ? { id: { notIn: inReportIds } } : {}),
      },
      select: vehicleSelect,
      orderBy: [{ domain: 'asc' }],
    });

    return (vehicles as unknown as VehicleSelectResult[]).map(mapVehicleToResult);
  } catch (error) {
    logger.error('Error al obtener vehículos fuera del parte', { data: { error } });
    return [];
  }
}

export type VehiclesNotInDailyReportData = Awaited<ReturnType<typeof getVehiclesNotInDailyReport>>;

// ─────────────────────────────────────────────────────────────────────────────
// 8. Vehicles On Repair (Prisma — replaces RPC)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene los vehículos no operativos (en reparación).
 * Usa Prisma en vez de la RPC get_vehicles_non_operative.
 */
export async function getVehiclesOnRepair(): Promise<VehicleNotInReportResult[]> {
  logger.debug('Obteniendo vehículos en reparación');

  try {
    const companyId = await getServerCompanyId();

    const vehicles = await prisma.vehicles.findMany({
      where: {
        is_active: true,
        condition: 'no_operativo',
        company_id: companyId,
      },
      select: vehicleSelect,
      orderBy: [{ domain: 'asc' }],
    });

    return (vehicles as unknown as VehicleSelectResult[]).map(mapVehicleToResult);
  } catch (error) {
    logger.error('Error al obtener vehículos en reparación', { data: { error } });
    return [];
  }
}

export type VehiclesOnRepairData = Awaited<ReturnType<typeof getVehiclesOnRepair>>;

// ─────────────────────────────────────────────────────────────────────────────
// 9. All Positions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene todas las posiciones de empresa disponibles.
 */
export async function getAllPositions() {
  logger.debug('Obteniendo todas las posiciones');

  try {
    const data = await prisma.company_positions.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return data;
  } catch (error) {
    logger.error('Error al obtener posiciones', { data: { error } });
    throw error;
  }
}

export type AllPositionsData = Awaited<ReturnType<typeof getAllPositions>>;
export type PositionItem = AllPositionsData[number];

// ─────────────────────────────────────────────────────────────────────────────
// 10. All Vehicle Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene todos los tipos de vehículos disponibles para la empresa.
 * Incluye tipos globales (company_id null) y propios de la empresa.
 */
export async function getAllVehicleTypes() {
  logger.debug('Obteniendo todos los tipos de vehículos');

  try {
    const companyId = await getServerCompanyId();

    const data = await prisma.type.findMany({
      where: {
        is_active: true,
        applies_to: 'vehicle',
        OR: [{ company_id: companyId }, { company_id: null }],
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return data;
  } catch (error) {
    logger.error('Error al obtener tipos de vehículos', { data: { error } });
    throw error;
  }
}

export type AllVehicleTypesData = Awaited<ReturnType<typeof getAllVehicleTypes>>;
export type VehicleTypeItem = AllVehicleTypesData[number];

// ─────────────────────────────────────────────────────────────────────────────
// 11. Services Detail By Client
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el detalle de servicios por cliente para una fecha dada (default: hoy).
 * Prisma findMany en dailyreportrows con include de customers y dailyreport.
 */
export async function getServicesDetailByClient(date?: string): Promise<ServiceDetailByClient[]> {
  logger.debug('Obteniendo detalle de servicios por cliente', { data: { date } });

  try {
    const companyId = await getServerCompanyId();
    const reportWhere = buildTodayReportWhere(companyId, date);

    const rows = await prisma.dailyreportrows.findMany({
      where: {
        customer_id: { not: null },
        status: { in: ['pendiente', 'ejecutado'] },
        ...reportWhere,
      },
      select: {
        type_service: true,
        status: true,
        customers: { select: { id: true, name: true } },
      },
    });

    if (rows.length === 0) return [];

    // Group by client — single loop
    const clientsMap = new Map<
      string,
      {
        client_name: string;
        mensual_count: number;
        adicional_count: number;
        status_counts: Map<string, number>;
      }
    >();

    for (const row of rows) {
      if (!row.customers) continue;
      const clientId = row.customers.id;

      if (!clientsMap.has(clientId)) {
        clientsMap.set(clientId, {
          client_name: row.customers.name,
          mensual_count: 0,
          adicional_count: 0,
          status_counts: new Map<string, number>(),
        });
      }

      const client = clientsMap.get(clientId)!;

      if (row.type_service === 'mensual') {
        client.mensual_count++;
      } else if (row.type_service === 'adicional' || row.type_service === 'adicional_permanente') {
        client.adicional_count++;
      }

      const status = row.status ?? 'sin_estado';
      client.status_counts.set(status, (client.status_counts.get(status) ?? 0) + 1);
    }

    const result: ServiceDetailByClient[] = Array.from(clientsMap.values()).map((client) => ({
      client_name: client.client_name,
      mensual_count: client.mensual_count,
      adicional_count: client.adicional_count,
      total_count: client.mensual_count + client.adicional_count,
      status_distribution: Array.from(client.status_counts.entries()).map(([status, count]) => ({
        status,
        count,
      })),
    }));

    return result.sort((a, b) => b.total_count - a.total_count);
  } catch (error) {
    logger.error('Error al obtener detalle de servicios por cliente', { data: { error } });
    return [];
  }
}

export type ServicesDetailByClientData = Awaited<ReturnType<typeof getServicesDetailByClient>>;

// ─────────────────────────────────────────────────────────────────────────────
// 12. Services Detail Paginated (Server-Side DataTable)
// ─────────────────────────────────────────────────────────────────────────────

const SERVICES_DETAIL_VALID_SORT_FIELDS = new Set([
  'status',
  'type_service',
  'created_at',
  'description',
  'remit_number',
]);

const SERVICES_DETAIL_TEXT_COLUMNS = ['description', 'remit_number'];
const SERVICES_DETAIL_DATE_COLUMNS = ['created_at'];

const SERVICES_DETAIL_SELECT = {
  id: true,
  status: true,
  type_service: true,
  description: true,
  remit_number: true,
  created_at: true,
  customers: { select: { id: true, name: true } },
} as const;

/**
 * Construye el WHERE clause compartido para las queries de servicios detalle paginados.
 * Filtra por fecha del parte diario y empresa.
 */
function buildServicesDetailWhere(companyId: string, targetDate: string, state: ReturnType<typeof parseSearchParams>) {
  const reportWhere = buildTodayReportWhere(companyId, targetDate);

  const searchWhere = buildSearchWhere(state.search, ['description', 'remit_number']);

  const filtersWhere = buildFiltersWhere(
    state.filters,
    { customer: 'customer_id' },
    {
      exclude: [
        ...SERVICES_DETAIL_TEXT_COLUMNS,
        ...SERVICES_DETAIL_DATE_COLUMNS.flatMap((c) => [`${c}_from`, `${c}_to`]),
      ],
    }
  );

  const textFiltersWhere = buildTextFiltersWhere(state.filters, SERVICES_DETAIL_TEXT_COLUMNS);
  const dateFiltersWhere = buildDateRangeFiltersWhere(state.filters, SERVICES_DETAIL_DATE_COLUMNS);

  return {
    customer_id: { not: null },
    ...reportWhere,
    ...searchWhere,
    ...filtersWhere,
    ...textFiltersWhere,
    ...dateFiltersWhere,
  };
}

/**
 * Obtiene el detalle de servicios paginado para el DataTable server-side.
 * Filtra por fecha del parte diario.
 */
export async function getServicesDetailPaginated(searchParams: DataTableSearchParams, targetDate: string) {
  logger.debug('Obteniendo servicios detalle paginados', { data: { targetDate } });

  try {
    const companyId = await getServerCompanyId();
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildServicesDetailWhere(companyId, targetDate, state);

    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (SERVICES_DETAIL_VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        if (s.id === 'customer') {
          resolvedSorts.push({ customers: { name: dir } });
        } else {
          resolvedSorts.push({ [s.id]: dir });
        }
      }
    }
    const safeOrderBy = [...resolvedSorts, { created_at: 'desc' as const }];

    const [data, total] = await Promise.all([
      prisma.dailyreportrows.findMany({
        skip,
        take,
        orderBy: safeOrderBy,
        where,
        select: SERVICES_DETAIL_SELECT,
      }),
      prisma.dailyreportrows.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener servicios detalle paginados', { data: { error } });
    throw new Error(`Error al obtener servicios: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export type ServicesDetailListItem = Awaited<ReturnType<typeof getServicesDetailPaginated>>['data'][number];

/**
 * Obtiene todos los servicios detalle sin paginación para exportación.
 */
export async function getAllServicesDetailForExport(searchParams: DataTableSearchParams, targetDate: string) {
  logger.debug('Exportando servicios detalle', { data: { targetDate } });

  try {
    const companyId = await getServerCompanyId();
    const state = parseSearchParams(searchParams);
    const where = buildServicesDetailWhere(companyId, targetDate, state);

    const data = await prisma.dailyreportrows.findMany({
      orderBy: [{ created_at: 'desc' as const }],
      where,
      select: SERVICES_DETAIL_SELECT,
    });

    return data;
  } catch (error) {
    logger.error('Error al exportar servicios detalle', { data: { error } });
    throw new Error('Error al exportar servicios');
  }
}

/**
 * Facets por columna individual con cross-filter para el DataTable de servicios detalle.
 */
export async function getServicesDetailSingleFacet(
  columnId: string,
  targetDate: string,
  searchParams?: DataTableSearchParams
): Promise<{ counts: Map<string, number>; resolvedOptions?: Array<{ id: string; name: string | null }> } | null> {
  logger.debug('Obteniendo facet de servicios detalle', { data: { columnId, targetDate } });

  try {
    const companyId = await getServerCompanyId();

    let parsedState: ReturnType<typeof parseSearchParams> = parseSearchParams({});
    if (searchParams && Object.keys(searchParams).length > 0) {
      parsedState = parseSearchParams(searchParams);
    }

    function crossWhere(excludeColumn: string) {
      const modified = { ...parsedState, filters: { ...parsedState.filters } };
      delete modified.filters[excludeColumn];
      delete modified.filters[`${excludeColumn}_from`];
      delete modified.filters[`${excludeColumn}_to`];
      return buildServicesDetailWhere(companyId, targetDate, modified);
    }

    function toFacetMap(rows: { key: string | null | undefined; count: number }[]): Map<string, number> {
      const map = new Map<string, number>();
      for (const { key, count } of rows) {
        if (key == null) {
          map.set(NULL_FILTER_VALUE, (map.get(NULL_FILTER_VALUE) ?? 0) + count);
        } else {
          map.set(key, count);
        }
      }
      return map;
    }

    switch (columnId) {
      case 'status': {
        const groups = await prisma.dailyreportrows.groupBy({
          by: ['status'],
          where: crossWhere('status'),
          _count: { id: true },
        });
        return {
          counts: toFacetMap(groups.map((g) => ({ key: g.status as string | null, count: g._count.id }))),
        };
      }

      case 'type_service': {
        const groups = await prisma.dailyreportrows.groupBy({
          by: ['type_service'],
          where: crossWhere('type_service'),
          _count: { id: true },
        });
        return {
          counts: toFacetMap(groups.map((g) => ({ key: g.type_service as string | null, count: g._count.id }))),
        };
      }

      case 'customer': {
        const groups = await prisma.dailyreportrows.groupBy({
          by: ['customer_id'],
          where: crossWhere('customer'),
          _count: { id: true },
        });
        const ids = groups.map((g) => g.customer_id).filter((id): id is string => id != null);
        const resolvedOptions =
          ids.length > 0
            ? await prisma.customers.findMany({
                where: { id: { in: ids } },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
              })
            : [];
        return {
          counts: toFacetMap(groups.map((g) => ({ key: g.customer_id, count: g._count.id }))),
          resolvedOptions,
        };
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener facet de servicios detalle', { data: { error, columnId } });
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Available Employees — Paginated DataTable (server-side, no in-memory)
// ─────────────────────────────────────────────────────────────────────────────

const AVAILABLE_EMP_TEXT_COLUMNS = ['file', 'cuil'];
const AVAILABLE_EMP_COLUMN_MAP: Record<string, string> = {
  company_positions: 'company_position',
};
const AVAILABLE_EMP_VALID_SORT_FIELDS = new Set(['lastname', 'firstname', 'cuil', 'file', 'company_positions']);
const AVAILABLE_EMP_FK_SORT_MAP: Record<string, (dir: 'asc' | 'desc') => Record<string, unknown>> = {
  company_positions: (dir) => ({ company_positions: { name: dir } }),
};

const AVAILABLE_EMPLOYEE_SELECT = {
  id: true,
  firstname: true,
  lastname: true,
  cuil: true,
  file: true,
  company_position: true,
  company_positions: { select: { id: true, name: true } },
  contractor_employee: {
    select: { contractor_id: true, customers: { select: { id: true, name: true } } },
  },
  employees_diagram: {
    select: {
      diagram_type: true,
      diagram_type_employees_diagram_diagram_typeTodiagram_type: {
        select: { short_description: true, color: true },
      },
    },
    where: {
      diagram_type_employees_diagram_diagram_typeTodiagram_type: {
        work_active: true,
        is_active: true,
      },
    },
    take: 1,
  },
} as const;

/**
 * Construye el WHERE de empleados disponibles:
 * - tienen diagrama de trabajo activo hoy
 * - NO están en el parte diario de hoy
 * - respetan los filtros activos (búsqueda, facets, texto)
 */
async function buildAvailableEmployeesWhere(
  companyId: string,
  positionIds: string[] | undefined,
  state: ReturnType<typeof parseSearchParams>
) {
  const now = moment().utcOffset(-3);
  const day = now.date();
  const month = now.month() + 1;
  const year = now.year();
  const todayDate = now.format('YYYY-MM-DD');

  // Una sola query SQL que computa los IDs disponibles en la BD (sin filtrado JS).
  // Replica la lógica del indicador: disponibles = operativos - TODOS_en_parte (resta aritmética).
  // LIMIT = COUNT(operativos) - COUNT(todos_en_parte) para coincidir con el indicador.
  const positionClause = positionIds?.length
    ? `AND e.company_position = ANY(ARRAY[${positionIds.map((id) => `'${id}'::uuid`).join(',')}])`
    : '';

  const availableRows = await prisma.$queryRawUnsafe<{ employee_id: string }[]>(
    `WITH operativos AS (
      SELECT DISTINCT ed.employee_id
      FROM employees_diagram ed
      INNER JOIN diagram_type dt ON ed.diagram_type = dt.id
      INNER JOIN employees e ON ed.employee_id = e.id
      WHERE ed.day = $1 AND ed.month = $2 AND ed.year = $3
        AND dt.work_active = true AND dt.is_active = true
        AND e.is_active = true AND e.company_id = $4
        ${positionClause}
    ),
    in_report AS (
      SELECT DISTINCT drer.employee_id
      FROM dailyreportemployeerelations drer
      INNER JOIN dailyreportrows drr ON drer.daily_report_row_id = drr.id
      INNER JOIN dailyreport dr ON drr.daily_report_id = dr.id
      INNER JOIN employees e ON drer.employee_id = e.id
      WHERE dr.date = $5::date AND dr.is_active = true
        AND e.company_id = $4 AND e.is_active = true
        AND drer.employee_id IS NOT NULL
        ${positionClause}
    )
    SELECT o.employee_id
    FROM operativos o
    WHERE o.employee_id NOT IN (SELECT employee_id FROM in_report)
    LIMIT GREATEST(
      (SELECT COUNT(*)::int FROM operativos) - (SELECT COUNT(*)::int FROM in_report),
      0
    )`,
    day,
    month,
    year,
    companyId,
    todayDate
  );

  const availableIds = availableRows.map((r) => r.employee_id);

  const searchWhere = buildSearchWhere(state.search, ['lastname', 'firstname', 'cuil', 'file']);
  const filtersWhere = buildFiltersWhere(state.filters, AVAILABLE_EMP_COLUMN_MAP, {
    exclude: [...AVAILABLE_EMP_TEXT_COLUMNS, 'customers', 'diagram'],
  });
  const textFiltersWhere = buildTextFiltersWhere(state.filters, AVAILABLE_EMP_TEXT_COLUMNS);

  const customerValues = state.filters['customers'];
  const m2mFilter: Record<string, unknown> = {};
  const extraAndConditions: Record<string, unknown>[] = [];

  if (customerValues?.length) {
    const hasNull = customerValues.includes(NULL_FILTER_VALUE);
    const realValues = customerValues.filter((v) => v !== NULL_FILTER_VALUE);
    if (hasNull && realValues.length > 0) {
      extraAndConditions.push({
        OR: [
          { contractor_employee: { some: { contractor_id: { in: realValues } } } },
          { contractor_employee: { none: {} } },
        ],
      });
    } else if (hasNull) {
      m2mFilter.contractor_employee = { none: {} };
    } else {
      m2mFilter.contractor_employee = { some: { contractor_id: { in: realValues } } };
    }
  }

  const filtersWhereAndConditions = (filtersWhere.AND as Record<string, unknown>[] | undefined) ?? [];
  const allAndConditions = [...filtersWhereAndConditions, ...extraAndConditions];
  const { AND: _discarded, ...filtersWhereWithoutAnd } = filtersWhere as Record<string, unknown> & {
    AND?: unknown;
  };

  return {
    id: availableIds.length > 0 ? { in: availableIds } : { in: [] as string[] },
    is_active: true as const,
    company_id: companyId,
    ...searchWhere,
    ...filtersWhereWithoutAnd,
    ...textFiltersWhere,
    ...m2mFilter,
    ...(allAndConditions.length > 0 ? { AND: allAndConditions } : {}),
  };
}

/**
 * Obtiene empleados disponibles paginados (Prisma skip/take).
 * "Disponible" = tiene diagrama de trabajo activo hoy Y no está en el parte diario de hoy.
 */
export async function getAvailableEmployeesPaginated(searchParams: DataTableSearchParams, positionIds?: string[]) {
  logger.debug('Obteniendo empleados disponibles paginados', { data: { positionIds } });

  try {
    const companyId = await getServerCompanyId();
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = await buildAvailableEmployeesWhere(companyId, positionIds, state);

    const resolvedSorts: Record<string, unknown>[] = [];
    for (const s of state.sorting) {
      if (AVAILABLE_EMP_VALID_SORT_FIELDS.has(s.id)) {
        const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
        const fkMapper = AVAILABLE_EMP_FK_SORT_MAP[s.id];
        resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
      }
    }
    const safeOrderBy = [...resolvedSorts, { lastname: 'asc' as const }];

    const [data, total] = await Promise.all([
      prisma.employees.findMany({ where, skip, take, orderBy: safeOrderBy, select: AVAILABLE_EMPLOYEE_SELECT }),
      prisma.employees.count({ where }),
    ]);

    return { data, total };
  } catch (error) {
    logger.error('Error al obtener empleados disponibles paginados', { data: { error } });
    throw error;
  }
}

// Tipo inferido desde la query — NUNCA tipar manualmente
export type AvailableEmployeeListItem = Awaited<ReturnType<typeof getAvailableEmployeesPaginated>>['data'][number];

/**
 * Obtiene TODOS los empleados disponibles sin paginación (para exportación Excel).
 */
export async function getAllAvailableEmployeesForExport(searchParams: DataTableSearchParams, positionIds?: string[]) {
  logger.debug('Exportando empleados disponibles', { data: { positionIds } });

  try {
    const companyId = await getServerCompanyId();
    const state = parseSearchParams(searchParams);
    const where = await buildAvailableEmployeesWhere(companyId, positionIds, state);

    return prisma.employees.findMany({
      where,
      orderBy: [{ lastname: 'asc' }],
      select: AVAILABLE_EMPLOYEE_SELECT,
    });
  } catch (error) {
    logger.error('Error al exportar empleados disponibles', { data: { error } });
    throw error;
  }
}

/**
 * Obtiene facets para una sola columna del listado de empleados disponibles.
 * Implementa cross-filter: los counts excluyen el filtro de la columna propia.
 */
export async function getAvailableEmployeeSingleFacet(
  columnId: string,
  searchParams: DataTableSearchParams,
  positionIds?: string[]
): Promise<{
  counts: Map<string, number>;
  resolvedOptions?: Array<{ id: string; name: string | null }>;
} | null> {
  logger.debug('Obteniendo facet de empleados disponibles', { data: { columnId } });

  try {
    const companyId = await getServerCompanyId();
    const state = parseSearchParams(searchParams);

    async function crossWhere(excludeColumn: string) {
      const modified = { ...state, filters: { ...state.filters } };
      delete modified.filters[excludeColumn];
      delete modified.filters[`${excludeColumn}_from`];
      delete modified.filters[`${excludeColumn}_to`];
      return buildAvailableEmployeesWhere(companyId, positionIds, modified);
    }

    function toFacetMap(rows: { key: string | null | undefined; count: number }[]): Map<string, number> {
      const map = new Map<string, number>();
      for (const { key, count } of rows) {
        if (key == null) {
          map.set(NULL_FILTER_VALUE, (map.get(NULL_FILTER_VALUE) ?? 0) + count);
        } else {
          map.set(key, count);
        }
      }
      return map;
    }

    switch (columnId) {
      case 'company_positions': {
        const where = await crossWhere('company_positions');
        const rows = await prisma.employees.groupBy({ by: ['company_position'], where, _count: true });
        const counts = toFacetMap(rows.map((r) => ({ key: r.company_position, count: r._count })));
        const ids = rows.map((r) => r.company_position).filter(Boolean) as string[];
        const resolvedOptions =
          ids.length > 0
            ? await prisma.company_positions.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
            : [];
        return { counts, resolvedOptions };
      }

      case 'customers': {
        const where = await crossWhere('customers');
        const [totalInCross, withCustomer, relations] = await Promise.all([
          prisma.employees.count({ where }),
          prisma.employees.count({ where: { ...where, contractor_employee: { some: {} } } }),
          prisma.contractor_employee.findMany({
            where: { employees: where },
            select: { contractor_id: true, employee_id: true, customers: { select: { id: true, name: true } } },
          }),
        ]);

        const counts = new Map<string, number>();
        const withoutCustomer = totalInCross - withCustomer;
        if (withoutCustomer > 0) counts.set(NULL_FILTER_VALUE, withoutCustomer);

        const contractorEmpSet = new Map<string, Set<string>>();
        const customerNameMap = new Map<string, string>();
        for (const rel of relations) {
          const cid = rel.contractor_id;
          const eid = rel.employee_id;
          if (!cid || !eid) continue;
          if (!contractorEmpSet.has(cid)) {
            contractorEmpSet.set(cid, new Set());
          }
          contractorEmpSet.get(cid)!.add(eid);
          if (rel.customers?.name) customerNameMap.set(cid, rel.customers.name);
        }
        for (const [cid, empSet] of contractorEmpSet) {
          counts.set(cid, empSet.size);
        }
        const resolvedOptions = Array.from(customerNameMap.entries()).map(([id, name]) => ({ id, name }));
        return { counts, resolvedOptions };
      }

      case 'diagram': {
        const now = moment().utcOffset(-3);
        const day = now.date();
        const month = now.month() + 1;
        const year = now.year();
        const where = await crossWhere('diagram');
        const empIds = await prisma.employees.findMany({ where, select: { id: true } });
        const ids = empIds.map((e) => e.id);
        if (ids.length === 0) return { counts: new Map(), resolvedOptions: [] };

        const diagrams = await prisma.employees_diagram.findMany({
          where: {
            employee_id: { in: ids },
            day,
            month,
            year,
            diagram_type_employees_diagram_diagram_typeTodiagram_type: { work_active: true, is_active: true },
          },
          select: {
            diagram_type: true,
            diagram_type_employees_diagram_diagram_typeTodiagram_type: {
              select: { id: true, short_description: true },
            },
          },
          distinct: ['employee_id'],
        });

        const diagramCounts = new Map<string, number>();
        const diagramNameMap = new Map<string, string>();
        for (const d of diagrams) {
          const key = d.diagram_type;
          diagramCounts.set(key, (diagramCounts.get(key) ?? 0) + 1);
          const dt = d.diagram_type_employees_diagram_diagram_typeTodiagram_type;
          if (dt?.short_description) diagramNameMap.set(key, dt.short_description);
        }
        const resolvedOptions = Array.from(diagramNameMap.entries()).map(([id, name]) => ({ id, name }));
        return { counts: diagramCounts, resolvedOptions };
      }

      default:
        return null;
    }
  } catch (error) {
    logger.error('Error al obtener facet de empleados disponibles', { data: { error, columnId } });
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Vehicle Dialog — Server-Side Paginated DataTable (Available + Repair)
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
  contractor_equipment: {
    select: { customers: { select: { id: true, name: true } } },
  },
} as const;

function toVehicleFacetMap(rows: { key: string | null | undefined; count: number }[]): Map<string, number> {
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

function buildVehicleFiltersWhere(state: ReturnType<typeof parseSearchParams>) {
  const searchWhere = buildSearchWhere(state.search, VEHICLE_TEXT_COLUMNS);
  const filtersWhere = buildFiltersWhere(
    state.filters,
    { vehicleType: 'type', subType: 'subType' },
    { exclude: [...VEHICLE_TEXT_COLUMNS, 'contractor_equipment'] }
  );
  const textFiltersWhere = buildTextFiltersWhere(state.filters, VEHICLE_TEXT_COLUMNS);

  const contractorValues = state.filters['contractor_equipment'];
  const extraAndConditions: Record<string, unknown>[] = [];
  const directM2mFilters: Record<string, unknown> = {};

  if (contractorValues?.length) {
    const hasNull = contractorValues.includes(NULL_FILTER_VALUE);
    const realValues = contractorValues.filter((v) => v !== NULL_FILTER_VALUE);
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

  const filtersWhereAndConditions =
    ((filtersWhere as Record<string, unknown>).AND as Record<string, unknown>[] | undefined) ?? [];
  const allAndConditions = [...filtersWhereAndConditions, ...extraAndConditions];
  const { AND: _discarded, ...filtersWhereWithoutAnd } = filtersWhere as Record<string, unknown> & { AND?: unknown };

  return {
    ...searchWhere,
    ...filtersWhereWithoutAnd,
    ...textFiltersWhere,
    ...directM2mFilters,
    ...(allAndConditions.length > 0 ? { AND: allAndConditions } : {}),
  };
}

async function buildAvailableVehiclesWhereClause(
  companyId: string,
  typeIds: string[] | undefined,
  state: ReturnType<typeof parseSearchParams>
) {
  const todayDate = moment().utcOffset(-3).format('YYYY-MM-DD');

  const vehiclesInReport = await prisma.dailyreportequipmentrelations.findMany({
    where: {
      equipment_id: { not: null },
      dailyreportrows: {
        dailyreport: { date: new Date(todayDate), is_active: true },
      },
      vehicles: {
        is_active: true,
        company_id: companyId,
        ...(typeIds?.length ? { type: { in: typeIds } } : {}),
      },
    },
    select: { equipment_id: true },
    distinct: ['equipment_id'],
  });

  const inReportIds = vehiclesInReport.map((r) => r.equipment_id).filter((id): id is string => id != null);
  const vehicleFilters = buildVehicleFiltersWhere(state);

  return {
    is_active: true,
    company_id: companyId,
    condition: { in: ['operativo', 'operativo_condicionado'] as const },
    ...(typeIds?.length ? { type: { in: typeIds } } : {}),
    ...(inReportIds.length > 0 ? { id: { notIn: inReportIds } } : {}),
    ...vehicleFilters,
  };
}

function buildRepairVehiclesWhereClause(companyId: string, state: ReturnType<typeof parseSearchParams>) {
  return {
    is_active: true,
    company_id: companyId,
    condition: { in: ['no_operativo', 'en_reparacion', 'en_preparacion'] as const },
    ...buildVehicleFiltersWhere(state),
  };
}

function buildVehicleOrderBy(state: ReturnType<typeof parseSearchParams>) {
  const resolvedSorts: Record<string, unknown>[] = [];
  for (const s of state.sorting) {
    if (VALID_VEHICLE_SORT_FIELDS.has(s.id)) {
      const dir: 'asc' | 'desc' = s.desc ? 'desc' : 'asc';
      const fkMapper = VEHICLE_FK_SORT_MAP[s.id];
      resolvedSorts.push(fkMapper ? fkMapper(dir) : { [s.id]: dir });
    }
  }
  return [...resolvedSorts, { domain: 'asc' as const }];
}

export async function getAvailableVehiclesPaginated(searchParams: DataTableSearchParams, typeIds?: string[]) {
  const companyId = await getServerCompanyId();
  logger.debug('Obteniendo vehículos disponibles paginados', { data: { typeIds } });

  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = await buildAvailableVehiclesWhereClause(companyId, typeIds, state);
    const orderBy = buildVehicleOrderBy(state);
    const [data, total] = await Promise.all([
      prisma.vehicles.findMany({
        skip,
        take,
        orderBy,
        where: where as unknown as Prisma.vehiclesWhereInput,
        select: VEHICLE_DIALOG_SELECT,
      }),
      prisma.vehicles.count({ where: where as unknown as Prisma.vehiclesWhereInput }),
    ]);
    return { data, total };
  } catch (error) {
    logger.error('Error al obtener vehículos disponibles paginados', { data: { error } });
    throw error;
  }
}

export type AvailableVehicleItem = Awaited<ReturnType<typeof getAvailableVehiclesPaginated>>['data'][number];

export async function getAvailableVehiclesForExport(searchParams: DataTableSearchParams, typeIds?: string[]) {
  const companyId = await getServerCompanyId();
  logger.debug('Exportando vehículos disponibles', { data: { typeIds } });
  try {
    const state = parseSearchParams(searchParams);
    const where = await buildAvailableVehiclesWhereClause(companyId, typeIds, state);
    return prisma.vehicles.findMany({
      orderBy: [{ domain: 'asc' }],
      where: where as unknown as Prisma.vehiclesWhereInput,
      select: VEHICLE_DIALOG_SELECT,
    });
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
  const companyId = await getServerCompanyId();
  logger.debug('Obteniendo facet de vehículos disponibles', { data: { columnId } });

  const parsedState =
    searchParams && Object.keys(searchParams).length > 0 ? parseSearchParams(searchParams) : parseSearchParams({});

  async function crossWhere(excludeColumn: string) {
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    return buildAvailableVehiclesWhereClause(companyId, typeIds, modified);
  }

  try {
    if (columnId === 'vehicleType') {
      const where = await crossWhere('vehicleType');
      const rows = await prisma.vehicles.groupBy({
        by: ['type'],
        where: where as unknown as Prisma.vehiclesWhereInput,
        _count: true,
      });
      const counts = toVehicleFacetMap(rows.map((r) => ({ key: r.type, count: r._count })));
      const ids = rows.map((r) => r.type).filter(Boolean) as string[];
      const resolvedOptions =
        ids.length > 0
          ? await prisma.type.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            })
          : [];
      return { counts, resolvedOptions };
    }

    if (columnId === 'subType') {
      const where = await crossWhere('subType');
      const rows = await prisma.vehicles.groupBy({
        by: ['subType'],
        where: where as unknown as Prisma.vehiclesWhereInput,
        _count: true,
      });
      const counts = toVehicleFacetMap(rows.map((r) => ({ key: r.subType, count: r._count })));
      const ids = rows.map((r) => r.subType).filter(Boolean) as string[];
      const resolvedOptions =
        ids.length > 0
          ? await prisma.sub_type.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            })
          : [];
      return { counts, resolvedOptions };
    }

    if (columnId === 'contractor_equipment') {
      const where = await crossWhere('contractor_equipment');
      const whereTyped = where as unknown as Prisma.vehiclesWhereInput;
      const [relations, allRels, totalInCross, withSome] = await Promise.all([
        prisma.contractor_equipment.findMany({
          where: { vehicles: whereTyped },
          select: { contractor_id: true, customers: { select: { id: true, name: true } } },
          distinct: ['contractor_id'],
        }),
        prisma.contractor_equipment.findMany({ where: { vehicles: whereTyped }, select: { contractor_id: true } }),
        prisma.vehicles.count({ where: whereTyped }),
        prisma.vehicles.count({
          where: { ...whereTyped, contractor_equipment: { some: {} } } as unknown as Prisma.vehiclesWhereInput,
        }),
      ]);
      const countMap = new Map<string, number>();
      for (const rel of allRels) {
        if (rel.contractor_id) countMap.set(rel.contractor_id, (countMap.get(rel.contractor_id) ?? 0) + 1);
      }
      const unassigned = totalInCross - withSome;
      if (unassigned > 0) countMap.set(NULL_FILTER_VALUE, unassigned);
      return {
        counts: countMap,
        resolvedOptions: relations
          .filter((r) => r.contractor_id && r.customers)
          .map((r) => ({ id: r.customers!.id, name: r.customers!.name })),
      };
    }

    logger.warn('Available vehicle facet column not recognized', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error al obtener facet de vehículos disponibles', { data: { error, columnId } });
    return null;
  }
}

export async function getRepairVehiclesPaginated(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();
  logger.debug('Obteniendo vehículos en reparación paginados');
  try {
    const state = parseSearchParams(searchParams);
    const { skip, take } = stateToPrismaParams(state);
    const where = buildRepairVehiclesWhereClause(companyId, state);
    const orderBy = buildVehicleOrderBy(state);
    const [data, total] = await Promise.all([
      prisma.vehicles.findMany({
        skip,
        take,
        orderBy,
        where: where as unknown as Prisma.vehiclesWhereInput,
        select: VEHICLE_DIALOG_SELECT,
      }),
      prisma.vehicles.count({ where: where as unknown as Prisma.vehiclesWhereInput }),
    ]);
    return { data, total };
  } catch (error) {
    logger.error('Error al obtener vehículos en reparación paginados', { data: { error } });
    throw error;
  }
}

export type RepairVehicleItem = Awaited<ReturnType<typeof getRepairVehiclesPaginated>>['data'][number];

export async function getRepairVehiclesForExport(searchParams: DataTableSearchParams) {
  const companyId = await getServerCompanyId();
  logger.debug('Exportando vehículos en reparación');
  try {
    const state = parseSearchParams(searchParams);
    const where = buildRepairVehiclesWhereClause(companyId, state);
    return prisma.vehicles.findMany({
      orderBy: [{ domain: 'asc' }],
      where: where as unknown as Prisma.vehiclesWhereInput,
      select: VEHICLE_DIALOG_SELECT,
    });
  } catch (error) {
    logger.error('Error al exportar vehículos en reparación', { data: { error } });
    throw error;
  }
}

export async function getRepairVehicleSingleFacet(
  columnId: string,
  searchParams?: DataTableSearchParams
): Promise<{ counts: Map<string, number>; resolvedOptions?: Array<{ id: string; name: string | null }> } | null> {
  const companyId = await getServerCompanyId();
  logger.debug('Obteniendo facet de vehículos en reparación', { data: { columnId } });

  const parsedState =
    searchParams && Object.keys(searchParams).length > 0 ? parseSearchParams(searchParams) : parseSearchParams({});

  function crossWhere(excludeColumn: string) {
    const modified = { ...parsedState, filters: { ...parsedState.filters } };
    delete modified.filters[excludeColumn];
    return buildRepairVehiclesWhereClause(companyId, modified);
  }

  try {
    if (columnId === 'vehicleType') {
      const where = crossWhere('vehicleType');
      const rows = await prisma.vehicles.groupBy({
        by: ['type'],
        where: where as unknown as Prisma.vehiclesWhereInput,
        _count: true,
      });
      const counts = toVehicleFacetMap(rows.map((r) => ({ key: r.type, count: r._count })));
      const ids = rows.map((r) => r.type).filter(Boolean) as string[];
      const resolvedOptions =
        ids.length > 0
          ? await prisma.type.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            })
          : [];
      return { counts, resolvedOptions };
    }

    if (columnId === 'subType') {
      const where = crossWhere('subType');
      const rows = await prisma.vehicles.groupBy({
        by: ['subType'],
        where: where as unknown as Prisma.vehiclesWhereInput,
        _count: true,
      });
      const counts = toVehicleFacetMap(rows.map((r) => ({ key: r.subType, count: r._count })));
      const ids = rows.map((r) => r.subType).filter(Boolean) as string[];
      const resolvedOptions =
        ids.length > 0
          ? await prisma.sub_type.findMany({
              where: { id: { in: ids } },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            })
          : [];
      return { counts, resolvedOptions };
    }

    if (columnId === 'contractor_equipment') {
      const where = crossWhere('contractor_equipment');
      const whereTyped = where as unknown as Prisma.vehiclesWhereInput;
      const [relations, allRels, totalInCross, withSome] = await Promise.all([
        prisma.contractor_equipment.findMany({
          where: { vehicles: whereTyped },
          select: { contractor_id: true, customers: { select: { id: true, name: true } } },
          distinct: ['contractor_id'],
        }),
        prisma.contractor_equipment.findMany({ where: { vehicles: whereTyped }, select: { contractor_id: true } }),
        prisma.vehicles.count({ where: whereTyped }),
        prisma.vehicles.count({
          where: { ...whereTyped, contractor_equipment: { some: {} } } as unknown as Prisma.vehiclesWhereInput,
        }),
      ]);
      const countMap = new Map<string, number>();
      for (const rel of allRels) {
        if (rel.contractor_id) countMap.set(rel.contractor_id, (countMap.get(rel.contractor_id) ?? 0) + 1);
      }
      const unassigned = totalInCross - withSome;
      if (unassigned > 0) countMap.set(NULL_FILTER_VALUE, unassigned);
      return {
        counts: countMap,
        resolvedOptions: relations
          .filter((r) => r.contractor_id && r.customers)
          .map((r) => ({ id: r.customers!.id, name: r.customers!.name })),
      };
    }

    logger.warn('Repair vehicle facet column not recognized', { data: { columnId } });
    return null;
  } catch (error) {
    logger.error('Error al obtener facet de vehículos en reparación', { data: { error, columnId } });
    return null;
  }
}
