import { formatAmountText } from '@/shared/utils/amount-text';

/**
 * Importe con formato de moneda.
 *
 * El valor llega como **texto** y se formatea como texto: no pasa por `Number` en ningún
 * momento (ver `formatAmountText`). Un importe que se vuelve `number` en un solo lugar del flujo
 * termina copiado a un lugar donde sí importa.
 */
export function CertificationAmount({ value, currency }: { value: string; currency: string }) {
  return (
    <span className="tabular-nums">
      {currency} {formatAmountText(value)}
    </span>
  );
}
