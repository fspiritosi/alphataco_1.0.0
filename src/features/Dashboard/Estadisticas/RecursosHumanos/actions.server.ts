'use server';

import { Prisma } from '@/generated/prisma/client';
import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { withCompany } from '@/shared/lib/prisma-tenant';
import { getActiveCompanyId } from '@/shared/lib/tenant';

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

// ─── Funciones SQL del dominio de RRHH ────────────────────────────────────
//
// Perímetro: NINGUNA de estas actions recibe ya el `companyId` del caller — lo deriva de
// la sesión con `getActiveCompanyId()`. Antes la empresa era un parámetro del cliente, y
// estas funciones devuelven el padrón completo con legajo, nombre, sector y motivo de
// ausencia: con el uuid de otra empresa salía su nómina entera.
//
// El SQL va por `$queryRaw` con `Prisma.sql` (los argumentos se bindean); se reemplazó
// `$queryRawUnsafe`, que armaba la consulta como string suelto.

/**
 * Obtiene el resumen general de ausentismo para una empresa y rango de fechas.
 * Llama al RPC `hr_get_absenteeism_summary`.
 */
export async function getAbsenteeismSummary(
  fromDate?: string,
  toDate?: string
): Promise<AbsenteeismSummaryResult | null> {
  const companyId = await getActiveCompanyId();
  logger.debug('Obteniendo resumen de ausentismo', { data: { fromDate, toDate } });

  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await prisma.$queryRaw<[{ hr_get_absenteeism_summary: AbsenteeismSummaryResult }]>(
      Prisma.sql`SELECT hr_get_absenteeism_summary(${companyId}::uuid, ${fromDate ?? today}::date, ${toDate ?? today}::date, false)`
    );

    return result[0]?.hr_get_absenteeism_summary ?? null;
  } catch (error) {
    logger.error('Error al obtener resumen de ausentismo', { data: { error } });
    throw error;
  }
}

export type AbsenteeismSummaryData = Awaited<ReturnType<typeof getAbsenteeismSummary>>;

/**
 * Obtiene la tendencia de ausentismo en el tiempo.
 * Llama al RPC `hr_get_absenteeism_trend`.
 */
export async function getAbsenteeismTrend(fromDate?: string, toDate?: string): Promise<AbsenteeismTrendItem[]> {
  const companyId = await getActiveCompanyId();
  logger.debug('Obteniendo tendencia de ausentismo', { data: { fromDate, toDate } });

  try {
    const result = await prisma.$queryRaw<[{ hr_get_absenteeism_trend: AbsenteeismTrendItem[] }]>(
      Prisma.sql`SELECT hr_get_absenteeism_trend(${companyId}::uuid, ${fromDate ?? null}::date, ${toDate ?? null}::date, false)`
    );

    return result[0]?.hr_get_absenteeism_trend ?? [];
  } catch (error) {
    logger.error('Error al obtener tendencia de ausentismo', { data: { error } });
    return [];
  }
}

export type AbsenteeismTrendData = Awaited<ReturnType<typeof getAbsenteeismTrend>>;

/**
 * Obtiene los empleados ausentes en una fecha determinada.
 * Llama al RPC `hr_get_current_absent_employees`.
 */
export async function getCurrentAbsentEmployees(date?: string): Promise<CurrentAbsentEmployeesResult | null> {
  const companyId = await getActiveCompanyId();
  logger.debug('Obteniendo empleados ausentes actuales', { data: { date } });

  try {
    const result = await prisma.$queryRaw<[{ hr_get_current_absent_employees: CurrentAbsentEmployeesResult }]>(
      Prisma.sql`SELECT hr_get_current_absent_employees(${companyId}::uuid, ${date ?? null}::date, false)`
    );

    return result[0]?.hr_get_current_absent_employees ?? null;
  } catch (error) {
    logger.error('Error al obtener empleados ausentes actuales', { data: { error } });
    throw error;
  }
}

export type CurrentAbsentEmployeesData = Awaited<ReturnType<typeof getCurrentAbsentEmployees>>;

/**
 * Obtiene la serie temporal diaria de ausentismo.
 * Llama al RPC `hr_get_daily_absence_timeseries`.
 */
export async function getDailyAbsenceTimeseries(
  fromDate?: string,
  toDate?: string
): Promise<DailyAbsenceTimeseriesItem[]> {
  const companyId = await getActiveCompanyId();
  logger.debug('Obteniendo serie temporal diaria de ausentismo', { data: { fromDate, toDate } });

  try {
    const result = await prisma.$queryRaw<[{ hr_get_daily_absence_timeseries: DailyAbsenceTimeseriesItem[] }]>(
      Prisma.sql`SELECT hr_get_daily_absence_timeseries(${companyId}::uuid, ${fromDate ?? null}::date, ${toDate ?? null}::date, false)`
    );

    return result[0]?.hr_get_daily_absence_timeseries ?? [];
  } catch (error) {
    logger.error('Error al obtener serie temporal diaria de ausentismo', { data: { error } });
    throw error;
  }
}

