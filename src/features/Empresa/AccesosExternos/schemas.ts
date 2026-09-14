import { z } from 'zod';

/**
 * Schemas del ABM de accesos externos.
 *
 * Vive en un modulo sin directiva porque lo consumen las dos puntas: el
 * formulario en el cliente y la server action que persiste.
 */

export const createExternalApiClientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(150, 'El nombre no puede superar los 150 caracteres'),
  notes: z.string().trim().max(500, 'Las notas no pueden superar los 500 caracteres').optional(),
});

export type CreateExternalApiClientValues = z.infer<typeof createExternalApiClientSchema>;
