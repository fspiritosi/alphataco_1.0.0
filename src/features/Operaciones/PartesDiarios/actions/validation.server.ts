'use server';

import { Logger } from '@/lib/logger';
import { prisma } from '@/shared/lib/prisma';
import { callScalar } from '@/shared/lib/sql';
import { getActiveCompanyId } from '@/shared/lib/tenant';
import { z } from 'zod';

const logger = new Logger('features/Operaciones/PartesDiarios/validation');

// ============================================================================
// TIPOS DEL RESULTADO DE `get_daily_report_deviations`
// ============================================================================

export interface EmployeeDeviation {
  employee_id: string;
  employee_name: string;
  employee_cuil: string;
  role: string;
  is_duplicated: boolean;
  is_unassigned_to_client: boolean;
  has_no_diagram: boolean;
  is_non_work_day: boolean;
  diagram_type_name: string | null;
}

export interface EquipmentDeviation {
  /** Id efectivo de la relación polimórfica: `vehicles.id` u `other_equipment.id`. */
  equipment_id: string;
  equipment_domain: string;
  equipment_intern_number: string;
  /** Identificador a mostrar: dominio del vehículo, o N° de serie / interno si es otro equipo. */
  equipment_label: string;
  /** Tipo del otro equipo (Pileta, Contenedor). `null` en vehículos. */
  equipment_type: string | null;
  /** `true` cuando la relación apunta a `other_equipment` en vez de a `vehicles`. */
  is_other_equipment: boolean;
  condition: string;
  is_duplicated: boolean;
  is_unassigned_to_client: boolean;
}

export interface CustomerEquipmentInfo {
  name: string;
  type: string;
}

export interface RowWithDeviations {
  row_id: string;
  customer_id: string;
  customer_name: string;
  service_name: string;
  item_name: string;
  start_time: string | null;
  end_time: string | null;
  working_day: string | null;
  type_service: string | null;
  status: string | null;
  description: string | null;
  sector_name: string | null;
  area_name: string | null;
  customer_equipment: CustomerEquipmentInfo[];
  employee_deviations: EmployeeDeviation[];
  equipment_deviations: EquipmentDeviation[];
}

export interface DeviationsSummary {
  total_employee_deviations: number;
  total_equipment_deviations: number;
  total_duplicated_employees: number;
  total_duplicated_equipment: number;
  total_rows_with_deviations: number;
}

export interface DailyReportDeviationsResult {
  rows_with_deviations: RowWithDeviations[];
  summary: DeviationsSummary;
}

const EMPTY_SUMMARY: DeviationsSummary = {
  total_employee_deviations: 0,
  total_equipment_deviations: 0,
  total_duplicated_employees: 0,
  total_duplicated_equipment: 0,
  total_rows_with_deviations: 0,
};

// ============================================================================
// SCHEMA ZOD DEL JSONB QUE DEVUELVE LA FUNCIÓN
// ============================================================================

const employeeDeviationSchema = z.object({
  employee_id: z.string(),
  employee_name: z.string(),
  employee_cuil: z.string(),
  role: z.string(),
  is_duplicated: z.boolean(),
  is_unassigned_to_client: z.boolean(),
  has_no_diagram: z.boolean(),
  is_non_work_day: z.boolean(),
  diagram_type_name: z.string().nullable(),
});

const equipmentDeviationSchema = z.object({
  equipment_id: z.string(),
  equipment_domain: z.string(),
  equipment_intern_number: z.string(),
  equipment_label: z.string(),
  equipment_type: z.string().nullable(),
  is_other_equipment: z.boolean(),
  condition: z.string(),
  is_duplicated: z.boolean(),
  is_unassigned_to_client: z.boolean(),
});

const rowWithDeviationsSchema = z.object({
  row_id: z.string(),
  customer_id: z.string(),
  customer_name: z.string(),
  service_name: z.string(),
  item_name: z.string(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  working_day: z.string().nullable(),
  type_service: z.string().nullable(),
  status: z.string().nullable(),
  description: z.string().nullable(),
  sector_name: z.string().nullable(),
  area_name: z.string().nullable(),
  customer_equipment: z.array(z.object({ name: z.string(), type: z.string() })),
  employee_deviations: z.array(employeeDeviationSchema),
  equipment_deviations: z.array(equipmentDeviationSchema),
});

/** `get_daily_report_deviations` devuelve un único `jsonb` con las filas y el resumen. */
const deviationsResultSchema = z.object({
  rows_with_deviations: z.array(rowWithDeviationsSchema),
  summary: z.object({
    total_employee_deviations: z.number(),
    total_equipment_deviations: z.number(),
    total_duplicated_employees: z.number(),
    total_duplicated_equipment: z.number(),
    total_rows_with_deviations: z.number(),
  }),
});

// ============================================================================
// ACTION
// ============================================================================

/**
 * Desvíos de empleados y equipos de un parte diario, agrupados por línea y con los datos
 * ya enriquecidos (nombre, CUIL, dominio, condición).
 *
 * Perímetro: el parte tiene que ser de la empresa activa; si no, se devuelve vacío.
 */
export async function getDailyReportDeviations(
  dailyReportId: string,
  reportDate: string
): Promise<DailyReportDeviationsResult> {
  try {
    const companyId = await getActiveCompanyId();

    const report = await prisma.dailyreport.findFirst({
      where: { id: dailyReportId, company_id: companyId },
      select: { id: true },
    });

    if (!report) {
      logger.warn('Parte diario inexistente o de otra empresa', { data: { dailyReportId } });
      return { rows_with_deviations: [], summary: EMPTY_SUMMARY };
    }

    const result = await callScalar(
      'get_daily_report_deviations',
      [{ uuid: dailyReportId }, { date: reportDate }],
      deviationsResultSchema
    );

    return {
      rows_with_deviations: result.rows_with_deviations,
      summary: result.summary,
    };
  } catch (error) {
    logger.error('Error al obtener los desvíos del parte diario', { data: { error, dailyReportId } });
    throw error;
  }
}
