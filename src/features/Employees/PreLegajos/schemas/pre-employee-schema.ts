import { z } from 'zod';
import { contactDataSchema, personalDataSchema } from '../../shared/schemas/person-data-schemas';

/**
 * Schema del pre legajo (ticket 505).
 *
 * Segun el ticket: datos personales COMPLETOS + datos de contacto COMPLETOS + de los
 * datos laborales SOLO sector y puesto propuestos. El resto de los datos laborales
 * (legajo definitivo, diagrama, convenio, etc.) se completan al convertirlo en empleado.
 *
 * Personales y contacto reutilizan literalmente los schemas del legajo de empleado, asi
 * que las reglas y los mensajes son los mismos en ambos formularios.
 */

// Datos laborales del pre legajo: los unicos dos campos, ambos obligatorios
export const preEmployeeWorkDataSchema = z.object({
  proposed_hierarchical_position: z.string().min(1, 'Sector propuesto es requerido'),
  proposed_company_position: z.string().min(1, 'Puesto propuesto es requerido'),
});

// El N° de pre legajo no viaja en el formulario: lo asigna la base al crear
// (`next_pre_file_number`) y despues es de solo lectura.
export const preEmployeeFormSchema = personalDataSchema.merge(contactDataSchema).merge(preEmployeeWorkDataSchema);

export type PreEmployeeFormData = z.infer<typeof preEmployeeFormSchema>;

/** Campos por tab — para marcar en que solapa quedaron errores. */
export const PRE_EMPLOYEE_WORK_DATA_FIELD_NAMES = Object.keys(
  preEmployeeWorkDataSchema.shape
) as (keyof PreEmployeeFormData)[];

// ─── Rechazo ──────────────────────────────────────────────────────────────────
export const rejectPreEmployeeSchema = z.object({
  rejection_reason: z.string().trim().min(10, 'Explicá el motivo del rechazo (mínimo 10 caracteres)'),
});

export type RejectPreEmployeeValues = z.infer<typeof rejectPreEmployeeSchema>;
