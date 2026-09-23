import { z } from 'zod';

/**
 * Salida de `get_daily_report_deviations(p_daily_report_id uuid, p_report_date date)`
 * (`prisma/sql/daily-report.sql`), que devuelve un único `jsonb`.
 *
 * Reemplaza las ~70 líneas de `interface` que la edge function `send-deviations-email`
 * mantenía a mano para describir el mismo objeto: acá el tipo se infiere del schema y, además,
 * se valida en runtime. Si alguien cambia la función SQL sin tocar esto, el job falla con un
 * error de Zod claro y queda registrado en `jobs_runs`, en vez de armar un correo con
 * `undefined` adentro.
 */
export const employeeDeviationSchema = z.object({
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

export const equipmentDeviationSchema = z.object({
  equipment_id: z.string(),
  equipment_domain: z.string(),
  equipment_intern_number: z.string(),
  /** Dominio del vehículo, o N° de serie / interno si es "otro equipo". */
  equipment_label: z.string(),
  /** Tipo del otro equipo (Pileta, Contenedor). `null` en vehículos. */
  equipment_type: z.string().nullable(),
  is_other_equipment: z.boolean(),
  condition: z.string(),
  is_duplicated: z.boolean(),
  is_unassigned_to_client: z.boolean(),
});

export const customerEquipmentSchema = z.object({
  name: z.string(),
  type: z.string(),
});

export const rowWithDeviationsSchema = z.object({
  row_id: z.string(),
  customer_id: z.string().nullable(),
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
  customer_equipment: z.array(customerEquipmentSchema),
  employee_deviations: z.array(employeeDeviationSchema),
  equipment_deviations: z.array(equipmentDeviationSchema),
});

export const deviationsResultSchema = z.object({
  rows_with_deviations: z.array(rowWithDeviationsSchema),
  summary: z.object({
    total_employee_deviations: z.coerce.number(),
    total_equipment_deviations: z.coerce.number(),
    total_duplicated_employees: z.coerce.number(),
    total_duplicated_equipment: z.coerce.number(),
    total_rows_with_deviations: z.coerce.number(),
  }),
});

export type EmployeeDeviation = z.infer<typeof employeeDeviationSchema>;
export type EquipmentDeviation = z.infer<typeof equipmentDeviationSchema>;
export type CustomerEquipment = z.infer<typeof customerEquipmentSchema>;
export type RowWithDeviations = z.infer<typeof rowWithDeviationsSchema>;
export type DeviationsResult = z.infer<typeof deviationsResultSchema>;
