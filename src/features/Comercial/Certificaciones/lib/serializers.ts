import type { Prisma } from '@/generated/prisma/client';

/**
 * Los importes de una certificación viajan al cliente como TEXTO.
 *
 * `Prisma.Decimal` es una instancia de clase: no cruza la frontera a un Client Component. Y
 * convertirlo a `number` le comería decimales a columnas `Decimal(15,4)` — justo las que
 * sostienen el total que se le factura al cliente. El componente sólo los formatea; la
 * aritmética de dinero se hace en el servidor con `certification-amounts`.
 */
export function decimalToString(value: Prisma.Decimal): string;
export function decimalToString(value: Prisma.Decimal | null): string | null;
export function decimalToString(value: Prisma.Decimal | null): string | null {
  return value === null ? null : value.toString();
}

/** Certificación de listado: sólo el total es `Decimal`. */
export function serializeCertification<T extends { total: Prisma.Decimal }>(row: T): Omit<T, 'total'> & { total: string } {
  return { ...row, total: row.total.toString() };
}

/** Línea de certificación: cantidad, precio unitario congelado e importe. */
export function serializeCertificationLine<
  T extends { quantity: Prisma.Decimal; unit_price: Prisma.Decimal; amount: Prisma.Decimal },
>(line: T): Omit<T, 'quantity' | 'unit_price' | 'amount'> & { quantity: string; unit_price: string; amount: string } {
  return {
    ...line,
    quantity: line.quantity.toString(),
    unit_price: line.unit_price.toString(),
    amount: line.amount.toString(),
  };
}
