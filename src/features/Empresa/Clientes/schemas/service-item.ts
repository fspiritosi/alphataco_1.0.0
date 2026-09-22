import { z } from 'zod';

/** Item de contrato (`service_items`). `item_measure_units` viaja como string (id del select). */
export const serviceItemFormSchema = z.object({
  item_name: z.string().trim().min(1, { message: 'Debe ingresar el nombre del item' }),
  item_description: z.string().nullable().optional(),
  code_item: z.string().nullable().optional(),
  item_number: z.string().nullable().optional(),
  item_price: z.preprocess((val) => Number(val), z.number().min(0, { message: 'Debe ingresar un precio válido' })),
  item_measure_units: z.string().min(1, { message: 'Debe seleccionar la unidad de medida' }),
  is_active: z.boolean().default(true),
  needs_personnel: z.boolean().default(true),
  needs_equipment: z.boolean().default(true),
});

export type ServiceItemFormValues = z.infer<typeof serviceItemFormSchema>;
