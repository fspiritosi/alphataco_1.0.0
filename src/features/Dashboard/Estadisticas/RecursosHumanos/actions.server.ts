'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';

const logger = new Logger('features/Dashboard/RRHH');

// ─── Interfaces de tipos de retorno de RPCs ────────────────────────────────

export interface AbsenteeismSummaryResult {
  dotacionAnterior: number;
  altas: number;
  bajas: number;
  dotacionActual: number;
  totalAusentes: number;
  porcentajeAusentismo: number;
}

export interface AbsenteeismTrendItem {
  date: string;
  percentage: number;
}

export interface EmployeeAbsence {
  id: string;
  legajo: string;
  nombre: string;
  tarea: string;
  linea: string;
  turno: string;
  motivo: string;
  desde: string;
  hasta: string;
  diasCaidos: number;
  observaciones: string;
}

export interface AbsentEmployeesDetalles {
  ausentes_info: EmployeeAbsence[];
  bajas_info: EmployeeAbsence[];
  altas_info: EmployeeAbsence[];
}

export interface CurrentAbsentEmployeesResult {
  data: EmployeeAbsence[];
  detalles: AbsentEmployeesDetalles;
}

export interface DailyAbsenceTimeseriesItem {
  fecha: string;
  dotacion: number;
  altas: number;
  bajas: number;
  vacaciones: number;
  totalDotacion: number;
  totalAusentes: number;
  porcentajeAusentismo: number;
}

export interface DepartmentAbsenceReasonItem {
  name: string;
  value: number;
  color: string;
}

export interface DepartmentAbsenceReasonEntry {
  department: string;
  data: DepartmentAbsenceReasonItem[];
}

export interface DepartmentAbsenceSummaryItem {
  sector: string;
  dotacion: number;
  ausentes: number;
  porcentaje: number;
  data: EmployeeAbsence[];
}

// ─── Funciones de RPCs via $queryRawUnsafe ────────────────────────────────

/**
 * Obtiene el resumen general de ausentismo para una empresa y rango de fechas.
 * Llama al RPC `hr_get_absenteeism_summary`.
 */
export async function getAbsenteeismSummary(
  companyId: string,
  fromDate?: string,
  toDate?: string
): Promise<AbsenteeismSummaryResult | null> {
  logger.debug('Obteniendo resumen de ausentismo', { data: { companyId, fromDate, toDate } });

  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await prisma.$queryRawUnsafe<[{ hr_get_absenteeism_summary: AbsenteeismSummaryResult }]>(
      `SELECT hr_get_absenteeism_summary($1::uuid, $2::date, $3::date, false)`,
      companyId,
      fromDate ?? today,
      toDate ?? today
    );

    return result[0]?.hr_get_absenteeism_summary ?? null;
  } catch (error) {
    logger.error('Error al obtener resumen de ausentismo', { data: { error, companyId } });
    throw error;
  }
}

export type AbsenteeismSummaryData = Awaited<ReturnType<typeof getAbsenteeismSummary>>;

/**
 * Obtiene la tendencia de ausentismo en el tiempo.
 * Llama al RPC `hr_get_absenteeism_trend`.
 */
export async function getAbsenteeismTrend(
  companyId: string,
  fromDate?: string,
  toDate?: string
): Promise<AbsenteeismTrendItem[]> {
  logger.debug('Obteniendo tendencia de ausentismo', { data: { companyId, fromDate, toDate } });

  try {
    const result = await prisma.$queryRawUnsafe<[{ hr_get_absenteeism_trend: AbsenteeismTrendItem[] }]>(
      `SELECT hr_get_absenteeism_trend($1::uuid, $2::date, $3::date, false)`,
      companyId,
      fromDate ?? null,
      toDate ?? null
    );

    return result[0]?.hr_get_absenteeism_trend ?? [];
  } catch (error) {
    logger.error('Error al obtener tendencia de ausentismo', { data: { error, companyId } });
    return [];
  }
}

export type AbsenteeismTrendData = Awaited<ReturnType<typeof getAbsenteeismTrend>>;

/**
 * Obtiene los empleados ausentes en una fecha determinada.
 * Llama al RPC `hr_get_current_absent_employees`.
 */
export async function getCurrentAbsentEmployees(
  companyId: string,
  date?: string
): Promise<CurrentAbsentEmployeesResult | null> {
  logger.debug('Obteniendo empleados ausentes actuales', { data: { companyId, date } });

  try {
    const result = await prisma.$queryRawUnsafe<[{ hr_get_current_absent_employees: CurrentAbsentEmployeesResult }]>(
      `SELECT hr_get_current_absent_employees($1::uuid, $2::date, false)`,
      companyId,
      date ?? null
    );

    return result[0]?.hr_get_current_absent_employees ?? null;
  } catch (error) {
    logger.error('Error al obtener empleados ausentes actuales', { data: { error, companyId } });
    throw error;
  }
}

export type CurrentAbsentEmployeesData = Awaited<ReturnType<typeof getCurrentAbsentEmployees>>;

/**
 * Obtiene la serie temporal diaria de ausentismo.
 * Llama al RPC `hr_get_daily_absence_timeseries`.
 */
