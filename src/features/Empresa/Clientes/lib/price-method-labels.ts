import type { price_update_method } from '@/generated/prisma/client';

/**
 * Cómo se nombra cada método de actualización de precio en pantalla.
 *
 * Vive acá y no en cada vista porque lo leen dos superficies distintas — la lista de reglas y el
 * historial de precios de un ítem — y un mapa duplicado no se nota en la pantalla que estás
 * mirando: se nota cuando alguien compara las dos y el mismo método se llama distinto.
 */
export const PRICE_METHOD_LABELS: Record<price_update_method, string> = {
  manual: 'Manual',
  index: 'Por índice',
  polynomial: 'Fórmula polinómica',
};
