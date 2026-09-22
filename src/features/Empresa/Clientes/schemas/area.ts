import { z } from 'zod';

/** Área de cliente (`areas_cliente` + `area_province`). */
export const areaFormSchema = z.object({
  name: z.string().trim().min(1, { message: 'El nombre es requerido' }),
  descripcion_corta: z
    .string()
    .trim()
    .min(1, { message: 'La descripción corta es requerida' })
    .max(5, 'Máximo 5 caracteres'),
  customer_id: z.string().min(1, { message: 'El cliente es requerido' }),
  province_id: z.array(z.number().int()).min(1, { message: 'La provincia es requerida' }),
  contract_ids: z.array(z.string()).optional(),
});

export type AreaFormValues = z.infer<typeof areaFormSchema>;
