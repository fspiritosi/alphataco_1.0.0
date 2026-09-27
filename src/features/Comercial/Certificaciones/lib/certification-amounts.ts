import { Prisma } from '@/generated/prisma/client';

/**
 * Importes de una certificación.
 *
 * La regla de redondeo, que es la que hace que el papel cierre cuando el cliente rehace la
 * cuenta a mano:
 *
 * 1. El importe de cada línea se redondea a 2 decimales UNA vez: `cantidad × unitario`.
 * 2. El total es la **suma de importes ya redondeados**, no el redondeo de una suma.
 *
 * Hacerlo al revés (sumar exactos y redondear al final) da un total que no coincide con la
 * suma de lo que está impreso línea por línea, y esa diferencia de centavos es la que termina
 * en un reclamo.
 *
 * El unitario mantiene 4 decimales porque los ajustes por índice y polinómica multiplican por
 * coeficientes; el importe, que es plata, va a 2.
 */

/** Escala de los importes: pesos y centavos. */
export const AMOUNT_SCALE = 2;

/** Importe de una línea. Se redondea acá y en ningún otro lado. */
export function lineAmount(
  quantity: Prisma.Decimal | string | number,
  unitPrice: Prisma.Decimal | string | number
): Prisma.Decimal {
  return new Prisma.Decimal(quantity)
    .times(new Prisma.Decimal(unitPrice))
    .toDecimalPlaces(AMOUNT_SCALE, Prisma.Decimal.ROUND_HALF_UP);
}

/** Total de la certificación: suma de importes YA redondeados. */
export function certificationTotal(amounts: (Prisma.Decimal | string | number)[]): Prisma.Decimal {
  return amounts
    .reduce<Prisma.Decimal>((acc, amount) => acc.plus(new Prisma.Decimal(amount)), new Prisma.Decimal(0))
    .toDecimalPlaces(AMOUNT_SCALE, Prisma.Decimal.ROUND_HALF_UP);
}
