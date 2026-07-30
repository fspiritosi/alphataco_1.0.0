import { z } from 'zod';
import { contactDataSchema, personalDataSchema } from '../../shared/schemas/person-data-schemas';

/**
 * Schemas del legajo de empleado.
 *
 * Viven fuera de `components/forms/employee-form.tsx` (que es `'use client'`) para que
 * tambien puedan usarse desde el servidor: si se importa un schema Zod desde un modulo
 * de cliente, Next lo entrega como referencia de cliente y `.parse()` no existe en el
 * servidor (falla en runtime, no en `check-types`). La conversion de un pre legajo en
 * legajo (ticket 505) valida con estos schemas del lado del servidor.
 */

/**
 * Datos Laborales del legajo. Se exporta por separado porque la conversion de un
 * pre legajo en empleado reutiliza exactamente esta seccion: son los campos que se
 * completan recien al dar el OK.
 */
export const employeeWorkDataSchema = z.object({
  file: z.string().min(1, 'Legajo es requerido'),
  hierarchical_position: z.string().min(1, 'Sector es requerido'),
  company_position: z.string().min(1, 'Puesto en la empresa es requerido'),
  workflow_diagram: z.string().min(1, 'Diagrama de trabajo es requerido'),
  normal_hours: z.string().optional(),
  type_of_contract: z.string().optional(),
  aptitudes: z.array(z.string()).optional(),
  allocated_to: z.array(z.string()).optional(),
  date_of_admission: z.string().optional(),
  guild_id: z.string().optional(),
  covenants_id: z.string().optional(),
  category_id: z.string().optional(),
  cost_center_id: z.string().optional(),
  cost_type: z.string().optional(),
  workshop_sector_ids: z.array(z.string()).optional(),
});

export type EmployeeWorkDataValues = z.infer<typeof employeeWorkDataSchema>;

// Datos personales y de contacto se comparten con el pre legajo — unica fuente de verdad
// en shared/schemas/person-data-schemas.ts
export const employeeFormSchema = personalDataSchema.merge(contactDataSchema).merge(employeeWorkDataSchema);

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;
