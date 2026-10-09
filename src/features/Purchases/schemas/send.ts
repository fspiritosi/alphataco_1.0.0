import { z } from 'zod';

/**
 * Envio de un pedido de cotizacion o de una orden de compra al proveedor. Modulo SIN directiva.
 * Los destinatarios son libres (se valida que sean mails, no que sean contactos cargados).
 */
export const sendDocumentSchema = z.object({
  to: z
    .array(z.string().trim().toLowerCase().email('Mail inválido'))
    .min(1, 'Elegí al menos un destinatario')
    .refine((list) => new Set(list).size === list.length, 'Hay destinatarios repetidos'),
  message: z.string().trim().max(2000, 'Máximo 2000 caracteres'),
});

export type SendDocumentValues = z.infer<typeof sendDocumentSchema>;
