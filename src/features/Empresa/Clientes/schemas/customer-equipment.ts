import { z } from 'zod';

/** Etiquetas de `type_equipment` tal como están en la base (el enum de Prisma las mapea con `@map`). */
export const CUSTOMER_EQUIPMENT_TYPES = [
  'Perforador',
  'Perforador Spudder',
  'Work over',
  'Fractura',
  'Coiled Tubing',
] as const;

export type CustomerEquipmentTypeLabel = (typeof CUSTOMER_EQUIPMENT_TYPES)[number];

/** Equipo del cliente (`equipos_clientes`). */
export const customerEquipmentFormSchema = z.object({
  name: z.string().trim().min(1, { message: 'El nombre es requerido' }),
  customer_id: z.string().min(1, { message: 'El cliente es requerido' }),
  type: z.enum(CUSTOMER_EQUIPMENT_TYPES),
});

export type CustomerEquipmentFormValues = z.infer<typeof customerEquipmentFormSchema>;