export type DailyAbsenceTimeseriesData = Awaited<ReturnType<typeof getDailyAbsenceTimeseries>>;

/**
 * Obtiene las razones de ausencia agrupadas por departamento para una fecha.
 * Llama al RPC `hr_get_department_absence_reasons`.
 */
export async function getDepartmentAbsenceReasons(date?: string): Promise<DepartmentAbsenceReasonEntry[]> {
  const companyId = await getActiveCompanyId();
  logger.debug('Obteniendo razones de ausencia por departamento', { data: { date } });

  try {
    const result = await prisma.$queryRaw<[{ hr_get_department_absence_reasons: DepartmentAbsenceReasonEntry[] }]>(
      Prisma.sql`SELECT hr_get_department_absence_reasons(${companyId}::uuid, ${date ?? null}::date, false)`
    );

    return result[0]?.hr_get_department_absence_reasons ?? [];
  } catch (error) {
    logger.error('Error al obtener razones de ausencia por departamento', { data: { error } });
    throw error;
  }
}

export type DepartmentAbsenceReasonsData = Awaited<ReturnType<typeof getDepartmentAbsenceReasons>>;

/**
 * Obtiene el resumen de ausentismo agrupado por departamento para una fecha.
 * Llama al RPC `hr_get_department_absence_summary`.
 */
export async function getDepartmentAbsenceSummary(date?: string): Promise<DepartmentAbsenceSummaryItem[]> {
  const companyId = await getActiveCompanyId();
  logger.debug('Obteniendo resumen de ausentismo por departamento', { data: { date } });

  try {
    const result = await prisma.$queryRaw<[{ hr_get_department_absence_summary: DepartmentAbsenceSummaryItem[] }]>(
      Prisma.sql`SELECT hr_get_department_absence_summary(${companyId}::uuid, ${date ?? null}::date, false)`
    );

    return result[0]?.hr_get_department_absence_summary ?? [];
  } catch (error) {
    logger.error('Error al obtener resumen de ausentismo por departamento', { data: { error } });
    throw error;
  }
}

export type DepartmentAbsenceSummaryData = Awaited<ReturnType<typeof getDepartmentAbsenceSummary>>;

/**
 * Obtiene el detalle de ausentismo diario para una fecha específica.
 * Reutiliza el RPC `hr_get_current_absent_employees` filtrado por fecha.
 */
export async function getDailyAbsenceDetail(date?: string): Promise<CurrentAbsentEmployeesResult | null> {
  const companyId = await getActiveCompanyId();
  logger.debug('Obteniendo detalle de ausentismo diario', { data: { date } });

  try {
    const result = await prisma.$queryRaw<[{ hr_get_current_absent_employees: CurrentAbsentEmployeesResult }]>(
      Prisma.sql`SELECT hr_get_current_absent_employees(${companyId}::uuid, ${date ?? null}::date, false)`
    );

    return result[0]?.hr_get_current_absent_employees ?? null;
  } catch (error) {
    logger.error('Error al obtener detalle de ausentismo diario', { data: { error } });
    throw error;
  }
}

export type DailyAbsenceDetailData = Awaited<ReturnType<typeof getDailyAbsenceDetail>>;

// ─── Funciones nativas de Prisma ──────────────────────────────────────────

/**
 * Obtiene la distribución de empleados activos por género y posición.
 */
export async function getEmployeesByGenderAndPosition() {
  const companyId = await getActiveCompanyId();
  logger.debug('Obteniendo empleados por género y posición');

  try {
    const data = await prisma.employees.findMany({
      where: withCompany({ is_active: true }, companyId),
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
    logger.error('Error al obtener empleados por género y posición', { data: { error } });
    throw error;
  }
}

export type EmployeesByGenderAndPositionData = Awaited<ReturnType<typeof getEmployeesByGenderAndPosition>>;
export type EmployeesByGenderAndPositionItem = EmployeesByGenderAndPositionData[number];

/**
 * Obtiene la distribución de empleados activos por tipo de contrato.
 * Solo incluye empleados que tienen tipo de contrato asignado.
 */
export async function getEmployeesByContractType() {
  const companyId = await getActiveCompanyId();
  logger.debug('Obteniendo empleados por tipo de contrato');

  try {
    const data = await prisma.employees.findMany({
      where: withCompany({ is_active: true, type_of_contract: { not: null } }, companyId),
      select: {
        types_of_contract: {
          select: { id: true, name: true },
        },
      },
    });

    return data;
  } catch (error) {
    logger.error('Error al obtener empleados por tipo de contrato', { data: { error } });
    throw error;
  }
}

export type EmployeesByContractTypeData = Awaited<ReturnType<typeof getEmployeesByContractType>>;
export type EmployeesByContractTypeItem = EmployeesByContractTypeData[number];