export async function getDailyAbsenceTimeseries(
  companyId: string,
  fromDate?: string,
  toDate?: string
): Promise<DailyAbsenceTimeseriesItem[]> {
  logger.debug('Obteniendo serie temporal diaria de ausentismo', { data: { companyId, fromDate, toDate } });

  try {
    const result = await prisma.$queryRawUnsafe<[{ hr_get_daily_absence_timeseries: DailyAbsenceTimeseriesItem[] }]>(
      `SELECT hr_get_daily_absence_timeseries($1::uuid, $2::date, $3::date, false)`,
      companyId,
      fromDate ?? null,
      toDate ?? null
    );

    return result[0]?.hr_get_daily_absence_timeseries ?? [];
  } catch (error) {
    logger.error('Error al obtener serie temporal diaria de ausentismo', { data: { error, companyId } });
    throw error;
  }
}

export type DailyAbsenceTimeseriesData = Awaited<ReturnType<typeof getDailyAbsenceTimeseries>>;

/**
 * Obtiene las razones de ausencia agrupadas por departamento para una fecha.
 * Llama al RPC `hr_get_department_absence_reasons`.
 */
export async function getDepartmentAbsenceReasons(
  companyId: string,
  date?: string
): Promise<DepartmentAbsenceReasonEntry[]> {
  logger.debug('Obteniendo razones de ausencia por departamento', { data: { companyId, date } });

  try {
    const result = await prisma.$queryRawUnsafe<
      [{ hr_get_department_absence_reasons: DepartmentAbsenceReasonEntry[] }]
    >(`SELECT hr_get_department_absence_reasons($1::uuid, $2::date, false)`, companyId, date ?? null);

    return result[0]?.hr_get_department_absence_reasons ?? [];
  } catch (error) {
    logger.error('Error al obtener razones de ausencia por departamento', { data: { error, companyId } });
    throw error;
  }
}

export type DepartmentAbsenceReasonsData = Awaited<ReturnType<typeof getDepartmentAbsenceReasons>>;

/**
 * Obtiene el resumen de ausentismo agrupado por departamento para una fecha.
 * Llama al RPC `hr_get_department_absence_summary`.
 */
export async function getDepartmentAbsenceSummary(
  companyId: string,
  date?: string
): Promise<DepartmentAbsenceSummaryItem[]> {
  logger.debug('Obteniendo resumen de ausentismo por departamento', { data: { companyId, date } });

  try {
    const result = await prisma.$queryRawUnsafe<
      [{ hr_get_department_absence_summary: DepartmentAbsenceSummaryItem[] }]
    >(`SELECT hr_get_department_absence_summary($1::uuid, $2::date, false)`, companyId, date ?? null);

    return result[0]?.hr_get_department_absence_summary ?? [];
  } catch (error) {
    logger.error('Error al obtener resumen de ausentismo por departamento', { data: { error, companyId } });
    throw error;
  }
}

export type DepartmentAbsenceSummaryData = Awaited<ReturnType<typeof getDepartmentAbsenceSummary>>;

/**
 * Obtiene el detalle de ausentismo diario para una fecha específica.
 * Reutiliza el RPC `hr_get_current_absent_employees` filtrado por fecha.
 */
export async function getDailyAbsenceDetail(
  companyId: string,
  date?: string
): Promise<CurrentAbsentEmployeesResult | null> {
  logger.debug('Obteniendo detalle de ausentismo diario', { data: { companyId, date } });

  try {
    const result = await prisma.$queryRawUnsafe<[{ hr_get_current_absent_employees: CurrentAbsentEmployeesResult }]>(
      `SELECT hr_get_current_absent_employees($1::uuid, $2::date, false)`,
      companyId,
      date ?? null
    );

    return result[0]?.hr_get_current_absent_employees ?? null;
  } catch (error) {
    logger.error('Error al obtener detalle de ausentismo diario', { data: { error, companyId } });
    throw error;
  }
}

export type DailyAbsenceDetailData = Awaited<ReturnType<typeof getDailyAbsenceDetail>>;

// ─── Funciones nativas de Prisma ──────────────────────────────────────────

/**
 * Obtiene la distribución de empleados activos por género y posición.
 */
export async function getEmployeesByGenderAndPosition(companyId: string) {
  logger.debug('Obteniendo empleados por género y posición', { data: { companyId } });

  try {
    const data = await prisma.employees.findMany({
      where: {
        company_id: companyId,
        is_active: true,
      },
      select: {
        gender: true,
        company_position: true,
        company_positions: {
          select: { name: true },
        },
      },
    });

    return data;
  } catch (error) {
    logger.error('Error al obtener empleados por género y posición', { data: { error, companyId } });
    throw error;
  }
}

export type EmployeesByGenderAndPositionData = Awaited<ReturnType<typeof getEmployeesByGenderAndPosition>>;
export type EmployeesByGenderAndPositionItem = EmployeesByGenderAndPositionData[number];

/**
 * Obtiene la distribución de empleados activos por tipo de contrato.
 * Solo incluye empleados que tienen tipo de contrato asignado.
 */
export async function getEmployeesByContractType(companyId: string) {
  logger.debug('Obteniendo empleados por tipo de contrato', { data: { companyId } });

  try {
    const data = await prisma.employees.findMany({
      where: {
        company_id: companyId,
        is_active: true,
        type_of_contract: { not: null },
      },
      select: {
        types_of_contract: {
          select: { id: true, name: true },
        },
      },
    });

    return data;
  } catch (error) {
    logger.error('Error al obtener empleados por tipo de contrato', { data: { error, companyId } });
    throw error;
  }
}

export type EmployeesByContractTypeData = Awaited<ReturnType<typeof getEmployeesByContractType>>;
export type EmployeesByContractTypeItem = EmployeesByContractTypeData[number];
