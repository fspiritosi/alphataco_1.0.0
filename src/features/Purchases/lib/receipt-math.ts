import { QUANTITY_SCALE, formatScaled, parseScaled } from '@/features/Comercial/Facturacion/lib/invoice-math';

/**
 * Parte una cantidad recibida en lo que cubre la OC y el excedente (spec Compras etapa 3 §3). Puro:
 * lo usan el formulario (aviso en la fila) y el servidor (lo que se guarda).
 */
export function splitReceived(input: { remaining: string; received: string }): { withinOrder: string; excess: string } {
  const zero = BigInt(0);
  const remaining = parseScaled(input.remaining, QUANTITY_SCALE) ?? zero;
  const received = parseScaled(input.received, QUANTITY_SCALE) ?? zero;
  const available = remaining > zero ? remaining : zero;
  const withinOrder = received < available ? received : available;
  return {
    withinOrder: formatScaled(withinOrder, QUANTITY_SCALE),
    excess: formatScaled(received - withinOrder, QUANTITY_SCALE),
  };
}
