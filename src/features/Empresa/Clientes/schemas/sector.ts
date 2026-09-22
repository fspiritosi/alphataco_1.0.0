import { z } from 'zod';

/** Sector (`sectors` + `sector_customer`). */
export const sectorFormSchema = z.object({
  name: z.string().trim().min(1, { message: 'El nombre es requerido' }),
  descripcion_corta: z.string().trim().min(1, { message: 'La descripción es requerida' }),
  customer_id: z.string().min(1, { message: 'El cliente es requerido' }),
});

export type SectorFormValues = z.infer<typeof sectorFormSchema>;
