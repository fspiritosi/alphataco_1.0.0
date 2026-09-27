/**
 * Importe con formato de moneda.
 *
 * El valor llega como **texto** y se formatea como texto: no pasa por `Number` en ningún
 * momento. Podría hacerlo —`Intl.NumberFormat` es cómodo y dos decimales entran holgados en un
 * `double`— pero entonces el único lugar del flujo donde un importe se vuelve `number` sería
 * este, y en seis meses alguien va a copiar el patrón a un lugar donde sí importa.
 */
function formatAmount(value: string): string {
  const negative = value.startsWith('-');
  const [rawInt = '0', rawDec = ''] = value.replace('-', '').split('.');
  const decimals = (rawDec + '00').slice(0, 2);
  const grouped = rawInt.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${grouped},${decimals}`;
}

export function CertificationAmount({ value, currency }: { value: string; currency: string }) {
  return (
    <span className="tabular-nums">
      {currency} {formatAmount(value)}
    </span>
  );
}
