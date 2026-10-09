import { z } from 'zod';

/** Concepto de gasto para las lineas sin OC (spec Compras etapa 4 §2.1). Sin directiva. */
export const expenseCategoryFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(80, 'Máximo 80 caracteres'),
});

export type ExpenseCategoryFormValues = z.infer<typeof expenseCategoryFormSchema>;
