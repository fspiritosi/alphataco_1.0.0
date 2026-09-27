import { Prisma } from '@/generated/prisma/client';

/**
 * Cantidad de una línea de parte diario.
 *
 * Regla (tsk-745): **cada línea vale 1, salvo que venga una cantidad explícita**, y en ese caso
 * manda esa. Hoy la única que la trae es la del preparte de origen — que hasta ahora se perdía
 * al confirmarlo, porque `dailyreportrows` no tenía dónde ponerla.
 *
 * Vive acá y no en cada alta porque `dailyreportrows` tiene **cuatro** rutas de creación
 * (preparte, alta manual de Operaciones, alta de Comercial y clonado). Una regla escrita en
 * cuatro lugares diverge, y esta multiplica precios.
 *
 * Siempre `Decimal`, nunca `number`: esta cantidad se multiplica por el precio unitario para
 * armar el importe de una certificación, y un `number` de JS no representa exactamente la
 * mayoría de los decimales.
 */
export const DEFAULT_ROW_QUANTITY = new Prisma.Decimal(1);

export function resolveRowQuantity(explicit?: Prisma.Decimal | string | number | null): Prisma.Decimal {
  if (explicit === null || explicit === undefined || explicit === '') return DEFAULT_ROW_QUANTITY;

  let value: Prisma.Decimal;
  try {
    value = new Prisma.Decimal(explicit);
  } catch {
    // Un valor no numérico es un dato roto, no un cero: se cae al default en vez de
    // propagar basura a un importe.
    return DEFAULT_ROW_QUANTITY;
  }

  // Negativa tampoco: el CHECK de la base la rechazaría, y fallar acá da un mensaje
  // entendible en lugar de un error de constraint.
  if (!value.isFinite() || value.isNegative()) return DEFAULT_ROW_QUANTITY;

  return value;
}
