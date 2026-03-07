'use server';

import { Logger } from '@/lib/logger';
import { getServerCompanyId } from '@/shared/actions/company.actions';
import { prisma } from '@/shared/lib/prisma';
import moment from 'moment';
import { cache } from 'react';

const logger = new Logger('features/Dashboard/Principal');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Convert BigInt values from Prisma raw queries to plain numbers
// PostgreSQL returns int8/bigint columns as BigInt, which can't be serialized
// by React Server Components when passed as props to Client Components.
// ─────────────────────────────────────────────────────────────────────────────

function toPlainNumbers<T>(rows: T[]): T[] {
  return JSON.parse(JSON.stringify(rows, (_key, value) => (typeof value === 'bigint' ? Number(value) : value))) as T[];
}

// ─────────────────────────────────────────────────────────────────────────────
// RPC Result Types
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

    const [activeEmployees, activeVehicles, servicesSummary, equipmentData] = await Promise.all([
      prisma.employees.count({
        where: { company_id: companyId, is_active: true },
      }),
      prisma.vehicles.count({
        where: { company_id: companyId, is_active: true },
      }),
      prisma.$queryRawUnsafe<{ service_count: bigint }[]>(
        'SELECT * FROM get_services_summary_by_type($1, $2)',
        companyId,
        false
      ),
      getEquipmentIndicators(),
    ]);

    const totalServices = (servicesSummary ?? []).reduce((sum, r) => sum + Number(r.service_count ?? 0), 0);

    let totalActive = 0;
    let totalNotAvailable = 0;
    for (const item of equipmentData) {
      totalActive += item.available_units;
      totalNotAvailable += item.not_available_units;
    }
    const totalFleet = totalActive + totalNotAvailable;
    const operativityPercentage = totalFleet > 0 ? Math.round((totalActive / totalFleet) * 100) : 0;

    return {
      activeEmployees,
      activeVehicles,
      totalFleet,
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
 * Llama a la función RPC get_services_summary_by_type.
 */
export async function getServicesSummary(saveToHistory = false): Promise<ServicesSummaryResult[]> {
  logger.debug('Obteniendo resumen de servicios por tipo');

  try {
    const companyId = await getServerCompanyId();

    const data = await prisma.$queryRawUnsafe<ServicesSummaryResult[]>(
      'SELECT * FROM get_services_summary_by_type($1, $2)',
      companyId,
      saveToHistory
    );

    const result = toPlainNumbers(data ?? []);
    logger.debug('Services summary raw result', { data: { firstRow: result[0], rowCount: result.length } });
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
 * Llama a la función RPC get_employee_usage_indicator.
 */
export async function getEmployeeIndicators(positionIds?: string[]): Promise<EmployeeIndicatorResult> {
  logger.debug('Obteniendo indicadores de empleados', { data: { positionIds } });

  try {
    const companyId = await getServerCompanyId();

    const rows = await prisma.$queryRawUnsafe<EmployeeIndicatorResult[]>(
      'SELECT * FROM get_employee_usage_indicator($1, $2, $3)',
      positionIds?.length ? positionIds : null,
      false,
      companyId
    );

    if (!rows || rows.length === 0) {
      return DEFAULT_EMPLOYEE_INDICATOR;
    }

    return toPlainNumbers(rows)[0];
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
 * Llama a la función RPC get_employee_diagram_count_by_day.
 */
export async function getDiagramIndicators(positionIds?: string[]): Promise<DiagramIndicatorResult[]> {
  logger.debug('Obteniendo indicadores de diagramas', { data: { positionIds } });

  try {
    const day = moment().date();
    const month = moment().month() + 1;
    const year = moment().year();

    // RPC returns JSON, so we SELECT the function call and extract the json column
    const rows = await prisma.$queryRawUnsafe<{ result: DiagramIndicatorResult[] | null }[]>(
      'SELECT get_employee_diagram_count_by_day($1, $2, $3, $4, $5) AS result',
      day,
      month,
      year,
      positionIds?.length ? positionIds : null,
      false
    );

    const jsonResult = rows?.[0]?.result;
    if (!jsonResult || !Array.isArray(jsonResult)) {
      return [];
    }

    return toPlainNumbers(jsonResult);
  } catch (error) {
    logger.error('Error al obtener indicadores de diagramas', { data: { error } });
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Employees Not In Daily Report
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene los empleados con diagrama activo que no están en el parte diario de hoy.
 * Llama a la función RPC get_employees_not_in_daily_report.
 */
export async function getEmployeesNotInDailyReport(positionIds?: string[]): Promise<EmployeeNotInReportResult[]> {
  logger.debug('Obteniendo empleados fuera del parte diario', { data: { positionIds } });

  try {
    const companyId = await getServerCompanyId();

    const data = await prisma.$queryRawUnsafe<EmployeeNotInReportResult[]>(
      'SELECT * FROM get_employees_not_in_daily_report($1, $2)',
      companyId,
      positionIds?.length ? positionIds : null
    );

    return toPlainNumbers(data ?? []);
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
 * Llama a la función RPC get_vehicle_usage_indicator.
 * Wrapped con React.cache para deduplicar llamadas dentro del mismo render.
 */
export const getEquipmentIndicators = cache(async (typeIds?: string[]): Promise<EquipmentIndicatorResult[]> => {
  logger.debug('Obteniendo indicadores de equipos', { data: { typeIds } });

  try {
    const companyId = await getServerCompanyId();

    const data = await prisma.$queryRawUnsafe<EquipmentIndicatorResult[]>(
      'SELECT * FROM get_vehicle_usage_indicator($1, $2, $3)',
      typeIds?.length ? typeIds : [],
      companyId,
      false
    );

    return toPlainNumbers(data ?? []);
  } catch (error) {
    logger.error('Error al obtener indicadores de equipos', { data: { error } });
    return [];
  }
});

export type EquipmentIndicatorsData = Awaited<ReturnType<typeof getEquipmentIndicators>>;

// ─────────────────────────────────────────────────────────────────────────────
// 7. Vehicles Not In Daily Report
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene los vehículos que no están en el parte diario de hoy.
 * Llama a la función RPC get_vehicles_not_in_daily_report.
 */
export async function getVehiclesNotInDailyReport(typeIds?: string[]): Promise<VehicleNotInReportResult[]> {
  logger.debug('Obteniendo vehículos fuera del parte diario', { data: { typeIds } });

  try {
    const companyId = await getServerCompanyId();

    const data = await prisma.$queryRawUnsafe<VehicleNotInReportResult[]>(
      'SELECT * FROM get_vehicles_not_in_daily_report($1, $2)',
      companyId,
      typeIds?.length ? typeIds : null
    );

    return toPlainNumbers(data ?? []);
  } catch (error) {
    logger.error('Error al obtener vehículos fuera del parte', { data: { error } });
    return [];
  }
}

export type VehiclesNotInDailyReportData = Awaited<ReturnType<typeof getVehiclesNotInDailyReport>>;

// ─────────────────────────────────────────────────────────────────────────────
// 8. Vehicles On Repair
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene los vehículos no operativos (en reparación).
 * Llama a la función RPC get_vehicles_non_operative.
 */
export async function getVehiclesOnRepair(): Promise<VehicleNotInReportResult[]> {
  logger.debug('Obteniendo vehículos en reparación');

  try {
    const companyId = await getServerCompanyId();

    const data = await prisma.$queryRawUnsafe<VehicleNotInReportResult[]>(
      'SELECT * FROM get_vehicles_non_operative($1, $2)',
      companyId,
      null
    );

    return toPlainNumbers(data ?? []);
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
 * Agrupa por cliente con conteos de servicios mensuales, adicionales y distribución de estados.
 */
export async function getServicesDetailByClient(date?: string): Promise<ServiceDetailByClient[]> {
  logger.debug('Obteniendo detalle de servicios por cliente', { data: { date } });

  try {
    const companyId = await getServerCompanyId();
    const targetDate = date ?? moment().utcOffset(-3).format('YYYY-MM-DD');

    // Use raw query to join dailyreportrows with dailyreport and customers
    const rows = await prisma.$queryRawUnsafe<
      {
        customer_id: string;
        customer_name: string;
        type_service: string | null;
        status: string;
      }[]
    >(
      `
      SELECT
        c.id AS customer_id,
        c.name AS customer_name,
        drr.type_service,
        drr.status
      FROM dailyreportrows drr
      INNER JOIN customers c ON c.id = drr.customer_id
      INNER JOIN dailyreport dr ON dr.id = drr.daily_report_id
      WHERE dr.company_id = $1
        AND dr.date = $2::date
      `,
      companyId,
      targetDate
    );

    if (!rows || rows.length === 0) {
      return [];
    }

    // Group by client
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
      const clientId = row.customer_id;
      const typeService = row.type_service ?? 'sin_tipo';
      const status = row.status;

      if (!clientsMap.has(clientId)) {
        clientsMap.set(clientId, {
          client_name: row.customer_name,
          mensual_count: 0,
          adicional_count: 0,
          status_counts: new Map<string, number>(),
        });
      }

      const client = clientsMap.get(clientId)!;

      if (typeService === 'mensual') {
        client.mensual_count++;
      } else if (typeService === 'adicional' || typeService === 'adicional_permanente') {
        client.adicional_count++;
      }

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
