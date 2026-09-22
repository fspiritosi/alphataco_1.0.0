import { z } from 'zod';

/**
 * Schema compartido server/client del formulario de cliente (sin directiva: lo importan la
 * server action y el componente). Los numéricos viajan como string (CUIT/teléfono) y la
 * action los convierte a `bigint` al persistir.
 */
export const customerFormSchema = z.object({
  name: z.string().trim().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  cuit: z
    .string()
    .trim()
    .min(8, 'El CUIT debe tener al menos 8 caracteres.')
    .regex(/^\d+$/, 'El CUIT solo puede contener dígitos'),
  client_email: z.string().trim().email('Por favor ingresa un email válido.').optional().or(z.literal('')),
  client_phone: z
    .string()
    .trim()
    .min(8, 'El teléfono debe tener al menos 8 caracteres.')
    .regex(/^\d+$/, 'El teléfono solo puede contener dígitos')
    .optional()
    .or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  is_active: z.boolean().default(true),
  reason_for_termination: z.string().trim().optional().or(z.literal('')),
  termination_date: z.date().optional().nullable(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
