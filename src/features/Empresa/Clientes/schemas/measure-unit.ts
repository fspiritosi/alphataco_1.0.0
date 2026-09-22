import { z } from 'zod';

/** Unidad de medida (`measure_units`, catálogo global). */
export const measureUnitFormSchema = z.object({
  simbol: z.string().trim().min(1, { message: 'El símbolo es requerido' }).max(5, 'Máximo 5 caracteres'),
  tipo: z.string().trim().min(1, { message: 'El tipo es requerido' }),
  unit: z.string().trim().min(1, { message: 'La unidad es requerida' }),
});

export type MeasureUnitFormValues = z.infer<typeof measureUnitFormSchema>;
